import { requireRole } from '@/lib/admin/auth';

import { UserManagementClient } from './UserManagementClient';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireRole(['super_admin', 'admin']);

  return (
    <UserManagementClient
      currentAdminId={admin.id}
      currentAdminRole={admin.profile.role}
    />
  );
}
