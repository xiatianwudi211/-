import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, NormalBlending, ShaderMaterial } from 'three'
import { PALETTE } from './constants'
import { useMorph } from './MorphContext'
import { makeFoliageData } from './positions'
import { foliageFragmentShader, foliageVertexShader } from './shaders/foliage'

export function Foliage() {
  const { progress } = useMorph()
  const { geometry } = useMemo(() => makeFoliageData(), [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: foliageVertexShader,
        fragmentShader: foliageFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uMorph: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: 0.5 },
          uDeep: { value: new Color(PALETTE.emeraldAbyss) },
          uMid: { value: new Color(PALETTE.emeraldLit) },
          uGold: { value: new Color(PALETTE.goldBright) },
          uWarm: { value: new Color(PALETTE.champagne) },
        },
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uMorph.value = progress.current
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
}
