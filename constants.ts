/**
 * Arix Signature — global art-direction constants.
 * All spatial values are in world units (1 unit ≈ 1 metre).
 */

export const TREE = {
  /** Overall cone height measured from the base of the foliage. */
  height: 6.4,
  /** Radius of the lowest foliage tier. */
  baseRadius: 2.45,
  /** Radius of the sphere the elements scatter into. */
  scatterRadius: 7.2,
  /** Foliage tier count — creates the layered "branch skirt" silhouette. */
  tiers: 9,
  /** Bottom offset so the tree sits on the pedestal. */
  footY: 0.42,
} as const

export const COUNTS = {
  foliage: 16000,
  gifts: 72,
  baubles: 180,
  lights: 340,
  stars: 30,
  dust: 700,
} as const

/** Force weight in the SCATTERED state. Higher = floats more freely. */
export const FORCE_WEIGHT = {
  gift: 0.32,
  bauble: 0.62,
  light: 1.0,
  star: 0.78,
} as const

export const PALETTE = {
  emeraldAbyss: '#03110d',
  emeraldDeep: '#063a2c',
  emerald: '#0d6b4c',
  emeraldLit: '#25a878',
  gold: '#e8b84b',
  goldBright: '#ffdf8a',
  champagne: '#fff0c2',
  crimson: '#9c1f36',
  sapphire: '#1b3f8f',
  ivory: '#fff6dd',
} as const

/** Motion damping (higher = faster morph). */
export const MORPH_LAMBDA = 2.1
