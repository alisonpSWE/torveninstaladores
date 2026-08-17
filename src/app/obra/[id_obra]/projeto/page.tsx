import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth';
import { ProjectUploadPage } from '@/components/obras/project-upload-page';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id_obra: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const role = await getUserRole();

  // Blindagem de segurança no Servidor: APENAS admin pode acessar esta página de upload
  if (role !== 'admin') {
    redirect(`/obra/${resolvedParams.id_obra}`);
  }

  return <ProjectUploadPage idObra={resolvedParams.id_obra} />;
}
