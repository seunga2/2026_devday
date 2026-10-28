import type { Project } from '../types/scene'
import { LEGACY_STORAGE_KEY, STORAGE_KEY, createProject, migrateProject } from './schema'

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export interface LoadResult {
  project: Project
  source: 'current' | 'legacy' | 'default'
}

export function loadProject(storage: KeyValueStorage | null = browserStorage()): LoadResult {
  if (!storage) return { project: createProject(), source: 'default' }
  for (const [key, source] of [
    [STORAGE_KEY, 'current'],
    [LEGACY_STORAGE_KEY, 'legacy'],
  ] as const) {
    try {
      const text = storage.getItem(key)
      if (text) return { project: migrateProject(JSON.parse(text)), source }
    } catch {
      // 손상된 데이터는 건너뛰고 다음 후보 확인
    }
  }
  return { project: createProject(), source: 'default' }
}

/** 실패 시 사용자에게 보여줄 오류 메시지 반환 */
export function saveProject(project: Project, storage: KeyValueStorage | null = browserStorage()): string | null {
  if (!storage) return '이 브라우저에서는 로컬 저장소를 사용할 수 없습니다.'
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(project))
    return null
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
    return quota ? '저장 공간이 부족해 자동 저장에 실패했습니다. 사용하지 않는 CUT을 삭제해 주세요.' : '브라우저 저장이 차단되어 프로젝트를 저장하지 못했습니다.'
  }
}
