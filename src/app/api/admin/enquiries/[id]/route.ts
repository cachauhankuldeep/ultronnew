import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();

    // Check if role is allowed (super_admin or admin, viewer cannot mutate)
    if (admin.profile.role === 'viewer') {
      return NextResponse.json(
        { success: false, message: 'Viewer accounts have read-only access.' },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { status, priority, assigned_to, archive } = body;

    const supabase = await createClient();
    const rpcClient = supabase as unknown as RpcClient;

    let result;

    if (typeof archive === 'boolean') {
      // Archive / Restore transactional RPC
      const { data, error } = await rpcClient.rpc(
        'archive_enquiry_with_activity',
        {
          p_enquiry_id: id,
          p_archive: archive,
          p_admin_id: admin.id,
        },
      );

      if (error) throw error;
      result = data;
    } else {
      // Update status / priority / assignment transactional RPC
      const { data, error } = await rpcClient.rpc(
        'update_enquiry_with_activity',
        {
          p_enquiry_id: id,
          p_status: status || null,
          p_priority: priority || null,
          p_assigned_to: assigned_to || null,
          p_admin_id: admin.id,
        },
      );

      if (error) throw error;
      result = data;
    }

    revalidatePath('/admin');
    revalidatePath('/admin/enquiries');
    revalidatePath('/admin/partner-leads');
    revalidatePath(`/admin/enquiries/${id}`);
    revalidatePath(`/admin/partner-leads/${id}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Enquiry updated successfully.',
    });
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to update enquiry.');
    console.error('Admin enquiry update error:', error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();

    if (admin.profile.role === 'viewer') {
      return NextResponse.json(
        { success: false, message: 'Viewer accounts cannot delete enquiries.' },
        { status: 403 },
      );
    }

    const { id } = await params;

    // Delete via service-role client after verifying admin role because anon/authenticated
    // roles intentionally lack DELETE table privileges on public.enquiries under RLS.
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('enquiries')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Enquiry not found.' },
        { status: 404 },
      );
    }

    revalidatePath('/admin');
    revalidatePath('/admin/enquiries');
    revalidatePath('/admin/partner-leads');

    return NextResponse.json({
      success: true,
      message: 'Enquiry deleted permanently.',
    });
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to delete enquiry.');
    console.error('Admin enquiry deletion error:', error);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
