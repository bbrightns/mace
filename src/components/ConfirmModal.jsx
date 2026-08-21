import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
  loading = false
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !loading) {
          onCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div 
      className="modal-overlay" 
      onClick={() => !loading && onCancel()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div 
        className="confirm-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: isDanger ? '#fee2e2' : isWarning ? '#fef3c7' : '#eff6ff',
                color: isDanger ? '#dc2626' : isWarning ? '#d97706' : '#2563eb'
              }}
            >
              {isDanger ? (
                <AlertTriangle size={24} strokeWidth={2.2} />
              ) : isWarning ? (
                <AlertCircle size={24} strokeWidth={2.2} />
              ) : (
                <HelpCircle size={24} strokeWidth={2.2} />
              )}
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 
                  id="confirm-modal-title"
                  style={{ 
                    fontSize: '17px', 
                    fontWeight: 700, 
                    color: 'var(--text, #1b1b1d)',
                    margin: 0,
                    lineHeight: 1.3
                  }}
                >
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  aria-label="Close"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text3, #64656b)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface2, #f6f3f5)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X size={18} />
                </button>
              </div>
              <p 
                style={{ 
                  marginTop: '10px', 
                  fontSize: '13.5px', 
                  color: 'var(--text2, #45464d)', 
                  lineHeight: 1.5,
                  margin: '10px 0 0 0'
                }}
              >
                {message}
              </p>
            </div>
          </div>
        </div>

        <div 
          style={{ 
            padding: '14px 24px', 
            backgroundColor: 'var(--surface2, #f6f3f5)', 
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '10px' 
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
            style={{ minWidth: '80px' }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={isDanger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
            style={{ 
              minWidth: '90px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
