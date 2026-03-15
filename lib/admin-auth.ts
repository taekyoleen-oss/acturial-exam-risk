/**
 * 관리자 인증 (ADMIN_USER_ID 환경변수 기반)
 * Supabase Auth 미사용 — 단순 시크릿 비교 방식
 */
export function verifyAdmin(request: Request): boolean {
  const adminId = request.headers.get('x-admin-id');
  const envAdminId = process.env.ADMIN_USER_ID;

  if (!envAdminId) return false;
  return adminId === envAdminId;
}
