export const ADMIN_USER_ID = "77d3a5c6-f9bb-447e-b6cf-be5c663dce54";

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId === ADMIN_USER_ID;
}
