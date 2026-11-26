'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { createClient } from '@/lib/supabase/client';

export async function signOutAdmin(router: AppRouterInstance): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  router.push('/admin/login');
  router.refresh();
}
