import { adminError, adminJson, parsePage, parsePageSize } from "@/app/api/admin/_utils";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAdmin();
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const page = parsePage(url.searchParams.get("page"));
    const pageSize = parsePageSize(url.searchParams.get("pageSize"));
    const { data, error } = await supabase.rpc("admin_search_users", { p_query: query, p_page: page, p_page_size: pageSize });
    if (error) throw error;
    return adminJson(data);
  } catch (error) {
    return adminError(error);
  }
}
