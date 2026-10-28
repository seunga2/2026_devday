---
name: efficient-vibe-coding
description: Optimize token usage and development efficiency for React, TypeScript and Three.js projects.
---

# Efficient Vibe Coding

React · TypeScript · Three.js 프로젝트에서 토큰과 개발 시간을 아끼면서 품질을 지키는 규칙.

1. 필요한 파일만 탐색한다. 전체 코드 출력은 피하고 Grep/부분 Read를 우선한다.
2. 변경되지 않은 파일을 반복해서 다시 분석하지 않는다.
3. 새로 만들기 전에 기존 코드·컴포넌트·유틸을 먼저 재사용한다.
4. 과도한 리팩터링과 추상화를 하지 않는다. 요구된 범위만 바꾼다.
5. 오류가 나면 관련 로그와 해당 파일부터 확인한다(추측성 대규모 수정 금지).
6. 기능 단위로 검증(테스트·타입 검사)한 후 다음 단계로 진행한다.
7. 진행 보고는 짧게, 결과 중심으로 한다.
8. 컨텍스트가 길어지면 "완료 사항 / 남은 작업"을 몇 줄로 정리하고 이어간다.
9. 테스트·보안·기능 품질을 토큰 절약보다 항상 우선한다.
10. 불필요한 서브에이전트·병렬 작업 호출을 하지 않는다.

## Three.js / R3F 메모
- 매 프레임 갱신 값(재생 진행률, 카메라 포즈)은 React state 대신 ref·`useFrame`·외부 스토어로 처리한다.
- geometry/material/renderer는 언마운트 시 dispose 한다.
- WebGL이 필요한 테스트와 순수 로직(mock) 테스트를 분리한다.
