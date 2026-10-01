import { NavLink } from 'react-router-dom'
import { useTheme } from '../lib/theme'

const link = 'rounded-lg px-3.5 py-2 text-sm font-medium transition'

export default function Navbar() {
  const { theme, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold text-fg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M4 21V9l8-5 8 5v12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </span>
          CorpMap
        </NavLink>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-accent-soft hover:text-fg'}`
              }
            >
              Search
            </NavLink>
            <NavLink
              to="/tools"
              className={({ isActive }) =>
                `${link} ${isActive ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-accent-soft hover:text-fg'}`
              }
            >
              Tools
            </NavLink>
          </nav>

          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:bg-accent-soft hover:text-fg"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
