import { memo } from 'react'
import type { Actor } from '../types/scene'
import { toRad } from '../lib/camera'
import { ACTOR_OUTFITS } from '../lib/schema'
import { Box } from './primitives'
import { GIZMO_LAYER } from './views'

/** 로우폴리 인물 (로컬 +z 방향을 바라봄). userData.drag로 3D 화면에서 끌어 옮길 수 있다 */
const Person = memo(function Person({ actor, selected }: { actor: Actor; selected: boolean }) {
  const o = ACTOR_OUTFITS[actor.outfit] ?? ACTOR_OUTFITS[0]
  return (
    <group position={[actor.x, 0, actor.z]} rotation={[0, toRad(actor.rotation), 0]} userData={{ drag: { kind: 'actor', id: actor.id } }}>
      {/* 다리 */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.9, 10]} />
          <meshStandardMaterial color={o.bottom} />
        </mesh>
      ))}
      {[-0.11, 0.11].map((x) => (
        <Box key={`s${x}`} size={[0.13, 0.08, 0.26]} position={[x, 0.04, 0.05]} color="#1b1b1d" />
      ))}
      {/* 몸통 */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.17, 0.62, 12]} />
        <meshStandardMaterial color={o.top} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.49, 0]} castShadow>
        <sphereGeometry args={[0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={o.top} roughness={0.9} />
      </mesh>
      {/* 팔 */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.25, 1.43, 0]} rotation={[0, 0, s * 0.12]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.6, 8]} />
            <meshStandardMaterial color={o.top} />
          </mesh>
          <mesh position={[0, -0.65, 0]} castShadow>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={o.skin} />
          </mesh>
        </group>
      ))}
      {/* 목·머리 */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.12, 8]} />
        <meshStandardMaterial color={o.skin} />
      </mesh>
      <mesh position={[0, 1.76, 0]} scale={[1, 1.12, 1]} castShadow>
        <sphereGeometry args={[0.13, 18, 14]} />
        <meshStandardMaterial color={o.skin} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.81, -0.015]} scale={[1.05, 1.0, 1.05]} castShadow>
        <sphereGeometry args={[0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={o.hair} roughness={0.9} />
      </mesh>
      {/* 눈·코 (정면 방향 확인용) */}
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} position={[x, 1.78, 0.122]}>
          <sphereGeometry args={[0.013, 8, 6]} />
          <meshBasicMaterial color="#1d1712" />
        </mesh>
      ))}
      <mesh position={[0, 1.745, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.018, 0.04, 6]} />
        <meshStandardMaterial color={o.skin} />
      </mesh>
      {/* 탐색 화면 전용: 선택 링 + 정면 방향 표시 (촬영 화면에는 보이지 않음) */}
      <group
        ref={(g) => g?.traverse((c) => c.layers.set(GIZMO_LAYER))}
        visible={selected}
      >
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color="#c8e6cd" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.02, 0.62]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 3]} />
          <meshBasicMaterial color="#c8e6cd" />
        </mesh>
      </group>
    </group>
  )
})

export function Actors({ actors, selectedId }: { actors: Actor[]; selectedId: string | null }) {
  return (
    <>
      {actors.map((a) => (
        <Person key={a.id} actor={a} selected={a.id === selectedId} />
      ))}
    </>
  )
}
