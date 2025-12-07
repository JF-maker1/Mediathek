import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// PUT: Změna role uživatele
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Bezpečnost: Pouze ADMIN může měnit role
    if (!session || session.user?.role !== 'ADMIN') {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Validace vstupu
    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return new NextResponse(JSON.stringify({ message: 'Missing userId or newRole' }), { status: 400 });
    }

    // Validace role (musí být jedna z povolených)
    const validRoles = ['USER', 'KURATOR', 'ADMIN'];
    if (!validRoles.includes(newRole)) {
      return new NextResponse(JSON.stringify({ message: 'Invalid role' }), { status: 400 });
    }

    // 3. Ochrana: Admin nemůže změnit roli sám sobě (prevence "sebevraždy")
    if (userId === session.user.id) {
      return new NextResponse(JSON.stringify({ message: 'You cannot change your own role' }), { status: 400 });
    }

    // 4. Update v databázi
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('API_ADMIN_USERS_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Error' }), { status: 500 });
  }
}