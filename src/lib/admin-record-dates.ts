// Date inputs always represent Asia/Seoul, independent of the browser timezone.
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function kstInput(instant: string | Date = new Date()) {
  const time = new Date(instant).getTime();
  if (!Number.isFinite(time)) throw new Error('유효하지 않은 시각입니다.');
  return new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

export function kstToUtc(date: string, time: string): string {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) {
    throw new Error('날짜와 시간을 정확하게 입력해 주세요.');
  }
  return new Date(`${date}T${time}+09:00`).toISOString();
}
