import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CompanySearchBar from '../components/CompanySearchBar'
import CompanyLogo from '../components/CompanyLogo'
import OwnershipFlowChart, { type OwnedGroup } from '../components/OwnershipFlowChart'
import RelatedOrgList from '../components/RelatedOrgList'
import { getCompanyDetails } from '../lib/wikidata'
import type { CompanyDetails, SearchResult } from '../lib/types'

type View = 'companies' | 'brands'

const VIEWS: Record<View, { label: string; blurb: string; icon: string }> = {
  companies: {
    label: 'Companies',
    blurb: 'Map the subsidiary companies and business entities a company owns.',
    icon: '🏢',
  },
  brands: {
    label: 'Brands',
    blurb: 'Map the brands, labels and trademarks that sit under a company.',
    icon: '🏷️',
  },
}

export default function BranchesToolPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const viewParam = params.get('view')
  const view: View | null = viewParam === 'companies' || viewParam === 'brands' ? viewParam : null

  const [company, setCompany] = useState<CompanyDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setCompany(null)
      return
    }
    let cancelled = false
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getCompanyDetails(id, controller.signal)
      .then((details) => {
        if (!cancelled) setCompany(details)
      })
      .catch((err) => {
        if (!cancelled && err.name !== 'AbortError') setError('Could not load this company.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [id])

  function onSelect(result: SearchResult) {
    const next = new URLSearchParams(params)
    next.set('id', result.id)
    setParams(next)
  }

  function setView(next: View) {
    const updated = new URLSearchParams(params)
    updated.set('view', next)
    setParams(updated)
  }

  // Step 1 — ask which kind of branches to map.
  if (!view) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link to="/tools" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-accent">
          ← Back to tools
        </Link>
        <h1 className="text-2xl font-bold text-fg">Branches</h1>
        <p className="mt-1 text-muted">What would you like to map?</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {(Object.keys(VIEWS) as View[]).map((key) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-7 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-2xl">
                {VIEWS[key].icon}
              </span>
              <span className="text-lg font-semibold text-fg group-hover:text-accent">{VIEWS[key].label}</span>
              <span className="mt-2 text-sm text-muted">{VIEWS[key].blurb}</span>
              <span className="mt-4 text-sm font-medium text-accent">Choose →</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const owned = company ? (view === 'brands' ? company.ownedBrands : company.ownedCompanies) : []
  const groups: OwnedGroup[] = [
    {
      key: view,
      title: view === 'brands' ? 'Brands Owned' : 'Companies Owned',
      accent: view === 'brands' ? 'brand' : 'neutral',
      items: owned,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/tools" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-accent">
        ← Back to tools
      </Link>

      <h1 className="text-2xl font-bold text-fg">Branches</h1>
      <p className="mt-1 text-muted">
        Showing the <span className="font-medium text-fg">{VIEWS[view].label.toLowerCase()}</span> a company owns, as a horizontal flow
        chart.
      </p>

      <div className="mt-5 inline-flex rounded-full border border-line bg-surface p-1">
        {(Object.keys(VIEWS) as View[]).map((key) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              view === key ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {VIEWS[key].icon} {VIEWS[key].label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-xl">
        <CompanySearchBar size="md" placeholder="Search a company to map its branches…" onSelect={onSelect} />
      </div>

      {loading && (
        <div className="mt-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-accent" />
        </div>
      )}

      {error && <p className="mt-8 text-center text-red-500">{error}</p>}

      {!id && !loading && (
        <div className="mt-16 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-16 text-center text-faint">
          <span className="text-3xl">🌳</span>
          <p>Search for a company above to draw its branches chart.</p>
        </div>
      )}

      {company && !loading && (
        <div className="mt-8 animate-fade-in-up">
          <div className="mb-4 flex items-center gap-3">
            <CompanyLogo src={company.logo} name={company.label} size={44} rounded="rounded-xl" />
            <div>
              <p className="font-semibold text-fg">{company.label}</p>
              <Link to={`/company/${company.id}`} className="text-xs text-accent hover:underline">
                View full profile →
              </Link>
            </div>
          </div>

          {owned.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line py-16 text-center text-faint">
              <p>
                No {VIEWS[view].label.toLowerCase()} on record for {company.label}.
              </p>
              <button onClick={() => setView(view === 'brands' ? 'companies' : 'brands')} className="mt-2 text-sm text-accent hover:underline">
                Try {view === 'brands' ? 'companies' : 'brands'} instead →
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5 2xl:-mx-24">
              <OwnershipFlowChart
                center={{ id: company.id, label: company.label, logo: company.logo }}
                parents={company.parents}
                shareholders={company.shareholders}
                groups={groups}
                onSelect={(qid) => {
                  const next = new URLSearchParams(params)
                  next.set('id', qid)
                  setParams(next)
                }}
              />
            </div>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <RelatedOrgList title="Parent company" orgs={company.parents} emptyText="No parent company on record." />
            </div>
            <div className="rounded-2xl border border-line bg-surface p-6">
              <RelatedOrgList
                title={view === 'brands' ? 'Brands owned' : 'Companies owned'}
                orgs={owned}
                emptyText={`No ${VIEWS[view].label.toLowerCase()} on record.`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
