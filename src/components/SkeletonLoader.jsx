import React from 'react';

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="table-skeleton-wrap" style={{ width: '100%', overflow: 'hidden' }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ padding: '12px 16px' }}>
                <div 
                  className="skeleton-pulse" 
                  style={{ 
                    height: '14px', 
                    width: i === 0 ? '40px' : i === 1 ? '120px' : '80px', 
                    borderRadius: '4px',
                    backgroundColor: 'rgba(203, 213, 225, 0.4)'
                  }} 
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} style={{ padding: '14px 16px' }}>
                  <div 
                    className="skeleton-pulse" 
                    style={{ 
                      height: '14px', 
                      width: c === 0 ? '30px' : c === 1 ? '70%' : c === cols - 1 ? '50px' : '85%', 
                      borderRadius: '4px',
                      backgroundColor: 'rgba(226, 232, 240, 0.6)'
                    }} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="dashboard-card"
          style={{ 
            padding: '18px', 
            borderRadius: '10px', 
            border: '1px solid var(--border, #e2e8f0)',
            background: 'var(--surface, #ffffff)' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div 
              className="skeleton-pulse" 
              style={{ width: '90px', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(203, 213, 225, 0.5)' }} 
            />
            <div 
              className="skeleton-pulse" 
              style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(203, 213, 225, 0.4)' }} 
            />
          </div>
          <div 
            className="skeleton-pulse" 
            style={{ width: '60px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(203, 213, 225, 0.6)', marginBottom: '8px' }} 
          />
          <div 
            className="skeleton-pulse" 
            style={{ width: '130px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(226, 232, 240, 0.7)' }} 
          />
        </div>
      ))}
    </div>
  );
}

export default { TableSkeleton, CardSkeleton };
