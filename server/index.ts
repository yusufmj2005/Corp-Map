import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

const PORT = Number(process.env.API_PORT ?? 8787)
const MODEL = process.env.CORPMAP_MODEL ?? 'claude-opus-5'

const app = express()
app.use(express.json({ limit: '32kb' }))

const client = new Anthropic()

const OwnedEntity = z.object({
  name: z.string().describe('The exact name of the company or brand'),
  kind: z.enum(['company', 'brand']).describe('"brand" for a product/trademark name, "company" for a legal business entity'),
  note: z.string().describe('A few words on what it is, e.g. "pencil brand" or "subsidiary in Germany"'),
})

const EnrichmentSchema = z.object({
  found: z.boolean().describe('False if you do not recognise this company or have no reliable information about it'),
  parent: z.string().nullable().describe('Name of the parent company or owner, or null if independent/unknown'),
  owned: z.array(OwnedEntity).describe('Companies and brands this company owns. Empty array if none are known.'),
  confidence: z.enum(['high', 'medium', 'low']).describe('How confident you are overall in this information'),
  summary: z.string().describe('One sentence describing the company'),
})

const RequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  wikipediaTitle: z.string().max(200).optional(),
})

/** Grounding the model in the real article text keeps it extracting rather than recalling.
 * Hindustan Pencils' article names Apsara and Nataraj even though Wikidata does not. */
async function fetchArticleText(title: string): Promise<string | null> {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.search = new URLSearchParams({
      action: 'query',
      prop: 'extracts',
      explaintext: '1',
      exintro: '0',
      titles: title,
      format: 'json',
      redirects: '1',
    }).toString()
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data: any = await res.json()
    const pages = Object.values(data.query?.pages ?? {}) as any[]
    const extract = pages[0]?.extract
    return typeof extract === 'string' && extract.length > 0 ? extract.slice(0, 12000) : null
  } catch {
    return null
  }
}

const cache = new Map<string, unknown>()

app.post('/api/enrich', async (req, res) => {
  const parsed = RequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' })
  }
  const { name, description, wikipediaTitle } = parsed.data

  const cacheKey = `${name}|${wikipediaTitle ?? ''}`
  const cached = cache.get(cacheKey)
  if (cached) return res.json(cached)

  const article = wikipediaTitle ? await fetchArticleText(wikipediaTitle) : null

  const context = [
    `Company to research: ${name}`,
    description ? `Known description: ${description}` : null,
    article ? `\nReference article text:\n"""\n${article}\n"""` : null,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const message = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: [
        'You identify the corporate structure of companies, with particular attention to companies outside the US and Europe (India, Southeast Asia, Africa, Latin America) that public databases cover poorly.',
        'List the brands and subsidiary companies the company owns, and its parent company if it has one.',
        'Use the reference article text when provided; prefer it over your own recollection. Use web search to confirm or fill gaps.',
        'Only list entities you are genuinely confident actually exist and are actually owned by this company. An empty list is a correct answer. Never invent plausible-sounding names.',
        'Set found=false if you do not recognise the company.',
      ].join(' '),
      messages: [{ role: 'user', content: context }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 4 }],
      output_config: {
        effort: 'medium',
        format: zodOutputFormat(EnrichmentSchema),
      },
    })

    if (message.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'Request was declined.' })
    }

    const result = { ...(message.parsed_output ?? { found: false, parent: null, owned: [], confidence: 'low', summary: '' }), model: MODEL }
    cache.set(cacheKey, result)
    res.json(result)
  } catch (error) {
    // A missing key surfaces as a plain resolution error, not AuthenticationError.
    if (!process.env.ANTHROPIC_API_KEY || error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'Server has no valid ANTHROPIC_API_KEY — add one to .env and restart.' })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited, try again shortly.' })
    }
    console.error('[enrich]', error)
    res.status(500).json({ error: 'AI lookup failed.' })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(process.env.ANTHROPIC_API_KEY) })
})

// In production `npm run build` emits dist/; serving it here means the whole app
// deploys as one process. In dev this is skipped and Vite proxies /api instead.
const distDir = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`CorpMap AI server listening on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY is not set — /api/enrich will fail until you add it to .env')
  }
})
