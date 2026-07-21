import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate } from '../../utils';

export default function LongTermPlan() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [item, setItemName] = useState('');
  const [intervalYears, setIntervalYears] = useState(5);
  const [lastDone, setLastDone] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_longterm_plans', (data) => {
      setItems(data);
      setLoading(false);
    }, (error) => {
      showToast('Failed to sync long term plans.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setItemName('');
    setIntervalYears(5);
    setLastDone('');
    setNextDue('');
    setNotes('');
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setItemName(target.item || '');
    setIntervalYears(target.intervalYears || 5);
    setLastDone(toInputDate(target.lastDone));
    setNextDue(toInputDate(target.nextDue));
    setNotes(target.notes || '');
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!item.trim()) {
      setFormError('Item Name is required.');
      return;
    }
    if (!intervalYears || intervalYears <= 0) {
      setFormError('Interval (Years) must be a positive number.');
      return;
    }

    const payload = {
      item: item.trim(),
      intervalYears: Number(intervalYears),
      lastDone: lastDone || null,
      nextDue: nextDue || null,
      notes: notes.trim() || null
    };

    try {
      if (editingItem) {
        await updateDocument('mace_longterm_plans', editingItem.id, payload);
        showToast('Long Term Plan updated successfully.');
      } else {
        await createDocument('mace_longterm_plans', payload);
        showToast('Long Term Plan created successfully.');
      }
      setIsOpen(false);
    } catch (error) {
      showToast('Error saving Long Term Plan.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this long term planning item?')) {
      try {
        await deleteDocument('mace_longterm_plans', id);
        showToast('Long Term Plan item deleted.');
      } catch (error) {
        showToast('Failed to delete long term item.', 'error');
      }
    }
  };

  const filteredItems = items.filter((x) => 
    x.item?.toLowerCase().includes(search.toLowerCase()) || 
    x.notes?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="workspace-container">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Long Term Maintenance Horizon</h1>
          <p className="page-subtitle">Configure major equipment lifecycle plans with horizons exceeding one year (e.g. 5-year refits).</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} id="add-ltp-btn">
          <Plus size={16} />
          <span>Add Long Term Item</span>
        </button>
      </div>

      <div className="card controls-bar" id="ltp-controls-bar">
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
          <input 
            type="text" 
            placeholder="Search long term items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '32px', width: '100%' }}
            id="ltp-search-input"
          />
        </div>
        <div className="font-mono text3">
          {filteredItems.length} lifecycle items stored
        </div>
      </div>

      {loading ? (
        <div id="ltp-loading-skeleton">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state" id="ltp-empty-state">
          <Clock className="empty-state-icon" />
          <h4 className="empty-state-title">No Long Term Items Plan</h4>
          <p className="empty-state-desc">Get started by entering major items like transformer oil refilling or furnace line inspections.</p>
          <button className="btn btn-sm" onClick={handleOpenAdd}>Create Lifecycle Item</button>
        </div>
      ) : (
        <>
          {/* Desktop view */}
          <div className="table-container hide-on-mobile" id="ltp-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scheduled Item Name</th>
                  <th>Interval (Years)</th>
                  <th>Last Executed</th>
                  <th>Next Planned Due</th>
                  <th>Action Notes / Details</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((target) => (
                  <tr key={target.id} id={`ltp-row-${target.id}`}>
                    <td style={{ fontWeight: '500', color: 'var(--text)' }}>
                      {target.item}
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: '500' }}>
                        {target.intervalYears}y
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11.5px' }}>{formatDate(target.lastDone)}</td>
                    <td className="font-mono" style={{ fontSize: '11.5px', fontWeight: '600', color: '#b45309' }}>{formatDate(target.nextDue)}</td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span className="text2" style={{ fontSize: '12px' }}>{target.notes || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button className="btn btn-sm" onClick={() => handleOpenEdit(target)} aria-label="Edit long-term plan">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(target.id)} aria-label="Delete long-term plan">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="mobile-cards-view" style={{ display: 'none' }} id="ltp-mobile-view">
            {filteredItems.map((target) => (
              <div key={target.id} className="mobile-table-card" id={`ltp-card-${target.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{target.item}</h4>
                  <span className="font-mono" style={{ backgroundColor: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '600' }}>
                    Interval: {target.intervalYears}y
                  </span>
                </div>
                {target.notes && (
                  <p style={{ fontSize: '12px', color: 'var(--text2)', margin: '4px 0' }}>{target.notes}</p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '4px 0', fontSize: '11.5px' }}>
                  <div>
                    <span className="text3" style={{ fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>Last Done</span>
                    <span className="font-mono">{formatDate(target.lastDone)}</span>
                  </div>
                  <div>
                    <span className="text3" style={{ fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>Next Due</span>
                    <span className="font-mono" style={{ color: '#b45309' }}>{formatDate(target.nextDue)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <button className="btn btn-sm" onClick={() => handleOpenEdit(target)}>
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(target.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit/Add Modal dialog overlay */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? 'Edit Long-Term Plan' : 'New Long-Term Plan'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} id="submit-ltp-btn">
              {editingItem ? 'Save Changes' : 'Create Plan'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="form-grid">
          {formError && (
            <div className="form-full" style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
              <AlertCircle size={14} />
              <span style={{ fontSize: '12px' }}>{formError}</span>
            </div>
          )}

          <div className="form-group form-full">
            <label className="form-label">Lifecycle Scheduled Item *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Substation Transformer Oil Filtration" 
              value={item}
              onChange={(e) => setItemName(e.target.value)}
              required
              id="form-item"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Recurrence Interval (Years) *</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              placeholder="e.g. 5" 
              min="1"
              value={intervalYears}
              onChange={(e) => setIntervalYears(e.target.value)}
              required
              id="form-intervalYears"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Last Executed Date</label>
            <input 
              type="date" 
              className="form-input font-mono" 
              value={lastDone}
              onChange={(e) => setLastDone(e.target.value)}
              id="form-lastDone"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Next Planned Date</label>
            <input 
              type="date" 
              className="form-input font-mono" 
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              id="form-nextDue"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Action Notes / Details</label>
            <textarea 
              className="form-textarea" 
              placeholder="Record manufacturer compliance codes, transformer IDs, sensor replacement requirements..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              id="form-notes"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
