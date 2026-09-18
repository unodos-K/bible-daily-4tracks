import { createClient } from "@/lib/supabase/server";
import { isAdminUserId } from "@/lib/admin";

export class AdminAuthError extends Error {
  status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AdminAuthError(401, "로그인이 필요합니다.");
  if (!isAdminUserId(user.id)) throw new AdminAuthError(403, "관리자 권한이 없습니다.");
  return { supabase, user };
}
