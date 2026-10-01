import { useNavigate } from 'react-router-dom'
import CompanySearchBar from '../components/CompanySearchBar'
import type { SearchResult } from '../lib/types'

const TRENDING = [
  { id: 'Q312', label: 'Apple Inc.' },
  { id: 'Q504998', label: 'LVMH' },
  { id: 'Q53268', label: 'Toyota' },
  { id: 'Q20718', label: 'Samsung Electronics' },
  { id: 'Q122891465', label: 'Doms' },
  { id: 'Q95', label: 'Google' },
]

const FEATURES = [
  { icon: '🔍', title: 'Search anything', body: 'Public giants and private firms alike, in any market worldwide.' },
  { icon: '🏢', title: 'Ownership, mapped', body: "See a company's parent, its subsidiaries and the brands beneath it." },
  { icon: '🔗', title: 'Visual flow charts', body: 'Draw a horizontal chart of parent → company → everything it owns.' },
]

export default function HomePage() {
  const navigate = useNavigate()

  function onSelect(result: SearchResult) {
    navigate(`/company/${result.id}`)
  }

  return (
    <div>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-accent">
          Global company intelligence
        </span>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Explore any company&rsquo;s <span className="text-accent">corporate structure</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Search listed and privately held companies worldwide. See who owns them, what they own, and how it all connects.
        </p>

        <div className="mt-10">
          <CompanySearchBar autoFocus onSelect={onSelect} />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-faint">Trending:</span>
          {TRENDING.map((company) => (
            <button
              key={company.id}
              onClick={() => navigate(`/company/${company.id}`)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-accent"
            >
              {company.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-line bg-surface p-6">
              <div className="mb-3 text-2xl">{feature.icon}</div>
              <h3 className="mb-1 font-semibold text-fg">{feature.title}</h3>
              <p className="text-sm text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
