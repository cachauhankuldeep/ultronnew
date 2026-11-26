'use client';

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AdminUserListItem } from '@/app/api/admin/users/route';
import type { AdminRole } from '@/lib/supabase/types';

type Props = {
  currentAdminId: string;
  currentAdminRole: AdminRole;
};

const ROLE_OPTIONS: {
  value: AdminRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description:
      'Full access to leads, CMS, settings, and admin user accounts.',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description:
      'Manage leads, CMS content, settings, and non-super-admin users.',
  },
  {
    value: 'editor',
    label: 'Editor',
    description: 'Create and edit blog posts, services, and team members.',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to enquiries and dashboard overview.',
  },
];

const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  super_admin: 'bg-[#035551]/10 text-[#035551] border-[#035551]/20',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  editor: 'bg-amber-50 text-amber-800 border-amber-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function UserManagementClient({
  currentAdminId,
  currentAdminRole,
}: Props) {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Create form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminRole>('admin');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Row mutation state
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] =
    useState<AdminUserListItem | null>(null);

  const availableRoleOptions =
    currentAdminRole === 'super_admin'
      ? ROLE_OPTIONS
      : ROLE_OPTIONS.filter((opt) => opt.value !== 'super_admin');

  useEffect(() => {
    let ignore = false;
    async function loadUsers() {
      try {
        setListError(null);
        const res = await fetch('/api/admin/users', { cache: 'no-store' });
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setListError(data.error || 'Failed to load admin users.');
          } else if (data.users) {
            setUsers(data.users);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setListError(
            err instanceof Error ? err.message : 'Failed to load admin users.',
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadUsers();
    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsCreating(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Failed to create user.');
      }

      setUsers((prev) => [data.user, ...prev]);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('admin');
      setFormSuccess(
        `Created ${data.user.email} (${ROLE_OPTIONS.find((r) => r.value === data.user.role)?.label || data.user.role}).`,
      );
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create user.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: AdminRole) => {
    setBusyId(userId);
    setListError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role.');
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)),
      );
    } catch (err: unknown) {
      setListError(
        err instanceof Error ? err.message : 'Failed to update role.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (user: AdminUserListItem) => {
    setBusyId(user.id);
    setListError(null);
    try {
      const nextActive = !user.is_active;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status.');
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: nextActive } : u,
        ),
      );
    } catch (err: unknown) {
      setListError(
        err instanceof Error ? err.message : 'Failed to update status.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setBusyId(confirmDeleteUser.id);
    setListError(null);
    try {
      const res = await fetch(`/api/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user.');
      }
      setUsers((prev) => prev.filter((u) => u.id !== confirmDeleteUser.id));
      setConfirmDeleteUser(null);
    } catch (err: unknown) {
      setListError(
        err instanceof Error ? err.message : 'Failed to delete user.',
      );
      setConfirmDeleteUser(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="font-display flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          <ShieldCheck className="h-7 w-7 text-[#035551]" />
          Admin Users & Access
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Create new admin portal users, select their title/role, and manage
          active access.
        </p>
      </div>

      {/* Create New User Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="font-display flex items-center gap-2 text-base font-bold text-slate-900 uppercase">
          <UserPlus className="h-4 w-4 text-[#035551]" />
          Create New User
        </h3>

        {formError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {formSuccess}
          </div>
        )}

        <form
          onSubmit={handleCreateUser}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label
              htmlFor="new-user-name"
              className="block text-xs font-bold tracking-wider text-slate-700 uppercase"
            >
              Full Name
            </label>
            <input
              id="new-user-name"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Kuldeep Chauhan"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-[#035551] focus:bg-white focus:ring-2 focus:ring-[#035551]/20 focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="new-user-email"
              className="block text-xs font-bold tracking-wider text-slate-700 uppercase"
            >
              Email / Username
            </label>
            <input
              id="new-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@ultronfinancials.com"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-[#035551] focus:bg-white focus:ring-2 focus:ring-[#035551]/20 focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="new-user-password"
              className="block text-xs font-bold tracking-wider text-slate-700 uppercase"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="new-user-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="block w-full rounded-lg border border-slate-300 bg-slate-50/50 py-2 pr-9 pl-3 text-sm text-slate-900 focus:border-[#035551] focus:bg-white focus:ring-2 focus:ring-[#035551]/20 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="new-user-role"
              className="block text-xs font-bold tracking-wider text-slate-700 uppercase"
            >
              Title / Role
            </label>
            <select
              id="new-user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:border-[#035551] focus:bg-white focus:ring-2 focus:ring-[#035551]/20 focus:outline-hidden"
            >
              {availableRoleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-between gap-3 pt-1 sm:col-span-2 sm:flex-row sm:items-center lg:col-span-4">
            <p className="text-xs text-slate-500">
              {ROLE_OPTIONS.find((r) => r.value === role)?.description}
            </p>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#035551] px-5 py-2.5 text-xs font-bold text-white uppercase shadow-xs transition-colors hover:bg-[#023c39] disabled:opacity-60"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating User...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {listError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          {listError}
        </div>
      )}

      {/* Existing Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-slate-500">
            Loading admin users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No admin users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Title / Role
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Last Sign In
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => {
                  const isSelf = u.id === currentAdminId;
                  const canManageTarget =
                    currentAdminRole === 'super_admin' ||
                    u.role !== 'super_admin';
                  const isBusy = busyId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {u.full_name}
                          </span>
                          {isSelf && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <span className="block text-xs text-slate-500">
                          {u.email || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isSelf || !canManageTarget ? (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${ROLE_BADGE_STYLES[u.role]}`}
                          >
                            {ROLE_OPTIONS.find((r) => r.value === u.role)
                              ?.label || u.role}
                          </span>
                        ) : (
                          <select
                            aria-label={`Role for ${u.full_name}`}
                            value={u.role}
                            disabled={isBusy}
                            onChange={(e) =>
                              handleRoleChange(
                                u.id,
                                e.target.value as AdminRole,
                              )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-[#035551] focus:outline-hidden disabled:opacity-50"
                          >
                            {availableRoleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString(
                              undefined,
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              },
                            )
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isSelf || !canManageTarget ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleActive(u)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors disabled:opacity-50 ${
                                u.is_active
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteUser(u)}
                              aria-label={`Delete ${u.full_name}`}
                              title="Delete user"
                              className="inline-flex items-center justify-center rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Delete Admin User
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-slate-900">
                {confirmDeleteUser.full_name}
              </span>{' '}
              ({confirmDeleteUser.email})? They will immediately lose access to
              the admin portal.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={busyId === confirmDeleteUser.id}
                onClick={() => setConfirmDeleteUser(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === confirmDeleteUser.id}
                onClick={handleDeleteUser}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                {busyId === confirmDeleteUser.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
