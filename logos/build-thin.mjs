// Draws the thin geometric monoline letters used in iterations 21-22.
// Letters are defined at cap height 100 (y=0 top, y=100 baseline).
import { writeFileSync } from 'node:fs'

const LETTERS = {
  G: { w: 100, d: 'M90.96,21.32 A50,50 0 1 0 100,50 H56' },
  R: { w: 70, d: 'M0,100 V0 H42 A26,26 0 0 1 42,52 H0 M36,52 L70,100' },
  A: { w: 84, d: 'M0,100 L42,4 L84,100' },
  Y: { w: 76, d: 'M0,0 L38,48 L76,0 M38,48 V100' },
  M: { w: 84, d: 'M0,100 V4 L42,76 L84,4 V100' },
  I: { w: 0, d: 'M0,0 V100' },
  N: { w: 72, d: 'M0,100 V4 L72,96 V0' },
}

const width = (word, cap, track) =>
  [...word].reduce((sum, ch) => sum + LETTERS[ch].w * (cap / 100), 0) + track * (word.length - 1)

// Returns <path> elements for `word` with its top-left at (x, y).
function word(text, { x, y, cap, track, stroke, color }) {
  const s = cap / 100
  let cx = x
  return [...text]
    .map((ch) => {
      const L = LETTERS[ch]
      const el = `<path transform="translate(${cx.toFixed(2)},${y}) scale(${s})" d="${L.d}" stroke-width="${(stroke / s).toFixed(2)}"/>`
      cx += L.w * s + track
      return el
    })
    .join('\n    ')
}

const BG = '#141414'
const INK = '#f4f4f4'
const RULE = '#8a909a'
const centred = (text, opts, left, span) =>
  word(text, { ...opts, x: left + (span - width(text, opts.cap, opts.track)) / 2 })

// Icon + rule / GRAY / rule / MARGIN. `icon` is drawn in a 100-tall box, `iconW` wide.
function lockup(file, iconW, icon) {
  const X = iconW + 20, W = 250, VW = X + W + 80
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 ${VW} 180">
  <rect x="-40" y="-40" width="${VW}" height="180" fill="${BG}"/>
  <g id="icon" fill="none" stroke="${INK}" stroke-linejoin="miter" stroke-miterlimit="1.6">
    ${icon}
  </g>
  <g id="wordmark" fill="none" stroke="${INK}" stroke-linejoin="miter" stroke-miterlimit="1.6">
    <rect x="${X}" y="0" width="${W}" height="2.5" fill="${RULE}" stroke="none"/>
    ${centred('GRAY', { y: 11, cap: 32, track: 30, stroke: 2.6 }, X, W)}
    <rect x="${X}" y="52" width="${W}" height="2.5" fill="${RULE}" stroke="none"/>
    ${word('MARGIN', { x: X, y: 62, cap: 38, track: (W - width('MARGIN', 38, 0)) / 5, stroke: 3.4 })}
  </g>
</svg>
`
  writeFileSync(`iterations/${file}.svg`, svg)
}

// 21 — split-Λ icon
lockup('iteration-21', 92, `<path d="M2,100 L44,3" stroke-width="5"/>
    <path d="M90,100 L52,14" stroke="${RULE}" stroke-width="5"/>`)

// 23 — GM monogram in a thin square
lockup('iteration-23', 100, `<rect x="1.5" y="1.5" width="97" height="97" stroke-width="3"/>
    ${word('GM', { x: 10.2, y: 30, cap: 40, track: 6, stroke: 3 })}`)

// 24 — thin A with a gray crossbar
lockup('iteration-24', 84, `<path d="M0,100 L42,4 L84,100" stroke-width="4"/>
    <path d="M17.5,60 H66.5" stroke="${RULE}" stroke-width="4"/>`)

// 25 — A set inside a thin circle, like a seal
lockup('iteration-25', 100, `<circle cx="50" cy="50" r="48.5" stroke-width="3"/>
    <path d="M22.5,89.3 L50,4 L77.5,89.3" stroke-width="3.4"/>
    <path d="M30.7,64 H69.3" stroke="${RULE}" stroke-width="3.4"/>`)

// 26 — thin A crossed by two gray lines, echoing the rules around GRAY
lockup('iteration-26', 84, `<path d="M0,100 L42,4 L84,100" stroke-width="4"/>
    <path d="M0,48 H84 M0,62 H84" stroke="${RULE}" stroke-width="3"/>`)

// Shared A: one tall A serves as the A of both GRAY (top row) and MARGIN (bottom row);
// the rule between the rows doubles as its crossbar. Legs use the same slope as the letter A.
function sharedA(file, { capG, capM, gap, t1, t2, sG, sM, sA }) {
  const k = 42 / 96, H = capG + gap + capM, g = capG / 100, m = capM / 100
  const half = (y) => k * (y - 2)
  // GRAY: G R [A] Y
  const gR = -half(capG) - t1 - 70 * g, gG = gR - t1 - 100 * g, gY = t1
  // MARGIN: M [A] R G I N
  const mM = -half(H) - t2 - 84 * m, mR = half(H) + t2
  const minX = Math.min(gG, mM), maxX = Math.max(gY + 76 * g, mR + (70 + 100 + 72) * m + 3 * t2)
  const ruleTop = -gap / 2 - 1.5, ruleMid = capG + gap / 2 - 1.5
  const pad = 56, vx = minX - pad, vy = ruleTop - pad, vw = maxX - minX + 2 * pad, vh = H - ruleTop + 2 * pad
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}">
  <rect x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" fill="${BG}"/>
  <g id="rules" fill="${RULE}">
    <rect x="${minX.toFixed(1)}" y="${ruleTop.toFixed(1)}" width="${(maxX - minX).toFixed(1)}" height="3"/>
    <rect x="${minX.toFixed(1)}" y="${ruleMid.toFixed(1)}" width="${(maxX - minX).toFixed(1)}" height="3"/>
  </g>
  <g id="wordmark" fill="none" stroke="${INK}" stroke-linejoin="miter" stroke-miterlimit="1.6">
    ${word('GR', { x: gG, y: 0, cap: capG, track: t1, stroke: sG })}
    ${word('Y', { x: gY, y: 0, cap: capG, track: 0, stroke: sG })}
    <path id="shared-a" d="M${(-half(H)).toFixed(2)},${H} L0,2 L${half(H).toFixed(2)},${H}" stroke-width="${sA}"/>
    ${word('M', { x: mM, y: capG + gap, cap: capM, track: 0, stroke: sM })}
    ${word('RGIN', { x: mR, y: capG + gap, cap: capM, track: t2, stroke: sM })}
  </g>
</svg>
`
  writeFileSync(`iterations/${file}.svg`, svg)
}

// 27 — big GRAY over small MARGIN (reference proportions)
sharedA('iteration-27', { capG: 80, capM: 40, gap: 30, t1: 30, t2: 16, sG: 5.6, sM: 3.4, sA: 5 })
// 28 — equal-height rows
sharedA('iteration-28', { capG: 60, capM: 60, gap: 28, t1: 22, t2: 20, sG: 4.4, sM: 4.4, sA: 4.8 })

// 22 — reference proportions: large GRAY between two rules, small tracked MARGIN below
{
  const W = 600
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -100 740 380">
  <rect x="-70" y="-100" width="740" height="380" fill="${BG}"/>
  <g id="wordmark" fill="none" stroke="${INK}" stroke-linejoin="miter" stroke-miterlimit="1.6">
    <rect x="0" y="-38" width="${W}" height="3" fill="${INK}" stroke="none"/>
    ${word('GRAY', { x: 0, y: 0, cap: 100, track: (W - width('GRAY', 100, 0)) / 3, stroke: 7 })}
    <rect x="0" y="135" width="${W}" height="3" fill="${INK}" stroke="none"/>
    ${centred('MARGIN', { y: 176, cap: 34, track: 44, stroke: 4 }, 0, W)}
  </g>
</svg>
`
  writeFileSync('iterations/iteration-22.svg', svg)
}
console.log('done')
