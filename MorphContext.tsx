import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { MORPH_LAMBDA } from './constants'
import { TreeMorphState } from './types'

interface MorphContextValue {
  state: TreeMorphState
  setState: (next: TreeMorphState) => void
  toggle: () => void
  /** Animated 0 → SCATTERED, 1 → TREE_SHAPE. Shared ref, no React re-render per frame. */
  progress: MutableRefObject<number>
}

const MorphContext = createContext<MorphContextValue | null>(null)

/** Per-element easing with a seed-based stagger so the tree assembles in waves. */
export function staggeredProgress(progress: number, seed: number): number {
  const x = MathUtils.clamp((progress - seed * 0.12) / 0.88, 0, 1)
  return x * x * (3 - 2 * x)
}

export function MorphProvider({ children }: { children: ReactNode }) {
  // Deep-link ?state=tree / ?state=scattered skips the cinematic entrance.
  const stateParam = new URLSearchParams(window.location.search).get('state')
  const initialState =
    stateParam === 'tree' ? TreeMorphState.TREE_SHAPE : TreeMorphState.SCATTERED

  const [state, setState] = useState<TreeMorphState>(initialState)
  const progress = useRef(initialState === TreeMorphState.TREE_SHAPE ? 1 : 0)

  useEffect(() => {
    if (stateParam !== null) return
    const id = window.setTimeout(() => setState(TreeMorphState.TREE_SHAPE), 850)
    return () => window.clearTimeout(id)
  }, [stateParam])

  const toggle = useCallback(() => {
    setState((prev) =>
      prev === TreeMorphState.SCATTERED ? TreeMorphState.TREE_SHAPE : TreeMorphState.SCATTERED,
    )
  }, [])

  const value = useMemo<MorphContextValue>(
    () => ({ state, setState, toggle, progress }),
    [state, toggle],
  )

  return <MorphContext.Provider value={value}>{children}</MorphContext.Provider>
}

export function useMorph(): MorphContextValue {
  const ctx = useContext(MorphContext)
  if (!ctx) throw new Error('useMorph must be used inside <MorphProvider>')
  return ctx
}

/** Mounted inside <Canvas> — advances the shared progress ref every frame. */
export function MorphAnimator() {
  const { state, progress } = useMorph()
  useFrame((_, delta) => {
    const target = state === TreeMorphState.TREE_SHAPE ? 1 : 0
    progress.current = MathUtils.damp(progress.current, target, MORPH_LAMBDA, Math.min(delta, 0.05))
  })
  return null
}
