import { Link } from 'react-router-dom'

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-fg">Tools</h1>
        <p className="mt-2 text-muted">Extra utilities for digging into corporate structures.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Link
          to="/tools/branches"
          className="group flex flex-col rounded-2xl border border-line bg-surface p-7 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-2xl">🌳</div>
          <h2 className="text-lg font-semibold text-fg group-hover:text-accent">Branches</h2>
          <p className="mt-2 text-sm text-muted">
            Map what a company owns as a horizontal flow chart — choose the companies it owns or the brands beneath it.
          </p>
          <span className="mt-4 text-sm font-medium text-accent">Open tool →</span>
        </Link>

        <div className="flex flex-col rounded-2xl border border-dashed border-line p-7 text-faint">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-2xl">✨</div>
          <h2 className="text-lg font-semibold">More tools coming soon</h2>
          <p className="mt-2 text-sm">Company comparisons and ownership timelines are on the roadmap.</p>
        </div>
      </div>
    </div>
  )
}
