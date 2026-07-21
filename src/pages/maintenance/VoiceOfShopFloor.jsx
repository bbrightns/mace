import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, MessageSquare, AlertCircle, Calendar, User } from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} from '../../firebase/collections';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate } from '../../utils';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

export default function VoiceOfShopFloor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [problemDetail, setProblemDetail] = useState('');
  const [reporter, setReporter] = useState('');
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().substring(0, 10));
  const [pic, setPic] = useState('');
  const [update, setUpdate] = useState('');
  const [lastUpdateDate, setLastUpdateDate] = useState('');
  const [status, setStatus] = useState('Open');
  const [formError, setFormError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_vosf', (data) => {
      // Sort items so recently reported are at top
      const sorted = [...data].sort((a, b) => {
        const da = new Date(a.reportedDate || 0);
        const db = new Date(b.reportedDate || 0);
        return db - da;
      });
      setItems(sorted);
      setLoading(false);
    }, (error) => {
      showToast('Error syncing shop floor feedback.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setProblemDetail('');
    setReporter('');
    setReportedDate(new Date().toISOString().substring(0, 10));
    setPic('');
    setUpdate('');
    setLastUpdateDate('');
    setStatus('Open');
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setProblemDetail(target.problemDetail || '');
    setReporter(target.reporter || '');
    setReportedDate(toInputDate(target.reportedDate));
    setPic(target.pic || '');
    setUpdate(target.update || '');
    setLastUpdateDate(toInputDate(target.lastUpdateDate));
    setStatus(target.status || 'Open');
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!problemDetail.trim()) {
      setFormError('Problem detail is required.');
      return;
    }
    if (!reporter.trim()) {
      setFormError('Reporter is required.');
      return;
    }
    if (!reportedDate) {
      setFormError('Reported date is required.');
      return;
    }

    // Auto-generate a beautiful sequence No if creating a new one
    let targetNo = editingItem?.no;
    if (!targetNo) {
      const serialCount = items.length + 1;
      targetNo = `VF-${String(serialCount).padStart(3, '0')}`;
    }

    const payload = {
      no: targetNo,
      problemDetail: problemDetail.trim(),
      reporter: reporter.trim(),
      reportedDate: reportedDate,
      pic: pic.trim() || null,
      update: update.trim() || null,
      lastUpdateDate: lastUpdateDate || lastDoneDateForNow(),
      status
    };

    try {
      if (editingItem) {
        await updateDocument('mace_vosf', editingItem.id, payload);
        showToast(`Problem record ${targetNo} updated.`);
      } else {
        await createDocument('mace_vosf', payload);
        showToast(`New floor problem filed as ${targetNo}.`);
      }
      setIsOpen(false);
    } catch (err) {
      showToast('Failed to save shop floor ticket.', 'error');
    }
  };

  const lastDoneDateForNow = () => {
    return new Date().toISOString().substring(0, 10);
  };

  const handleDelete = async (id, codeNo) => {
    if (confirm(`Delete shop floor report ${codeNo}?`)) {
      try {
        await deleteDocument('mace_vosf', id);
        showToast(`Report ${codeNo} deleted.`);
      } catch (err) {
        showToast('Error deleting item.', 'error');
      }
    }
  };

  const filteredItems = items.filter((x) => {
    const matchesSearch = x.no?.toLowerCase().includes(search.toLowerCase()) ||
                          x.problemDetail?.toLowerCase().includes(search.toLowerCase()) ||
                          x.reporter?.toLowerCase().includes(search.toLowerCase()) ||
                          x.pic?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || x.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="workspace-container">
      <PageHeader 
        title="Voice of Shop Floor"
        subtitle="Field problem reporting registry for plant technicians, electrical assistants, and operators."
        actions={
          <button className="btn btn-primary" onClick={handleOpenAdd} id="add-vosf-btn">
            <Plus size={16} />
            <span>New Problem Report</span>
          </button>
        }
        id="vosf-page-header"
      />

      <div className="card controls-bar" id="vosf-controls-bar">
        <div className="filters-group">
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search code, reporter, PIC..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%' }}
              id="vosf-search-input"
            />
          </div>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
            id="vosf-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Process">In Process</option>
            <option value="Closed">Closed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div className="font-mono text3">
          {filteredItems.length} complaints listed
        </div>
      </div>

      {loading ? (
        <div id="vosf-loading-skeleton">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState 
          icon={MessageSquare}
          title="Floor Issues Clear"
          description="No unresolved problem reports currently found. Create a ticket if a fault raises."
          action={
            <button className="btn btn-sm" onClick={handleOpenAdd}>File Problem</button>
          }
          id="vosf-empty-state"
        />
      ) : (
        <>
          {/* Desktop view */}
          <div className="table-container hide-on-mobile" id="vosf-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Code No.</th>
                  <th>Problem Details</th>
                  <th>Reporter</th>
                  <th>Reported Date</th>
                  <th>PIC Assignee</th>
                  <th>Progress Log</th>
                  <th>Status</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((target) => (
                  <tr key={target.id} id={`vosf-row-${target.id}`}>
                    <td className="font-mono" style={{ fontWeight: '600', color: 'var(--text)' }}>
                      {target.no}
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: '500', color: 'var(--text)' }}>{target.problemDetail}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px' }}>{target.reporter}</span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11.5px' }}>{formatDate(target.reportedDate)}</td>
                    <td>
                      {target.pic ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={12} className="text3" />
                          <span>{target.pic}</span>
                        </div>
                      ) : (
                        <span className="text3" style={{ fontStyle: 'italic', fontSize: '11.5px' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      {target.update ? (
                        <div>
                          <p style={{ fontSize: '12px', lineHeight: '1.3' }}>{target.update}</p>
                          <span className="font-mono text3" style={{ fontSize: '9.5px', display: 'block', marginTop: '2px' }}>
                            Updated: {formatDate(target.lastUpdateDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text3" style={{ fontStyle: 'italic' }}>No update log</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={target.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button className="btn btn-sm" onClick={() => handleOpenEdit(target)} aria-label="Edit floor report">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(target.id, target.no)} aria-label="Delete floor report">
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
          <div className="mobile-cards-view" style={{ display: 'none' }} id="vosf-mobile-view">
            {filteredItems.map((target) => (
              <div key={target.id} className="mobile-table-card" id={`vosf-card-${target.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="font-mono" style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent)' }}>{target.no}</span>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>{target.problemDetail}</h4>
                  </div>
                  <StatusBadge status={target.status} />
                </div>
                
                <div style={{ fontSize: '11.5px', color: 'var(--text2)', margin: '4px 0' }}>
                  <div><strong>From:</strong> {target.reporter} ({formatDate(target.reportedDate)})</div>
                  {target.pic && <div><strong>PIC:</strong> {target.pic}</div>}
                  {target.update && (
                    <div style={{ padding: '6px', background: 'var(--surface2)', borderRadius: '4px', marginTop: '4px', fontSize: '11px' }}>
                      <strong>Update:</strong> {target.update}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <button className="btn btn-sm" onClick={() => handleOpenEdit(target)}>
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(target.id, target.no)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Slide Modal dialogue */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? `Edit Report ${editingItem.no}` : 'New Floor Report'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} id="submit-vosf-btn">
              {editingItem ? 'Save Updates' : 'File Complaint'}
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
            <label className="form-label">Problem Details *</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. Line 2 MIR cutter sensor misses glass edge periodically due to loose wire connection." 
              value={problemDetail}
              onChange={(e) => setProblemDetail(e.target.value)}
              required
              id="form-problemDetail"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reported By Whom *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Somchai S. (Shift Assistant)" 
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
              required
              id="form-reporter"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reported Date *</label>
            <input 
              type="date" 
              className="form-input font-mono" 
              value={reportedDate}
              onChange={(e) => setReportedDate(e.target.value)}
              required
              id="form-reportedDate"
            />
          </div>

          <div className="form-group">
            <label className="form-label">PIC Engineer Assignment</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Praween B." 
              value={pic}
              onChange={(e) => setPic(e.target.value)}
              id="form-pic"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Working Status</label>
            <select 
              className="form-select" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              id="form-status"
            >
              <option value="Open">Open</option>
              <option value="In Process">In Process</option>
              <option value="Closed">Closed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Action Log / Engineering Update</label>
            <textarea 
              className="form-textarea" 
              placeholder="Record technical adjustments completed, parts checked, or calibration values..." 
              value={update}
              onChange={(e) => setUpdate(e.target.value)}
              id="form-update"
            />
          </div>

          {editingItem && (
            <div className="form-group">
              <label className="form-label">Last Log Update Date</label>
              <input 
                type="date" 
                className="form-input font-mono" 
                value={lastUpdateDate}
                onChange={(e) => setLastUpdateDate(e.target.value)}
                id="form-lastUpdateDate"
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
