import type { CompanyDetails, OrgKind, RelatedOrg, SearchResult } from './types'

const WD_API = 'https://www.wikidata.org/w/api.php'
const WD_ENTITY_DATA = 'https://www.wikidata.org/wiki/Special:EntityData'
const WD_SPARQL = 'https://query.wikidata.org/sparql'
const WP_API = 'https://en.wikipedia.org/w/api.php'
const WP_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary'

// Properties we read off a Wikidata entity.
const P = {
  instanceOf: 'P31',
  country: 'P17',
  hq: 'P159',
  inception: 'P571',
  industry: 'P452',
  foundedBy: 'P112',
  ceo: 'P169',
  employees: 'P1128',
  logo: 'P154',
  image: 'P18',
  website: 'P856',
  parentOrg: 'P749',
  ownedBy: 'P127',
  subsidiary: 'P355',
  businessDivision: 'P199',
  ownerOf: 'P1830',
  stockExchange: 'P414',
  ticker: 'P249',
} as const

type Snak = { mainsnak?: { datavalue?: { value: any } } }
type Entity = {
  id: string
  labels?: Record<string, { value: string }>
  descriptions?: Record<string, { value: string }>
  claims?: Record<string, Snak[]>
  sitelinks?: Record<string, { title: string }>
}

function commonsFilePath(filename: string, width = 400): string {
  const clean = filename.replace(/ /g, '_')
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=${width}`
}

function label(entity: Entity | undefined): string | undefined {
  return entity?.labels?.en?.value
}

/** Some entities (e.g. Walmart, Q483551) have no English Wikidata label but do have
 * an English Wikipedia sitelink — fall back to that title rather than showing a raw QID. */
function displayLabel(entity: Entity | undefined, id: string): string {
  const anyLanguage = entity?.labels && Object.values(entity.labels)[0]?.value
  return label(entity) ?? entity?.sitelinks?.enwiki?.title ?? anyLanguage ?? id
}

function description(entity: Entity | undefined): string | undefined {
  return entity?.descriptions?.en?.value
}

function claimValues(entity: Entity, prop: string): any[] {
  const claims = entity.claims?.[prop]
  if (!claims) return []
  return claims
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v) => v !== undefined)
}

function entityIds(entity: Entity, prop: string): string[] {
  return claimValues(entity, prop)
    .map((v) => v?.id)
    .filter((id): id is string => typeof id === 'string')
}

/** Wikidata's own search only matches an item's label and aliases. */
async function searchWikidataEntities(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL(WD_API)
  url.search = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language: 'en',
    uselang: 'en',
    type: 'item',
    limit: '10',
    format: 'json',
    origin: '*',
  }).toString()

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`Wikidata search failed (${res.status})`)
  const data = await res.json()
  return (data.search ?? []).map((r: any) => ({
    id: r.id,
    label: r.label ?? r.id,
    description: r.description,
  }))
}

/** Label-only search buries regional brands: searching "DOMS" returns a costume designer
 * and a French commune, while the Indian stationery brand only appears if you type its
 * full legal name. Wikipedia's full-text search finds them through article content, and
 * pageprops maps each article straight back to its Wikidata id. */
async function searchWikipediaArticles(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL(WP_API)
  url.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '8',
    prop: 'pageprops',
    ppprop: 'wikibase_item|wikibase-shortdesc',
    format: 'json',
    origin: '*',
  }).toString()

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) return []
  const data = await res.json()
  const pages = Object.values(data.query?.pages ?? {}) as any[]
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .filter((p) => p.pageprops?.wikibase_item)
    .map((p) => ({
      id: p.pageprops.wikibase_item as string,
      label: p.title as string,
      description: p.pageprops['wikibase-shortdesc'] as string | undefined,
    }))
}

const COMPANYISH =
  /\b(compan(y|ies)|brand|manufacturer|corporation|business|conglomerate|retailer|enterprise|firm|group|holding|subsidiary|producer|maker|stationery|multinational)\b/i

/** This is a company search box, so rank company-like results above same-named people
 * and places, and exact name matches above loose ones. */
function relevance(result: SearchResult, query: string): number {
  const label = result.label.toLowerCase()
  const q = query.trim().toLowerCase()
  let score = 0
  if (label === q) score += 3
  else if (label.startsWith(q)) score += 2
  else if (label.includes(q)) score += 1
  if (result.description && COMPANYISH.test(result.description)) score += 2
  return score
}

/** Debounced search combining Wikidata's entity index with Wikipedia's full-text index. */
export async function searchCompanies(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (!query.trim()) return []

  const [entities, articles] = await Promise.all([
    searchWikidataEntities(query, signal),
    searchWikipediaArticles(query, signal).catch(() => [] as SearchResult[]),
  ])

  const merged: SearchResult[] = []
  const seen = new Set<string>()
  for (const result of [...entities, ...articles]) {
    if (seen.has(result.id)) continue
    seen.add(result.id)
    merged.push(result)
  }

  return merged
    .map((result, i) => ({ result, i, score: relevance(result, query) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, 10)
    .map((entry) => entry.result)
}

/** Fetch full raw entity data (claims, labels, sitelinks) for a QID. */
async function getEntity(qid: string, signal?: AbortSignal): Promise<Entity> {
  const res = await fetch(`${WD_ENTITY_DATA}/${qid}.json`, { signal })
  if (!res.ok) throw new Error(`Failed to load entity ${qid}`)
  const data = await res.json()
  return data.entities[qid]
}

/** Batch-fetch labels/claims for a list of QIDs. The API caps each request at 50 ids,
 * so large conglomerates are split across parallel requests rather than truncated. */
async function getEntitiesBatch(
  qids: string[],
  props = 'labels|claims|sitelinks',
  signal?: AbortSignal,
): Promise<Record<string, Entity>> {
  if (qids.length === 0) return {}
  const unique = Array.from(new Set(qids))
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += 50) chunks.push(unique.slice(i, i + 50))

  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const url = new URL(WD_API)
      url.search = new URLSearchParams({
        action: 'wbgetentities',
        ids: chunk.join('|'),
        props,
        languages: 'en',
        // Without this, an entity with no English label renders as a bare QID —
        // Q112247183 is "YouTube LLC". Regional entities rely on this heavily.
        languagefallback: '1',
        sitefilter: 'enwiki',
        format: 'json',
        origin: '*',
      }).toString()
      const res = await fetch(url.toString(), { signal })
      if (!res.ok) throw new Error('Failed to batch-load entities')
      const data = await res.json()
      return (data.entities ?? {}) as Record<string, Entity>
    }),
  )

  return Object.assign({}, ...responses)
}

/** Wikidata types a brand in many specific ways — "brand", "trademark", "perfume brand",
 * "clothing brand" — so match on the type's label rather than an ever-growing QID list. */
const BRAND_TYPE = /\b(brand|trademark|marque)\b/i

interface RelatedInfo {
  label?: string
  logo?: string | null
  types: string[]
}

/** Asking wbgetentities for `claims` on every related entity returns ~1.6MB and takes 5s
 * for a group like LVMH, almost all of it claims we never read. This query returns the
 * three fields we actually use — name, logo, type — in ~60KB, and resolves type names in
 * the same round trip. */
async function resolveRelatedViaSparql(ids: string[], signal?: AbortSignal): Promise<Record<string, RelatedInfo>> {
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100))

  const merged: Record<string, RelatedInfo> = {}
  await Promise.all(
    chunks.map(async (chunk) => {
      const query = `SELECT ?item ?itemLabel ?logo ?image ?typeLabel WHERE {
  VALUES ?item { ${chunk.map((id) => `wd:${id}`).join(' ')} }
  OPTIONAL { ?item wdt:${P.logo} ?logo . }
  OPTIONAL { ?item wdt:${P.image} ?image . }
  OPTIONAL { ?item wdt:${P.instanceOf} ?type . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul,ja,fr,de,es,it,pt,nl,hi". }
}`
      const res = await fetch(`${WD_SPARQL}?format=json&query=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/sparql-results+json' },
        signal,
      })
      if (!res.ok) throw new Error(`SPARQL failed (${res.status})`)
      const data = await res.json()

      for (const row of data.results?.bindings ?? []) {
        const id = row.item?.value?.split('/').pop()
        if (!id) continue
        const entry = (merged[id] ??= { types: [] })
        // The label service echoes the QID back when no label exists in any listed language.
        if (row.itemLabel?.value && row.itemLabel.value !== id) entry.label = row.itemLabel.value
        const media = row.logo?.value ?? row.image?.value
        if (media && !entry.logo) entry.logo = `${media.replace(/^http:/, 'https:')}?width=120`
        const type = row.typeLabel?.value
        if (type && !entry.types.includes(type)) entry.types.push(type)
      }
    }),
  )
  return merged
}

/** The public query service throttles and intermittently returns HTML errors, so the
 * original entity API stays available as a fallback. */
async function resolveRelatedViaApi(ids: string[], signal?: AbortSignal): Promise<Record<string, RelatedInfo>> {
  const entities = await getEntitiesBatch(ids, 'labels|claims|sitelinks', signal)
  const typeIds = Array.from(new Set(ids.flatMap((id) => (entities[id] ? entityIds(entities[id], P.instanceOf) : []))))
  const typeEntities = await getEntitiesBatch(typeIds, 'labels', signal)

  const out: Record<string, RelatedInfo> = {}
  for (const id of ids) {
    const e = entities[id]
    const logoFile = e ? claimValues(e, P.logo)[0]?.name ?? claimValues(e, P.image)[0]?.name : undefined
    out[id] = {
      label: e ? displayLabel(e, id) : undefined,
      logo: logoFile ? commonsFilePath(logoFile, 120) : null,
      types: (e ? entityIds(e, P.instanceOf) : []).map((tid) => label(typeEntities[tid])).filter((v): v is string => Boolean(v)),
    }
  }
  return out
}

async function resolveRelated(ids: string[], signal?: AbortSignal): Promise<Record<string, RelatedInfo>> {
  if (ids.length === 0) return {}
  try {
    const viaSparql = await resolveRelatedViaSparql(ids, signal)
    if (Object.keys(viaSparql).length > 0) return viaSparql
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
  }
  return resolveRelatedViaApi(ids, signal)
}

function toRelatedOrgs(related: Record<string, RelatedInfo>, ids: string[]): RelatedOrg[] {
  return ids.map((id) => {
    const info = related[id] ?? { types: [] }
    const kind: OrgKind = info.types.some((t) => BRAND_TYPE.test(t)) ? 'brand' : 'company'
    return {
      id,
      label: info.label ?? id,
      logo: info.logo ?? null,
      kind,
      typeLabel: kind === 'brand' ? info.types.find((t) => BRAND_TYPE.test(t)) : info.types[0],
    }
  })
}

async function getWikipediaSummary(title: string, signal?: AbortSignal) {
  try {
    const res = await fetch(`${WP_SUMMARY}/${encodeURIComponent(title)}`, { signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getCompanyDetails(qid: string, signal?: AbortSignal): Promise<CompanyDetails> {
  const entity = await getEntity(qid, signal)

  // Kicked off now and awaited at the end so it overlaps the entity batches below
  // instead of adding its round-trip to the end of the chain.
  const enTitle = entity.sitelinks?.enwiki?.title
  const summaryPromise = enTitle ? getWikipediaSummary(enTitle, signal) : Promise.resolve(null)

  const dedupe = (ids: string[]) => Array.from(new Set(ids))

  // P749 is the real corporate parent. P127 "owned by" on a listed company is mostly
  // institutional shareholders (Toyota's is Nippon Life), so it is kept separate rather
  // than presented as a parent.
  const parentIds = dedupe(entityIds(entity, P.parentOrg))
  const shareholderIds = dedupe(entityIds(entity, P.ownedBy)).filter((id) => !parentIds.includes(id))

  // Ownership is spread across three properties and no single one is complete:
  // LVMH lists 14 under P355 but 64 under P1830 (Louis Vuitton, Hennessy, Bulgari...),
  // and Toyota's Lexus only appears under P199.
  const subsidiaryIds = dedupe([
    ...entityIds(entity, P.subsidiary),
    ...entityIds(entity, P.businessDivision),
    ...entityIds(entity, P.ownerOf),
  ]).filter((id) => id !== qid)
  const countryIds = dedupe(entityIds(entity, P.country))
  const hqIds = dedupe(entityIds(entity, P.hq))
  const industryIds = dedupe(entityIds(entity, P.industry))
  const founderIds = dedupe(entityIds(entity, P.foundedBy))
  const ceoIds = dedupe(entityIds(entity, P.ceo))
  const exchangeIds = entityIds(entity, P.stockExchange)

  // Plain name lookups stay on the cheap labels-only endpoint; the ownership graph needs
  // logos and types too, so it goes through the query service.
  const plainIds = [...countryIds, ...hqIds, ...industryIds, ...founderIds, ...ceoIds, ...exchangeIds]
  const relatedIds = [...parentIds, ...shareholderIds, ...subsidiaryIds]

  const [entities, related] = await Promise.all([
    getEntitiesBatch(plainIds, 'labels', signal),
    resolveRelated(relatedIds, signal),
  ])

  const labelsFor = (ids: string[]) => ids.map((id) => displayLabel(entities[id], id))

  const logoFile = claimValues(entity, P.logo)[0]?.name
  const imageFile = claimValues(entity, P.image)[0]?.name

  const inception = claimValues(entity, P.inception)[0]?.time as string | undefined
  const foundedYear = inception ? inception.replace(/^\+?(-?\d+).*/, '$1') : undefined

  const employees = claimValues(entity, P.employees)[0]?.amount as string | undefined

  const website = claimValues(entity, P.website)[0]

  const tickers = claimValues(entity, P.ticker).map((t, i) => ({
    exchangeLabel: labelsFor(exchangeIds)[i] ?? exchangeIds[i] ?? 'Stock exchange',
    symbol: typeof t === 'string' ? t : t?.text,
  }))

  const summary = await summaryPromise

  const subsidiaries = toRelatedOrgs(related, subsidiaryIds)

  return {
    id: qid,
    label: displayLabel(entity, qid),
    description: description(entity),
    extract: summary?.extract,
    wikipediaUrl: summary?.content_urls?.desktop?.page,
    website: typeof website === 'string' ? website : undefined,
    logo: logoFile ? commonsFilePath(logoFile, 300) : summary?.thumbnail?.source ?? null,
    image: imageFile ? commonsFilePath(imageFile, 600) : null,
    countries: labelsFor(countryIds),
    headquarters: labelsFor(hqIds),
    founded: foundedYear,
    industries: labelsFor(industryIds),
    founders: labelsFor(founderIds),
    ceo: labelsFor(ceoIds),
    numEmployees: employees,
    tickers,
    isListed: exchangeIds.length > 0 || tickers.length > 0,
    parents: toRelatedOrgs(related, parentIds),
    shareholders: toRelatedOrgs(related, shareholderIds),
    subsidiaries,
    ownedCompanies: subsidiaries.filter((s) => s.kind === 'company'),
    ownedBrands: subsidiaries.filter((s) => s.kind === 'brand'),
  }
}
