/**
 * 실내 스튜디오: 바닥·벽·창문·소파·테이블·스탠드·소품·인물.
 * 외부 모델 없이 기본 도형만 사용하므로 네트워크 상태와 무관하게 항상 표시된다.
 */
import { memo } from 'react'
import { DoubleSide } from 'three'

type V3 = [number, number, number]

function Box({ size, position, color, rotation, cast = true, rough = 0.85 }: { size: V3; position: V3; color: string; rotation?: V3; cast?: boolean; rough?: number }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} flatShading />
    </mesh>
  )
}

function Room() {
  return (
    <group>
      {/* 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#6f5a46" roughness={0.9} />
      </mesh>
      {/* 바닥 판재 라인 */}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-5 + i, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, 12]} />
          <meshBasicMaterial color="#4f3f31" />
        </mesh>
      ))}
      {/* 러그 */}
      <mesh position={[0.3, 0.006, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.6, 2.6]} />
        <meshStandardMaterial color="#c9bba4" roughness={1} />
      </mesh>
      {/* 뒷벽: 앞면만 렌더링 → 벽 뒤(후면 촬영)에서는 투명하게 보인다 */}
      <mesh position={[0, 1.6, -3.5]} receiveShadow>
        <planeGeometry args={[12, 3.2]} />
        <meshStandardMaterial color="#bdb2a0" roughness={0.95} />
      </mesh>
      {/* 왼쪽 벽 */}
      <mesh position={[-4.5, 1.6, 1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 3.2]} />
        <meshStandardMaterial color="#a99e8c" roughness={0.95} />
      </mesh>
      {/* 걸레받이 */}
      <Box size={[12, 0.12, 0.04]} position={[0, 0.06, -3.48]} color="#8a7f6e" cast={false} />
      <Window />
      {/* 액자 */}
      <group position={[-4.47, 1.75, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <Box size={[1.0, 1.25, 0.05]} position={[0, 0, 0]} color="#2b241e" cast={false} />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.84, 1.08]} />
          <meshStandardMaterial color="#e9dfcd" />
        </mesh>
        <mesh position={[0, 0.05, 0.035]}>
          <circleGeometry args={[0.24, 24]} />
          <meshStandardMaterial color="#d0744f" />
        </mesh>
      </group>
    </group>
  )
}

function Window() {
  return (
    <group position={[1.6, 1.75, -3.47]}>
      <Box size={[2.3, 1.6, 0.06]} position={[0, 0, 0]} color="#e8e4dc" cast={false} />
      {[-0.75, 0, 0.75].map((x) => (
        <mesh key={x} position={[x, 0, 0.035]}>
          <planeGeometry args={[0.68, 1.45]} />
          <meshStandardMaterial color="#cfe3e6" emissive="#b8d7dc" emissiveIntensity={0.55} />
        </mesh>
      ))}
      <Box size={[2.5, 0.07, 0.18]} position={[0, -0.82, 0.07]} color="#ddd6c9" />
    </group>
  )
}

function Sofa() {
  const fabric = '#6f7656'
  return (
    <group position={[1.9, 0, -2.3]}>
      <Box size={[2.4, 0.42, 0.95]} position={[0, 0.26, 0]} color={fabric} />
      <Box size={[2.4, 0.6, 0.25]} position={[0, 0.72, -0.36]} color={fabric} />
      <Box size={[0.22, 0.6, 0.95]} position={[-1.2, 0.42, 0]} color="#646b4c" />
      <Box size={[0.22, 0.6, 0.95]} position={[1.2, 0.42, 0]} color="#646b4c" />
      {[-0.55, 0.55].map((x) => (
        <Box key={x} size={[1.05, 0.14, 0.72]} position={[x, 0.54, 0.08]} color="#7e8663" />
      ))}
      <Box size={[0.42, 0.36, 0.12]} position={[-0.75, 0.78, -0.18]} rotation={[-0.2, 0.15, 0.1]} color="#c88c5e" />
    </group>
  )
}

function SideTable() {
  return (
    <group position={[-1.7, 0, -1.4]}>
      <Box size={[0.9, 0.06, 0.6]} position={[0, 0.58, 0]} color="#9a6b45" rough={0.6} />
      {[
        [-0.38, -0.24],
        [0.38, -0.24],
        [-0.38, 0.24],
        [0.38, 0.24],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.05, 0.56, 0.05]} position={[x, 0.28, z]} color="#7c5536" />
      ))}
      {/* 컵 */}
      <mesh position={[0.15, 0.67, 0.05]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.12, 14]} />
        <meshStandardMaterial color="#f1ece2" roughness={0.4} />
      </mesh>
      {/* 책 */}
      <Box size={[0.3, 0.05, 0.22]} position={[-0.18, 0.635, -0.02]} rotation={[0, 0.3, 0]} color="#3f5d6b" />
    </group>
  )
}

function FloorLamp() {
  return (
    <group position={[3.6, 0, -1.4]}>
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

function Plant() {
  return (
    <group position={[-3.7, 0, -2.8]}>
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

/** 로우폴리 인물 (원점에서 +z 방향을 바라봄) */
function Character() {
  const skin = '#e3b593'
  return (
    <group>
      {/* 다리 */}
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.9, 10]} />
          <meshStandardMaterial color="#26282d" />
        </mesh>
      ))}
      {[-0.11, 0.11].map((x) => (
        <Box key={`s${x}`} size={[0.13, 0.08, 0.26]} position={[x, 0.04, 0.05]} color="#1b1b1d" />
      ))}
      {/* 몸통 */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.17, 0.62, 12]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.49, 0]} castShadow>
        <sphereGeometry args={[0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
      </mesh>
      {/* 팔 */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.25, 1.43, 0]} rotation={[0, 0, s * 0.12]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.6, 8]} />
            <meshStandardMaterial color="#e8dcc8" />
          </mesh>
          <mesh position={[0, -0.65, 0]} castShadow>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
      ))}
      {/* 목·머리 */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.06, 0.12, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.76, 0]} scale={[1, 1.12, 1]} castShadow>
        <sphereGeometry args={[0.13, 18, 14]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>
      {/* 머리카락 */}
      <mesh position={[0, 1.81, -0.015]} scale={[1.05, 1.0, 1.05]} castShadow>
        <sphereGeometry args={[0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#3a2a20" roughness={0.9} />
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
        <meshStandardMaterial color="#d9a585" />
      </mesh>
    </group>
  )
}

export const Studio3D = memo(function Studio3D() {
  return (
    <group>
      <Room />
      <Sofa />
      <SideTable />
      <FloorLamp />
      <Plant />
      <Character />
    </group>
  )
})
