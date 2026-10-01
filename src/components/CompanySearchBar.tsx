import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '../lib/useDebounce'
import { searchCompanies } from '../lib/wikidata'
import type { SearchResult } from '../lib/types'

interface Props {
  placeholder?: string
  autoFocus?: boolean
  onSelect: (result: SearchResult) => void
  size?: 'lg' | 'md'
}

export default function CompanySearchBar({ placeholder, autoFocus, onSelect, size = 'lg' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounced = useDebouncedValue(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([])
      setError(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    searchCompanies(debounced, controller.signal)
      .then((r) => {
        setResults(r)
        setOpen(true)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError('Search failed. Please try again.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [debounced])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const inputClasses =
    size === 'lg'
      ? 'w-full rounded-xl border border-line bg-surface py-3.5 pl-11 pr-10 text-base text-fg shadow-sm outline-none transition placeholder:text-faint focus:border-accent'
      : 'w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-9 text-sm text-fg outline-none transition placeholder:text-faint focus:border-accent'

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <svg
          className={`pointer-events-none absolute ${size === 'lg' ? 'left-4 top-4 h-5 w-5' : 'left-3 top-3 h-4 w-4'} text-faint`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 5.5 5.5a7.5 7.5 0 0 0 11.15 11.15Z" />
        </svg>
        <input
          className={inputClasses}
          placeholder={placeholder ?? 'Search any company, listed or private…'}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <div className={`absolute ${size === 'lg' ? 'right-4 top-4' : 'right-3 top-3'}`}>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          </div>
        )}
      </div>

      {open && (results.length > 0 || error) && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {error && <div className="px-4 py-3 text-sm text-red-500">{error}</div>}
          <ul className="max-h-80 overflow-y-auto scrollbar-thin">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition hover:bg-accent-soft"
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                    setResults([])
                    onSelect(r)
                  }}
                >
                  <span className="font-medium text-fg">{r.label}</span>
                  {r.description && <span className="text-xs text-faint">{r.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
