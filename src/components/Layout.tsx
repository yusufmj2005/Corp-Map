import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-canvas">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            Company data from{' '}
            <a href="https://www.wikidata.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Wikidata
            </a>{' '}
            &amp;{' '}
            <a href="https://www.wikipedia.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Wikipedia
            </a>
            , under CC BY-SA.
          </p>
          <p>Independent — not affiliated with any company listed</p>
        </div>
      </footer>
    </div>
  )
}
