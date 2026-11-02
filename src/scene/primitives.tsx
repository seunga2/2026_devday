import { DoubleSide } from 'three'

export type V3 = [number, number, number]

export function Box({
  size,
  position,
  color,
  rotation,
  cast = true,
  rough = 0.85,
  emissive,
  emissiveIntensity = 0,
}: {
  size: V3
  position: V3
  color: string
  rotation?: V3
  cast?: boolean
  rough?: number
  emissive?: string
  emissiveIntensity?: number
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} flatShading emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  )
}

/** 로우폴리 나무 (줄기 + 겹친 이코사면체 잎) */
export function Tree({ position, scale = 1, tint = '#4f7d47' }: { position: V3; scale?: number; tint?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.8, 7]} />
        <meshStandardMaterial color="#6b4b33" roughness={1} flatShading />
      </mesh>
      {[
        [0, 2.3, 0, 1.0],
        [0.45, 1.9, 0.2, 0.7],
        [-0.4, 2.0, -0.2, 0.75],
        [0, 2.9, 0, 0.7],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={tint} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function Plant({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.44, 12]} />
        <meshStandardMaterial color="#b9b0a2" />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.16, 0.85 + (i % 3) * 0.12, Math.cos(a) * 0.16]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]} castShadow>
            <coneGeometry args={[0.12, 0.75, 5]} />
            <meshStandardMaterial color={i % 2 ? '#3f6b3d' : '#4f7d47'} flatShading />
          </mesh>
        )
      })}
    </group>
  )
}

export function FloorLamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.04, 20]} />
        <meshStandardMaterial color="#2e2a26" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.66, 8]} />
        <meshStandardMaterial color="#2e2a26" metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <coneGeometry args={[0.36, 0.38, 20, 1, true]} />
        <meshStandardMaterial color="#f4e6c6" emissive="#ffd9a0" emissiveIntensity={0.6} side={DoubleSide} />
      </mesh>
      <pointLight position={[0, 1.7, 0]} intensity={2.2} distance={6} decay={1.6} color="#ffcf94" />
    </group>
  )
}
