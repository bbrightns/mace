import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  
  const statusLower = status.toLowerCase();
  let className = 'status-finished';
  let text = status;

  if (statusLower === 'finished' || statusLower === 'closed' || statusLower === 'done' || statusLower === 'completed' || statusLower === 'purchased' || statusLower === 'passed') {
    className = 'status-finished';
    if (statusLower === 'closed' || statusLower === 'done' || statusLower === 'completed') text = 'Finished';
  } else if (statusLower === 'pending' || statusLower === 'open' || statusLower === 'in process' || statusLower === 'in_process' || statusLower === 'need advice' || statusLower === 'need_advice' || statusLower === 'waiting') {
    className = 'status-pending';
    if (statusLower === 'open') text = 'Pending';
  } else if (statusLower === 'on hold' || statusLower === 'on_hold' || statusLower === 'danger' || statusLower === 'breakdown' || statusLower === 'rejected' || statusLower === 'failed') {
    className = 'status-on-hold';
  } else {
    className = 'status-pending';
  }

  return (
    <span 
      className={`status-badge ${className}`} 
      style={{ 
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <span 
        style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          backgroundColor: 'currentColor', 
          opacity: 0.85 
        }} 
      />
      {text}
    </span>
  );
}

