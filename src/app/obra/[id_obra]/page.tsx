import { ObraDetailPage } from '@/components/obras/obra-detail-page';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id_obra: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return <ObraDetailPage idObra={resolvedParams.id_obra} />;
}
