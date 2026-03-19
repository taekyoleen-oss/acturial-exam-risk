import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Collect cookies to set (Supabase auth refresh)
  let cookiesToSet: Array<{ name: string; value: string; options: Partial<ResponseCookie> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cs) { cookiesToSet = cs; },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Set custom headers BEFORE creating the response so they're captured correctly
  if (user) {
    requestHeaders.set('x-user-id', user.id);
    if (user.id === process.env.ADMIN_USER_ID) {
      requestHeaders.set('x-admin-id', process.env.ADMIN_USER_ID!);
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Apply any auth cookie updates
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
