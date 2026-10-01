import type { CompanyDetails, RelatedOrg } from './types'

export interface AiEntity {
  name: string
  kind: 'company' | 'brand'
  note: string
}

export interface Enrichment {
  found: boolean
  parent: string | null
  owned: AiEntity[]
  confidence: 'high' | 'medium' | 'low'
  summary: string
  model?: string
}

/** AI is a fallback, not a supplement: it runs only where the structured data is
 * genuinely empty, so verified Wikidata facts are never displaced by a guess. */
export function needsEnrichment(company: CompanyDetails): boolean {
  return company.subsidiaries.length === 0
}

const SERVER_DOWN = 'The AI server isn\'t running. Start it with "npm run dev" (it runs the site and the API together).'

export async function enrichCompany(company: CompanyDetails, signal?: AbortSignal): Promise<Enrichment> {
  let res: Response
  try {
    res = await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: company.label,
        description: company.description,
        wikipediaTitle: company.wikipediaUrl ? decodeURIComponent(company.wikipediaUrl.split('/wiki/')[1] ?? '') : undefined,
      }),
      signal,
    })
  } catch (err) {
    // The dev proxy refuses the connection outright when the API isn't up.
    if ((err as Error).name === 'AbortError') throw err
    throw new Error(SERVER_DOWN)
  }

  // A dead upstream surfaces as a proxy-level gateway error, not a JSON body.
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error(SERVER_DOWN)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `AI lookup failed (${res.status})`)
  }
  return res.json()
}

/** AI results have no Wikidata id, so they get a synthetic one and are never
 * clickable — there is no verified entity behind them to open. */
export function toRelatedOrgs(entities: AiEntity[], kind: 'company' | 'brand'): RelatedOrg[] {
  return entities
    .filter((e) => e.kind === kind)
    .map((e) => ({
      id: `ai:${e.name}`,
      label: e.name,
      logo: null,
      kind: e.kind,
      typeLabel: e.note,
    }))
}
