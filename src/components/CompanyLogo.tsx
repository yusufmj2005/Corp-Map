import { useState } from 'react'

interface Props {
  src?: string | null
  name: string
  size?: number
  rounded?: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function CompanyLogo({ src, name, size = 56, rounded = 'rounded-2xl' }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center ${rounded} bg-accent-soft font-semibold text-accent`}
        style={{ width: size, height: size, fontSize: size / 2.6 }}
      >
        {initials(name) || '?'}
      </div>
    )
  }

  // White-on-white wordmarks are common, so logos always sit on a white tile.
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${rounded} border border-line bg-white`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={name} className="h-full w-full object-contain p-0.5" onError={() => setFailed(true)} />
    </div>
  )
}
