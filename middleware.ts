    import { withAuth } from 'next-auth/middleware';
    import { NextResponse } from 'next/server';
    
    export default withAuth(
      // `middleware` se volá POUZE pokud je token platný (uživatel přihlášen)
      function middleware(req) {
        const token = req.nextauth.token;
        const { pathname } = req.nextUrl;
    
        // 1. Ochrana /admin
        if (pathname.startsWith('/admin')) {
          // Pokud je přihlášen, ale NENÍ admin, přesměruj pryč
          if (token?.role !== 'ADMIN') {
            // Můžeme přesměrovat na dashboard nebo domovskou stránku
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
          // Volá se VŽDY, když se přistupuje na chráněnou trasu v `matcher`u
          authorized: ({ token }) => {
            // Pokud uživatel nemá token (není přihlášen),
            // `withAuth` ho automaticky přesměruje na `signIn` stránku.
            return !!token; // !!token převede token (nebo null) na boolean
          },
        },
        pages: {
          signIn: '/login', // Stránka pro přesměrování nepřihlášených
        },
      }
    );
    
    // Konfigurace matcheru (které stránky chránit)
    export const config = {
      matcher: [
        '/dashboard/:path*', // Původní chráněná trasa
        '/admin/:path*',    // Nová chráněná trasa pro adminy
      ],
    };