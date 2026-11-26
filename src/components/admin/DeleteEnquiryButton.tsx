'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  enquiryId: string;
  referenceNumber: string;
  fullName: string;
  redirectTo?: string;
  variant?: 'inline' | 'full';
};

export function DeleteEnquiryButton({
  enquiryId,
  referenceNumber,
  fullName,
  redirectTo,
  variant = 'inline',
}: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/enquiries/${enquiryId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete enquiry.');
      }

      setShowConfirm(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to delete enquiry.',
      );
      setIsDeleting(false);
    }
  };

  return (
    <>
      {variant === 'full' ? (
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setShowConfirm(true);
          }}
          className="font-display flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 uppercase transition-all hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Delete Permanently
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setShowConfirm(true);
          }}
          title={`Delete ${referenceNumber}`}
          aria-label={`Delete ${fullName} (${referenceNumber})`}
          className="inline-flex items-center justify-center rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-600 hover:text-white"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-left">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">
              Delete Query Permanently
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-900">{fullName}</span> (
              <span className="font-mono text-xs">{referenceNumber}</span>)?
              This action cannot be undone.
            </p>

            {errorMsg && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Query'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
