import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action, id }) {
  return (
    <div className="empty-state" id={id || 'empty-state-container'}>
      {Icon && <Icon className="empty-state-icon" aria-hidden="true" />}
      {title && <div className="empty-state-title">{title}</div>}
      {description && <div className="empty-state-desc">{description}</div>}
      {action && <div className="empty-state-action" style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
