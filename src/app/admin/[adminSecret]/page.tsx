'use client'

import { AdminSecretLogin } from '@/components/admin/AdminSecretLogin'

export default function AdminSecretPage({
  params,
}: {
  params: { adminSecret: string }
}) {
  return <AdminSecretLogin secretToken={params.adminSecret} />
}
