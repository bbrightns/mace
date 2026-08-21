import React from 'react';
import { Search, Filter, RefreshCw, Plus, Download, Upload } from 'lucide-react';

export default function FilterToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterPlant = 'all',
  onPlantChange,
  plants = ['MIR', 'SLB', 'MMT', 'NPT'],
  filterStatus = 'all',
  onStatusChange,
  statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Finished', label: 'Finished' }
  ],
  totalCount,
  filteredCount,
  onAdd,
  addLabel = 'Add New',
  onExport,
  onImport,
  onResetFilters,
  extraActions
}) {
  const hasActiveFilters = (filterPlant && filterPlant !== 'all') || (filterStatus && filterStatus !== 'all') || search;

  return (
    <div 
      className="filter-toolbar-container"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '16px',
        backgroundColor: 'var(--surface, #ffffff)',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid var(--border, #e2e8f0)'
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px' }}>
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text3, #64656b)' 
            }} 
          />
          <input
            type="text"
            className="input"
            style={{ width: '100%', paddingLeft: '36px', height: '36px' }}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text3)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Plant Filter */}
        {onPlantChange && (
          <div style={{ minWidth: '110px' }}>
            <select
              className="input"
              style={{ height: '36px', width: '100%', cursor: 'pointer' }}
              value={filterPlant}
              onChange={(e) => onPlantChange(e.target.value)}
            >
              <option value="all">All Plants</option>
              {plants.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        {onStatusChange && (
          <div style={{ minWidth: '120px' }}>
            <select
              className="input"
              style={{ height: '36px', width: '100%', cursor: 'pointer' }}
              value={filterStatus}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onResetFilters}
            title="Reset Filters"
            style={{ 
              height: '36px', 
              padding: '0 10px', 
              fontSize: '12px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}
          >
            <RefreshCw size={13} />
            Reset
          </button>
        )}

        {/* Count Counter */}
        {totalCount !== undefined && (
          <span 
            style={{ 
              fontSize: '12px', 
              color: 'var(--text3, #64656b)', 
              fontWeight: 500, 
              marginLeft: '4px', 
              whiteSpace: 'nowrap' 
            }}
          >
            {filteredCount !== undefined && filteredCount !== totalCount 
              ? `${filteredCount} of ${totalCount}` 
              : `${totalCount} total`}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {extraActions}

        {onExport && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onExport}
            style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Download size={15} />
            Export CSV
          </button>
        )}

        {onImport && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onImport}
            style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Upload size={15} />
            Import CSV
          </button>
        )}

        {onAdd && (
          <button
            type="button"
            className="btn-primary"
            onClick={onAdd}
            style={{ height: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Plus size={16} />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
