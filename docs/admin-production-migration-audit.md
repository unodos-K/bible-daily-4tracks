# 관리자 DB 운영 적용 기록 — 2026-09-19

대상: `bible-daily-4tracks` / `olyenmbyrgiekwdsqmql`.
코드 커밋·푸시·배포는 이 작업에 포함하지 않았다.

## 이력 복구

복구 전 원격 이력: `20260823033422`만 존재.
다음 5개는 운영 객체를 PGlite에서 SQL을 실행해 생성한 기대 카탈로그와 비교한 뒤
사용자의 명시 승인에 따라 CLI `migration repair --status applied`로 이력만 복구했다.

- `20260823205000_split_invites_and_friends.sql`
- `20260901090000_secure_invite_acceptance.sql`
- `20260902090000_friendship_like_integrity.sql`
- `20260902100000_one_verse_candidates.sql`
- `20260918090000_notifications.sql`

컬럼·타입·기본값·NOT NULL, PK/FK/CHECK/UNIQUE, 인덱스 정의,
함수 본문·인자·기본 인자·반환형·언어·SECURITY DEFINER·search_path·실행 권한,
트리거 연결, RLS/정책, 테이블 권한, Realtime 등록을 확인했다.
PG18 기반 로컬 엔진의 명명된 NOT NULL 제약은 PG17 운영 DB의 `attnotnull`과 비교했다.
첫 번째 마이그레이션의 초대 정책은 두 번째가 변경한 최종 상태로 비교했다.

기존 친구 상태를 모두 accepted로 바꾸던 UPDATE는 로컬 첫 번째 SQL에서 제거했다.
운영에는 다시 실행하지 않았다. 과거 최초 주석은 기존 관계를 수락 상태로 간주하는
전환용 보정을 설명했으나 현재 pending 요청에는 적합하지 않다.
이미 적용된 다른 환경의 DB를 파일 수정만으로 변경하거나 복원하지 않는다.
다른 프로젝트의 실제 적용 이력은 조회하지 않았다.

운영에 기존부터 있던 공개 읽기 정책과 후보 테이블의 기본 ACL도 기록했다.
후보 테이블의 추가 ACL은 운영 `pg_default_acl`과 일치한다.
이들 정책·권한을 확대하거나 축소하지 않았다. 특히 TRUNCATE는 RLS의 보호 대상이
아니므로 기존 기본 권한의 적정성은 별도 권한 검토 대상이다.

## 신규 적용

repair 후 dry-run에서 아래 3개만 출력됨을 확인하고
`supabase db push --linked --yes`로 순서대로 적용했다.

- `20260919090000_refine_notifications.sql`
- `20260919110000_atomic_one_verse_completion.sql`
- `20260919130000_admin_readonly_inspection.sql`

세 파일 모두 성공. 실패·부분 적용·실패 파일 repair 없음.
적용 후 원격 이력은 초기 버전과 위 8개 전부 존재하며 dry-run은 미적용 0개.

실제 변경: 폐기 알림 타입 제외, 아멘 알림 날짜 metadata 반영,
기존 요청에 따른 연속 읽기 알림 발송 비활성화, 최종 One Verse 자동 완료 RPC,
관리자 조회 RPC 추가. RPC 생성 자체는 기존 읽기 기록을 변경하지 않는다.
폐기 알림 삭제 대상은 적용 직전 0건이었으며 실제 삭제도 0건이다.

## 데이터 보존

적용 전후 서버 내 전체 행의 해시를 집계해 건수와 함께 비교했다.
원시 사용자 내용은 출력하거나 다운로드하지 않았다.

| 테이블 | 전후 건수 | 집계 해시 |
|---|---:|---|
| profiles | 15 | 동일 |
| reading_settings | 15 | 동일 |
| reading_records | 93 | 동일 |
| friendships | 40 | 동일 |
| one_verse_likes | 113 | 동일 |
| one_verse_candidates | 60 | 동일 |
| invites | 0 | 동일 |
| notifications | 54 | 동일 |

친구 pending 10건 / accepted 30건 / NULL 0건 보존.
테스트 알림·요청·아멘은 운영에 생성하지 않았다.

## 검증

- 첫 5개 및 최종 8개 카탈로그의 필요한 효과 비교: 차이 0개.
- 관리자 helper는 UUID를 `IS DISTINCT FROM`으로 검사하며 NULL도 차단.
- 관리자 외부 RPC 5개 모두 조회 전에 helper 호출; SECURITY DEFINER / 빈 search_path.
- PUBLIC/anon 실행 불가, authenticated 실행 가능하나 본문에서 관리자 검사.
- helper는 authenticated에도 실행 권한 없음.
- save_final_one_verse: authenticated만 사용자 역할 중 실행 가능, 빈 search_path,
  auth.uid() 소유권 사용, 기존 완료 기록 갱신 제한. 함수 본문 일치 확인.
- 운영 읽기 전용 트랜잭션의 역할/claim 모의 테스트: anon·NULL·비관리자 각각
  조회 RPC 5개 전부 SQLSTATE 42501; 관리자 claim은 5개 모두 실행 성공.
- 실제 브라우저 로그인·HTTP API·모바일 세션 테스트는 미실행.
- 로컬 `npm run test:admin`, `npm run test:notifications`, `git diff --check` 통과.

첫 NULL 테스트는 빈 문자열 sub를 JWT JSON에도 넣어 UUID 형식 오류가 났다.
미인증 JWT를 `{}`로 바로잡아 NULL 인증값의 42501 차단을 재검증했다.
이 오류는 테스트 입력 오류이며 마이그레이션 적용 실패가 아니다.

검증 도구: `scripts/verify-migration-catalog.mjs`,
`scripts/snapshot-migration-data.mjs`, `scripts/verify-admin-db-access.mjs`.
카탈로그 및 집계 증빙은 `/private/tmp/oneverse-migration-audit/`에 보관된다.

DB 의존성 준비는 완료. 코드 배포와 배포 후 관리자/일반 사용자/비로그인
브라우저 및 API 확인은 후속 작업이다.
