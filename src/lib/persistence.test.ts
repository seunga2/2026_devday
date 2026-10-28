import { describe, expect, it } from 'vitest'
import { PROJECT_VERSION } from '../types/scene'
import { loadProject, saveProject, type KeyValueStorage } from './persistence'
import { LEGACY_STORAGE_KEY, STORAGE_KEY, createCut, createProject, migrateProject } from './schema'

const memory = (init: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } => {
  const data = { ...init }
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

// 배포된 기존(Codex) 버전이 localStorage에 남기는 실제 형식
const legacyShot = {
  distance: 4.2, height: 1.8, angle: 90, targetHeight: 1.3, fov: 35,
  lighting: 'side', brightness: 5, tone: 'cool', aspect: '9:16',
  description: '창밖을 바라보며 생각에 잠긴다', prompt: '',
}
const legacyFrame = { position: [4.2, 1.8, 0], target: [0, 1.3, 0], fov: 35, settings: { lighting: 'side', brightness: 5, tone: 'cool', aspect: '9:16' } }
const legacy = {
  state: {
    projectName: 'Old project',
    shot: legacyShot,
    motion: { type: 'fixed', start: legacyFrame, end: legacyFrame, duration: 5 },
    cuts: [
      { id: 'a1', name: 'CUT 01', shot: { ...legacyShot, prompt: 'My hand-written prompt' }, motion: { type: 'dolly', duration: 8, start: legacyFrame, end: { ...legacyFrame, position: [2, 1.8, 0] } } },
      { id: 'broken', name: 'bad', shot: { distance: 'x' }, motion: { type: 'unknown', start: { position: [NaN] } } },
    ],
    selectedId: 'a1',
  },
  version: 2,
}

describe('저장·복원 및 마이그레이션', () => {
  it('현재 버전 저장 → 복원 왕복', () => {
    const s = memory()
    const p = createProject()
    p.cuts.push(createCut(1, { name: '두번째', action: 'walks in' }))
    expect(saveProject(p, s)).toBeNull()
    const { project, source } = loadProject(s)
    expect(source).toBe('current')
    expect(project).toEqual(p)
  })

  it('기존(Codex) 저장 데이터를 v3로 마이그레이션', () => {
    const { project, source } = loadProject(memory({ [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) }))
    expect(source).toBe('legacy')
    expect(project.version).toBe(PROJECT_VERSION)
    expect(project.projectName).toBe('Old project')
    expect(project.activeCutId).toBe('a1')
    const cut = project.cuts.find((c) => c.id === 'a1')!
    expect(cut.camera).toEqual({ distance: 4.2, height: 1.8, angle: 90, targetHeight: 1.3, fov: 35 })
    expect(cut.lighting).toEqual({ preset: 'side', intensity: 5, direction: 90, tone: 'cool' })
    expect(cut.aspect).toBe('9:16')
    expect(cut.motion.type).toBe('dolly')
    expect(cut.motion.duration).toBe(8)
    expect(cut.motion.start?.lighting.tone).toBe('cool')
    expect(cut.motion.end?.position).toEqual([2, 1.8, 0])
    // 사용자가 작성한 프롬프트는 수정본으로 보존
    expect(cut.prompt).toEqual({ text: 'My hand-written prompt', edited: true })
    expect(cut.action).toBe('창밖을 바라보며 생각에 잠긴다')
  })

  it('잘못된 CUT 데이터는 기본값으로 보정되고 앱이 깨지지 않는다', () => {
    const p = migrateProject(legacy)
    const bad = p.cuts.find((c) => c.id === 'broken')!
    expect(bad.camera.distance).toBe(5.8)
    expect(bad.motion.type).toBe('fixed')
    expect(bad.motion.start).toBeNull()
  })

  it('선택된 CUT 없이 작업 중이던 구도는 별도 CUT으로 보존', () => {
    const p = migrateProject({ state: { ...legacy.state, selectedId: null } })
    expect(p.cuts).toHaveLength(3)
    expect(p.cuts[2].name).toContain('가져옴')
    expect(p.activeCutId).toBe(p.cuts[2].id)
  })

  it('CUT이 없던 기존 데이터는 작업 중 구도 하나로 시작', () => {
    const p = migrateProject({ state: { shot: legacyShot, motion: legacy.state.motion, cuts: [], selectedId: null }, version: 0 })
    expect(p.cuts).toHaveLength(1)
    expect(p.cuts[0].motion.end).toBeNull()
  })

  it('손상된 JSON·알 수 없는 형식은 기본 프로젝트', () => {
    expect(loadProject(memory({ [STORAGE_KEY]: '{not json' })).source).toBe('default')
    expect(migrateProject({ foo: 1 }).cuts).toHaveLength(1)
    expect(migrateProject(null).cuts).toHaveLength(1)
    expect(migrateProject({ version: 3, cuts: [{ id: 'x' }] }).cuts[0].name).toBe('CUT 01')
  })

  it('현재 버전 데이터의 범위 밖 값은 보정, 존재하지 않는 activeCutId는 첫 CUT', () => {
    const p = createProject()
    p.cuts[0].camera.fov = 500
    const r = migrateProject({ ...p, activeCutId: 'nope' })
    expect(r.cuts[0].camera.fov).toBe(90)
    expect(r.activeCutId).toBe(p.cuts[0].id)
  })

  it('저장 공간 부족 시 오류 메시지 반환', () => {
    const quota: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    expect(saveProject(createProject(), quota)).toContain('저장 공간')
    expect(saveProject(createProject(), null)).toContain('사용할 수 없')
  })
})
