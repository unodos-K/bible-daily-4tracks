import { adminError, adminJson, parseDate, parsePage, parsePageSize, parseUuid } from "@/app/api/admin/_utils";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const fromDate = parseDate(params.get("from"));
    const toDate = parseDate(params.get("to"));
    if ((params.get("from") && !fromDate) || (params.get("to") && !toDate)) {
      return adminJson({ error: "기간은 YYYY-MM-DD 형식이어야 합니다." }, { status: 400 });
    }
    const readParam = params.get("isRead");
    const isRead = readParam === "true" ? true : readParam === "false" ? false : null;
    const dayParam = params.get("day");
    const day = dayParam && /^\d+$/.test(dayParam) ? Number(dayParam) : null;
    const { data, error } = await supabase.rpc("admin_search_notifications", {
      p_recipient_id: parseUuid(params.get("recipientId")),
      p_actor_id: parseUuid(params.get("actorId")),
      p_type: (params.get("type") ?? "").slice(0, 80) || null,
      p_from: fromDate ? `${fromDate}T00:00:00+09:00` : null,
      p_to: toDate ? `${toDate}T23:59:59+09:00` : null,
      p_is_read: isRead,
      p_day_index: day,
      p_page: parsePage(params.get("page")),
      p_page_size: parsePageSize(params.get("pageSize")),
    });
    if (error) throw error;
    return adminJson(data);
  } catch (error) {
    return adminError(error);
  }
}
