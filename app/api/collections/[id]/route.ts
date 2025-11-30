import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
const prisma = new PrismaClient();

async function checkPermissions(collectionId: string, session: any) {
  if (!session) return { allowed: false, code: 401, message: 'No session' };
  try {
    const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
    if (!collection) return { allowed: false, code: 404, message: 'Not found' };
    if (collection.authorId !== session.user.id && session.user.role !== 'ADMIN') return { allowed: false, code: 403, message: 'Forbidden' };
    return { allowed: true, collection };
  } catch (e) { return { allowed: false, code: 500, message: 'DB Error' }; }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    const { allowed, code, message } = await checkPermissions(id, session);
    if (!allowed) return new NextResponse(JSON.stringify({ message }), { status: code });

    const collection = await prisma.collection.findUnique({
        where: { id },
        include: { videos: { select: { id: true, title: true, youtubeId: true } } }
    });
    return NextResponse.json(collection);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    const { allowed, code, message } = await checkPermissions(id, session);
    if (!allowed) return new NextResponse(JSON.stringify({ message }), { status: code });

    const body = await request.json();
    
    // Zde je důležité, abychom četli všechna pole
    const { 
        name, 
        description, 
        keywords, // User intent
        isPublic, 
        seoTitle, 
        seoDescription, 
        seoKeywords // AI mirror
    } = body;

    const updated = await prisma.collection.update({
      where: { id },
      data: { 
          name, 
          description: description || '',
          keywords: keywords || [],
          isPublic,
          
          seoTitle: seoTitle || '',
          seoDescription: seoDescription || '',
          seoKeywords: seoKeywords || [],
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update Error', error);
    return new NextResponse(JSON.stringify({ message: 'Internal Error' }), { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    const { allowed, code, message } = await checkPermissions(id, session);
    if (!allowed) return new NextResponse(JSON.stringify({ message }), { status: code });
    await prisma.collection.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
}