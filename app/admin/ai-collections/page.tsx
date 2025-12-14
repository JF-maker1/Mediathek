import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { BrainCircuit, Folder, FolderOpen, Video, ChevronRight, AlertCircle } from 'lucide-react';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function AdminAiCollectionsPage() {
  const session = await getServerSession(authOptions);
  const allowedRoles = ['ADMIN', 'KURATOR'];
  if (!session || !session.user?.role || !allowedRoles.includes(session.user.role)) {
    redirect('/');
  }

  // 1. Načteme VŠECHNY systémové sbírky
  const allCollections = await prisma.coreCollection.findMany({
    where: { origin: 'SYSTEM' },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { videos: true } }
    }
  });

  // 2. Postavíme strom v paměti
  const roots = allCollections.filter(c => !c.parentId);
  const branches = allCollections.filter(c => c.parentId);

  // Helper pro nalezení dětí
  const getChildren = (parentId: string) => branches.filter(b => b.parentId === parentId);

  // Helper pro výpočet celkového počtu videí ve větvi (rekurzivně)
  const getTotalVideos = (col: any) => {
      const children = getChildren(col.id);
      const childVideos = children.reduce((acc, child) => acc + child._count.videos, 0);
      return col._count.videos + childVideos;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BrainCircuit className="text-purple-600" size={32} />
                AI Taxonomie (Velín)
            </h1>
            <p className="text-gray-500 mt-2">
                Hierarchická struktura znalostí vygenerovaná umělou inteligencí.
            </p>
        </div>
        <div className="flex gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1"><Folder className="w-4 h-4 text-purple-600" /> Hlavní obor</div>
            <div className="flex items-center gap-1"><FolderOpen className="w-4 h-4 text-indigo-500" /> Podkategorie</div>
        </div>
      </div>

      <div className="space-y-6">
        {roots.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <BrainCircuit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Zatím prázdno</h3>
            <p className="text-gray-500">Spusťte 'backfill' skript pro vygenerování taxonomie.</p>
          </div>
        ) : (
          roots.map((root) => {
            const children = getChildren(root.id);
            const totalVideos = getTotalVideos(root);

            return (
              <div key={root.id} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                
                {/* HLAVIČKA ROOTU (Obor) */}
                <div className="bg-purple-50 dark:bg-purple-900/10 px-6 py-4 flex justify-between items-center border-b border-purple-100 dark:border-purple-900/20">
                    <div className="flex items-center gap-3">
                        <Folder className="text-purple-600 w-6 h-6" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {root.name}
                        </h2>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-mono">
                            ROOT
                        </span>
                    </div>
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        {totalVideos > 0 ? (
                            <span className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
                                {totalVideos} videí celkem
                            </span>
                        ) : (
                            <span className="text-gray-400 flex items-center gap-1"><AlertCircle size={14}/> Prázdná sekce</span>
                        )}
                    </div>
                </div>

                {/* TĚLO (Větve) */}
                <div className="p-2">
                    {children.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 italic pl-12">
                            Žádné podkategorie.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                            {children.map((child) => (
                                <Link 
                                    key={child.id} 
                                    href={`/admin/ai-collections/${child.id}`}
                                    className="group flex items-start gap-3 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
                                >
                                    <FolderOpen className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 mt-0.5 transition-colors" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 transition-colors">
                                                {child.name}
                                            </h3>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 mb-2 h-8">
                                            {child.description}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${child._count.videos > 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-400'}`}>
                                                {child._count.videos} videí
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}