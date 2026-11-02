import { useLayoutEffect, useRef } from 'react'
import { BufferGeometry, Float32BufferAttribute, Group, LineSegments, Mesh, Vector3 } from 'three'
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
const LEG_SPREAD = 0.42
const UP = new Vector3(0, 1, 0)
const _foot = new Vector3()
const _apex = new Vector3()
const _dir = new Vector3()

/** 3D 화면에서 끌어 옮길 수 있는 대상 표시 */
export const CAMERA_DRAG = { kind: 'camera' as const }

/**
 * 탐색 화면 전용(레이어 1) 촬영 카메라 + 삼각대 + 화각 절두체.
 * 매 프레임 shotCamera를 따라가도록 Viewports 렌더 루프에서 sync()를 호출한다.
 * 삼각대를 끌면 DragControls가 카메라 위치(거리·각도)를 바꾼다.
 */
export function CameraGizmo({ gizmoRef }: { gizmoRef: React.RefObject<{ sync: () => void } | null> }) {
  const root = useRef<Group>(null)
  const head = useRef<Group>(null)
  const tripod = useRef<Group>(null)
  const frustum = useRef<LineSegments>(null)
  const legs = useRef<(Mesh | null)[]>([])
  const column = useRef<Mesh>(null)
  const hit = useRef<Mesh>(null)

  useLayoutEffect(() => {
    root.current!.traverse((o) => o.layers.set(GIZMO_LAYER))
    const geom = unitFrustum()
    frustum.current!.geometry = geom
    gizmoRef.current = {
      sync: () => {
        const p = shotCamera.position
        head.current!.position.copy(p)
        head.current!.quaternion.copy(shotCamera.quaternion)
        const h = Math.tan((shotCamera.fov * Math.PI) / 360) * FRUSTUM_DEPTH
        frustum.current!.scale.set(h * shotCamera.aspect, h, FRUSTUM_DEPTH)

        // 삼각대: 바닥 세 점 → 꼭짓점, 꼭짓점 → 카메라까지 기둥
        tripod.current!.position.set(p.x, 0, p.z)
        const apexY = Math.max(0.2, Math.min(p.y - 0.18, 1.6))
        _apex.set(0, apexY, 0)
        legs.current.forEach((leg, i) => {
          if (!leg) return
          const a = (i / 3) * Math.PI * 2 + Math.PI / 6
          _foot.set(Math.cos(a) * LEG_SPREAD, 0, Math.sin(a) * LEG_SPREAD)
          _dir.subVectors(_apex, _foot)
          leg.position.addVectors(_foot, _apex).multiplyScalar(0.5)
          leg.scale.set(1, _dir.length(), 1)
          leg.quaternion.setFromUnitVectors(UP, _dir.normalize())
        })
        const colLen = Math.max(0.01, p.y - apexY)
        column.current!.position.set(0, apexY + colLen / 2, 0)
        column.current!.scale.set(1, colLen, 1)
        hit.current!.position.set(0, p.y / 2, 0)
        hit.current!.scale.set(1, Math.max(0.3, p.y + 0.2), 1)
      },
    }
    return () => {
      geom.dispose()
      gizmoRef.current = null
    }
  }, [gizmoRef])

  return (
    <group ref={root} userData={{ drag: CAMERA_DRAG }}>
      <group ref={head}>
        {/* 카메라 바디 (렌즈는 -z 방향) */}
        <mesh position={[0, 0, 0.16]}>
          <boxGeometry args={[0.24, 0.2, 0.34]} />
          <meshStandardMaterial color="#9fd6aa" roughness={0.5} emissive="#2f5a38" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.14, 0.18]}>
          <boxGeometry args={[0.1, 0.08, 0.14]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 14]} />
          <meshStandardMaterial color="#141414" />
        </mesh>
        <lineSegments ref={frustum}>
          <lineBasicMaterial color="#ffb547" transparent opacity={0.9} />
        </lineSegments>
      </group>
      <group ref={tripod}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} ref={(m) => void (legs.current[i] = m)}>
            <cylinderGeometry args={[0.018, 0.014, 1, 6]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        <mesh ref={column}>
          <cylinderGeometry args={[0.028, 0.028, 1, 8]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* 끌기 가능 표시 링 */}
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.56, 40]} />
          <meshBasicMaterial color="#c8e6cd" transparent opacity={0.85} />
        </mesh>
        {/* 클릭 판정용 투명 원기둥 (얇은 다리를 쉽게 잡도록) */}
        <mesh ref={hit}>
          <cylinderGeometry args={[0.45, 0.45, 1, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
