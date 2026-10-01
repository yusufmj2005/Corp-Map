import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import CompanyLogo from './CompanyLogo'
import { useTheme } from '../lib/theme'
import type { RelatedOrg } from '../lib/types'

interface NodeData {
  label: string
  logo?: string | null
  variant: 'center' | 'parent' | 'owned'
  accent: 'neutral' | 'brand'
  caption: string
  companyId: string
}

const NODE_W = 230
const NODE_H = 64
const COL_GAP = 270
const ROW_GAP = 82
const LABEL_OFFSET = 56
const BAND_GAP = 76
const TARGET_ASPECT = 1.7
const MIN_HEIGHT = 440
const MAX_HEIGHT = 860
/** Above roughly this many nodes per band the chart scales down past readability. */
const MAX_PER_BAND = 20

/** Edge and grid colours are SVG/canvas values, not classes, so they can't inherit the
 * theme through CSS — they're picked per theme instead. */
const CHART_COLORS = {
  light: { edge: '#c7cdda', brandEdge: '#a5b4fc', dots: '#d8dde7' },
  dark: { edge: '#39435a', brandEdge: '#4c5480', dots: '#242c3a' },
} as const

function OrgNode({ data }: NodeProps<NodeData>) {
  const isCenter = data.variant === 'center'
  const isBrand = data.accent === 'brand'

  return (
    <div
      title={isCenter ? data.label : `View ${data.label}`}
      className={`group flex w-[230px] items-center gap-3 rounded-xl border px-3 py-3 transition ${
        isCenter
          ? 'border-accent bg-accent-soft'
          : `cursor-pointer border-line bg-surface hover:-translate-y-0.5 hover:border-accent hover:shadow-md ${
              isBrand ? 'border-dashed' : ''
            }`
      }`}
    >
      {data.variant !== 'parent' && <Handle type="target" position={Position.Left} className="!border-accent !bg-accent" />}
      <CompanyLogo src={data.logo} name={data.label} size={34} rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        {/* Wrapped rather than truncated: Toyota owns a dozen "Toyota Motor Manufacturing …"
            entities that are indistinguishable once cut off at one line. */}
        <p
          className={`text-sm font-semibold leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden ${
            isCenter ? 'text-accent' : 'text-fg group-hover:text-accent'
          }`}
        >
          {data.label}
        </p>
        <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-faint">{data.caption}</p>
      </div>
      {!isCenter && (
        <span className="shrink-0 text-accent opacity-0 transition group-hover:opacity-100" aria-hidden>
          →
        </span>
      )}
      {data.variant !== 'owned' && <Handle type="source" position={Position.Right} className="!border-accent !bg-accent" />}
    </div>
  )
}

function BandLabel({ data }: NodeProps<{ title: string; count: number; accent: 'neutral' | 'brand' }>) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-accent-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
      {data.title}
      <span className="text-faint">{data.count}</span>
    </div>
  )
}

function MoreNode({ data }: NodeProps<{ count: number; accent: 'neutral' | 'brand' }>) {
  return (
    <div className="flex w-[230px] items-center justify-center rounded-xl border border-dashed border-line bg-canvas px-3 py-4 text-center text-xs text-faint">
      <Handle type="target" position={Position.Left} className="!border-accent !bg-accent" />+{data.count} more — see the list below
    </div>
  )
}

const nodeTypes = { org: OrgNode, band: BandLabel, more: MoreNode }

/** A long branch list stacked in one column makes the chart far taller than it is wide,
 * so most of it ends up off-canvas. Wrapping it into several columns keeps the chart
 * closer to the container's shape, which lets fitView show every node at once. */
function chooseColumns(count: number, maxCols: number, targetAspect = TARGET_ASPECT): number {
  let best = 1
  let bestDelta = Infinity
  for (let cols = 1; cols <= Math.min(Math.max(count, 1), maxCols); cols++) {
    const rows = Math.ceil(count / cols)
    const aspect = ((2 + cols) * COL_GAP) / (rows * ROW_GAP)
    const delta = Math.abs(aspect - targetAspect)
    if (delta < bestDelta) {
      bestDelta = delta
      best = cols
    }
  }
  return best
}

const FIT_OPTIONS = { padding: 0.12 }

/** ReactFlow's `fitView` prop races custom nodes whose size comes from CSS: if it runs
 * before they are measured the chart stays at zoom 1 and overflows. Fit once they are
 * measured, and again whenever the pane resizes, so nothing is ever cut off. */
function AutoFit({ signature }: { signature: string }) {
  const initialized = useNodesInitialized()
  const { fitView } = useReactFlow()
  const paneWidth = useStore((s) => s.width)
  const paneHeight = useStore((s) => s.height)

  useEffect(() => {
    if (!paneWidth || !paneHeight) return
    // `initialized` never flips while the tab is backgrounded, because unpainted nodes
    // report no size — so retry rather than gating the fit on it. Re-fitting is cheap
    // and idempotent.
    fitView(FIT_OPTIONS)
    const timers = [250, 800].map((delay) => setTimeout(() => fitView(FIT_OPTIONS), delay))
    return () => timers.forEach(clearTimeout)
  }, [initialized, signature, paneWidth, paneHeight, fitView])

  // A tab that was hidden during the initial render measures its nodes only once shown.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTimeout(() => fitView(FIT_OPTIONS), 100)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fitView])

  return null
}

export interface OwnedGroup {
  key: string
  title: string
  accent: 'neutral' | 'brand'
  items: RelatedOrg[]
}

interface Props {
  center: { id: string; label: string; logo?: string | null }
  parents: RelatedOrg[]
  shareholders?: RelatedOrg[]
  groups: OwnedGroup[]
  onSelect?: (id: string) => void
}

export default function OwnershipFlowChart({ center, parents, shareholders = [], groups, onSelect }: Props) {
  const { theme } = useTheme()
  const palette = CHART_COLORS[theme]

  const { nodes, edges, contentWidth, contentHeight } = useMemo(() => {
    const nodes: Node<any>[] = []
    const edges: Edge[] = []

    // A shareholder is not a parent, so it is captioned as what it is.
    const upstream = [
      ...parents.map((org) => ({ org, caption: org.kind === 'brand' ? 'Parent brand' : 'Parent company' })),
      // "Owned by" rather than "Shareholder": the same property covers Toyota's insurer
      // holding a few percent and Christian Dior controlling LVMH outright.
      ...shareholders.map((org) => ({ org, caption: 'Owned by' })),
    ]

    const bands = groups.filter((g) => g.items.length > 0)
    const parentCols = chooseColumns(upstream.length, 3)
    const parentRows = Math.max(Math.ceil(upstream.length / parentCols), 1)
    const centerX = parentCols * COL_GAP

    // Bands stack vertically, so each one should sit wider and shorter than it would alone.
    const bandAspect = TARGET_ASPECT * Math.max(bands.length, 1)
    const layouts = bands.map((band) => {
      // Google owns 171 entities; drawing them all shrinks the chart to ~3px text and is
      // unreadable. The chart shows the first slice, the band label keeps the true count,
      // and a trailing "+N more" node points at the complete list below.
      const shown = band.items.slice(0, MAX_PER_BAND)
      const hidden = band.items.length - shown.length
      const cells = shown.length + (hidden > 0 ? 1 : 0)
      const cols = chooseColumns(cells, 5, bandAspect)
      const rows = Math.max(Math.ceil(cells / cols), 1)
      return { band, shown, hidden, cells, cols, rows, span: LABEL_OFFSET + (rows - 1) * ROW_GAP }
    })

    const leftSpan = (parentRows - 1) * ROW_GAP
    const rightSpan = layouts.reduce((sum, l, i) => sum + l.span + (i > 0 ? BAND_GAP : 0), 0)
    const contentSpan = Math.max(leftSpan, rightSpan, 0)

    nodes.push({
      id: center.id,
      type: 'org',
      position: { x: centerX, y: contentSpan / 2 },
      data: { label: center.label, logo: center.logo, variant: 'center', accent: 'neutral', caption: 'Searched company', companyId: center.id },
      draggable: false,
    })

    upstream.forEach(({ org, caption }, i) => {
      const col = Math.floor(i / parentRows)
      const row = i % parentRows
      const rowsInCol = Math.min(parentRows, upstream.length - col * parentRows)
      nodes.push({
        id: `parent-${org.id}`,
        type: 'org',
        position: {
          x: centerX - (col + 1) * COL_GAP,
          y: (contentSpan - (rowsInCol - 1) * ROW_GAP) / 2 + row * ROW_GAP,
        },
        data: {
          label: org.label,
          logo: org.logo,
          variant: 'parent',
          accent: 'neutral',
          caption,
          companyId: org.id,
        },
        draggable: false,
      })
      edges.push({
        id: `e-parent-${org.id}`,
        source: `parent-${org.id}`,
        target: center.id,
        style: { stroke: palette.edge, strokeWidth: 1.5 },
      })
    })

    let cursor = (contentSpan - rightSpan) / 2
    for (const { band, shown, hidden, rows, span } of layouts) {
      nodes.push({
        id: `band-${band.key}`,
        type: 'band',
        position: { x: centerX + COL_GAP, y: cursor - 6 },
        data: { title: band.title, count: band.items.length, accent: band.accent },
        draggable: false,
        selectable: false,
      })

      shown.forEach((item, i) => {
        const col = Math.floor(i / rows)
        const row = i % rows
        nodes.push({
          id: `owned-${band.key}-${item.id}`,
          type: 'org',
          position: { x: centerX + (col + 1) * COL_GAP, y: cursor + LABEL_OFFSET + row * ROW_GAP },
          data: {
            label: item.label,
            logo: item.logo,
            variant: 'owned',
            accent: band.accent,
            caption: item.typeLabel ?? (item.kind === 'brand' ? 'Brand' : 'Company'),
            companyId: item.id,
          },
          draggable: false,
        })
        edges.push({
          id: `e-owned-${band.key}-${item.id}`,
          source: center.id,
          target: `owned-${band.key}-${item.id}`,
          style: { stroke: band.accent === 'brand' ? palette.brandEdge : palette.edge, strokeWidth: 1.5 },
        })
      })

      if (hidden > 0) {
        const i = shown.length
        nodes.push({
          id: `more-${band.key}`,
          type: 'more',
          position: { x: centerX + (Math.floor(i / rows) + 1) * COL_GAP, y: cursor + LABEL_OFFSET + (i % rows) * ROW_GAP },
          data: { count: hidden, accent: band.accent },
          draggable: false,
          selectable: false,
        })
      }

      cursor += span + BAND_GAP
    }

    const widestBandCols = layouts.reduce((max, l) => Math.max(max, l.cols), 0)
    const contentWidth = (parentCols + 1 + widestBandCols) * COL_GAP + NODE_W
    const contentHeight = contentSpan + NODE_H

    return { nodes, edges, contentWidth, contentHeight }
  }, [center, parents, shareholders, groups, palette])

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [availableWidth, setAvailableWidth] = useState(0)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    setAvailableWidth(el.clientWidth)
    const observer = new ResizeObserver((entries) => {
      setAvailableWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Handled here rather than inside the node: React Flow only enables pointer events on
  // node wrappers when it sees an onNodeClick (or nodes are draggable/selectable).
  const handleNodeClick = useCallback(
    (_: MouseEvent | React.MouseEvent, node: Node<NodeData>) => {
      if (node.type !== 'org' || node.data.variant === 'center') return
      onSelect?.(node.data.companyId)
    },
    [onSelect],
  )

  // A wide, short chart shrinks to fit the container's width, so sizing the box from the
  // raw content height would leave a large empty band beneath it. Scale the height by the
  // same factor fitView will apply.
  const scale = availableWidth ? Math.min(1, (availableWidth * (1 - FIT_OPTIONS.padding * 2)) / contentWidth) : 1
  const height = Math.min(Math.max(contentHeight * scale + 96, MIN_HEIGHT), MAX_HEIGHT)

  return (
    <div ref={wrapperRef} style={{ height }} className="w-full overflow-hidden rounded-xl border border-line bg-canvas">
      <ReactFlow
        key={center.id}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={FIT_OPTIONS}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
      >
        <AutoFit signature={`${center.id}:${nodes.length}`} />
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={palette.dots} />
        <Controls showInteractive={false} className="!shadow-sm" />
      </ReactFlow>
    </div>
  )
}
