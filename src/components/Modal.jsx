import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, footerActions }) {
  if (!isOpen) return null;

  // Stop click propagation inside the modal container to prevent triggering backdrop click
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="modal-backdrop">
      <div className="modal-container" onClick={handleContentClick} id="modal-container">
        <div className="modal-header">
          <h3 className="modal-title">{title || 'Details'}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
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
