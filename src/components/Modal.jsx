import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footerActions }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Focus the modal container on open for keyboard accessibility
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Stop click propagation inside the modal container to prevent triggering backdrop click
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      id="modal-backdrop"
      role="presentation"
    >
      <div 
        ref={modalRef}
        className="modal-container" 
        onClick={handleContentClick} 
        id="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-heading"
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 className="modal-title" id="modal-title-heading">{title || 'Details'}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog" type="button">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footerActions && (
          <div className="modal-footer">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}

