import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { COUNTS, FORCE_WEIGHT, PALETTE, TREE } from './constants'
import type { DualPosition, OrnamentKind } from './types'

/** Deterministic PRNG so every reload builds the exact same installation. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform distribution inside a sphere shell around the origin. */
export function randomInSphere(rng: () => number, radius: number, inner = 0.18): Vector3 {
  const theta = rng() * Math.PI * 2
  const phi = Math.acos(2 * rng() - 1)
  const r = radius * (inner + (1 - inner) * Math.cbrt(rng()))
  return new Vector3(
    Math.sin(phi) * Math.cos(theta) * r,
    Math.cos(phi) * r * 0.82 + TREE.footY + TREE.height * 0.35,
    Math.sin(phi) * Math.sin(theta) * r,
  )
}

/** Radius of the cone envelope at a normalised height t ∈ [0,1]. */
export function coneRadiusAt(t: number): number {
  const envelope = Math.pow(Math.max(0, 1 - t), 0.82)
  // Layered "skirt" modulation — the silhouette reads as tiers, not a smooth cone.
  const tierWave = 0.5 + 0.5 * Math.cos(t * Math.PI * 2 * TREE.tiers)
  return TREE.baseRadius * envelope * (1 + tierWave * 0.12)
}

/**
 * A single pre-computed point on the tree cone with volumetric thickness.
 * Returns the position plus its normalised radial factor (0 = core, 1 = tip).
 */
function conePoint(rng: () => number, radialBias = 0.55): { position: Vector3; radial: number; t: number } {
  // Bias toward the base for a fuller, more opulent lower silhouette.
  const t = Math.pow(rng(), 0.72)
  const y = TREE.footY + t * TREE.height
  const maxR = coneRadiusAt(t)
  const radial = radialBias + (1 - radialBias) * Math.cbrt(rng())
  const r = maxR * radial
  const theta = rng() * Math.PI * 2
  // Outer branch tips droop slightly, like real evergreen boughs.
  const droop = -0.14 * radial * (0.4 + 0.6 * rng())
  return {
    position: new Vector3(Math.cos(theta) * r, y + droop, Math.sin(theta) * r),
    radial,
    t,
  }
}

export interface FoliageData {
  geometry: BufferGeometry
  /** Per-particle float seed used by the shader for stagger + breathing phase. */
  seeds: Float32Array
}

/**
 * Builds the foliage point cloud. Every vertex carries BOTH positions —
 * this is the dual-position system consumed by the vertex shader.
 */
export function makeFoliageData(count = COUNTS.foliage, seed = 20261225): FoliageData {
  const rng = createRng(seed)
  const scatter = new Float32Array(count * 3)
  const tree = new Float32Array(count * 3)
  const position = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const sizes = new Float32Array(count)
  const colorMix = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const s = randomInSphere(rng, TREE.scatterRadius)
    const { position: p, radial } = conePoint(rng, 0.48)

    scatter.set([s.x, s.y, s.z], i * 3)
    tree.set([p.x, p.y, p.z], i * 3)
    position.set([p.x, p.y, p.z], i * 3)

    const r = rng()
    seeds[i] = r
    // Mostly fine needles, occasional larger glints that catch the bloom.
    sizes[i] = 0.55 + Math.pow(rng(), 3) * 1.5 + radial * 0.25
    // Tips and a random minority glow gold / warm white.
    colorMix[i] = Math.min(1, Math.pow(radial, 2.8) * 0.62 + (rng() > 0.96 ? 0.4 : 0) + rng() * 0.05)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aScatter', new BufferAttribute(scatter, 3))
  geometry.setAttribute('aTree', new BufferAttribute(tree, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aColorMix', new BufferAttribute(colorMix, 1))
  geometry.boundingSphere = null

  return { geometry, seeds }
}

export interface OrnamentData {
  items: DualPosition[]
  colors: Color[]
  /** Stable per-instance yaw/pitch/roll used to make the pose feel hand-placed. */
  rotations: Vector3[]
  scales: number[]
}

const KIND_TINT: Record<OrnamentKind, string[]> = {
  gift: [PALETTE.crimson, PALETTE.sapphire, PALETTE.emeraldDeep, PALETTE.gold, '#7a1f5c'],
  bauble: [PALETTE.gold, PALETTE.champagne, PALETTE.emeraldLit, '#b3243f', '#c9a227'],
  light: [PALETTE.champagne, PALETTE.goldBright, '#ffd9a0', '#fff9e8'],
  star: [PALETTE.goldBright, PALETTE.champagne, PALETTE.gold],
}

/** Height ranges for each ornament class — gifts stay low, stars stay high. */
const KIND_HEIGHT: Record<OrnamentKind, [number, number]> = {
  gift: [0.0, 0.34],
  bauble: [0.1, 0.86],
  light: [0.04, 0.98],
  star: [0.62, 1.06],
}

export function makeOrnamentData(kind: OrnamentKind, count: number, seed: number): OrnamentData {
  const rng = createRng(seed)
  const items: DualPosition[] = []
  const colors: Color[] = []
  const rotations: Vector3[] = []
  const scales: number[] = []

  const [tMin, tMax] = KIND_HEIGHT[kind]
  const tints = KIND_TINT[kind]
  const weight = FORCE_WEIGHT[kind]

  for (let i = 0; i < count; i++) {
    const t = tMin + (tMax - tMin) * Math.pow(rng(), 0.9)
    const y = TREE.footY + t * TREE.height
    const maxR = coneRadiusAt(Math.min(1, Math.max(0, t)))
    const radial = kind === 'gift' ? 0.82 + rng() * 0.3 : 0.9 + rng() * 0.22
    const theta = rng() * Math.PI * 2
    const r = maxR * radial

    const treePosition = new Vector3(
      Math.cos(theta) * r,
      y + (kind === 'gift' ? 0.16 : -0.05 * radial),
      Math.sin(theta) * r,
    )

    items.push({
      scatterPosition: randomInSphere(rng, TREE.scatterRadius * (kind === 'gift' ? 0.88 : 1.05)),
      treePosition,
      seed: rng(),
      weight,
    })

    colors.push(new Color(tints[Math.floor(rng() * tints.length)]))
    rotations.push(new Vector3(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI))
    // A hero star is scaled up; the rest stay petite.
    scales.push(kind === 'star' && i === 0 ? 2.35 : 0.78 + rng() * 0.55)
  }

  return { items, colors, rotations, scales }
}

/** Slow ambient dust that lives behind the installation for depth. */
export function makeDustGeometry(count = COUNTS.dust, seed = 7717): BufferGeometry {
  const rng = createRng(seed)
  const positions = new Float32Array(count * 3)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const p = randomInSphere(rng, 15, 0.05)
    positions.set([p.x, p.y, p.z], i * 3)
    scales[i] = rng()
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aScale', new BufferAttribute(scales, 1))
  return geometry
}
