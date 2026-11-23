import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  Color,
  ExtrudeGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Shape,
  SphereGeometry,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COUNTS, PALETTE, TREE } from './constants'
import { staggeredProgress, useMorph } from './MorphContext'
import { makeOrnamentData, type OrnamentData } from './positions'

/**
 * Writes one shared transform to every mesh in `meshes` for each instance.
 * Weight scales the drift amplitude: gifts barely stir, lights float freely.
 */
function writeMatrices(
  data: OrnamentData,
  meshes: (InstancedMesh | null)[],
  dummy: Object3D,
  time: number,
  morph: number,
  scaleMul = 1,
) {
  const active = meshes.filter((m): m is InstancedMesh => m !== null)
  if (active.length === 0) return

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    const e = staggeredProgress(morph, item.seed)
    const phase = item.seed * 37.0

    dummy.position.lerpVectors(item.scatterPosition, item.treePosition, e)

    // Force-weighted turbulence: strong when scattered, almost still when assembled.
    const amp = item.weight * ((1 - e) * 0.56 + e * 0.016)
    dummy.position.x += Math.sin(time * 1.13 + phase) * amp
    dummy.position.y += Math.cos(time * 0.91 + phase * 0.73) * amp * 1.15
    dummy.position.z += Math.sin(time * 1.04 + phase * 1.27) * amp

    // Assembled ornaments keep a barely perceptible pendulum sway.
    dummy.position.x += Math.sin(time * 0.62 + item.treePosition.y * 1.4) * 0.014 * e

    const rot = data.rotations[i]
    dummy.rotation.set(
      rot.x + Math.sin(time * 0.41 + phase) * 0.28 * (1 - e * 0.6) + time * 0.12 * (1 - e),
      rot.y + time * (0.18 + item.weight * 0.32) * (1 - e * 0.75),
      rot.z + Math.cos(time * 0.53 + phase) * 0.22 * (1 - e * 0.5),
    )

    dummy.scale.setScalar(data.scales[i] * scaleMul * (0.88 + 0.12 * e))
    dummy.updateMatrix()
    for (const mesh of active) mesh.setMatrixAt(i, dummy.matrix)
  }

  for (const mesh of active) mesh.instanceMatrix.needsUpdate = true
}

function applyColors(data: OrnamentData, mesh: InstancedMesh | null, override?: Color) {
  if (!mesh) return
  for (let i = 0; i < data.items.length; i++) mesh.setColorAt(i, override ?? data.colors[i])
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

/* ------------------------------------------------------------------ */
/* Heavy elements — gift boxes + gilded ribbon                         */
/* ------------------------------------------------------------------ */

function makeRibbonGeometry(): BufferGeometry {
  const bandA = new BoxGeometry(0.312, 0.052, 0.312)
  const bandB = new BoxGeometry(0.052, 0.312, 0.312)
  const merged = mergeGeometries([bandA, bandB], false)
  if (!merged) return bandA
  bandA.dispose()
  bandB.dispose()
  return merged
}

function GiftInstances() {
  const giftRef = useRef<InstancedMesh>(null)
  const ribbonRef = useRef<InstancedMesh>(null)
  const { progress } = useMorph()

  const data = useMemo(() => makeOrnamentData('gift', COUNTS.gifts, 4101), [])
  const dummy = useMemo(() => new Object3D(), [])
  const box = useMemo(() => new BoxGeometry(0.3, 0.3, 0.3), [])
  const ribbon = useMemo(makeRibbonGeometry, [])
  const giftMat = useMemo(
    () => new MeshStandardMaterial({ metalness: 0.42, roughness: 0.3, envMapIntensity: 1.4 }),
    [],
  )
  const ribbonMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: PALETTE.goldBright,
        metalness: 1,
        roughness: 0.16,
        envMapIntensity: 2.4,
      }),
    [],
  )
  const gold = useMemo(() => new Color(PALETTE.goldBright), [])

  useEffect(() => {
    applyColors(data, giftRef.current)
    applyColors(data, ribbonRef.current, gold)
  }, [data, gold])

  useFrame(({ clock }) => {
    writeMatrices(data, [giftRef.current, ribbonRef.current], dummy, clock.elapsedTime, progress.current)
  })

  useEffect(
    () => () => {
      box.dispose()
      ribbon.dispose()
      giftMat.dispose()
      ribbonMat.dispose()
    },
    [box, ribbon, giftMat, ribbonMat],
  )

  return (
    <>
      <instancedMesh ref={giftRef} args={[box, giftMat, COUNTS.gifts]} castShadow renderOrder={3} />
      <instancedMesh ref={ribbonRef} args={[ribbon, ribbonMat, COUNTS.gifts]} renderOrder={4} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Medium elements — metallic baubles                                  */
/* ------------------------------------------------------------------ */

function BaubleInstances() {
  const ref = useRef<InstancedMesh>(null)
  const { progress } = useMorph()
  const data = useMemo(() => makeOrnamentData('bauble', COUNTS.baubles, 8821), [])
  const dummy = useMemo(() => new Object3D(), [])
  const sphere = useMemo(() => new SphereGeometry(0.115, 20, 16), [])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        metalness: 1,
        roughness: 0.09,
        envMapIntensity: 2.6,
      }),
    [],
  )

  useEffect(() => applyColors(data, ref.current), [data])
  useFrame(({ clock }) => {
    writeMatrices(data, [ref.current], dummy, clock.elapsedTime, progress.current)
  })
  useEffect(
    () => () => {
      sphere.dispose()
      material.dispose()
    },
    [sphere, material],
  )

  return <instancedMesh ref={ref} args={[sphere, material, COUNTS.baubles]} castShadow renderOrder={3} />
}

/* ------------------------------------------------------------------ */
/* Very light elements — incandescent pin lights                       */
/* ------------------------------------------------------------------ */

function LightInstances() {
  const ref = useRef<InstancedMesh>(null)
  const { progress } = useMorph()
  const data = useMemo(() => makeOrnamentData('light', COUNTS.lights, 1277), [])
  const dummy = useMemo(() => new Object3D(), [])
  const sphere = useMemo(() => new SphereGeometry(0.032, 8, 8), [])
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffffff',
        toneMapped: false,
      }),
    [],
  )

  useEffect(() => applyColors(data, ref.current), [data])
  useFrame(({ clock }) => {
    writeMatrices(data, [ref.current], dummy, clock.elapsedTime, progress.current)
  })
  useEffect(
    () => () => {
      sphere.dispose()
      material.dispose()
    },
    [sphere, material],
  )

  return <instancedMesh ref={ref} args={[sphere, material, COUNTS.lights]} renderOrder={5} />
}

/* ------------------------------------------------------------------ */
/* Stars — faceted gold, plus the hero star at the apex                 */
/* ------------------------------------------------------------------ */

function makeStarGeometry(): BufferGeometry {
  const shape = new Shape()
  const spikes = 5
  const outer = 0.17
  const inner = 0.072
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
    curveSegments: 2,
  })
  geometry.center()
  return geometry
}

function StarInstances() {
  const ref = useRef<InstancedMesh>(null)
  const heroRef = useRef<InstancedMesh>(null)
  const { progress } = useMorph()
  const data = useMemo(() => makeOrnamentData('star', COUNTS.stars, 3309), [])
  const dummy = useMemo(() => new Object3D(), [])
  const geometry = useMemo(makeStarGeometry, [])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: PALETTE.goldBright,
        emissive: new Color(PALETTE.gold),
        emissiveIntensity: 0.55,
        metalness: 1,
        roughness: 0.2,
        envMapIntensity: 2.4,
        toneMapped: false,
      }),
    [],
  )
  const gold = useMemo(() => new Color(PALETTE.champagne), [])

  useEffect(() => {
    applyColors(data, ref.current, gold)
    // The hero mesh holds a single instance — index 0 is repurposed as the apex star.
    if (heroRef.current) {
      heroRef.current.setColorAt(0, gold)
      if (heroRef.current.instanceColor) heroRef.current.instanceColor.needsUpdate = true
    }
  }, [data, gold])

  useFrame(({ clock }) => {
    writeMatrices(data, [ref.current], dummy, clock.elapsedTime, progress.current)
    if (heroRef.current) {
      // The hero instance rides at the apex once the tree has assembled.
      const e = staggeredProgress(progress.current, data.items[0].seed)
      const apex = TREE.footY + TREE.height + 0.22
      dummy.position.set(0, apex + Math.sin(clock.elapsedTime * 0.9) * 0.05, 0)
      dummy.rotation.set(0, clock.elapsedTime * 0.32, 0)
      dummy.scale.setScalar(0.02 + e * 1.9)
      dummy.updateMatrix()
      heroRef.current.setMatrixAt(0, dummy.matrix)
      heroRef.current.instanceMatrix.needsUpdate = true
    }
  })

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <>
      <instancedMesh ref={ref} args={[geometry, material, COUNTS.stars]} renderOrder={5} />
      <instancedMesh ref={heroRef} args={[geometry, material, 1]} renderOrder={6} />
    </>
  )
}

export function Ornaments() {
  return (
    <group>
      <GiftInstances />
      <BaubleInstances />
      <LightInstances />
      <StarInstances />
    </group>
  )
}
