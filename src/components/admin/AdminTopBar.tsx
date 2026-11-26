'use client';

import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { AdminUser } from '@/lib/admin/auth';
import { signOutAdmin } from '@/lib/admin/client-auth';

type Props = {
  admin: AdminUser;
  title: string;
  onOpenMobileMenu?: () => void;
};

export function AdminTopBar({ admin, title, onOpenMobileMenu }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const roleLabel =
    admin.profile.role === 'super_admin'
      ? 'Super Admin'
      : admin.profile.role === 'admin'
        ? 'Administrator'
        : admin.profile.role === 'editor'
          ? 'Editor'
          : 'Viewer';

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutAdmin(router);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </button>

        <h1 className="font-display text-lg font-bold text-slate-900 uppercase sm:text-xl">
          {title}
        </h1>
      </div>

      {/* User Profile Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#035551] focus-visible:outline-none"
        >
          <div className="hidden flex-col text-right sm:flex">
            <span className="text-sm font-bold text-slate-900">
              {admin.profile.full_name || admin.email}
            </span>
            <span className="text-xs font-semibold text-[#035551] uppercase">
              {roleLabel}
            </span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#035551]/10 text-[#035551]">
            <User className="h-5 w-5" />
          </div>

          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
          >
            <div className="border-b border-slate-100 px-4 py-2.5">
              <p className="truncate text-sm font-bold text-slate-900">
                {admin.profile.full_name || 'Administrator'}
              </p>
              <p className="truncate text-xs text-slate-500">{admin.email}</p>
              <span className="mt-1 inline-block rounded-full bg-[#035551]/10 px-2 py-0.5 text-[10px] font-bold text-[#035551] uppercase">
                {roleLabel}
              </span>
            </div>

            <div className="px-2 pt-1.5">
              <button
                type="button"
                role="menuitem"
                disabled={signingOut}
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {signingOut ? 'Logging out...' : 'Log Out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
