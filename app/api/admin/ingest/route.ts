import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ingestVideoToCore } from '@/lib/core/ingestion';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const allowedRoles = ['ADMIN', 'KURATOR'];

    if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 403 });
    }

    const { videoId } = await request.json();

    if (!videoId) {
      return new NextResponse(JSON.stringify({ message: 'Missing videoId' }), { status: 400 });
    }

    console.log(`[API] Manuální spuštění ingesce pro video: ${videoId}`);
    
    // Spustíme kompletní DCVA proces (Segmentace -> Vektory -> Taxonomie -> Zařazení)
    await ingestVideoToCore(videoId);

    return NextResponse.json({ message: 'Analýza a zařazení dokončeno.' });

  } catch (error: any) {
    console.error('[API INGEST ERROR]', error);
    return new NextResponse(JSON.stringify({ message: error.message || 'Internal Error' }), { status: 500 });
  }
}