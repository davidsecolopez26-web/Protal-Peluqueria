import { AdminSecretLogin } from '@/components/admin/AdminSecretLogin'

export default async function AdminSecretPage({
  params,
}: {
  params: Promise<{ adminSecret: string }>
}) {
  const { adminSecret } = await params
  return <AdminSecretLogin secretToken={adminSecret} />
}
