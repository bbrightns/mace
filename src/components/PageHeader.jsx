import React from 'react';

export default function PageHeader({ title, subtitle, badgeText, actions, id }) {
  return (
    <div className="page-header" id={id || 'page-header-block'}>
      <div className="page-title-block">
        {badgeText && (
          <span className="page-title-badge" style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--accent)',
            backgroundColor: 'var(--blue-soft)',
            padding: '3px 8px',
            borderRadius: '12px',
            display: 'inline-block',
            marginBottom: '4px'
          }}>
            {badgeText}
          </span>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {actions && (
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
