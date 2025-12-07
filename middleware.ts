import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  // `middleware` se volá POUZE pokud je token platný (uživatel přihlášen)
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // 1. Ochrana /admin
    if (pathname.startsWith('/admin')) {
      // Definice povolených rolí pro admin sekci
      const allowedRoles = ['ADMIN', 'KURATOR'];
      
      // Pokud role uživatele není v seznamu povolených, přesměruj pryč
      if (!token?.role || !allowedRoles.includes(token.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    // 2. Pro /dashboard stačí být přihlášen, což `withAuth` již řeší.

    // Pokud projde kontrolou role, pokračuj
    return NextResponse.next();
  },
  {
    // Callback pro `withAuth`
    callbacks: {
      authorized: ({ token }) => {
        return !!token; // Uživatel musí být přihlášen
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};