import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentAdmin, isSuperAdminOrAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminProfile, AdminRole } from '@/lib/supabase/types';

const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(100, 'Full name cannot exceed 100 characters.'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .max(150),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password cannot exceed 128 characters.'),
  role: z.enum(['super_admin', 'admin', 'editor', 'viewer']),
});

export type AdminUserListItem = AdminProfile & {
  email: string;
  last_sign_in_at: string | null;
};

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !isSuperAdminOrAdmin(admin.profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    const [{ data: profiles, error: profilesError }, authUsersResult] =
      await Promise.all([
        supabaseAdmin
          .from('admin_profiles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      ]);

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 400 },
      );
    }

    if (authUsersResult.error) {
      return NextResponse.json(
        { error: authUsersResult.error.message },
        { status: 400 },
      );
    }

    const authById = new Map(
      (authUsersResult.data?.users || []).map((u) => [
        u.id,
        {
          email: u.email || '',
          last_sign_in_at: u.last_sign_in_at || null,
        },
      ]),
    );

    const users: AdminUserListItem[] = ((profiles || []) as AdminProfile[]).map(
      (profile) => {
        const authUser = authById.get(profile.id);
        return {
          ...profile,
          email: authUser?.email || '',
          last_sign_in_at: authUser?.last_sign_in_at || null,
        };
      },
    );

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to load admin users.';
    console.error('Admin users GET error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !isSuperAdminOrAdmin(admin.profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message || 'Invalid user details.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fullName, password, role } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    if (role === 'super_admin' && admin.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only a Super Admin can create another Super Admin.' },
        { status: 403 },
      );
    }

    const supabaseAdmin = createAdminClient();

    // 1. Create confirmed Supabase Auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user.' },
        { status: 400 },
      );
    }

    const createdUser = authData.user;

    // 2. Insert matching admin_profiles record
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        id: createdUser.id,
        full_name: fullName,
        role: role as AdminRole,
        is_active: true,
      })
      .select('*')
      .single();

    if (profileError || !profileData) {
      // Roll back the auth user so no orphan remains on failure
      await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
      return NextResponse.json(
        {
          error:
            profileError?.message || 'Failed to create admin profile record.',
        },
        { status: 400 },
      );
    }

    const user: AdminUserListItem = {
      ...(profileData as AdminProfile),
      email: createdUser.email || email,
      last_sign_in_at: createdUser.last_sign_in_at || null,
    };

    return NextResponse.json({ user }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create admin user.';
    console.error('Admin users POST error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
