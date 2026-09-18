import { adminError, adminJson, parseUuid } from "@/app/api/admin/_utils";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireAdmin();
    const userId = parseUuid(params.id);
    if (!userId) return adminJson({ error: "유효한 사용자 UUID가 필요합니다." }, { status: 400 });
    const { data, error } = await supabase.rpc("admin_user_detail", { p_user_id: userId });
    if (error) throw error;
    return adminJson(data);
  } catch (error) {
    return adminError(error);
  }
}
