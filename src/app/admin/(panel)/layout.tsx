import { AdminGroupLayout } from '../_components/AdminGroupLayout'

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret'

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGroupLayout loginUrl={`/admin-${ADMIN_SECRET}`}>
      {children}
    </AdminGroupLayout>
  )
}
