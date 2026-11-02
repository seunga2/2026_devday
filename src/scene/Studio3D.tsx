/**
 * 촬영 공간: 실내(거실 스튜디오) / 실외(도심 공원) 2종 + 인물.
 * 외부 모델 없이 기본 도형만 사용하므로 네트워크 상태와 무관하게 항상 표시된다.
 * 벽·천장은 안쪽 면만 렌더링해, 카메라가 방 밖에 있어도 벽 너머로 장면이 보인다.
 */
import { memo, useMemo } from 'react'
import { BackSide, Color, Float32BufferAttribute, SphereGeometry } from 'three'
import type { Actor, Environment } from '../types/scene'
import { Actors } from './Actors'
import { Box, FloorLamp, Plant, Tree, type V3 } from './primitives'

const ROOM = 7 // 방 반폭 (m)
const WALL_H = 3.2

function Wall({ position, rotation, color, width = ROOM * 2 }: { position: V3; rotation: V3; color: string; width?: number }) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[width, WALL_H]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

/** 추상화: 색 면 분할 구성 (특정 국기·로고와 무관) */
function Artwork({ position, rotation }: { position: V3; rotation: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[1.5, 1.05, 0.05]} position={[0, 0, 0]} color="#1f1b17" cast={false} />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.38, 0.93]} />
        <meshStandardMaterial color="#efe8da" />
      </mesh>
      {[
        [-0.38, 0.12, 0.5, 0.55, '#c5b0f4'],
        [0.2, 0.18, 0.62, 0.42, '#dceeb1'],
        [0.05, -0.2, 0.9, 0.3, '#2f4a68'],
        [0.48, -0.22, 0.24, 0.24, '#f3c9b6'],
      ].map(([x, y, w, h, c], i) => (
        <mesh key={i} position={[x as number, y as number, 0.035]}>
          <planeGeometry args={[w as number, h as number]} />
          <meshStandardMaterial color={c as string} />
        </mesh>
      ))}
    </group>
  )
}

function Bookshelf({ position, rotation }: { position: V3; rotation: V3 }) {
  const books = ['#2f4a68', '#b5573b', '#d8c9a8', '#4a6b48', '#8a6db0', '#c99a4a', '#3b3f46']
  return (
    <group position={position} rotation={rotation}>
      <Box size={[1.6, 2.2, 0.38]} position={[0, 1.1, 0]} color="#6e5038" rough={0.7} />
      {[0.45, 1.05, 1.65].map((y) => (
        <group key={y}>
          <Box size={[1.5, 0.5, 0.02]} position={[0, y + 0.22, 0.19]} color="#4a3626" cast={false} />
          {books.map((c, i) => (
            <Box key={i} size={[0.13, 0.36 + ((i * 7) % 5) * 0.03, 0.26]} position={[-0.6 + i * 0.17, y + 0.2, 0.05]} color={c} cast={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

function Sofa({ position }: { position: V3 }) {
  const fabric = '#6f7656'
  return (
    <group position={position}>
      <Box size={[2.4, 0.42, 0.95]} position={[0, 0.26, 0]} color={fabric} />
      <Box size={[2.4, 0.6, 0.25]} position={[0, 0.72, -0.36]} color={fabric} />
      <Box size={[0.22, 0.6, 0.95]} position={[-1.2, 0.42, 0]} color="#646b4c" />
      <Box size={[0.22, 0.6, 0.95]} position={[1.2, 0.42, 0]} color="#646b4c" />
      {[-0.55, 0.55].map((x) => (
        <Box key={x} size={[1.05, 0.14, 0.72]} position={[x, 0.54, 0.08]} color="#7e8663" />
      ))}
      <Box size={[0.42, 0.36, 0.12]} position={[-0.75, 0.78, -0.18]} rotation={[-0.2, 0.15, 0.1]} color="#c88c5e" />
      <Box size={[0.38, 0.34, 0.12]} position={[0.8, 0.77, -0.18]} rotation={[-0.2, -0.2, -0.08]} color="#c5b0f4" />
    </group>
  )
}

function SideTable({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Box size={[0.9, 0.06, 0.6]} position={[0, 0.58, 0]} color="#9a6b45" rough={0.6} />
      {[
        [-0.38, -0.24],
        [0.38, -0.24],
        [-0.38, 0.24],
        [0.38, 0.24],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.05, 0.56, 0.05]} position={[x, 0.28, z]} color="#7c5536" />
      ))}
      <mesh position={[0.15, 0.67, 0.05]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.12, 14]} />
        <meshStandardMaterial color="#f1ece2" roughness={0.4} />
      </mesh>
      <Box size={[0.3, 0.05, 0.22]} position={[-0.18, 0.635, -0.02]} rotation={[0, 0.3, 0]} color="#3f5d6b" />
    </group>
  )
}

const IndoorSet = memo(function IndoorSet() {
  return (
    <group>
      {/* 바닥 + 판재 라인 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial color="#6f5a46" roughness={0.9} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-6 + i, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, ROOM * 2]} />
          <meshBasicMaterial color="#4f3f31" />
        </mesh>
      ))}
      {/* 러그 (테두리 포함) */}
      <mesh position={[0.3, 0.005, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.8, 2.8]} />
        <meshStandardMaterial color="#8a6f58" roughness={1} />
      </mesh>
      <mesh position={[0.3, 0.008, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.5, 2.5]} />
        <meshStandardMaterial color="#d6c8b0" roughness={1} />
      </mesh>

      {/* 네 벽 + 천장 (안쪽 면만) */}
      <Wall position={[0, WALL_H / 2, -ROOM]} rotation={[0, 0, 0]} color="#bdb2a0" />
      <Wall position={[0, WALL_H / 2, ROOM]} rotation={[0, Math.PI, 0]} color="#b8ad9b" />
      <Wall position={[-ROOM, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} color="#a99e8c" />
      <Wall position={[ROOM, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} color="#ada290" />
      <mesh position={[0, WALL_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM * 2, ROOM * 2]} />
        <meshStandardMaterial color="#d9d3c7" roughness={1} />
      </mesh>
      {/* 걸레받이 */}
      <Box size={[ROOM * 2, 0.12, 0.04]} position={[0, 0.06, -ROOM + 0.02]} color="#8a7f6e" cast={false} />

      {/* 뒷벽: 큰 창 + 커튼 */}
      <group position={[1.6, 1.75, -ROOM + 0.03]}>
        <Box size={[2.6, 1.8, 0.06]} position={[0, 0, 0]} color="#e8e4dc" cast={false} />
        {[-0.85, 0, 0.85].map((x) => (
          <mesh key={x} position={[x, 0, 0.035]}>
            <planeGeometry args={[0.78, 1.64]} />
            <meshStandardMaterial color="#cfe3e6" emissive="#b8d7dc" emissiveIntensity={0.7} />
          </mesh>
        ))}
        <Box size={[2.8, 0.07, 0.18]} position={[0, -0.92, 0.07]} color="#ddd6c9" />
        {[-1.55, 1.55].map((x) => (
          <Box key={x} size={[0.45, 2.6, 0.08]} position={[x, -0.15, 0.1]} color="#cdbfa6" cast={false} />
        ))}
      </group>
      <directionalLight position={[1.6, 2.5, -ROOM + 1]} intensity={0.25} color="#dbe9f2" />

      {/* 왼쪽 벽: 추상화 + 책장 */}
      <Artwork position={[-ROOM + 0.03, 1.8, -0.8]} rotation={[0, Math.PI / 2, 0]} />
      <Bookshelf position={[-ROOM + 0.22, 0, 2.2]} rotation={[0, Math.PI / 2, 0]} />
      {/* 오른쪽 벽: 문 + 벽 선반 */}
      <group position={[ROOM - 0.03, 0, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Box size={[1.1, 2.2, 0.06]} position={[0, 1.1, 0]} color="#7a5a40" cast={false} />
        <mesh position={[0.4, 1.05, 0.06]}>
          <sphereGeometry args={[0.04, 10, 8]} />
          <meshStandardMaterial color="#c9a45c" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <group position={[ROOM - 0.15, 1.6, -2.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Box size={[1.3, 0.05, 0.25]} position={[0, 0, 0]} color="#8a6a4a" />
        <Box size={[0.18, 0.28, 0.18]} position={[-0.4, 0.17, 0]} color="#c5b0f4" />
        <Box size={[0.12, 0.2, 0.12]} position={[0.1, 0.12, 0]} color="#f3c9b6" />
      </group>
      {/* 천장 펜던트 조명 */}
      <group position={[0.3, WALL_H, -0.4]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.8, 4]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[0, -0.85, 0]}>
          <sphereGeometry args={[0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e9e1d1" emissive="#ffe0b0" emissiveIntensity={0.4} side={BackSide} />
        </mesh>
        <pointLight position={[0, -0.95, 0]} intensity={1.3} distance={7} decay={1.5} color="#ffdcae" />
      </group>

      <Sofa position={[1.9, 0, -2.6]} />
      <SideTable position={[-1.7, 0, -1.6]} />
      <FloorLamp position={[3.7, 0, -2.0]} />
      <Plant position={[-ROOM + 0.6, 0, -ROOM + 0.6]} />
      <Plant position={[ROOM - 0.6, 0, -ROOM + 0.6]} />
    </group>
  )
})

/** 하늘 돔: 정점 색 그라데이션 (조명 영향 없음) */
function Sky() {
  const geom = useMemo(() => {
    const g = new SphereGeometry(80, 32, 16)
    const top = new Color('#7fb0dc')
    const horizon = new Color('#f2e3c8')
    const pos = g.getAttribute('position')
    const colors: number[] = []
    const c = new Color()
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / 80)
      c.copy(horizon).lerp(top, Math.pow(t, 0.6))
      colors.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3))
    return g
  }, [])
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial vertexColors side={BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function Bench({ position, rotation = 0 }: { position: V3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[0.12, 0.28, 0.44].map((z, i) => (
        <Box key={i} size={[1.8, 0.05, 0.13]} position={[0, 0.46, z - 0.28]} color="#9a6b45" />
      ))}
      {[0, 1].map((i) => (
        <Box key={i} size={[1.8, 0.13, 0.05]} position={[0, 0.7 + i * 0.17, -0.3]} color="#9a6b45" />
      ))}
      {[-0.75, 0.75].map((x) => (
        <Box key={x} size={[0.06, 0.46, 0.6]} position={[x, 0.23, -0.05]} color="#2e2a26" />
      ))}
    </group>
  )
}

function StreetLamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 3.6, 8]} />
        <meshStandardMaterial color="#2b2d30" metalness={0.5} roughness={0.5} />
      </mesh>
      <Box size={[0.32, 0.3, 0.32]} position={[0, 3.7, 0]} color="#f6ecd2" emissive="#ffe2a8" emissiveIntensity={0.8} />
      <pointLight position={[0, 3.5, 0]} intensity={1.6} distance={8} decay={1.5} color="#ffd9a0" />
    </group>
  )
}

const BUILDINGS: [number, number, number, number, string][] = [
  [-22, -28, 6, 14, '#c9c2b6'],
  [-14, -30, 8, 22, '#a9b4bf'],
  [-5, -32, 7, 17, '#d8cdbd'],
  [4, -30, 9, 26, '#b7aea2'],
  [14, -29, 7, 15, '#c5b0a0'],
  [23, -27, 8, 20, '#aeb9b0'],
  [-28, -10, 6, 12, '#cbc4b8'],
  [29, -8, 7, 16, '#b9b3c2'],
]

const TREES: [number, number, number][] = [
  [-5.5, -4.5, 1.2],
  [-3.2, -6.2, 1.0],
  [4.8, -5.4, 1.3],
  [6.8, -2.0, 1.0],
  [-7.2, 1.5, 1.15],
  [7.5, 3.8, 1.2],
  [-6.0, 6.5, 0.95],
  [2.5, -8.5, 1.4],
  [-9.5, -7.5, 1.3],
  [10.5, -6.0, 1.1],
]

const OutdoorSet = memo(function OutdoorSet() {
  return (
    <group>
      <Sky />
      {/* 잔디 + 산책로 + 광장 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#7a9a57" roughness={1} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.2, 40]} />
        <meshStandardMaterial color="#cdbfa6" roughness={1} />
      </mesh>
      <mesh position={[0, 0.003, -12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.2, 20]} />
        <meshStandardMaterial color="#c2b49b" roughness={1} />
      </mesh>
      <mesh position={[9, 0.003, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[2.2, 12]} />
        <meshStandardMaterial color="#c2b49b" roughness={1} />
      </mesh>
      {/* 광장 화단 */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.5, 40]} />
        <meshStandardMaterial color="#a39a8a" />
      </mesh>

      {TREES.map(([x, z, s], i) => (
        <Tree key={i} position={[x, 0, z]} scale={s} tint={i % 3 === 0 ? '#5b8a4a' : i % 3 === 1 ? '#4a7a40' : '#6a9553'} />
      ))}
      <Bench position={[-2.2, 0, -3.6]} rotation={0.35} />
      <Bench position={[2.6, 0, -3.5]} rotation={-0.35} />
      <StreetLamp position={[4.2, 0, -3.8]} />
      <StreetLamp position={[-4.4, 0, 3.6]} />
      {/* 낮은 울타리 */}
      {Array.from({ length: 14 }, (_, i) => (
        <Box key={i} size={[0.08, 0.6, 0.08]} position={[-6.5 + i, 0.3, -11]} color="#e9e4da" />
      ))}
      <Box size={[13.2, 0.06, 0.05]} position={[0, 0.5, -11]} color="#e9e4da" />
      {/* 원경 건물 */}
      {BUILDINGS.map(([x, z, w, h, c], i) => (
        <group key={i} position={[x, h / 2, z]}>
          <Box size={[w, h, w * 0.8]} position={[0, 0, 0]} color={c} cast={false} rough={1} />
          {Array.from({ length: Math.floor(h / 3) }, (_, r) => (
            <Box key={r} size={[w * 0.8, 0.5, 0.05]} position={[0, -h / 2 + 2 + r * 3, w * 0.4 + 0.03]} color="#6d7f8f" cast={false} />
          ))}
        </group>
      ))}
      {/* 구름 */}
      {[
        [-18, 22, -40, 4],
        [10, 26, -45, 5],
        [30, 20, -30, 3.5],
      ].map(([x, y, z, s], i) => (
        <group key={i} position={[x, y, z]} scale={s}>
          {[
            [0, 0, 0, 1],
            [1.1, -0.2, 0, 0.75],
            [-1.0, -0.25, 0.1, 0.7],
          ].map(([cx, cy, cz, r], j) => (
            <mesh key={j} position={[cx, cy, cz]} scale={[1, 0.6, 1]}>
              <icosahedronGeometry args={[r, 1]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 햇빛 (그림자는 키 라이트가 담당) */}
      <directionalLight position={[-20, 30, 10]} intensity={0.9} color="#fff1d6" />
    </group>
  )
})

export function Studio3D({ environment, actors, selectedActorId }: { environment: Environment; actors: Actor[]; selectedActorId: string | null }) {
  return (
    <group>
      {environment === 'outdoor' ? <OutdoorSet /> : <IndoorSet />}
      <Actors actors={actors} selectedId={selectedActorId} />
    </group>
  )
}
