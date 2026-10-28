# Scene Preview — 3D Video Previsualization Studio (v2)

3D 공간에서 카메라·조명·움직임을 직접 설계하고, 촬영 CUT별 시작/종료 프레임 PNG와 영문 영상 프롬프트를 ZIP으로 내보내는 사전 시각화 도구입니다. 유료 AI API를 쓰지 않으며, 프롬프트는 규칙 기반 템플릿으로 생성합니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (56 tests)
npm run typecheck
npm run build      # dist/ (Vercel: Vite 프리셋 그대로 사용 가능)
```

## 사용 흐름

3D 탐색(드래그 회전 · 우클릭 이동 · 휠 확대 · 뷰포트 클릭 후 WASD/QE) → 카메라·조명 슬라이더(촬영 미리보기에 즉시 반영) → 시작/종료 프레임 저장 → 움직임·길이 선택 후 재생/타임라인 → 하단 탭에서 CUT 관리 · 프롬프트 편집 · ZIP 내보내기.

## 구조

| 경로 | 역할 |
|---|---|
| `src/lib/` | 순수 로직: `camera` `lighting` `motion`(보간·종료 프레임 보정) `playback` `prompt` `capture` `export` `schema`(Zod·마이그레이션) `persistence` |
| `src/store/store.ts` | Zustand 프로젝트 상태. 활성 CUT이 편집 단위이며 LocalStorage 자동 저장 |
| `src/scene/` | R3F 씬. 단일 Canvas + scissor로 탐색·촬영 두 뷰를 렌더링 (`Viewports.tsx`) |
| `src/components/` | UI 패널 |

- 탐색 카메라와 촬영 카메라 분리. 탐색 전용 기즈모(레이어 1)는 촬영 화면·PNG에 포함되지 않습니다.
- 재생 진행률은 React state가 아닌 `playback` 컨트롤러로 처리해 재생 중 리렌더링이 없습니다.
- 저장 형식 v3. 기존(Codex) 배포본의 `scene-preview-project-v1` 데이터를 자동으로 마이그레이션합니다.
- 내보내기: 시작 프레임 = 모션 0%, 종료 프레임 = 모션 100%. 16:9는 1920×1080, 9:16은 1080×1920.
