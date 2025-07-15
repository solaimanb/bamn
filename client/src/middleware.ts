import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;

    // Handle login page access
    if (request.nextUrl.pathname.startsWith('/login')) {
        if (token) {
            try {
                await verifyToken(token);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            } catch {
                return NextResponse.next();
            }
        }
        return NextResponse.next();
    }

    // Handle dashboard access
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        try {
            const user = await verifyToken(token);
            if (user.role === 'mentor' && request.nextUrl.pathname !== '/dashboard/profile') {
                return NextResponse.redirect(new URL('/dashboard/profile', request.url));
            }

            return NextResponse.next();
        } catch {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/login'],
}; 