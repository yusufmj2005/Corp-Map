import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AiEnrichment from '../components/AiEnrichment'
import CompanyLogo from '../components/CompanyLogo'
import OwnershipFlowChart from '../components/OwnershipFlowChart'
import RelatedOrgList from '../components/RelatedOrgList'
import { needsEnrichment } from '../lib/enrich'
import { getCompanyDetails } from '../lib/wikidata'
import type { CompanyDetails } from '../lib/types'

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setCompany(null)
    getCompanyDetails(id, controller.signal)
      .then((details) => {
        if (!cancelled) setCompany(details)
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError') setError('Could not load this company. It may not exist on Wikidata.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-line border-t-accent" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-medium text-fg">{error ?? 'Company not found.'}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to search
        </Link>
      </div>
    )
  }

  const facts = [
    { label: 'Founded', value: company.founded },
    { label: 'Headquarters', value: company.headquarters.join(', ') || undefined },
    { label: 'Country', value: company.countries.join(', ') || undefined },
    { label: 'Industry', value: company.industries.join(', ') || undefined },
    { label: 'CEO', value: company.ceo.join(', ') || undefined },
    { label: 'Founders', value: company.founders.join(', ') || undefined },
    { label: 'Employees', value: company.numEmployees ? Number(company.numEmployees).toLocaleString() : undefined },
  ].filter((f) => f.value)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 animate-fade-in-up">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-accent">
        ← Back to search
      </Link>

      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-7 sm:flex-row sm:items-start">
        <CompanyLogo src={company.logo} name={company.label} size={80} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-fg">{company.label}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                company.isListed ? 'bg-positive-soft text-positive' : 'bg-accent-soft text-muted'
              }`}
            >
              {company.isListed ? 'Publicly listed' : 'Private / not listed'}
            </span>
          </div>
          {company.description && <p className="mt-1.5 text-muted">{company.description}</p>}

          {company.tickers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {company.tickers.map((t, i) => (
                <span key={i} className="rounded-lg bg-accent-soft px-2.5 py-1 font-mono text-xs font-semibold text-accent">
                  {t.exchangeLabel}
                  {t.symbol ? `: ${t.symbol}` : ''}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                Official website ↗
              </a>
            )}
            <button
              onClick={() => navigate(`/tools/branches?id=${company.id}`)}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition hover:opacity-90"
            >
              View branches flow chart →
            </button>
          </div>
        </div>
      </div>

      {company.extract && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-7">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-faint">Overview</h2>
          <p className="leading-relaxed text-muted">{company.extract}</p>
          {company.wikipediaUrl && (
            <a href={company.wikipediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-accent hover:underline">
              Read more on Wikipedia ↗
            </a>
          )}
        </div>
      )}

      {facts.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-5 rounded-2xl border border-line bg-surface p-7 sm:grid-cols-3 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">{f.label}</dt>
              <dd className="mt-1 text-sm font-medium text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <RelatedOrgList title="Parent company" orgs={company.parents} emptyText="No parent on record — likely independent." />
          {company.shareholders.length > 0 && (
            <div className="mt-6">
              <RelatedOrgList title="Owned by" orgs={company.shareholders} emptyText="" />
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <RelatedOrgList title="Companies owned" orgs={company.ownedCompanies} emptyText="None on record." />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <RelatedOrgList title="Brands owned" orgs={company.ownedBrands} emptyText="None on record." />
        </div>
      </div>

      {needsEnrichment(company) && <AiEnrichment company={company} />}

      {/* The chart breaks out of the container only once the viewport is wide enough to
          hold it; at lg the extra width overflowed and produced a horizontal scrollbar. */}
      {(company.parents.length > 0 || company.subsidiaries.length > 0) && (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-5 2xl:-mx-24">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">Corporate structure</h2>
            <p className="text-xs text-faint">Click any parent or subsidiary to open it</p>
          </div>
          <OwnershipFlowChart
            center={{ id: company.id, label: company.label, logo: company.logo }}
            parents={company.parents}
            shareholders={company.shareholders}
            groups={[
              { key: 'companies', title: 'Companies Owned', accent: 'neutral', items: company.ownedCompanies },
              { key: 'brands', title: 'Brands Owned', accent: 'brand', items: company.ownedBrands },
            ]}
            onSelect={(qid) => navigate(`/company/${qid}`)}
          />
        </div>
      )}
    </div>
  )
}
