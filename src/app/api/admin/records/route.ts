import { adminError, adminJson, parseUuid } from '@/app/api/admin/_utils';
import { requireAdmin } from '@/lib/admin-server';
import { kstInput, kstToUtc, validDate } from '@/lib/admin-record-dates';

export const dynamic = 'force-dynamic';

const errors: Record<string, string> = {
  STALE_RECORD: '다른 작업으로 기록이 변경됐습니다. 상세를 다시 조회해 주세요.',
  REQUEST_CONFLICT: '요청 내용이 변경됐습니다. 모달을 다시 열어 주세요.',
  RECORD_NOT_FOUND: '대상 기록이 없습니다.',
  NOT_COMPLETABLE: 'One Verse가 있는 미완료 기록만 완료 처리할 수 있습니다.',
  CANNOT_CLEAR_COMPLETION: '이미 완료된 기록의 완료 시각은 비울 수 없습니다.',
  ONE_VERSE_REQUIRED: 'One Verse가 없는 미완료 기록은 완료 처리할 수 없습니다.',
  START_DATE_REQUIRED: '통독 시작일이 없어 날짜를 검증할 수 없습니다.',
  INVALID_RECORD_DATE: '미래 또는 시작일 이전 날짜는 허용되지 않으며 완료일은 읽은 날짜 이후여야 합니다.',
  INVALID_INPUT: '입력값을 확인해 주세요.',
};

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    // Cookie authentication requires same-origin JSON requests for mutations.
    if (request.headers.get('origin') !== new URL(request.url).origin) {
      return adminJson({ success: false, code: 'INVALID_ORIGIN', error: '허용되지 않은 요청입니다.' }, { status: 403 });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return adminJson({ success: false, code: 'INVALID_INPUT', error: errors.INVALID_INPUT }, { status: 400 });
    }
    let body;
    try { body = await request.json(); } catch { return adminJson({ success: false, code: 'INVALID_INPUT', error: errors.INVALID_INPUT }, { status: 400 }); }
    if (!body || typeof body !== 'object' || !['complete', 'dates'].includes(body.action)
      || typeof body.userId !== 'string' || !parseUuid(body.userId)
      || typeof body.requestId !== 'string' || !parseUuid(body.requestId)
      || !Number.isInteger(body.dayIndex) || body.dayIndex < 1 || body.dayIndex > 365
      || !validDate(body.expectedReadDate)
      || (body.expectedCompletedAt !== null && (typeof body.expectedCompletedAt !== 'string'
        || !/([zZ]|[+-]\d{2}:\d{2})$/.test(body.expectedCompletedAt) || !Number.isFinite(Date.parse(body.expectedCompletedAt))))
      || (body.action === 'dates' && !validDate(body.readDate))) {
      return adminJson({ success: false, code: 'INVALID_INPUT', error: errors.INVALID_INPUT }, { status: 400 });
    }
    let completedAt: string | null = null;
    try {
      if (body.completedDate || body.completedTime) {
        completedAt = kstToUtc(body.completedDate, body.completedTime);
        // Preserve sub-second precision when only read_date was edited.
        if (body.expectedCompletedAt && `${body.completedDate}T${body.completedTime}` === kstInput(body.expectedCompletedAt)) {
          completedAt = body.expectedCompletedAt;
        }
      }
    } catch { return adminJson({ success: false, code: 'INVALID_INPUT', error: errors.INVALID_INPUT }, { status: 400 }); }
    const args = {
      p_user_id: body.userId, p_day_index: body.dayIndex, p_request_id: body.requestId,
      p_expected_read_date: body.expectedReadDate, p_expected_completed_at: body.expectedCompletedAt,
      p_completed_at: completedAt,
    };
    const { data, error } = body.action === 'complete'
      ? await supabase.rpc('admin_complete_one_verse_record', args)
      : await supabase.rpc('admin_update_reading_record_date', { ...args, p_read_date: body.readDate });
    if (error) {
      const message = errors[error.message];
      return adminJson({ success: false, code: message ? error.message : 'SAVE_FAILED', error: message || '저장하지 못했습니다. 다시 시도해 주세요.' },
        { status: error.code === '42501' ? 403 : error.code === '40001' ? 409 : error.code === 'P0002' ? 404 : message ? 400 : 500 });
    }
    return adminJson(data);
  } catch (error) { return adminError(error); }
}
