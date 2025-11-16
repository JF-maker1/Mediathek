import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// DŮLEŽITÉ: Vypnutí cachování pro tento endpoint
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Pomocná funkce pro kontrolu práv
async function checkPermissions(collectionId: string, session: any) {
  if (!session) {
    return { allowed: false, code: 401, message: 'No session' };
  }

  try {
    const collection = await prisma.collection.findUnique({ 
        where: { id: collectionId } 
    });
  
    if (!collection) {
        return { allowed: false, code: 404, message: 'Collection not found' };
    }

    const isOwner = collection.authorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
        return { allowed: false, code: 403, message: 'Forbidden' };
    }

    return { allowed: true, collection };
  } catch (e) {
      console.error("[checkPermissions] DB Error:", e);
      return { allowed: false, code: 500, message: 'DB Error' };
  }
}

// PUT: Update sbírky (Změna viditelnosti, názvu)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const params = await context.params;
    const id = params.id;

    const { allowed, code, message } = await checkPermissions(id, session);
    
    if (!allowed) {
       return new NextResponse(JSON.stringify({ message }), { status: code });
    }

    const body = await request.json();
    const { name, description, isPublic } = body;

    const updated = await prisma.collection.update({
      where: { id },
      data: { name, description, isPublic },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PUT] Error:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Error' }), { status: 500 });
  }
}

// DELETE: Smazání sbírky
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const params = await context.params;
    const id = params.id;

    const { allowed, code, message } = await checkPermissions(id, session);
    if (!allowed) {
        return new NextResponse(JSON.stringify({ message }), { status: code });
    }

    await prisma.collection.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE] Error:', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Error' }), { status: 500 });
  }
}
