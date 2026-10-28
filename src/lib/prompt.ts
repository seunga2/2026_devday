/**
 * 규칙·템플릿 기반 영문 영상 프롬프트 생성기 (LLM 미사용).
 * 촬영 설정값과 사용자의 행동/분위기 입력을 결합한다.
 */
import type { CameraSettings, Cut, Frame, LightingSettings, Vec3 } from '../types/scene'
import { distance3, fovToFocalLength, tiltDegrees } from './camera'
import { LIGHTING_PRESETS, TONES } from './lighting'
import { frameFromSettings, resolveEndFrame } from './motion'

export function shotSize(distance: number, fov: number): string {
  // 화각을 반영한 '체감 거리' (42° 기준)
  const effective = distance * (Math.tan((fov * Math.PI) / 360) / Math.tan((42 * Math.PI) / 360))
  if (effective < 1.8) return 'close-up'
  if (effective < 3.2) return 'medium close-up'
  if (effective < 4.8) return 'medium shot'
  if (effective < 6.8) return 'medium wide shot'
  return 'wide shot'
}

export function cameraAngle(position: Vec3, target: Vec3): string {
  const tilt = tiltDegrees(position, target)
  if (tilt > 35) return 'a steep high-angle view'
  if (tilt > 10) return 'a slightly high angle'
  if (tilt < -20) return 'a dramatic low angle'
  if (tilt < -6) return 'a slightly low angle'
  return 'eye level'
}

/** 피사체(+z를 바라봄) 기준 카메라 방향 */
export function viewSide(position: Vec3, target: Vec3): string {
  const a = Math.abs((Math.atan2(position[0] - target[0], position[2] - target[2]) * 180) / Math.PI)
  if (a < 20) return 'frontal view'
  if (a < 65) return 'three-quarter view'
  if (a < 115) return 'profile view'
  if (a < 160) return 'three-quarter rear view'
  return 'view from behind the subject'
}

export function lensDescription(fov: number): string {
  const mm = Math.round(fovToFocalLength(fov))
  const kind = mm < 24 ? 'ultra-wide' : mm < 35 ? 'wide-angle' : mm < 60 ? 'natural' : mm < 100 ? 'portrait telephoto' : 'long telephoto'
  return `${kind} ${mm}mm lens (${Math.round(fov)}° vertical field of view)`
}

export function intensityWord(i: number): string {
  if (i < 1.5) return 'dim, low-key'
  if (i < 3) return 'soft'
  if (i < 5) return 'balanced'
  if (i < 6.5) return 'bright'
  return 'intense, high-contrast'
}

export function lightingPhrase(l: LightingSettings): string {
  const t = TONES[l.tone]
  return `${intensityWord(l.intensity)} ${LIGHTING_PRESETS[l.preset].en}, ${t.en} color temperature (around ${t.kelvin}K)`
}

/** 한국어/영어 행동 키워드 → 영어 문장 조각 */
const ACTION_RULES: [RegExp, string][] = [
  [/바라|응시|쳐다|look|gaz|stare/i, 'looks toward the camera'],
  [/미소|웃|smil|laugh/i, 'slowly breaks into a gentle smile'],
  [/걷|걸어|walk/i, 'walks slowly through the room'],
  [/앉|sit/i, 'sits down gently'],
  [/일어|stand up|rise/i, 'rises to their feet'],
  [/돌아|돌린|turn/i, 'turns their head slowly'],
  [/손|흔들|wave|gesture/i, 'raises a hand in a subtle gesture'],
  [/마시|커피|차를|drink|sip|coffee|tea/i, 'takes a slow sip from a cup'],
  [/읽|책|read|book/i, 'reads quietly'],
  [/창밖|창문|window/i, 'gazes out of the window'],
  [/울|눈물|cry|tear/i, 'holds back tears'],
  [/생각|고민|think|ponder/i, 'pauses, lost in thought'],
  [/한숨|sigh/i, 'lets out a quiet sigh'],
  [/춤|dance/i, 'moves in a slow, graceful dance'],
  [/전화|phone|call/i, 'answers a phone call'],
]

const MOOD_RULES: [RegExp, string][] = [
  [/긴장|불안|스릴|tense|thrill|anxious/i, 'tense, suspenseful'],
  [/미스터리|신비|mysterious|myster/i, 'mysterious'],
  [/어두|어둡|느와르|dark|noir/i, 'dark, moody'],
  [/쓸쓸|외로|고독|lonely|solitary/i, 'lonely, contemplative'],
  [/차가|냉|cold|cool/i, 'cool, restrained'],
  [/따뜻|포근|warm|cozy/i, 'warm, intimate'],
  [/영화|시네마|cinema|film/i, 'cinematic'],
  [/행복|밝|즐거|happy|joy|bright/i, 'joyful, uplifting'],
  [/슬픔|슬픈|우울|sad|melanchol/i, 'melancholic'],
  [/평화|고요|잔잔|calm|peace|quiet/i, 'calm, serene'],
  [/몽환|꿈|dream/i, 'dreamy, ethereal'],
  [/로맨|사랑|romant|love/i, 'romantic'],
  [/향수|레트로|nostalg|retro/i, 'nostalgic'],
]

const HANGUL = /[가-힣]/

function matchRules(text: string, rules: [RegExp, string][]): string[] {
  return rules.filter(([re]) => re.test(text)).map(([, en]) => en)
}

/** 영어 입력은 그대로, 한국어는 키워드 규칙으로 변환. 변환 불가 시 원문을 따옴표로 보존 */
export function describeAction(action: string): string {
  const text = action.trim()
  if (!text) return 'stands naturally with a relaxed posture'
  if (!HANGUL.test(text)) return text.replace(/[.\s]+$/, '')
  const phrases = matchRules(text, ACTION_RULES)
  return phrases.length ? phrases.join(', then ') : `performs the following action: "${text}"`
}

export function describeMood(mood: string): string {
  const text = mood.trim()
  if (!text) return 'natural, understated cinematic'
  if (!HANGUL.test(text)) return text.replace(/[.\s]+$/, '')
  const words = matchRules(text, MOOD_RULES)
  return words.length ? [...new Set(words)].join(', ') : `"${text}"`
}

function framing(f: Pick<Frame, 'position' | 'target' | 'fov'>): string {
  const d = Math.hypot(f.position[0] - f.target[0], f.position[2] - f.target[2])
  return `${shotSize(d, f.fov)} from ${cameraAngle(f.position, f.target)}, ${viewSide(f.position, f.target)}`
}

function motionSentence(cut: Cut): string {
  const { motion } = cut
  const start = motion.start
  const end = resolveEndFrame(motion)
  const secs = `${motion.duration}-second`
  if (motion.type === 'fixed' || !start || !end) {
    return `Locked-off static camera for a ${secs} shot, no camera movement.`
  }
  const move = distance3(start.position, end.position)
  let movement: string
  switch (motion.type) {
    case 'dolly': {
      const before = distance3(start.position, start.target)
      const after = distance3(end.position, end.target)
      movement = `a smooth dolly ${after < before ? 'in toward' : 'out away from'} the subject, traveling ${move.toFixed(1)}m`
      break
    }
    case 'truck': {
      const fwd: Vec3 = [start.target[0] - start.position[0], 0, start.target[2] - start.position[2]]
      const right = -fwd[2] * (end.position[0] - start.position[0]) + fwd[0] * (end.position[2] - start.position[2])
      movement = `a steady lateral truck to the ${right >= 0 ? 'right' : 'left'}, ${move.toFixed(1)}m`
      break
    }
    case 'pedestal':
      movement = `a smooth pedestal ${end.position[1] >= start.position[1] ? 'up' : 'down'}, ${move.toFixed(1)}m vertically`
      break
    case 'orbit': {
      const a0 = Math.atan2(start.position[0] - start.target[0], start.position[2] - start.target[2])
      const a1 = Math.atan2(end.position[0] - end.target[0], end.position[2] - end.target[2])
      let deg = ((a1 - a0) * 180) / Math.PI
      if (deg > 180) deg -= 360
      if (deg < -180) deg += 360
      movement = `a slow ${Math.round(Math.abs(deg))}-degree orbit around the subject`
      break
    }
  }
  return `The camera performs ${movement} over ${motion.duration} seconds with eased acceleration, starting on a ${framing(start)} and ending on a ${framing(end)}.`
}

export function generatePrompt(cut: Cut): string {
  const camera: CameraSettings = cut.camera
  const start = cut.motion.start ?? frameFromSettings(camera, cut.lighting, cut.aspect)
  const lighting = start.lighting
  const end = resolveEndFrame(cut.motion)
  const lightChange =
    end && cut.motion.start && (end.lighting.preset !== lighting.preset || end.lighting.tone !== lighting.tone || Math.abs(end.lighting.intensity - lighting.intensity) > 0.4)
      ? ` The lighting gradually shifts to ${lightingPhrase(end.lighting)}.`
      : ''
  const orientation = cut.aspect === '9:16' ? 'vertical 9:16' : 'horizontal 16:9'

  return [
    `A ${framing(start)} of a person in a cozy, contemporary living-room studio, shot on a ${lensDescription(start.fov)}.`,
    `The subject ${describeAction(cut.action)}.`,
    motionSentence(cut),
    `Lighting: ${lightingPhrase(lighting)}.${lightChange}`,
    `Mood: ${describeMood(cut.mood)} atmosphere.`,
    `${orientation} framing, realistic materials, soft natural shadows, subtle film grain, consistent character appearance. No text, subtitles or watermarks.`,
  ].join(' ')
}

/** 표시·내보내기용 최종 프롬프트: 사용자 수정본 우선 */
export function effectivePrompt(cut: Cut): string {
  return cut.prompt.edited && cut.prompt.text.trim() ? cut.prompt.text : generatePrompt(cut)
}
