import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import axiosInstance from '../../api/axiosInstance.jsx';

const isImage = (url = '') => /\.(png|jpe?g)$/i.test(url);
const isPdf = (url = '') => /\.pdf$/i.test(url);
const isPreviewable = (url = '') => isPdf(url) || isImage(url);

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [locked]);
}

const DocRow = ({ label, url, onPreview }) => {
  const canPreview = isPreviewable(url);
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-gray-700">{label}</div>
      <div className="flex items-center gap-2">
        {url ? (
          <>
            {canPreview && (
              <button
                type="button"
                onClick={() => onPreview(url)}
                className="px-3 py-1.5 text-sm rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                Preview
              </button>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Download
            </a>
          </>
        ) : (
          <span className="text-gray-400 text-sm">Not provided</span>
        )}
      </div>
    </div>
  );
};

DocRow.propTypes = {
  label: PropTypes.string.isRequired,
  url: PropTypes.string,
  onPreview: PropTypes.func.isRequired,
};

const SupplierProfileViewerModal = ({ open, onClose, userId, preloadProfile }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(preloadProfile || null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const closeBtnRef = useRef(null);
  const dialogRef = useRef(null);

  useBodyScrollLock(open);

  const hasDocs = useMemo(() => {
    if (!profile) return false;
    return Boolean(
      profile.business_reg_certificate_url ||
        profile.tax_compliance_cert_url ||
        profile.company_profile_url
    );
  }, [profile]);

  const resetState = useCallback(() => {
    setError('');
    setPreviewUrl('');
    if (preloadProfile) {
      setProfile(preloadProfile);
    } else {
      setProfile(null);
    }
  }, [preloadProfile]);

  const fetchProfile = useCallback(async (signal) => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/users/admin/suppliers/${userId}/`, { signal });
      setProfile(res.data);
    } catch (e) {
      // Ignore abort errors
      if (signal?.aborted) return;
      const msg = e?.response?.data?.error || e.message || 'Failed to load supplier profile';
      setError(msg);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId]);

  // Load when opening
  useEffect(() => {
    if (!open) return;
    // Autofocus close button for keyboard users
    const id = setTimeout(() => closeBtnRef.current?.focus(), 0);

    // If preload data is complete, skip fetch
    const hasMinimalPreload =
      preloadProfile &&
      (preloadProfile.business_reg_number || preloadProfile.user_email || preloadProfile.user);

    const controller = new AbortController();
    if (!hasMinimalPreload && userId) {
      fetchProfile(controller.signal);
    } else if (hasMinimalPreload) {
      setProfile(preloadProfile);
    }

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [open, preloadProfile, userId, fetchProfile]);

  // Cleanup when closing
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Backdrop click (ignore inside dialog clicks)
  const onBackdropClick = (e) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target)) {
      onClose();
    }
  };

  // Keyboard trap: basic – loop focus between close button and last interactive element in panel
  useEffect(() => {
    if (!open) return;
    const container = dialogRef.current;
    if (!container) return;

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onBackdropClick}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-profile-title"
        className="relative bg-white w-full max-w-5xl rounded-lg shadow-lg overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 id="supplier-profile-title" className="text-lg font-semibold">
            Supplier Profile
          </h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 rounded p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
            <div className="text-gray-600">Loading profile…</div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>
            <div className="text-right">
              <button
                onClick={() => fetchProfile()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !profile ? (
          <div className="p-6 text-gray-600">No profile data</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Details */}
            <div className="p-6 space-y-5 border-r">
              <div>
                <div className="text-sm text-gray-500">Supplier</div>
                <div className="font-medium">
                  {profile.user_full_name || profile.user_username || '—'}
                </div>
                <div className="text-sm text-gray-600">{profile.user_email || '—'}</div>
                <div className="text-sm text-gray-600">{profile.company_name || '—'}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Business Reg Number</div>
                  <div className="font-medium break-all">{profile.business_reg_number || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Business Category</div>
                  <div className="font-medium capitalize">
                    {profile.business_category || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Years of Experience</div>
                  <div className="font-medium">{profile.years_of_experience ?? '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <span
                    className={`inline-flex text-xs px-2 py-1 rounded ${
                      profile.verification_status === 'verified'
                        ? 'bg-green-50 text-green-700'
                        : profile.verification_status === 'rejected'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {profile.verification_status}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-sm text-gray-500 mb-1">Admin Notes</div>
                <div className="text-gray-800 whitespace-pre-wrap border rounded p-3 bg-gray-50 min-h-[64px]">
                  {profile.admin_notes || '—'}
                </div>
              </div>

              <div className="pt-2">
                <div className="text-sm text-gray-500 mb-2">Documents</div>
                <div className="divide-y">
                  <DocRow
                    label="Business Registration Certificate"
                    url={profile.business_reg_certificate_url}
                    onPreview={setPreviewUrl}
                  />
                  <DocRow
                    label="Tax Compliance Certificate"
                    url={profile.tax_compliance_cert_url}
                    onPreview={setPreviewUrl}
                  />
                  <DocRow
                    label="Company Profile"
                    url={profile.company_profile_url}
                    onPreview={setPreviewUrl}
                  />
                </div>
                {!hasDocs && (
                  <div className="text-sm text-gray-500 mt-2">No documents uploaded.</div>
                )}
              </div>
            </div>

            {/* Right: Preview */}
            <div className="p-6">
              <div className="text-sm text-gray-500 mb-2">Preview</div>
              <div className="border rounded-lg bg-gray-50 h-[420px] flex items-center justify-center overflow-hidden">
                {!previewUrl ? (
                  <div className="text-gray-400 text-sm">Select a document to preview</div>
                ) : isImage(previewUrl) ? (
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : isPdf(previewUrl) ? (
                  <iframe
                    title="PDF preview"
                    src={previewUrl}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="text-gray-500 text-sm p-6 text-center">
                    Preview not available. Use Download instead.
                  </div>
                )}
              </div>
              {previewUrl && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500 break-all">{previewUrl}</div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

SupplierProfileViewerModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userId: PropTypes.number,          // required if preloadProfile not provided
  preloadProfile: PropTypes.object,  // optional: row data to avoid flicker
};

export default SupplierProfileViewerModal;