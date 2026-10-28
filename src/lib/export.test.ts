/**
 * ZIP 구성 테스트 (mock 캡처). 실제 WebGL 렌더링 캡처는 브라우저에서 별도 검증한다.
 */
import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import type { Aspect, ShotPose } from '../types/scene'
import { frameSize, withPoseLighting, type CaptureFn } from './capture'
import { DEFAULT_LIGHTING, lightRigState, type LightRigState } from './lighting'
import { evaluateMotion, frameFromSettings } from './motion'
import { playback } from './playback'
import { buildExportZip, exportFileName, isExportRunning, runExclusive } from './export'
import { createCut } from './schema'
import { createSceneStore, toProject } from '../store/store'

const mockCapture = () => {
  const calls: { pose: ShotPose; aspect: Aspect }[] = []
  const fn: CaptureFn = vi.fn(async (pose, aspect) => {
    calls.push({ pose, aspect })
    return new Blob([`PNG:${JSON.stringify(pose.position)}`], { type: 'image/png' })
  })
  return { fn, calls }
}

function sampleCuts() {
  const a = createCut(0, { name: '오프닝' })
  const start = frameFromSettings({ ...a.camera, angle: 0, distance: 6 }, DEFAULT_LIGHTING, '16:9')
  a.motion = { type: 'dolly', duration: 3, start, end: null }
  const b = createCut(1, { aspect: '9:16', prompt: { text: 'USER EDITED PROMPT', edited: true } })
  return [a, b]
}

describe('ZIP 내보내기', () => {
  it('폴더 구조와 파일 구성이 명세와 일치', async () => {
    const { fn } = mockCapture()
    const zip = await JSZip.loadAsync(await buildExportZip(sampleCuts(), { projectName: 'Test', capture: fn }))
    const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir).sort()
    expect(files).toEqual([
      'scene-preview-export/README.txt',
      'scene-preview-export/cut-01/end-frame.png',
      'scene-preview-export/cut-01/scene-settings.json',
      'scene-preview-export/cut-01/start-frame.png',
      'scene-preview-export/cut-01/video-prompt.txt',
      'scene-preview-export/cut-02/end-frame.png',
      'scene-preview-export/cut-02/scene-settings.json',
      'scene-preview-export/cut-02/start-frame.png',
      'scene-preview-export/cut-02/video-prompt.txt',
    ])
  })

  it('시작 프레임은 모션 0%, 종료 프레임은 100% 시점으로 캡처하고 비율을 유지', async () => {
    const { fn, calls } = mockCapture()
    const cuts = sampleCuts()
    await buildExportZip(cuts, { projectName: 'T', capture: fn })
    expect(calls).toHaveLength(4)
    expect(calls[0].pose.position).toEqual(evaluateMotion(cuts[0].motion, 0)!.position)
    expect(calls[1].pose.position).toEqual(evaluateMotion(cuts[0].motion, 1)!.position)
    expect(calls[1].pose.position[2]).toBeCloseTo(6 * 0.6) // 자동 Dolly In 40%
    expect(calls.map((c) => c.aspect)).toEqual(['16:9', '16:9', '9:16', '9:16'])
    expect(frameSize('16:9')).toEqual({ width: 1920, height: 1080 })
    expect(frameSize('9:16')).toEqual({ width: 1080, height: 1920 })
  })

  it('사용자 수정 프롬프트 보존 및 설정 JSON 포함', async () => {
    const { fn } = mockCapture()
    const zip = await JSZip.loadAsync(await buildExportZip(sampleCuts(), { projectName: 'T', capture: fn }))
    expect(await zip.file('scene-preview-export/cut-02/video-prompt.txt')!.async('string')).toBe('USER EDITED PROMPT\n')
    expect(await zip.file('scene-preview-export/cut-01/video-prompt.txt')!.async('string')).toMatch(/dolly in/)
    const json = JSON.parse(await zip.file('scene-preview-export/cut-01/scene-settings.json')!.async('string'))
    expect(json).toMatchObject({ schemaVersion: 3, cut: { name: '오프닝' }, motion: { type: 'dolly', duration: 3, startFrameSaved: true } })
    expect(await zip.file('scene-preview-export/README.txt')!.async('string')).toMatch(/cut-02/)
  })

  it('캡처 실패 시 CUT·프레임을 명시한 오류', async () => {
    const failing: CaptureFn = async () => {
      throw new Error('WebGL 연결이 끊겼습니다.')
    }
    await expect(buildExportZip(sampleCuts(), { projectName: 'T', capture: failing })).rejects.toThrow('오프닝 시작 프레임 캡처 실패: WebGL 연결이 끊겼습니다.')
    await expect(buildExportZip([], { projectName: 'T', capture: failing })).rejects.toThrow('내보낼 CUT이 없습니다.')
  })

  it('진행 상태가 0→100으로 단조 증가', async () => {
    const { fn } = mockCapture()
    const seen: number[] = []
    await buildExportZip(sampleCuts(), { projectName: 'T', capture: fn, onProgress: (p) => seen.push(p.percent) })
    expect(seen.at(-1)).toBe(100)
    expect(seen.every((v, i) => i === 0 || v >= seen[i - 1])).toBe(true)
  })

  it('중복 실행 방지', async () => {
    let release!: () => void
    const first = runExclusive(() => new Promise<void>((r) => (release = r)))
    expect(isExportRunning()).toBe(true)
    await expect(runExclusive(async () => 1)).rejects.toThrow('이미 내보내기가 진행 중')
    release()
    await first
    expect(isExportRunning()).toBe(false)
    expect(exportFileName('My Project', 'current', createCut(0))).toBe('scene-preview-My-Project-CUT-01.zip')
  })
})

describe('내보내기 전후 상태 유지', () => {
  it('스토어(CUT·프롬프트)와 타임라인 상태가 변하지 않는다', async () => {
    const store = createSceneStore()
    store.getState().addCut()
    store.getState().editPrompt('keep me')
    playback.seek(0.42)
    const before = structuredClone(toProject(store.getState()))
    const { fn } = mockCapture()
    await buildExportZip(store.getState().cuts, { projectName: 'T', capture: fn })
    expect(toProject(store.getState())).toEqual(before)
    expect(playback.status).toBe('paused')
    expect(playback.progress).toBeCloseTo(0.42)
    playback.stop()
  })

  it('캡처 중 바꾼 조명은 렌더 후(실패해도) 원래대로 복원', () => {
    let current: LightRigState = lightRigState(DEFAULT_LIGHTING)
    const original = current
    const handle = { applyLightRig: (s: LightRigState) => (current = s), currentLightRig: () => current }
    const pose: ShotPose = { position: [0, 1, 5], target: [0, 1, 0], fov: 40, lighting: { ...DEFAULT_LIGHTING, preset: 'back', intensity: 8 } }
    let during: LightRigState | null = null
    withPoseLighting(handle, pose, undefined, () => (during = current))
    expect(during!.keyIntensity).toBe(lightRigState(pose.lighting).keyIntensity)
    expect(current).toBe(original)
    expect(() =>
      withPoseLighting(handle, pose, undefined, () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(current).toBe(original)
  })
})
