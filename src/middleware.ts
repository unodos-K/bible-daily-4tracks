import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.has('is-logged-in');
  const path = request.nextUrl.pathname;
  
  // 비로그인 상태에서 내부 페이지 접근 시 랜딩 페이지로 리다이렉트
  if (!isLoggedIn && (path.startsWith('/home') || path.startsWith('/read') || path.startsWith('/mypage'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 로그인 상태에서 랜딩 페이지 접근 시 홈으로 리다이렉트
  if (isLoggedIn && path === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/home/:path*', '/read/:path*', '/mypage/:path*'],
};
