import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { isAdminUserId } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  if (!isAdminUserId(user.id)) redirect("/home");
  return <AdminDashboard />;
}
