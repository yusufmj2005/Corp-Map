import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-32 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="mt-4 text-2xl font-bold text-fg">Page not found</h1>
      <p className="mt-2 text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
      <Link to="/" className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90">
        Back to search
      </Link>
    </div>
  )
}
