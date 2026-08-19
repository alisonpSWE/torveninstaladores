import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth';
import { EstoqueAdminDashboard } from '@/components/estoque/estoque-admin-dashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestão de Estoque & Inventário | Torven Instaladores',
  description: 'Painel administrativo de controle de estoque de materiais fotovoltaicos',
};

export default async function EstoquePage() {
  // BLINDAGEM NO SERVIDOR: Apenas usuários com a role 'admin' podem acessar
  const role = await getUserRole();

  if (role !== 'admin') {
    redirect('/');
  }

  return <EstoqueAdminDashboard />;
}
