import { describe, expect, it } from 'vitest'
import { DEFAULT_LIGHTING } from './lighting'
import { frameFromSettings } from './motion'
import { cameraAngle, describeAction, describeMood, effectivePrompt, generatePrompt, lensDescription, shotSize, viewSide } from './prompt'
import { createCut } from './schema'

describe('영상 프롬프트 생성 (규칙 기반)', () => {
  it('기본 CUT 프롬프트는 영문이며 주요 설정을 모두 포함', () => {
    const cut = createCut(0)
    const p = generatePrompt(cut)
    expect(p).not.toMatch(/[가-힣]/)
    expect(p).toMatch(/medium wide shot/)
    expect(p).toMatch(/Rembrandt lighting/)
    expect(p).toMatch(/warm color temperature/)
    expect(p).toMatch(/Locked-off static camera for a 5-second shot/)
    expect(p).toMatch(/looks toward the camera, then slowly breaks into a gentle smile/)
    expect(p).toMatch(/warm, intimate, cinematic atmosphere/)
    expect(p).toMatch(/horizontal 16:9/)
  })

  it('거리·높이·화각·방향에 따라 구도 표현이 달라진다', () => {
    expect(shotSize(1.4, 42)).toBe('close-up')
    expect(shotSize(8, 42)).toBe('wide shot')
    expect(shotSize(3, 20)).toBe('close-up') // 망원은 더 타이트
    expect(cameraAngle([0, 4, 2], [0, 1, 0])).toBe('a steep high-angle view')
    expect(cameraAngle([0, 0.4, 4], [0, 1.6, 0])).toBe('a slightly low angle')
    expect(viewSide([4, 1, 0], [0, 1, 0])).toBe('profile view')
    expect(viewSide([0, 1, -4], [0, 1, 0])).toBe('view from behind the subject')
    expect(lensDescription(42)).toMatch(/31mm/)
  })

  it('모션 종류·시간·시작/종료 구도를 문장으로 표현', () => {
    const cut = createCut(0, { aspect: '9:16' })
    const start = frameFromSettings({ ...cut.camera, angle: 0, distance: 6 }, DEFAULT_LIGHTING, '9:16')
    const dolly = generatePrompt({ ...cut, motion: { type: 'dolly', duration: 8, start, end: null } })
    expect(dolly).toMatch(/dolly in toward the subject/)
    expect(dolly).toMatch(/over 8 seconds/)
    expect(dolly).toMatch(/starting on a medium wide shot .* ending on a medium shot/)
    expect(dolly).toMatch(/vertical 9:16/)
    expect(generatePrompt({ ...cut, motion: { type: 'orbit', duration: 3, start, end: null } })).toMatch(/60-degree orbit/)
    expect(generatePrompt({ ...cut, motion: { type: 'truck', duration: 3, start, end: null } })).toMatch(/truck to the right/)
    expect(generatePrompt({ ...cut, motion: { type: 'pedestal', duration: 3, start, end: null } })).toMatch(/pedestal up/)
  })

  it('조명 변화가 있으면 함께 기술', () => {
    const cut = createCut(0)
    const start = frameFromSettings(cut.camera, DEFAULT_LIGHTING, '16:9')
    const end = { ...start, lighting: { ...DEFAULT_LIGHTING, preset: 'back' as const, tone: 'cool' as const } }
    expect(generatePrompt({ ...cut, motion: { type: 'orbit', duration: 5, start, end } })).toMatch(/gradually shifts to .*backlighting/)
  })

  it('영어 입력은 그대로, 매칭되지 않는 한국어는 원문 보존', () => {
    expect(describeAction('She opens the door slowly.')).toBe('She opens the door slowly')
    expect(describeAction('냉장고를 연다')).toContain('"냉장고를 연다"')
    expect(describeAction('')).toMatch(/relaxed posture/)
    expect(describeMood('어둡고 긴장감 있는')).toBe('tense, suspenseful, dark, moody')
  })

  it('사용자가 수정한 프롬프트는 자동 생성으로 덮어쓰지 않는다', () => {
    const cut = createCut(0, { prompt: { text: 'Custom prompt', edited: true } })
    expect(effectivePrompt(cut)).toBe('Custom prompt')
    expect(effectivePrompt({ ...cut, camera: { ...cut.camera, fov: 20 } })).toBe('Custom prompt')
    expect(effectivePrompt({ ...cut, prompt: { text: '', edited: false } })).toBe(generatePrompt(cut))
  })
})
