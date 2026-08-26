import { useEffect, useRef } from 'react';
import { X, AlertCircle, Inbox, Loader2 } from 'lucide-react';

/* ---------------- primitives ---------------- */

export function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`bg-surface border border-line rounded-lg shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

const VARIANTS = {
  primary: 'bg-accent text-bg hover:bg-accent-hover font-semibold',
  secondary: 'bg-raised text-text border border-line hover:border-line-strong',
  ghost: 'text-text-muted hover:text-text hover:bg-raised',
  danger: 'bg-danger text-white hover:opacity-90 font-semibold',
};

export function Button({ variant = 'secondary', className = '', loading, children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded px-3 h-9 text-sm
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-xs uppercase tracking-wide text-text-faint font-semibold">
          {label}
        </span>
      )}
      {children}
      {error && <span className="text-xs text-danger">{error}</span>}
      {!error && hint && <span className="text-xs text-text-faint">{hint}</span>}
    </label>
  );
}

const CONTROL =
  'w-full bg-raised border border-line rounded px-3 h-9 text-sm text-text ' +
  'focus:border-accent outline-none transition-colors';

export function Input({ className = '', mono, ...rest }) {
  return <input className={`${CONTROL} ${mono ? 'num' : ''} ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={`${CONTROL} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Badge({ color, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded
        bg-raised border border-line whitespace-nowrap ${className}`}
    >
      {color && (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      )}
      {children}
    </span>
  );
}

const STATUS_CLASS = { ok: 'text-ok', warning: 'text-warning', over: 'text-danger' };
const STATUS_BG = { ok: 'var(--ok)', warning: 'var(--warning)', over: 'var(--danger)' };

export function ProgressBar({ percentage = 0, status = 'ok', className = '' }) {
  return (
    <div className={`h-1.5 w-full rounded bg-raised overflow-hidden ${className}`}>
      <div
        className="h-full rounded transition-[width] duration-300"
        style={{ width: `${Math.min(percentage, 100)}%`, background: STATUS_BG[status] }}
      />
    </div>
  );
}

export function statusClass(status) {
  return STATUS_CLASS[status] || 'text-text';
}

/* ---------------- states ---------------- */

export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <Icon size={28} className="text-text-faint" />
      <div>
        <p className="font-semibold text-text">{title}</p>
        {description && <p className="text-sm text-text-muted mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      <AlertCircle size={28} className="text-danger" />
      <div>
        <p className="font-semibold text-text">{message || "Couldn't load this"}</p>
        {/* Reassurance matters: users assume a failed read lost their data. */}
        <p className="text-sm text-text-muted mt-1">Nothing was lost.</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ---------------- modal ---------------- */

export function Modal({ open, onClose, title, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key !== 'Tab') return;
      // Focus trap.
      const f = ref.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!f?.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => {
      const target = ref.current?.querySelector('[data-autofocus]') ||
        ref.current?.querySelector('input, select, button');
      target?.focus();
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface border border-line rounded-t-lg sm:rounded-lg shadow-modal
          w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
    </Modal>
  );
}
