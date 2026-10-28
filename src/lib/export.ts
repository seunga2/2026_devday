import JSZip from 'jszip'
import { PROJECT_VERSION, type Cut } from '../types/scene'
import type { CaptureFn } from './capture'
import { evaluateMotion, frameFromSettings, resolveEndFrame } from './motion'
import { effectivePrompt } from './prompt'

export const EXPORT_ROOT = 'scene-preview-export'

export interface ExportProgress {
  percent: number
  message: string
}

export interface ExportOptions {
  projectName: string
  capture: CaptureFn
  onProgress?: (p: ExportProgress) => void
  /** 테스트에서 고정 시간 주입 */
  now?: Date
}

export const cutFolder = (index: number) => `cut-${String(index + 1).padStart(2, '0')}`

/** 시작 프레임이 없으면 현재 구도를 시작 프레임으로 사용 */
function motionForExport(cut: Cut) {
  return cut.motion.start ? cut.motion : { ...cut.motion, start: frameFromSettings(cut.camera, cut.lighting, cut.aspect) }
}

export function sceneSettings(cut: Cut, projectName: string) {
  const motion = motionForExport(cut)
  const start = evaluateMotion(motion, 0)
  const end = evaluateMotion(motion, 1)
  return {
    schemaVersion: PROJECT_VERSION,
    generator: 'Scene Preview (rule-based prompt, no AI model)',
    projectName,
    cut: { id: cut.id, name: cut.name },
    aspect: cut.aspect,
    camera: cut.camera,
    lighting: cut.lighting,
    motion: {
      type: cut.motion.type,
      duration: cut.motion.duration,
      easing: 'smoothstep',
      startFrameSaved: !!cut.motion.start,
      endFrameSaved: !!cut.motion.end,
      start: start && { position: start.position, target: start.target, fov: start.fov, lighting: start.lighting },
      end: end && { position: end.position, target: end.target, fov: end.fov, lighting: end.lighting },
      resolvedEnd: resolveEndFrame(motion),
    },
    scene: { action: cut.action, mood: cut.mood },
    prompt: { text: effectivePrompt(cut), editedByUser: cut.prompt.edited },
  }
}

function readme(projectName: string, cuts: Cut[], now: Date): string {
  const lines = [
    'Scene Preview — 3D Video Previsualization Export',
    '================================================',
    '',
    `Project : ${projectName}`,
    `Exported: ${now.toISOString()}`,
    `Cuts    : ${cuts.length}`,
    '',
    'Each cut folder contains:',
    '  start-frame.png      Shooting camera at 0% of the camera motion',
    '  end-frame.png        Shooting camera at 100% of the camera motion',
    '  video-prompt.txt     English video prompt (rule-based template; user edits preserved)',
    '  scene-settings.json  Camera, lighting, motion and scene description data',
    '',
    'Prompts are generated from templates, not by an AI model. Use them with any video generation tool',
    'together with start-frame.png / end-frame.png as first/last frame references.',
    '',
    ...cuts.map((c, i) => `${cutFolder(i)}  ${c.name}  ·  ${c.motion.type}  ·  ${c.motion.duration}s  ·  ${c.aspect}`),
  ]
  return lines.join('\n') + '\n'
}

/** ZIP 생성. 사용자 화면·스토어 상태는 변경하지 않는다 (캡처는 별도 카메라 사용) */
export async function buildExportZip(cuts: Cut[], opts: ExportOptions): Promise<Blob> {
  if (cuts.length === 0) throw new Error('내보낼 CUT이 없습니다.')
  const report = opts.onProgress ?? (() => {})
  const zip = new JSZip()
  const root = zip.folder(EXPORT_ROOT)!
  const total = cuts.length * 2
  let done = 0

  for (const [i, cut] of cuts.entries()) {
    const folder = root.folder(cutFolder(i))!
    const motion = motionForExport(cut)
    for (const [which, progress] of [
      ['start', 0],
      ['end', 1],
    ] as const) {
      report({ percent: Math.round((done / total) * 80), message: `${cut.name} ${which === 'start' ? '시작' : '종료'} 프레임 렌더링 중` })
      const pose = evaluateMotion(motion, progress)
      if (!pose) throw new Error(`${cut.name}: 카메라 프레임 정보가 올바르지 않습니다.`)
      let png: Blob
      try {
        png = await opts.capture(pose, cut.aspect, { lightColor: pose.lightColor })
      } catch (e) {
        throw new Error(`${cut.name} ${which === 'start' ? '시작' : '종료'} 프레임 캡처 실패: ${e instanceof Error ? e.message : String(e)}`)
      }
      // Blob을 그대로 넣어 base64 변환으로 인한 메모리 증가를 피한다
      folder.file(`${which}-frame.png`, png)
      done++
    }
    folder.file('video-prompt.txt', effectivePrompt(cut) + '\n')
    folder.file('scene-settings.json', JSON.stringify(sceneSettings(cut, opts.projectName), null, 2))
  }
  root.file('README.txt', readme(opts.projectName, cuts, opts.now ?? new Date()))

  report({ percent: 85, message: 'ZIP 파일 압축 중' })
  let last = 85
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (m) => {
    // 퍼센트가 바뀔 때만 알려 UI 갱신 횟수를 줄인다
    const percent = 85 + Math.round(m.percent * 0.14)
    if (percent !== last) report({ percent: (last = percent), message: 'ZIP 파일 압축 중' })
  })
  report({ percent: 100, message: '완료' })
  return blob
}

export function exportFileName(projectName: string, scope: 'current' | 'all', cut?: Cut): string {
  const safe = (s: string) => s.trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'project'
  return scope === 'all' ? `scene-preview-${safe(projectName)}.zip` : `scene-preview-${safe(projectName)}-${safe(cut?.name ?? 'cut')}.zip`
}

let exportLock = false
/** 중복 실행 방지 래퍼 */
export async function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  if (exportLock) throw new Error('이미 내보내기가 진행 중입니다.')
  exportLock = true
  try {
    return await task()
  } finally {
    exportLock = false
  }
}
export const isExportRunning = () => exportLock
