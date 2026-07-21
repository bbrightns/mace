import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Layers, AlertCircle, HelpCircle, DollarSign } from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} from '../../firebase/collections';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate, formatBaht } from '../../utils';

export default function ProjectRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlant, setFilterPlant] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [plant, setPlant] = useState('RFG');
  const [item, setItemName] = useState('');
  const [scope, setScope] = useState('');
  const [pr, setPr] = useState('');
  const [po, setPo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [planOn, setPlanOn] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('Open');
  const [remark, setRemark] = useState('');
  const [formError, setFormError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_project_requests', (data) => {
      setItems(data);
      setLoading(false);
    }, (error) => {
      showToast('Project requests failed to sync.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setPlant('RFG');
    setItemName('');
    setScope('');
    setPr('');
    setPo('');
    setSupplier('');
    setPlanOn('');
    setPrice('');
    setStatus('Open');
    setRemark('');
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setPlant(target.plant || 'RFG');
    setItemName(target.item || '');
    setScope(target.scope || '');
    setPr(target.pr || '');
    setPo(target.po || '');
    setSupplier(target.supplier || '');
    setPlanOn(toInputDate(target.planOn));
    setPrice(target.price || '');
    setStatus(target.status || 'Open');
    setRemark(target.remark || '');
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!item.trim()) {
      setFormError('Project Item Name is required.');
      return;
    }
    if (!scope.trim()) {
      setFormError('Scope of works is required.');
      return;
    }

    let targetNo = editingItem?.no;
    if (!targetNo) {
      targetNo = `PRJ-${String(items.length + 1).padStart(3, '0')}`;
    }

    const payload = {
      no: targetNo,
      plant,
      item: item.trim(),
      scope: scope.trim(),
      pr: pr.trim() || null,
      po: po.trim() || null,
      supplier: supplier.trim() || null,
      planOn: planOn || null,
      price: price === '' ? null : Number(price),
      status,
      remark: remark.trim() || null
    };

    try {
      if (editingItem) {
        await updateDocument('mace_project_requests', editingItem.id, payload);
        showToast(`Project ${targetNo} saved.`);
      } else {
        await createDocument('mace_project_requests', payload);
        showToast(`New Project filed under ${targetNo}.`);
      }
      setIsOpen(false);
    } catch (err) {
      showToast('Error syncing project requests.', 'error');
    }
  };

  const handleDelete = async (id, prjNo) => {
    if (confirm(`Are you sure you want to delete Project ${prjNo}?`)) {
      try {
        await deleteDocument('mace_project_requests', id);
        showToast('Project deleted successfully.');
      } catch (err) {
        showToast('Failed to delete project.', 'error');
      }
    }
  };

  const filteredItems = items.filter(x => {
    const matchesSearch = x.no?.toLowerCase().includes(search.toLowerCase()) ||
                          x.item?.toLowerCase().includes(search.toLowerCase()) ||
                          x.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchesPlant = filterPlant === 'all' || x.plant === filterPlant;
    const matchesStatus = filterStatus === 'all' || x.status === filterStatus;
    return matchesSearch && matchesPlant && matchesStatus;
  });

  const totalProjectBudget = filteredItems.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

  return (
    <div className="workspace-container">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Project Requests & Supplier Specifications</h1>
          <p className="page-subtitle">Track lines remodeling, electric installations, and supplier scopes of work requiring PO execution.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} id="add-prj-req">
          <Plus size={16} />
          <span>New Project Job</span>
        </button>
      </div>

      {/* Aggregate widgets */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="form-label" style={{ color: 'var(--text3)' }}>Total Supplier Projects Committed Budget</div>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)', marginTop: '4px' }}>
            {formatBaht(totalProjectBudget)}
          </div>
        </div>
        <DollarSign size={28} className="text3" style={{ color: 'rgba(37, 99, 235, 0.15)' }} />
      </div>

      {/* Filters */}
      <div className="card controls-bar" id="prj-controls-bar">
        <div className="filters-group">
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search code, item, supplier..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%' }}
              id="prj-search-input"
            />
          </div>

          <select value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)} className="form-select" id="prj-plant-filter">
            <option value="all">All Lines</option>
            <option value="RFG">RFG Plant</option>
            <option value="MIR">MIR Plant</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select" id="prj-status-filter">
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Process">In Process</option>
            <option value="Closed">Closed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div className="font-mono text3">
          Showing {filteredItems.length} projects
        </div>
      </div>

      {loading ? (
        <div id="prj-loading-skeleton">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state" id="prj-empty-state">
          <Layers className="empty-state-icon" />
          <h4 className="empty-state-title">No Projects Found</h4>
          <p className="empty-state-desc">Simplify planning by archiving capital projects, specifying supplier contractors, and POs.</p>
          <button className="btn btn-sm" onClick={handleOpenAdd}>File Project Job</button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="table-container hide-on-mobile" id="prj-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Proj. ID</th>
                  <th>Plant</th>
                  <th>Project Item / Equipment</th>
                  <th>Works Scope Details</th>
                  <th>PR / PO Numbers</th>
                  <th>Contractor Supplier</th>
                  <th>Planned Audit Date</th>
                  <th>Agreed Price</th>
                  <th>Status</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(target => (
                  <tr key={target.id} id={`prj-row-${target.id}`}>
                    <td className="font-mono" style={{ fontWeight: '600', color: 'var(--text)' }}>
                      {target.no}
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontSize: '11px', background: 'var(--surface2)', padding: '2px 5px', borderRadius: '4px' }}>
                        {target.plant}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text)' }}>
                      {target.item}
                    </td>
                    <td style={{ maxWidth: '200px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span className="text2" title={target.scope}>{target.scope}</span>
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>
                      {target.pr ? <div>PR: {target.pr}</div> : null}
                      {target.po ? <div style={{ color: 'var(--accent)' }}>PO: {target.po}</div> : null}
                      {!target.pr && !target.po && <span className="text3">—</span>}
                    </td>
                    <td>{target.supplier || <span className="text3">—</span>}</td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>{formatDate(target.planOn)}</td>
                    <td className="font-mono" style={{ fontWeight: '600' }}>{formatBaht(target.price)}</td>
                    <td>
                      <StatusBadge status={target.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button className="btn btn-sm" onClick={() => handleOpenEdit(target)} aria-label="Edit project request">
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(target.id, target.no)} aria-label="Delete project request">
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
          <div className="mobile-cards-view" style={{ display: 'none' }} id="prj-mobile-view">
            {filteredItems.map(target => (
              <div key={target.id} className="mobile-table-card" id={`prj-card-${target.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="font-mono" style={{ fontWeight: '700', fontSize: '12.5px', color: 'var(--accent)' }}>{target.no} [{target.plant}]</span>
                    <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{target.item}</h4>
                  </div>
                  <StatusBadge status={target.status} />
                </div>
                
                <p style={{ fontSize: '12px', color: 'var(--text2)' }}>{target.scope}</p>

                <div style={{ fontSize: '11.5px', color: 'var(--text2)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {target.supplier && <div><strong>Supplier:</strong> {target.supplier}</div>}
                  {target.price && <div><strong>Price:</strong> <span className="font-mono">{formatBaht(target.price)}</span></div>}
                  {target.po && <div className="font-mono"><strong>PO:</strong> {target.po}</div>}
                  {target.planOn && <div className="font-mono"><strong>Plan On:</strong> {formatDate(target.planOn)}</div>}
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

      {/* Slide dialogue */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? `Edit Project ${editingItem.no}` : 'Configure Project Job'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} id="submit-prj-btn">
              {editingItem ? 'Save Updates' : 'Commit New Project'}
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
            <label className="form-label">Project Headline Item / Equipment *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. MIR Main Substation Breaker Refit" 
              value={item}
              onChange={(e) => setItemName(e.target.value)}
              required
              id="form-item"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Scope of works *</label>
            <textarea 
              className="form-textarea" 
              placeholder="Describe full specifications, contractor deliverables, inspections..." 
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              required
              id="form-scope"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Plant Unit</label>
            <select className="form-select" value={plant} onChange={(e) => setPlant(e.target.value)} id="form-plant">
              <option value="RFG">RFG Plant Line</option>
              <option value="MIR">MIR Plant Line</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Agreed Price (THB)</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              placeholder="e.g. 120000" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              id="form-price"
            />
          </div>

          <div className="form-group">
            <label className="form-label">PR Code</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. PR-1004825" 
              value={pr}
              onChange={(e) => setPr(e.target.value)}
              id="form-pr"
            />
          </div>

          <div className="form-group">
            <label className="form-label">PO Code</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. PO-8850125" 
              value={po}
              onChange={(e) => setPo(e.target.value)}
              id="form-po"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contractor Supplier / Partner</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. ABB Thailand Engineering" 
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              id="form-supplier"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Planned Execution Date</label>
            <input 
              type="date" 
              className="form-input font-mono" 
              value={planOn}
              onChange={(e) => setPlanOn(e.target.value)}
              id="form-planOn"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Task Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} id="form-status">
              <option value="Open">Open</option>
              <option value="In Process">In Process</option>
              <option value="Closed">Closed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Planner Remarks</label>
            <textarea 
              className="form-textarea" 
              placeholder="Internal notes, payment terms, or outstanding items..." 
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              id="form-remark"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
