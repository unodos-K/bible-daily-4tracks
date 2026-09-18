import { adminError, adminJson } from "@/app/api/admin/_utils";
import { requireAdmin } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.rpc("admin_summary");
    if (error) throw error;
    return adminJson(data);
  } catch (error) {
    return adminError(error);
  }
}
