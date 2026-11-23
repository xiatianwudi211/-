import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { AdditiveBlending, DoubleSide, Points, ShaderMaterial, type BufferGeometry } from 'three'
import { PALETTE, TREE } from './constants'
import { Foliage } from './Foliage'
import { MorphAnimator } from './MorphContext'
import { Ornaments } from './Ornaments'
import { makeDustGeometry } from './positions'

/** A gilded studio built from light cards — no external HDR asset required. */
function GoldenEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#050f0c']} />
      <Lightformer form="rect" intensity={4.2} color="#ffe6a8" position={[0, 6, -7]} scale={[10, 7, 1]} />
      <Lightformer form="rect" intensity={2.6} color="#e8b84b" position={[-7, 2, 2]} scale={[5, 8, 1]} rotation-y={Math.PI / 2} />
      <Lightformer form="rect" intensity={2.2} color="#fff5d8" position={[7, 3, 1]} scale={[5, 8, 1]} rotation-y={-Math.PI / 2} />
      <Lightformer form="ring" intensity={2.8} color="#8ff0c4" position={[0, -1, -6]} scale={4} />
      <Lightformer form="circle" intensity={1.6} color="#ffffff" position={[0, 8, 3]} scale={3} rotation-x={Math.PI / 2} />
    </Environment>
  )
}

function StageLights() {
  return (
    <>
      <ambientLight intensity={0.32} color="#2b6d54" />
      <hemisphereLight intensity={0.45} color="#ffe6a8" groundColor="#041a12" />
      <spotLight
        position={[0, 11, 5]}
        angle={0.72}
        penumbra={0.95}
        intensity={230}
        distance={28}
        decay={2}
        color="#ffe3a3"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-4.5, 2.2, 3.5]} intensity={42} distance={13} decay={2} color="#39c98e" />
      <pointLight position={[4.2, 3.6, -3.2]} intensity={58} distance={14} decay={2} color="#ffc76a" />
      <directionalLight position={[0, 4, 9]} intensity={0.9} color="#fff2d2" />
    </>
  )
}

function Pedestal() {
  const gold = PALETTE.goldBright
  return (
    <group>
      {/* Trunk */}
      <mesh position={[0, TREE.footY + 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.23, 0.86, 20]} />
        <meshStandardMaterial color="#3b2c1c" metalness={0.25} roughness={0.78} />
      </mesh>

      {/* Emerald lacquer drum */}
      <mesh position={[0, TREE.footY - 0.16, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.62, 2.86, 0.32, 96]} />
        <meshStandardMaterial color="#07271d" metalness={0.86} roughness={0.26} envMapIntensity={1.7} />
      </mesh>

      {/* Gilded rims */}
      {[0.005, -0.315].map((offset, i) => (
        <mesh key={i} position={[0, TREE.footY + offset, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[i === 0 ? 2.63 : 2.86, 0.032, 12, 128]} />
          <meshStandardMaterial
            color={gold}
            metalness={1}
            roughness={0.14}
            emissive={gold}
            emissiveIntensity={0.22}
            envMapIntensity={2.4}
          />
        </mesh>
      ))}

      {/* Ground */}
      <mesh position={[0, TREE.footY - 0.34, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[26, 96]} />
        <meshStandardMaterial color="#030b09" metalness={0.55} roughness={0.62} envMapIntensity={0.4} />
      </mesh>
    </group>
  )
}

const dustVertex = /* glsl */ `
  attribute float aScale;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.35 + aScale * 20.0) * 0.18;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((1.2 + aScale * 2.6) * uPixelRatio * (34.0 / max(0.001, -mv.z)), 1.0, 6.0);
    vAlpha = 0.16 + aScale * 0.36;
  }
`

const dustFragment = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha;
    gl_FragColor = vec4(1.0, 0.86, 0.58, a);
  }
`

function AmbientDust() {
  const ref = useRef<Points>(null)
  const geometry = useMemo(() => makeDustGeometry(), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  )

  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012
  })

  return <points ref={ref} geometry={geometry as BufferGeometry} material={material} frustumCulled={false} />
}

export function TreeScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.5, 12.6], fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#040b09']} />
      <fog attach="fog" args={['#040b09', 17, 34]} />

      <MorphAnimator />

      <Suspense fallback={null}>
        <GoldenEnvironment />
        <StageLights />
        <Pedestal />
        <AmbientDust />
        <Foliage />
        <Ornaments />
      </Suspense>

      <OrbitControls
        makeDefault
        target={[0, 2.85, 0]}
        enablePan={false}
        minDistance={7}
        maxDistance={19}
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI / 2.08}
        autoRotate
        autoRotateSpeed={0.32}
        dampingFactor={0.06}
        enableDamping
      />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          intensity={0.78}
          luminanceThreshold={0.88}
          luminanceSmoothing={0.18}
          radius={0.62}
        />
        <Vignette offset={0.26} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
