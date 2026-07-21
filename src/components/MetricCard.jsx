import React from 'react';

export default function MetricCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
  glowColor = 'blue', 
  onClick, 
  ariaLabel,
  id 
}) {
  const isClickable = typeof onClick === 'function';
  const Component = isClickable ? 'button' : 'div';
  const glowClass = `card-glow-${glowColor}`;

  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={`card ${glowClass} ${isClickable ? 'interactive-card' : ''}`}
      aria-label={ariaLabel || (isClickable ? `View details for ${label}` : undefined)}
      id={id}
      style={{
        padding: '18px 20px',
        cursor: isClickable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: 'var(--surface)',
        minHeight: '125px',
        textAlign: 'left',
        border: '1px solid var(--border)',
        width: isClickable ? '100%' : undefined
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px' }}>
          {label}
        </div>
        {Icon && (
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: glowColor === 'red' ? 'rgba(239, 68, 68, 0.12)' : glowColor === 'yellow' ? 'rgba(245, 158, 11, 0.12)' : glowColor === 'green' ? 'rgba(16, 185, 129, 0.12)' : 'var(--blue-soft)', 
            color: glowColor === 'red' ? 'var(--red)' : glowColor === 'yellow' ? 'var(--yellow)' : glowColor === 'green' ? 'var(--green)' : 'var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0 
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>
          {value}
        </div>
        {subtext && (
          <div style={{ 
            fontSize: '11px', 
            color: glowColor === 'red' ? 'var(--red)' : glowColor === 'yellow' ? 'var(--yellow)' : glowColor === 'green' ? 'var(--green)' : 'var(--accent)', 
            fontWeight: '600', 
            marginTop: '6px' 
          }}>
            {subtext}
          </div>
        )}
      </div>
    </Component>
  );
}
