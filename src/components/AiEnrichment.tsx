import { useEffect, useState } from 'react'
import CompanyLogo from './CompanyLogo'
import { enrichCompany, type Enrichment } from '../lib/enrich'
import type { CompanyDetails } from '../lib/types'

const CONFIDENCE_STYLES = {
  high: 'text-positive',
  medium: 'text-accent',
  low: 'text-faint',
} as const

export default function AiEnrichment({ company }: { company: CompanyDetails }) {
  const [data, setData] = useState<Enrichment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setData(null)
    enrichCompany(company, controller.signal)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [company.id])

  if (loading) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
        No ownership data on record — asking AI to research {company.label}…
      </div>
    )
  }

  if (error) {
    return <div className="mt-5 rounded-2xl border border-dashed border-line p-6 text-sm text-faint">AI lookup unavailable: {error}</div>
  }

  if (!data || !data.found || data.owned.length === 0) {
    return null
  }

  const companies = data.owned.filter((e) => e.kind === 'company')
  const brands = data.owned.filter((e) => e.kind === 'brand')

  return (
    <div className="mt-5 rounded-2xl border border-dashed border-line bg-surface p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-fg">AI research</span>
        <span className={`rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold ${CONFIDENCE_STYLES[data.confidence]}`}>
          {data.confidence} confidence
        </span>
        <span className="text-xs text-faint">Not in Wikidata — unverified, please double-check</span>
      </div>

      {data.summary && <p className="mt-3 text-sm text-muted">{data.summary}</p>}
      {data.parent && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-fg">Parent:</span> {data.parent}
        </p>
      )}

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <AiList title="Companies owned" entities={companies} />
        <AiList title="Brands owned" entities={brands} />
      </div>
    </div>
  )
}

function AiList({ title, entities }: { title: string; entities: { name: string; note: string }[] }) {
  if (entities.length === 0) return null
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">{title}</h3>
      <ul className="flex flex-col gap-2">
        {entities.map((e) => (
          <li key={e.name} className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
            <CompanyLogo src={null} name={e.name} size={34} rounded="rounded-lg" />
            <div className="min-w-0">
              <p className="font-medium text-fg">{e.name}</p>
              <p className="truncate text-xs text-faint">{e.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
