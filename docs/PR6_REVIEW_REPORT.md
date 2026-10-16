# PR #6 리뷰 반영 보고서

- 대상 브랜치: `feature/backend-dev-script`
- 이번 작업: 요청 항목 6~8번 및 검증, 보고서 작성
- 누적 작업: 앞선 0~5번 결과를 포함해 설명
- 커밋·push: 수행하지 않음. 단, 0번의 명시적 pull 요청으로 merge commit은 생성됨.
- 원칙: 참고 리뷰 보고서보다 사용자가 지정한 범위와 지침을 우선함.

## 0~8번 변경 내용

| 번호 | 변경 내용                                                                                                                              | 주요 파일                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0    | `git pull origin develop`으로 충돌 없이 병합. 병합 직후 AGENTS.md와 shared 티켓 스키마가 origin/develop과 동일함을 확인                | Git 병합, shared는 develop 변경만 반영                               |
| 1    | 생성·수정을 shared 스키마로 검증하고 parsed.data만 사용. 잘못된 입력·경로 ID는 400. 빈 memo도 반영                                     | `backend/src/modules/ticket/ticket.controller.ts`                    |
| 2    | 티켓 기능을 modules/ticket으로 이동. controller → service → repository 호출 구조로 분리. 메모리 배열은 repository에만 배치             | `backend/src/modules/ticket/`, `backend/src/server.ts`               |
| 3    | getRequesterId 한 곳에서 테스트 사용자 ID 1 반환. service가 생성 시 서버에서 userId를 전달. 요청 body의 userId는 무시                  | `requester.ts`, `ticket.service.ts`, `ticket.repository.ts`          |
| 4    | 삭제 시 deletedAt만 기록. repository가 삭제된 항목을 목록·단건에서 제외하고 수정·재삭제도 거절                                         | `ticket.repository.ts`                                               |
| 5    | 잘못된 JSON은 400과 공통 error 형식으로 응답. 그 외 처리되지 않은 오류는 내부 정보 없는 500 응답                                       | `backend/src/server.ts`                                              |
| 6    | 기존에 적용돼 있던 tsx watch 개발 명령을 실제로 실행해 확인. PR에서 누락된 기존 start 명령 복구                                        | `backend/package.json`                                               |
| 7    | NODE_ENV=development에서만 Swagger 등록. shared 생성·수정 스키마에서 OpenAPI 요청 스키마 생성. 소스·빌드 실행 모두 문서 경로 탐색 가능 | `backend/src/swagger.ts`, `ticket.routes.ts`, `backend/.env.example` |
| 8    | 루트 package.json의 tsx 추가 이유 확인. 실제 dev 명령이 사용하므로 유지. 이번 작업에서 루트 package.json·lock 변경 없음                | `package.json` 확인만 수행                                           |

## 이번 6~8번의 구체적인 차이

### 6. 개발 실행

현재 dev 명령은 이미 `tsx watch src/server.ts`였다. 다시 수정하거나 같은 역할의 패키지를 추가하지 않고 실제 npm 명령으로 기동을 확인했다.

develop에 있었던 `start: node dist/server.js`가 PR 브랜치에서 빠져 있어 복구했다. build·typecheck 명령 이름은 유지했다.

### 7. Swagger 공개 범위와 스키마

이전에는 환경에 관계없이 Swagger가 등록됐다. 이제 `NODE_ENV`가 정확히 `development`인 경우에만 `/api-docs`를 등록한다. `production`과 미설정 상태에서는 문서 페이지·초기화 스크립트·CSS 모두 404다.

라우터 주석은 생성 요청에 `CreateTicketInput`, 수정 요청에 `UpdateTicketInput`을 참조한다. 이 두 문서 스키마는 zod의 기존 `toJSONSchema` 기능으로 shared 스키마에서 생성한다. 필드와 제한 숫자를 Swagger에 별도로 복사하지 않는다.

- 필드: title, location, visitDate, memo
- 생성 필수: title, location, visitDate
- 수정 필드: 모두 선택
- title·location 최대 20자, memo 최대 80자: shared에서 자동 반영
- visitDate: date 형식
- 서버 URL: 현재 서버의 상대 주소 `/`
- 주석 파일 경로: 현재 파일 기준 절대 경로를 사용하고 .ts·.js 모두 탐색

환경변수 이름 `NODE_ENV`를 `backend/.env.example`에 추가했다. 예시 파일에는 값이나 비밀값을 넣지 않았다. 앱이 이 예시 파일을 자동으로 읽는 것은 아니므로 실행 환경에서 변수를 설정해야 한다.

### 8. 루트 package.json

origin/develop과 비교했을 때 추가된 항목은 개발 의존성 `tsx: 4.23.15`다. backend의 dev 명령이 실제로 이 실행 도구를 사용하므로 불필요한 변경이 아니다. npm workspace에서 루트 도구를 사용할 수 있어 현재 위치를 유지했다.

이번 작업에서 패키지를 추가·삭제하거나 루트 package.json·package-lock.json을 수정하지 않았다. 기존 swagger-jsdoc·swagger-ui-express도 문서 생성·표시에 계속 사용한다.

## 실행 방법

레포 루트의 PowerShell에서 개발 서버 실행:

```powershell
npm run build -w shared
$env:NODE_ENV = 'development'
npm run dev -w backend
```

기본 포트는 3000이며, 개발 문서는 `http://localhost:3000/api-docs/`에서 확인한다.

빌드 결과 실행:

```powershell
npm run build -w backend
$env:NODE_ENV = 'production'
npm run start -w backend
```

운영 배포 환경의 NODE_ENV는 production으로 설정한다. 실제 배포 설정 파일은 이번 작업에서 수정하지 않았다.

## 검증 결과

| 검사                                                   | 결과                                                |
| ------------------------------------------------------ | --------------------------------------------------- |
| npm run format                                         | 통과                                                |
| npm run format:check                                   | 통과                                                |
| npm run lint                                           | 통과                                                |
| npm run typecheck                                      | 통과                                                |
| npm run build -w backend                               | 통과                                                |
| npm run dev -w backend, NODE_ENV=development           | 서버 기동·health·Swagger 통과                       |
| npm run start -w backend, NODE_ENV=development         | 빌드된 서버·Swagger 스키마 통과                     |
| npm run start -w backend, NODE_ENV=production          | 서버 정상, Swagger 페이지·정적 파일 404             |
| npm run start -w backend, NODE_ENV 미설정              | 서버 정상, Swagger 페이지·정적 파일 404             |
| 레포 루트에서 node backend/dist/server.js, development | 작업 디렉터리와 관계없이 Swagger 경로·스키마 확인   |
| Swagger 생성·수정 문서                                 | 필드·필수 여부·길이 제한·날짜 형식·라우터 참조 확인 |
| 각 실행 방식의 API 회귀 검사                           | 생성·목록·단건·수정·삭제 정상                       |
| 제목 길이 초과                                         | shared 상수보다 1자 긴 제목은 400                   |
| 빈 메모 수정                                           | 빈 문자열 반영                                      |
| 요청 body의 userId 조작                                | 서버 고정 요청자 ID 유지                            |
| 삭제 후 목록·단건                                      | 목록에서 제외, 단건 404                             |
| 잘못된 JSON                                            | 400, INVALID_INPUT JSON 응답                        |

서버 검증은 별도 로컬 포트에서 실행했고, 검사 후 해당 프로세스와 자식 프로세스를 종료했다. AWS 배포·실제 DB 연결은 검사하지 않았다.

앞선 3~5번 검증에서는 삭제 시 Date 기록, 삭제된 티켓 수정·재삭제 404, body의 deletedAt 무시도 확인했다.

## 임시 처리와 후속 사항

- 저장소는 사용자 지시대로 메모리 배열이다. 서버 재시작 시 변경이 사라지고 서버 간 공유되지 않는다. DB 스키마가 준비되면 repository를 Prisma로 교체해야 한다.
- 요청자는 테스트 사용자 ID 1로 고정했다. 로그인 구현 시 getRequesterId를 검증된 인증 정보 기반으로 교체해야 한다.
- 주인 확인 비교·열람 권한 검사는 사용자 지시대로 아직 추가하지 않았다.
- 기존 expiresAt 계산과 24시간 안내 문구는 유지했다. 만료 자동 삭제·조회 제외 기능은 이번 작업 범위가 아니며 구현하지 않았다.
- shared에는 아직 공통 에러 코드 목록이 없다. shared 수정 금지 범위에 따라 기존 INVALID_INPUT·TICKET_NOT_FOUND·INTERNAL_SERVER_ERROR를 유지했다. 공통 목록 정리는 후속 작업이 필요하다.
- backend/test.http의 기존 예시 요청 배치는 이번 6~8번 범위에 포함하지 않았다. 검증은 별도의 실제 HTTP 요청으로 수행했다.
- shared 소스, AGENTS.md, .github, Prisma, 배포 파일, ESLint·TypeScript·Prettier 설정은 직접 수정하지 않았다.

## PR 제목 제안

`fix: 티켓 API 리뷰 반영 및 개발 문서 노출 제한`

## PR 본문 초안

### 무엇을

shared 기반 입력 검증, 티켓 계층 분리, 고정 요청자, 소프트 삭제, JSON 오류 처리를 적용했다. 개발 실행을 확인하고 start 명령을 복구했다. Swagger는 개발 환경에서만 제공하며 요청 스키마를 shared에서 생성한다.

### 왜

입력 규칙의 중복을 없애고 DB 전환 위치를 repository로 모으기 위해서다. 클라이언트가 보낸 userId를 사용하지 않고, 삭제 기록을 남기며, 운영에서 개발 문서가 노출되지 않게 한다.

### 어떻게 확인했는지

포맷·lint·타입 검사·백엔드 빌드를 통과했다. dev·start 및 운영·환경변수 미설정 상태에서 서버를 띄워 CRUD, 오류 처리, Swagger 접근 여부와 스키마를 확인했다. 세부 결과는 위 검증 표를 참고한다.

### 보안·아키텍처 점검

- 열람 권한: 해당 있음. ticket.service.ts의 티켓 조회·수정·삭제 기능이 있다. 주인 비교·열람 권한 검사는 사용자의 명시적 후속 구현 지시에 따라 미구현 상태다.
- 사진 주소: 해당 없음. 사진 업로드·주소 발급 기능을 추가하지 않았다.
- 입력 검증: 해당 있음. ticket.controller.ts는 shared의 createTicketSchema·updateTicketSchema 및 경로 ID 스키마로 검증한다. server.ts에서 잘못된 JSON을 처리한다.
- 비밀값: 해당 없음. 키·비밀번호·토큰을 추가하지 않았다. backend/.env.example에 NODE_ENV 이름만 추가했다.
- 서버 상태: 해당 있음. ticket.repository.ts는 사용자가 허용한 임시 메모리 배열을 사용한다.
- 구조 변경: 해당 있음. modules/ticket으로 기능을 분리하고 backend/package.json의 start를 복구했다. DB 스키마·루트 설정·API 응답의 바깥 형식은 직접 변경하지 않았다.
- 추가한 패키지: 이번 작업에서 추가 없음. PR의 기존 tsx는 개발 실행, swagger-jsdoc는 문서 생성, swagger-ui-express는 문서 UI 제공에 사용한다.

### 리뷰어가 특히 봐야 할 부분

ticket.repository.ts의 임시 저장소와 소프트 삭제 조건, requester.ts의 테스트 사용자, swagger.ts의 개발 환경 제한과 shared 스키마 변환을 확인해 주세요. 권한 검사는 로그인 작업 때 구현해야 한다.
