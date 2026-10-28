import { useLayoutEffect, useRef } from 'react'
import { BufferGeometry, Float32BufferAttribute, Group, LineSegments } from 'three'
import { GIZMO_LAYER, shotCamera } from './views'

/** 단위 절두체(깊이 1, 반높이 1, 반너비 1) → scale로 FOV·비율 반영 */
function unitFrustum() {
  const c = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
  ]
  const pts: number[] = []
  for (const p of c) pts.push(0, 0, 0, ...p)
  for (let i = 0; i < 4; i++) pts.push(...c[i], ...c[(i + 1) % 4])
  // 화면 위쪽 표시 삼각형
  pts.push(-0.3, 1.05, -1, 0, 1.35, -1, 0, 1.35, -1, 0.3, 1.05, -1)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pts, 3))
  return g
}

const FRUSTUM_DEPTH = 1.1

/**
 * 탐색 화면에 표시되는 촬영 카메라 오브젝트 + 화각 절두체.
 * 매 프레임 shotCamera를 따라가도록 Viewports 렌더 루프에서 sync()를 호출한다.
 */
export function CameraGizmo({ gizmoRef }: { gizmoRef: React.RefObject<{ sync: () => void } | null> }) {
  const group = useRef<Group>(null)
  const frustum = useRef<LineSegments>(null)

  useLayoutEffect(() => {
    const g = group.current!
    g.traverse((o) => o.layers.set(GIZMO_LAYER))
    const geom = unitFrustum()
    frustum.current!.geometry = geom
    gizmoRef.current = {
      sync: () => {
        g.position.copy(shotCamera.position)
        g.quaternion.copy(shotCamera.quaternion)
        const h = Math.tan((shotCamera.fov * Math.PI) / 360) * FRUSTUM_DEPTH
        frustum.current!.scale.set(h * shotCamera.aspect, h, FRUSTUM_DEPTH)
      },
    }
    return () => {
      geom.dispose()
      gizmoRef.current = null
    }
  }, [gizmoRef])

  return (
    <group ref={group}>
      {/* 카메라 바디 (렌즈는 -z 방향) */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.22, 0.2, 0.32]} />
        <meshStandardMaterial color="#2fd3b4" roughness={0.5} emissive="#0d5a4c" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.1, 14]} />
        <meshStandardMaterial color="#14211f" />
      </mesh>
      <lineSegments ref={frustum}>
        <lineBasicMaterial color="#ffb547" transparent opacity={0.9} />
      </lineSegments>
    </group>
  )
}
