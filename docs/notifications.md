# 앱 내부 알림

## 구성 및 적용 상태

- 홈·말씀뷰어·친구·마이페이지의 기존 헤더에 공통 `NotificationBell` 배치. 별도의 상단 바를 추가하지 않아 화면 높이/스크롤 구조를 유지한다.
- `MainLayout`의 `NotificationProvider`에서 인증 사용자 ID당 한 번 구독한다. 화면 전환 시 상태를 유지하고 계정 변경/로그아웃 시 이전 목록과 요청을 폐기한다.
- 상단에는 unread count만 요청하며, 목록은 패널을 열 때 20개씩 조회한다. 패널을 열기만 해서는 읽음 처리하지 않는다.
- 알림 생성을 위한 migration 파일은 `supabase/migrations/20260918090000_notifications.sql`이다.
- **원격 DB 적용은 아직 하지 않았다.** 자동 승인 심사에서 운영/공유 DB 영구 변경에 대한 별도 승인이 필요하다고 거절했다. 원격 테이블·RLS·publication은 읽기 전용으로 확인했다.
- 원격 migration history에는 첫 migration만 기록되어 있지만, 여러 후속 변경의 컬럼은 이미 존재했다. `supabase db push`로 전체 파일을 적용하지 않는다. 승인 후 이번 파일만 별도로 적용하고 해당 버전만 이력에 등록해야 한다. 과거 이력 정리는 별도 작업이다.

## 스키마와 보안

`notifications`: `id`, `recipient_id`, `actor_id`, `type`, `related_day_index`, `metadata`, `event_key`, `is_read`, `read_at`, `created_at`.

`metadata`에는 필요에 따라 `book`, `chapter`, `verse`, `method`, `days`, `achieved_on`을 보관한다. 고정 문장이나 닉네임 스냅샷은 저장하지 않고, 목록 조회 시 현재 프로필을 배치 조회해 문구를 만든다. 수신자가 삭제되면 cascade, 활동 사용자가 삭제되면 actor는 NULL로 남는다.

- RLS `notifications_read_own`: 수신자 본인만 SELECT.
- authenticated/anon에게 직접 INSERT/UPDATE/DELETE 권한을 주지 않는다.
- `mark_notifications_read(p_id?, p_before?)` RPC만 본인 알림을 읽음 처리한다. 단건과 모두 읽음 모두 서버 시각으로 `read_at`을 저장한다. 모두 읽음의 cutoff 이후 새 알림은 읽지 않음으로 남는다.
- 생성 helper/trigger 함수는 `SECURITY DEFINER`, 고정된 빈 `search_path`, 완전한 스키마 이름을 사용하고 public/anon/authenticated의 직접 실행 권한을 제거했다.
- 친구 활동/아멘은 양쪽 accepted 관계를 확인한다. 현재 별도 차단 테이블은 없다. 기존 친구·기록·좋아요 RLS는 변경하지 않는다.
- 수신자/actor 존재 여부와 자기 알림 방지를 확인한다. 저장 단계의 unique `(recipient_id,event_key)`가 동시 실행/재시도 중복을 막는다.

## 이벤트와 이동 경로

| type | DB의 실제 이벤트 | 클릭 경로 |
|---|---|---|
| friend_request | friendships pending INSERT | /friends?tab=requests |
| friend_request_accepted | pending → accepted UPDATE 또는 초대 수락 RPC의 방향성 accepted INSERT | /friends |
| one_verse_liked | one_verse_likes INSERT, 공개 완료 One Verse와 accepted 친구 확인 | /mypage?date=YYYY-MM-DD |
| reading_streak_achieved | reading_records의 완료 전환 | /friend/actorId |
| memorization_completed | one_verse JSON의 isMemorized 및 memorizedMethods 변화 | /friend/actorId |
| one_verse_completed | one_verse가 존재하는 완료 기록의 최초 완료 | /friend/actorId |

삭제된 actor는 친구 화면으로 이동하며, 기존 상세/읽기 화면의 빈 상태 처리를 재사용한다. 친구 요청 탭은 URL 상태로 관리하여 이미 친구 화면에 있을 때도 알림 링크가 작동한다.

아멘 키는 actor/author/Day를 사용하므로 취소·재등록으로 다시 알리지 않는다. 마음새김은 actor/Day/책·장·절/음성 또는 쓰기 기준으로 한 번씩 생성한다. 기존 클라이언트의 `isMemorized`만 있는 기록은 일반 마음새김 알림으로 호환한다. 완료 취소 후 재완료도 기존 이벤트 키를 재사용한다.

## 읽기와 마음새김 기준

기존 앱에 연속 읽기 계산 함수는 없었다. `completed_at AT TIME ZONE 'Asia/Seoul'`의 중복 없는 실제 완료 날짜를 기준으로 계산한다. 같은 날 여러 Day를 읽어도 하루, 날짜가 끊기면 연속 기록이 끊긴다. 계산은 유지하지만 `reading_streak_achieved` 생성은 기준 재설계 전까지 migration에서 일시 중지한다.

기존 음성/쓰기 성공은 모두 `isMemorized`로만 저장되고 방법은 메모리 상태에만 있었다. 성공 확인 callback에 방법을 전달하고 `one_verse.memorizedMethods` 배열에 voice/writing을 보존한다. 성공 판단 방식·점수·읽기 완료 방식은 그대로다. One Verse 완료는 선택만 한 draft가 아니라 완료 시각과 One Verse가 모두 있는 기록이다.

## 검증

`npm run test:notifications`는 PGlite의 실제 PostgreSQL SQL/PLpgSQL/RLS를 사용하며 외부 DB에 연결하지 않는다. 친구 요청/수락, 아멘 취소/재등록, 비친구 차단, 4개 연속 읽기 기준, 완료 취소/재완료, 음성/쓰기별 성공, 본인만 읽음 처리, 위조 INSERT/helper 호출 차단, 비로그인 조회 차단을 검증한다.

브라우저 컴포넌트 테스트는 실제 NotificationProvider/Panel/Bell/ReadHeader와 Chrome을 사용하고 데이터 및 라우터는 테스트 어댑터로 연결한다. 운영 계정 A/B 사이 실제 이벤트 전송과 실제 iOS/Android PWA 검증은 원격 migration 승인 및 적용 후 별도로 진행해야 한다.

구현 시 검증 결과: 320px·390px·1280px에서 99+ 배지, 20개 페이지 나누기, 패널 열기 시 읽지 않음 유지, 단건 읽음 후 이동, 모두 읽음, 계정 변경 시 이전 목록 제거를 통과했다. 가로 넘침·런타임 오류 없음. `npm run build`, `npx tsc --noEmit`, `npm run lint`, DB 회귀 테스트를 통과했다. 기존 PWA 대용량 청크 precache 및 Node 버전 경고는 별개로 남아 있다.

## 확장

`notifications.id`와 `event_key`는 향후 푸시 작업의 멱등 키로 사용할 수 있다. DB INSERT 이벤트에 서버 outbox/worker를 연결하고 사용자별 push subscription과 발송 상태 테이블을 추가하면 된다. 읽음 상태와 푸시 전송 상태는 분리한다. 이번에는 권한 요청·PushManager·Web Push 발송을 추가하지 않았다.

참고: [Supabase 함수 보안](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
