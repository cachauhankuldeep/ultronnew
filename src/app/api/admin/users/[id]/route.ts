import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentAdmin, isSuperAdminOrAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminProfile } from '@/lib/supabase/types';

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['super_admin', 'admin', 'editor', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128)
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !isSuperAdminOrAdmin(admin.profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.errors[0]?.message || 'Invalid update payload.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { fullName, role, isActive, password } = parsed.data;

    if (id === admin.id && isActive === false) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 },
      );
    }

    if (id === admin.id && role && role !== admin.profile.role) {
      return NextResponse.json(
        { error: 'You cannot change your own role.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: targetProfileData, error: fetchError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !targetProfileData) {
      return NextResponse.json(
        { error: 'Admin user not found.' },
        { status: 404 },
      );
    }

    const targetProfile = targetProfileData as AdminProfile;

    if (
      admin.profile.role !== 'super_admin' &&
      (targetProfile.role === 'super_admin' || role === 'super_admin')
    ) {
      return NextResponse.json(
        {
          error: 'Only a Super Admin can modify or assign Super Admin access.',
        },
        { status: 403 },
      );
    }

    if (password) {
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { password },
      );
      if (pwError) {
        return NextResponse.json({ error: pwError.message }, { status: 400 });
      }
    }

    const updatePayload: Partial<AdminProfile> = {};
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (role !== undefined) updatePayload.role = role;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('admin_profiles')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updatedProfile) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update admin user.' },
        { status: 400 },
      );
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update admin user.';
    console.error('Admin user PATCH error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !isSuperAdminOrAdmin(admin.profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: targetProfileData, error: fetchError } = await supabaseAdmin
      .from('admin_profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (fetchError || !targetProfileData) {
      return NextResponse.json(
        { error: 'Admin user not found.' },
        { status: 404 },
      );
    }

    if (
      admin.profile.role !== 'super_admin' &&
      targetProfileData.role === 'super_admin'
    ) {
      return NextResponse.json(
        { error: 'Only a Super Admin can delete a Super Admin account.' },
        { status: 403 },
      );
    }

    const { error: profileDeleteError } = await supabaseAdmin
      .from('admin_profiles')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      if (profileDeleteError.code === '23503') {
        return NextResponse.json(
          {
            error:
              'This user has existing enquiry notes and cannot be permanently deleted. Deactivate the account instead.',
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: profileDeleteError.message },
        { status: 400 },
      );
    }

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(id);

    if (authDeleteError) {
      return NextResponse.json(
        { error: authDeleteError.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete admin user.';
    console.error('Admin user DELETE error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
