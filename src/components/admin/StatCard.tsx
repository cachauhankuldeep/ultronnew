import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type Props = {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  subtext?: string;
  href?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-[#035551]',
  subtext,
  href,
}: Props) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          {label}
        </span>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ${color}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4">
        <span className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {value}
        </span>
        {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex h-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-[#035551]/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#035551] focus-visible:outline-none"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      {content}
    </div>
  );
}
