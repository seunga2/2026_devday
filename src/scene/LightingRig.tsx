import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import { BufferGeometry, Group, Mesh, MeshBasicMaterial, Object3D, SpotLight } from 'three'
import { registerScene } from '../lib/capture'
import { KEY_LIGHT_TARGET, lightRigState, type LightRigState, DEFAULT_LIGHTING } from '../lib/lighting'
import { GIZMO_LAYER } from './views'

/** 키 라이트(조명 설정 반영) + 고정 보조광. 값은 렌더 루프에서 applyLightRig로 직접 갱신한다 */
export function LightingRig() {
  const { scene, gl } = useThree()
  const key = useRef<SpotLight>(null)
  const gizmo = useRef<Group>(null)
  const bulb = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null)

  useLayoutEffect(() => {
    const light = key.current!
    const target = new Object3D()
    target.position.set(...KEY_LIGHT_TARGET)
    scene.add(target)
    light.target = target
    gizmo.current?.traverse((o) => o.layers.set(GIZMO_LAYER))

    let current: LightRigState = lightRigState(DEFAULT_LIGHTING)
    const apply = (s: LightRigState) => {
      current = s
      light.position.set(...s.keyPosition)
      light.intensity = s.keyIntensity
      light.color.setRGB(...s.keyColor)
      bulb.current?.position.set(...s.keyPosition)
      bulb.current?.material.color.setRGB(...s.keyColor)
      light.updateMatrixWorld()
    }
    apply(current)
    registerScene({ scene, gl, applyLightRig: apply, currentLightRig: () => current })
    return () => {
      registerScene(null)
      scene.remove(target)
    }
  }, [scene, gl])

  return (
    <>
      <hemisphereLight args={['#dfe7ef', '#4a3b2e', 0.55]} />
      <ambientLight intensity={0.12} />
      {/* 창문에서 들어오는 은은한 빛 */}
      <directionalLight position={[2.5, 3.5, -6]} intensity={0.35} color="#d5e6f0" />
      <spotLight
        ref={key}
        angle={0.62}
        penumbra={0.65}
        decay={0}
        distance={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* 탐색 화면 전용: 키 라이트 위치 표시 */}
      <group ref={gizmo}>
        <mesh ref={bulb}>
          <sphereGeometry args={[0.12, 14, 10]} />
          <meshBasicMaterial color="#ffd27a" />
        </mesh>
      </group>
    </>
  )
}
