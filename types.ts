import type { Vector3 } from 'three'

/** The two macro states of the installation. */
export enum TreeMorphState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

/** A point that owns both of its possible resting places. */
export interface DualPosition {
  scatterPosition: Vector3
  treePosition: Vector3
  /** Stable pseudo-random seed in [0,1) — drives stagger + drift phase. */
  seed: number
  /** Per-instance force weight — scales the floating amplitude. */
  weight: number
}

export type OrnamentKind = 'gift' | 'bauble' | 'light' | 'star'
