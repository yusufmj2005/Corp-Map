import { Link } from 'react-router-dom'
import CompanyLogo from './CompanyLogo'
import type { RelatedOrg } from '../lib/types'

export default function RelatedOrgList({ title, orgs, emptyText }: { title: string; orgs: RelatedOrg[]; emptyText: string }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-faint">{title}</h3>
        {orgs.length > 0 && <span className="text-xs text-faint">{orgs.length}</span>}
      </div>

      {orgs.length === 0 ? (
        emptyText ? (
          <p className="text-sm text-faint">{emptyText}</p>
        ) : null
      ) : (
        <ul className="flex flex-col gap-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                to={`/company/${org.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-accent hover:bg-accent-soft"
              >
                <CompanyLogo src={org.logo} name={org.label} size={36} rounded="rounded-lg" />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{org.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
