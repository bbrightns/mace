import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Library, AlertCircle } from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { TableSkeleton } from '../../components/SkeletonLoader';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

export default function Drawings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, loading: false });


  // Form State
  const [drawingNo, setDrawingNo] = useState('');
  const [title, setTitle] = useState('');
  const [systemArea, setSystemArea] = useState('');
  const [revision, setRevision] = useState('R0');
  const [format, setFormat] = useState('A3');
  const [locationCabinet, setLocationCabinet] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_drawings', (data) => {
      // Sort alphabetically by drawing code
      const sorted = [...data].sort((a, b) => (a.drawingNo || '').localeCompare(b.drawingNo || ''));
      setItems(sorted);
      setLoading(false);
    }, (error) => {
      showToast('Drawings database failed to sync.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDrawingNo('');
    setTitle('');
    setSystemArea('');
    setRevision('R0');
    setFormat('A3');
    setLocationCabinet('');
    setRemarks('');
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setDrawingNo(target.drawingNo || '');
    setTitle(target.title || '');
    setSystemArea(target.systemArea || '');
    setRevision(target.revision || 'R0');
    setFormat(target.format || 'A3');
    setLocationCabinet(target.locationCabinet || '');
    setRemarks(target.remarks || '');
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!drawingNo.trim()) {
      setFormError('Drawing No Code is required.');
      return;
    }
    if (!title.trim()) {
      setFormError('Drawing Title is required.');
      return;
    }
    if (!systemArea.trim()) {
      setFormError('System or area is required.');
      return;
    }
    if (!locationCabinet.trim()) {
      setFormError('Physical location/cabinet space details are required.');
      return;
    }

    const payload = {
      drawingNo: drawingNo.trim(),
      title: title.trim(),
      systemArea: systemArea.trim(),
      revision: revision.trim(),
      format: format.trim(),
      locationCabinet: locationCabinet.trim(),
      remarks: remarks.trim() || null
    };

    try {
      if (editingItem) {
        await updateDocument('mace_drawings', editingItem.id, payload);
        showToast(`Drawing ${drawingNo} updated.`);
      } else {
        await createDocument('mace_drawings', payload);
        showToast(`Registered schematic ${drawingNo} successfully.`);
      }
      setIsOpen(false);
    } catch (err) {
      showToast('Error syncing drawings.', 'error');
    }
  };

  const handleOpenDelete = (item) => {
    setDeleteModal({ isOpen: true, item, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await deleteDocument('mace_drawings', deleteModal.item.id);
      showToast(`Deleted drawing reference ${deleteModal.item.drawingNo || ''}.`);
      setDeleteModal({ isOpen: false, item: null, loading: false });
    } catch (err) {
      showToast('Error deleting drawing.', 'error');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Extract unique areas for filtering option
  const uniqueAreas = Array.from(new Set(items.map(x => x.systemArea).filter(Boolean)));

  const filteredItems = items.filter(x => {
    const matchesSearch = x.drawingNo?.toLowerCase().includes(search.toLowerCase()) ||
                          x.title?.toLowerCase().includes(search.toLowerCase()) ||
                          x.locationCabinet?.toLowerCase().includes(search.toLowerCase());
    const matchesArea = filterArea === 'all' || x.systemArea === filterArea;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="workspace-container">
      <PageHeader 
        title="Engineering Technical Drawings Directory"
        subtitle="Master cabinet schematics, physical cabinet indexes, and revisions ledger."
        actions={
          <button className="btn btn-primary" onClick={handleOpenAdd} id="add-dwg-btn">
            <Plus size={16} />
            <span>Register Drawing</span>
          </button>
        }
        id="dwg-page-header"
      />

      {/* Filter toolbar */}
      <div className="card controls-bar" id="dwg-controls-bar">
        <div className="filters-group">
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search drawing code, title, cabinet..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%' }}
              id="dwg-search-input"
            />
          </div>

          <select 
            value={filterArea} 
            onChange={(e) => setFilterArea(e.target.value)}
            className="form-select"
            id="dwg-area-filter"
          >
            <option value="all">All Plant Functional Areas</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div className="font-mono text3">
          Showing {filteredItems.length} drawing sheets
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '16px' }}>
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState 
          icon={Library}
          title="Drawing Archive Empty"
          description="No electrical or mechanical schematic references match criteria."
          action={
            <button className="btn btn-sm" onClick={handleOpenAdd}>Add Drawing Code</button>
          }
          id="dwg-empty-state"
        />
      ) : (
        <>
          {/* Desktop Table view */}
          <div className="table-container hide-on-mobile" id="dwg-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Drawing Code</th>
                  <th>Title & Description</th>
                  <th style={{ width: '160px' }}>System Area</th>
                  <th style={{ width: '80px' }}>Revision</th>
                  <th style={{ width: '70px' }}>Format</th>
                  <th style={{ width: '120px' }}>Physical Cabinet</th>
                  <th>Remarks</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((target) => (
                  <tr key={target.id} id={`dwg-row-${target.id}`}>
                    <td>
                      <span className="font-mono" style={{ fontWeight: '700', color: 'var(--accent)' }}>{target.drawingNo}</span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{target.title}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--surface2)', color: 'var(--text)' }}>{target.systemArea}</span>
                    </td>
                    <td>
                      <span className="font-mono badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: '700' }}>{target.revision}</span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ padding: '2px 4px', background: 'var(--surface2)', borderRadius: '4px', fontSize: '11px' }}>{target.format}</span>
                    </td>
                    <td>
                      <span className="font-mono text2" style={{ fontWeight: '500' }}>{target.locationCabinet}</span>
                    </td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span className="text3">{target.remarks || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button className="btn btn-sm" onClick={() => handleOpenEdit(target)} aria-label="Edit drawing code">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleOpenDelete(target)} aria-label="Delete drawing code">
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
          <div className="mobile-cards-view" style={{ display: 'none' }} id="dwg-mobile-view">
            {filteredItems.map(target => (
              <div key={target.id} className="mobile-table-card" id={`dwg-card-${target.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="font-mono" style={{ fontWeight: '700', fontSize: '12.5px', color: 'var(--accent)' }}>{target.drawingNo}</span>
                    <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{target.title}</h4>
                  </div>
                  <span className="font-mono" style={{ backgroundColor: 'var(--surface2)', padding: '2px 5px', borderRadius: '4px', fontSize: '10.5px' }}>
                    {target.format}
                  </span>
                </div>
                
                <div style={{ fontSize: '11.5px', color: 'var(--text2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><strong>Area:</strong> {target.systemArea}</div>
                  <div><strong>Revision:</strong> {target.revision}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Cabinet Drawer:</strong> <span className="font-mono" style={{ fontWeight: '500' }}>{target.locationCabinet}</span>
                  </div>
                </div>

                {target.remarks && <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: 'var(--text3)' }}>{target.remarks}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                  <button className="btn btn-sm" onClick={() => handleOpenEdit(target)}>
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleOpenDelete(target)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Slide overlay */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? `Edit drawing card ${editingItem.drawingNo}` : 'Catalog panel schematic'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} id="submit-dwg-btn">
              {editingItem ? 'Save Updates' : 'Registry Blueprint'}
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
            <label className="form-label">Drawing No / Blueprint Code *</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. DWG-E-MIR-0024" 
              value={drawingNo}
              onChange={(e) => setDrawingNo(e.target.value)}
              required
              id="form-drawingNo"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Schematic Title Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. MIR Main Inverter Drive Bus Topology Diagram" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              id="form-title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">System / Area *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. MIR Hot End electrical cabin" 
              value={systemArea}
              onChange={(e) => setSystemArea(e.target.value)}
              required
              id="form-systemArea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Physical Cabinet / Location drawer *</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. Cab-03 / Dr-A" 
              value={locationCabinet}
              onChange={(e) => setLocationCabinet(e.target.value)}
              required
              id="form-locationCabinet"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Drawing Format Size</label>
            <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value)} id="form-format">
              <option value="A0">A0 sheet</option>
              <option value="A1">A1 sheet</option>
              <option value="A2">A2 sheet</option>
              <option value="A3">A3 sheet</option>
              <option value="A4">A4 sheet</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Revision No</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. R2" 
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              id="form-revision"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label" htmlFor="form-remarks">Remarks / Cabinet coordinates notes</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. Bound in main leather cabinet binder. Replaces original DWG-E-MIR-0021." 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              id="form-remarks"
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={`Delete Drawing ${deleteModal.item?.drawingNo || ''}`}
        message={`Are you sure you want to delete drawing reference "${deleteModal.item?.drawingNo || ''}" (${deleteModal.item?.title || ''})?`}
        confirmText="Delete Drawing"
        variant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
