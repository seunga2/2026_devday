# Scene Preview — Claude Code 작업 규칙

3D 영상 사전 시각화(previs) 웹앱. React + TypeScript + Vite + R3F + Zustand + Zod + JSZip + Vitest.

## 소통·작업 방식
- 한국어로 간결하게 소통하고, 기능 완료 시 핵심 결과만 보고한다.
- 작업 전 프로젝트 구조(아래)를 먼저 확인하고, 관련 파일만 탐색한다.
- 기존 코드·컴포넌트(`src/components/ui.tsx`, `src/lib/*`)를 재사용하고 중복 기능을 만들지 않는다.
- 핵심 기능을 우선 개발한다. 정상 동작하는 기능은 불필요하게 수정하지 않는다.
- 파일 변경 범위를 최소화한다.
- 변경 후 `npm test`, `npm run typecheck`, `npm run build`를 반드시 통과시킨다.
- 장식용(동작하지 않는) 버튼을 만들지 않는다. 유료 AI API를 사용하지 않는다.

## 저장소·배포 보호
- 기존 GitHub(seunga2/3D_scenepreview)과 Vercel(3d-scenepreview.vercel.app) 환경을 변경하지 않는다.
- 커밋·Push·배포는 사용자의 명시적 요청이 있을 때만 수행한다.

## 구조
- `src/types/scene.ts` 도메인 타입 · `src/lib/schema.ts` Zod 스키마·마이그레이션
- `src/lib/{camera,lighting,motion,playback,prompt,capture,export,persistence}.ts` 순수 로직(테스트 대상)
- `src/store/store.ts` Zustand 프로젝트 상태(CUT = 편집 단위, 자동 저장)
- `src/scene/*` R3F 씬. 단일 Canvas + scissor로 탐색/촬영 두 뷰를 렌더링(`Viewports.tsx`)
- `src/components/*` UI 패널
- 재생 진행률은 React state가 아닌 `playback` 컨트롤러(ref·DOM 직접 갱신)로 관리한다.
