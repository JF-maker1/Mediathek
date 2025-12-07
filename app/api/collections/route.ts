import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// POST: Vytvoření nové sbírky
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Definice rolí, které mají právo provádět tuto akci (Admin i Kurátor)
    const allowedRoles = ['ADMIN', 'KURATOR'];
    
    // Pokud uživatel nemá session, nemá roli, nebo jeho role není v seznamu povolených -> 403
    if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return new NextResponse(JSON.stringify({ message: 'Name is required' }), { status: 400 });
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        description,
        authorId: session.user.id,
        isPublic: false,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('API_COLLECTIONS_POST_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Error' }), { status: 500 });
  }
}

// GET: Seznam sbírek (Respektuje RBAC)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    const where = session.user.role === 'ADMIN' ? {} : { authorId: session.user.id };

    const collections = await prisma.collection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { videos: true } } } 
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('API_COLLECTIONS_GET_ERROR', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Error' }), { status: 500 });
  }
}