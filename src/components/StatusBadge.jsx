import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  
  const statusLower = status.toLowerCase();
  let className = 'status-closed';

  if (statusLower === 'finished' || statusLower === 'closed' || statusLower === 'done' || statusLower === 'completed') {
    className = 'status-closed';
  } else if (statusLower === 'pending' || statusLower === 'open') {
    className = 'status-open';
  } else if (statusLower === 'need advice' || statusLower === 'need_advice' || statusLower === 'in process' || statusLower === 'in_process') {
    className = 'status-in-process';
  } else if (statusLower === 'on hold' || statusLower === 'on_hold' || statusLower === 'danger') {
    className = 'status-on-hold';
  } else if (statusLower === 'purchased') {
    className = 'status-purchased';
  }

  let text = status;
  if (statusLower === 'closed') text = 'Finished';
  if (statusLower === 'open') text = 'Pending';
  if (statusLower === 'in process' || statusLower === 'in_process') text = 'Need advice';

  return (
    <span className={`status-badge ${className}`} style={{ transition: 'transform 0.15s ease, opacity 0.15s ease' }}>
      {text}
    </span>
  );
}
