import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Milestone, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  CheckSquare, 
  Square,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument 
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatMthb } from '../../utils';

const YEARS = [
  { id: 'Y2026', label: '2026' },
  { id: 'Y2027', label: '2027' },
  { id: 'Y2028', label: '2028' },
  { id: 'Y2029', label: '2029' },
  { id: 'Y2030', label: '2030' }
];

const getTypeStyle = (type) => {
  switch (type) {
    case 'Project':
      return { bg: '#8b5cf6', label: 'Capital Project', text: '#ffffff' };
    case 'Yearly':
      return { bg: '#10b981', label: 'Yearly PM Program', text: '#ffffff' };
    case 'Sparepart':
      return { bg: '#f59e0b', label: 'Critical Spare Parts', text: '#ffffff' };
    case 'Aging':
      return { bg: '#ef4444', label: 'Aging Asset Replacement', text: '#ffffff' };
    case 'Improve':
      return { bg: '#3b82f6', label: 'Line Improvement', text: '#ffffff' };
    default:
      return { bg: 'var(--accent)', label: type, text: '#ffffff' };
  }
};

const getRowBgClass = (plant) => {
  if (!plant) return '';
  const pl = plant.toUpperCase();
  if (pl.includes('GENERAL')) return 'row-general';
  if (pl.includes('RFG')) return 'row-rfg';
  if (pl.includes('MIR')) return 'row-mir';
  return '';
};

const getLineColor = (plant) => {
  if (!plant) return 'var(--text)';
  const pl = plant.toUpperCase();
  if (pl.includes('GENERAL')) return '#64748b'; // Slate
  if (pl.includes('RFG')) return '#10b981';    // Green
  if (pl.includes('MIR')) return '#8b5cf6';    // Purple
  return 'var(--text)';
};

const getPriorityBadge = (priority) => {
  switch (priority) {
    case 'S':
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2px 8px', 
          borderRadius: '9999px', 
          fontSize: '11px', 
          fontWeight: '700', 
          backgroundColor: '#fee2e2', 
          color: '#ef4444', 
          border: '1px solid #fca5a5' 
        }}>
          S
        </span>
      );
    case 'A':
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2px 8px', 
          borderRadius: '9999px', 
          fontSize: '11px', 
          fontWeight: '700', 
          backgroundColor: '#ffedd5', 
          color: '#ea580c', 
          border: '1px solid #fed7aa' 
        }}>
          A
        </span>
      );
    case 'B':
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2px 8px', 
          borderRadius: '9999px', 
          fontSize: '11px', 
          fontWeight: '600', 
          backgroundColor: '#fef9c3', 
          color: '#ca8a04', 
          border: '1px solid #fef08a' 
        }}>
          B
        </span>
      );
    case 'C':
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2px 8px', 
          borderRadius: '9999px', 
          fontSize: '11px', 
          fontWeight: '600', 
          backgroundColor: '#e0f2fe', 
          color: '#0284c7', 
          border: '1px solid #bae6fd' 
        }}>
          C
        </span>
      );
    default:
      return (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2px 8px', 
          borderRadius: '9999px', 
          fontSize: '11px', 
          fontWeight: '500', 
          backgroundColor: 'var(--surface2)', 
          color: 'var(--text2)', 
          border: '1px solid var(--border)' 
        }}>
          —
        </span>
      );
  }
};

export default function ProjectPlanning() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPlant, setFilterPlant] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Sorting State for bottom table
  const [sortBy, setSortBy] = useState('priority'); // 'priority', 'budget', 'type'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [type, setType] = useState('Project'); // Yearly, Sparepart, Project, Aging, Improve
  const [plant, setPlant] = useState('RFG'); // General, RFG, MIR
  const [item, setItemName] = useState('');
  const [estimatedBudgetMthb, setEstimatedBudgetMthb] = useState('');
  const [priority, setPriority] = useState('A'); // S, A, B, C
  const [note, setNote] = useState('');
  
  // Timeline Active Years Map
  const [timelineYears, setTimelineYears] = useState({
    Y2026: true,
    Y2027: false,
    Y2028: false,
    Y2029: false,
    Y2030: false
  });

  // Drilldown Checklist Checkboxes
  const [budgetApproved, setBudgetApproved] = useState(false);
  const [scopeReady, setScopeReady] = useState(false);
  const [prDone, setPrDone] = useState(false);
  const [poDone, setPoDone] = useState(false);
  const [workCompleted, setWorkCompleted] = useState(false);
  const [formError, setFormError] = useState('');

  // Clear All Data State
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { showToast } = useToast();

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      for (const item of items) {
        await deleteDocument('mace_project_planning', item.id);
      }
      showToast('All 5-year project planning items have been cleared.');
      setIsClearAllModalOpen(false);
    } catch (err) {
      showToast('Failed to clear project planning data.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_project_planning', (data) => {
      setItems(data);
      setLoading(false);
    }, (error) => {
      showToast('Error syncing 5-year project horizons.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setType('Project');
    setPlant('RFG');
    setItemName('');
    setEstimatedBudgetMthb('');
    setPriority('A');
    setNote('');
    setTimelineYears({
      Y2026: true,
      Y2027: false,
      Y2028: false,
      Y2029: false,
      Y2030: false
    });
    setBudgetApproved(false);
    setScopeReady(false);
    setPrDone(false);
    setPoDone(false);
    setWorkCompleted(false);
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setType(target.type || 'Project');
    setPlant(target.plant || 'RFG');
    setItemName(target.item || '');
    setEstimatedBudgetMthb(target.estimatedBudgetMthb || '');
    setPriority(target.priority || 'A');
    setNote(target.note || '');
    setTimelineYears({
      Y2026: target.timelineYears?.Y2026 || false,
      Y2027: target.timelineYears?.Y2027 || false,
      Y2028: target.timelineYears?.Y2028 || false,
      Y2029: target.timelineYears?.Y2029 || false,
      Y2030: target.timelineYears?.Y2030 || false
    });
    setBudgetApproved(target.budgetApproved || false);
    setScopeReady(target.scopeReady || false);
    setPrDone(target.prDone || false);
    setPoDone(target.poDone || false);
    setWorkCompleted(target.workCompleted || false);
    setFormError('');
    setIsOpen(true);
  };

  const toggleYearCheckbox = (yearId) => {
    setTimelineYears(prev => ({
      ...prev,
      [yearId]: !prev[yearId]
    }));
  };

  const handleToggleGateCheckbox = async (target, gateKey, currentVal) => {
    try {
      await updateDocument('mace_project_planning', target.id, {
        [gateKey]: !currentVal
      });
      showToast(`Milestone Gate updated.`);
    } catch (err) {
      showToast('Failed to update milestone state.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!item.trim()) {
      setFormError('Item/Equipment description is required.');
      return;
    }
    if (!estimatedBudgetMthb || Number(estimatedBudgetMthb) <= 0) {
      setFormError('Estimated budget is required and must be greater than zero MTHB.');
      return;
    }

    const payload = {
      type,
      plant,
      item: item.trim(),
      estimatedBudgetMthb: Number(estimatedBudgetMthb),
      priority,
      note: note.trim(),
      timelineYears,
      budgetApproved,
      scopeReady,
      prDone,
      poDone,
      workCompleted
    };

    try {
      if (editingItem) {
        await updateDocument('mace_project_planning', editingItem.id, payload);
        showToast('Planning project modified.');
      } else {
        await createDocument('mace_project_planning', payload);
        showToast('Created 5-year investment forecast item.');
      }
      setIsOpen(false);
    } catch (err) {
      showToast('Failed to save planning item.', 'error');
    }
  };

  const handleDelete = async (id, title) => {
    if (confirm(`Remove "${title}" from 5-Year investment list?`)) {
      try {
        await deleteDocument('mace_project_planning', id);
        showToast('Planning project deleted.');
      } catch (err) {
        showToast('Error deleting planning project.', 'error');
      }
    }
  };

  const filteredItems = items.filter(x => {
    const matchesSearch = x.item?.toLowerCase().includes(search.toLowerCase()) || 
                          x.note?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || x.type === filterType;
    const matchesPlant = filterPlant === 'all' || x.plant === filterPlant;
    const matchesPriority = filterPriority === 'all' || x.priority === filterPriority;
    return matchesSearch && matchesType && matchesPlant && matchesPriority;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedTableItems = [...filteredItems].sort((a, b) => {
    // 1. Group by LINE/Plant first (General -> RFG -> MIR)
    const getPlantWeight = (plantName) => {
      if (!plantName) return 99;
      const name = plantName.toUpperCase().trim();
      if (name.includes('GENERAL')) return 1;
      if (name.includes('RFG')) return 2;
      if (name.includes('MIR')) return 3;
      return 4;
    };

    const plantA = getPlantWeight(a.plant);
    const plantB = getPlantWeight(b.plant);
    if (plantA !== plantB) {
      return plantA - plantB;
    }

    // 2. Sort within groups
    let comparison = 0;
    if (sortBy === 'priority') {
      const priorityWeight = { 'S': 1, 'A': 2, 'B': 3, 'C': 4 };
      const weightA = priorityWeight[a.priority] || 99;
      const weightB = priorityWeight[b.priority] || 99;
      comparison = weightA - weightB;
    } else if (sortBy === 'budget') {
      const budgetA = Number(a.estimatedBudgetMthb) || 0;
      const budgetB = Number(b.estimatedBudgetMthb) || 0;
      comparison = budgetA - budgetB;
    } else if (sortBy === 'type') {
      const typeA = (a.type || '').toLowerCase();
      const typeB = (b.type || '').toLowerCase();
      comparison = typeA.localeCompare(typeB);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalMthbBudget = filteredItems.reduce((acc, curr) => acc + (Number(curr.estimatedBudgetMthb) || 0), 0);
  
  // Custom aggregations for KPI dashboard
  const safetyCount = filteredItems.filter(x => x.priority === 'S').length;
  const safetyBudget = filteredItems.filter(x => x.priority === 'S').reduce((acc, curr) => acc + (Number(curr.estimatedBudgetMthb) || 0), 0);
  
  const projectCount = filteredItems.filter(x => x.type === 'Project' || x.type === 'Improve').length;
  const projectBudget = filteredItems.filter(x => x.type === 'Project' || x.type === 'Improve').reduce((acc, curr) => acc + (Number(curr.estimatedBudgetMthb) || 0), 0);

  const maintenanceCount = filteredItems.filter(x => x.type === 'Yearly' || x.type === 'Sparepart' || x.type === 'Aging').length;
  const maintenanceBudget = filteredItems.filter(x => x.type === 'Yearly' || x.type === 'Sparepart' || x.type === 'Aging').reduce((acc, curr) => acc + (Number(curr.estimatedBudgetMthb) || 0), 0);

  return (
    <div className="workspace-container">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">5-Year Capital Project Planning</h1>
          <p className="page-subtitle">Formulate long term glass plant improvement schedules and aging infrastructure investments.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }} 
            onClick={() => setIsClearAllModalOpen(true)}
            id="clear-all-project-planning-btn"
            title="Clear all 5-year project planning data with confirmation"
          >
            <Trash2 size={14} />
            <span>Clear All Data</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} id="add-pp-btn">
            <Plus size={16} />
            <span>Add Plan Horizon</span>
          </button>
        </div>
      </div>

      {/* Aggregate Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
          <div>
            <div className="form-label" style={{ color: 'var(--text3)', margin: 0 }}>Total Forecasted Budget</div>
            <div className="font-mono" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent)', marginTop: '4px' }}>
              {formatMthb(totalMthbBudget)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{filteredItems.length} planned items</div>
          </div>
          <TrendingUp size={24} className="text3" style={{ opacity: 0.3 }} />
        </div>

        <div className="card metric-card flex-between">
          <div>
            <div className="metric-label">Safety & SPOF Critical (S)</div>
            <div className="metric-value" style={{ color: 'var(--red)' }}>
              {formatMthb(safetyBudget)}
            </div>
            <div className="metric-subtext">{safetyCount} super-critical items</div>
          </div>
          <ShieldAlert size={24} style={{ color: 'var(--red)', opacity: 0.4 }} />
        </div>

        <div className="card metric-card flex-between">
          <div>
            <div className="metric-label">Capital Projects (CAPEX)</div>
            <div className="metric-value" style={{ color: '#8b5cf6' }}>
              {formatMthb(projectBudget)}
            </div>
            <div className="metric-subtext">{projectCount} investment upgrades</div>
          </div>
          <Milestone size={24} style={{ color: '#8b5cf6', opacity: 0.4 }} />
        </div>

        <div className="card metric-card flex-between">
          <div>
            <div className="metric-label">Maintenance & Spares (OPEX)</div>
            <div className="metric-value" style={{ color: '#10b981' }}>
              {formatMthb(maintenanceBudget)}
            </div>
            <div className="metric-subtext">{maintenanceCount} yearly & parts programs</div>
          </div>
          <CheckCircle2 size={24} style={{ color: '#10b981', opacity: 0.4 }} />
        </div>
      </div>

      <div className="card controls-bar" id="pp-controls-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: '1' }}>
          <div style={{ position: 'relative', minWidth: '200px', flex: '1', maxWidth: '300px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search assets or notes..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%' }}
              id="pp-search-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-select" id="pp-type-filter" style={{ minWidth: '130px' }}>
              <option value="all">All Plan Types</option>
              <option value="Yearly">Yearly Program</option>
              <option value="Sparepart">Spare Parts</option>
              <option value="Project">Capital Projects</option>
              <option value="Aging">Aging Asset</option>
              <option value="Improve">Line Improvement</option>
            </select>

            <select value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)} className="form-select" id="pp-plant-filter" style={{ minWidth: '120px' }}>
              <option value="all">All Lines</option>
              <option value="General">General Plant</option>
              <option value="RFG">RFG Line</option>
              <option value="MIR">MIR Line</option>
            </select>

            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="form-select" id="pp-priority-filter" style={{ minWidth: '110px' }}>
              <option value="all">All Priorities</option>
              <option value="S">Priority S (Safety)</option>
              <option value="A">Priority A (High)</option>
              <option value="B">Priority B (Medium)</option>
              <option value="C">Priority C (Low)</option>
            </select>
          </div>
        </div>

        <div className="font-mono text3" style={{ fontSize: '12px', fontWeight: '500' }}>
          {filteredItems.length} visible plans
        </div>
      </div>

      {loading ? (
        <div id="pp-loading-skeleton">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state" id="pp-empty-state">
          <Milestone className="empty-state-icon" />
          <h4 className="empty-state-title">No Capital Future Plans</h4>
          <p className="empty-state-desc">Model aging infrastructure or furnace line improvements over the 5-year timeline grid.</p>
          <button className="btn btn-sm" onClick={handleOpenAdd}>Add Budget Plan</button>
        </div>
      ) : (
        <>
          {/* Timeline 5-Year Matrix Grid */}
            <div className="card" style={{ padding: '16px', borderColor: 'var(--border2)', overflowX: 'auto' }} id="pp-timeline-matrix">
              <h3 style={{ fontSize: '13.5px', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                5-Year Timeline Horizon Grid
              </h3>
              
              <div className="timeline-grid" style={{ minWidth: '850px' }}>
                {/* Year Headers */}
                <div className="timeline-header-cell" style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plant</div>
                <div className="timeline-header-cell" style={{ textAlign: 'left', paddingLeft: '12px', fontWeight: '700', fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project name</div>
                {YEARS.map(y => (
                  <div key={y.id} className="timeline-header-cell" style={{ textAlign: 'center', fontWeight: '700', fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{y.label}</div>
                ))}

                {/* Data Rows */}
                {filteredItems.map(p => {
                  const typeStyle = getTypeStyle(p.type);
                  return (
                    <React.Fragment key={p.id}>
                      {/* Column 1: LINE with existing chip style */}
                      <div className={`timeline-cell ${getRowBgClass(p.plant)}`} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRight: '1px solid var(--border)',
                        padding: '6px'
                      }}>
                        <span className="font-mono" style={{ 
                          backgroundColor: 'var(--surface2)', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600'
                        }}>
                          {p.plant}
                        </span>
                      </div>

                      {/* Column 2: Capital Project details aligned left */}
                      <div className={`timeline-cell timeline-first-cell ${getRowBgClass(p.plant)}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', paddingLeft: '12px' }}>
                        <div style={{ textAlign: 'left', width: '100%' }}>
                          <div style={{ fontWeight: '600', fontSize: '12.5px', color: 'var(--text)', lineHeight: '1.4' }} title={p.item}>
                            {p.item}
                          </div>
                          <div className="font-mono text3" style={{ fontSize: '10px', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ color: typeStyle.bg, fontWeight: '600' }}>{p.type}</span>
                            <span>•</span>
                            <span style={{ fontWeight: '600' }}>{formatMthb(p.estimatedBudgetMthb)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Columns 3-7: YEARS */}
                      {YEARS.map(y => {
                        const isPlanned = p.timelineYears?.[y.id];
                        return (
                          <div key={y.id} className={`timeline-cell ${getRowBgClass(p.plant)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isPlanned ? (
                              <span 
                                className="timeline-status" 
                                style={{ 
                                  backgroundColor: typeStyle.bg,
                                  boxShadow: `0 0 0 3px ${typeStyle.bg}20`,
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  display: 'inline-block'
                                }}
                                title={`Planned in ${y.label} (${typeStyle.label})`}
                              ></span>
                            ) : (
                              <span style={{ color: 'var(--border)', fontSize: '12px' }}>—</span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            
            <div style={{ marginTop: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text2)', padding: '10px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="timeline-status" style={{ backgroundColor: '#ef4444', display: 'inline-block', margin: 0, width: '10px', height: '10px' }}></span>
                <strong>Aging Asset Replacement</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="timeline-status" style={{ backgroundColor: '#8b5cf6', display: 'inline-block', margin: 0, width: '10px', height: '10px' }}></span>
                <strong>Capital Projects</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="timeline-status" style={{ backgroundColor: '#10b981', display: 'inline-block', margin: 0, width: '10px', height: '10px' }}></span>
                <strong>Yearly PM Program</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="timeline-status" style={{ backgroundColor: '#f59e0b', display: 'inline-block', margin: 0, width: '10px', height: '10px' }}></span>
                <strong>Critical Spare Parts</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="timeline-status" style={{ backgroundColor: '#3b82f6', display: 'inline-block', margin: 0, width: '10px', height: '10px' }}></span>
                <strong>Line Improvement</strong>
              </div>
            </div>
          </div>

          {/* Core Milestones Dashboard Table & Interactive Checklist */}
          <div className="table-container hide-on-mobile" style={{ marginTop: '12px', overflowX: 'auto' }} id="pp-milestones-table">
            <table className="data-table" style={{ width: '100%', minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>Plant</th>
                  <th style={{ width: '320px' }}>Planned Project Asset / Equipment</th>
                  <th 
                    style={{ width: '110px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('type')}
                    title="Sort by Type"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Type {sortBy === 'type' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    style={{ width: '110px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('priority')}
                    title="Sort by Priority"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      Priority {sortBy === 'priority' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th 
                    style={{ width: '110px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('budget')}
                    title="Sort by Budget"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      Budget {sortBy === 'budget' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                    </div>
                  </th>
                  <th style={{ textAlign: 'center', width: '85px' }}>Budget Appr.</th>
                  <th style={{ textAlign: 'center', width: '85px' }}>Scope Ready</th>
                  <th style={{ textAlign: 'center', width: '85px' }}>PR Issued</th>
                  <th style={{ textAlign: 'center', width: '85px' }}>PO Released</th>
                  <th style={{ textAlign: 'center', width: '85px' }}>Field Install</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTableItems.map(p => {
                  const typeStyle = getTypeStyle(p.type);
                  return (
                    <tr key={p.id} id={`pp-row-${p.id}`} className={getRowBgClass(p.plant)}>
                      <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                        <span className="font-mono" style={{ backgroundColor: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          {p.plant}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>{p.item}</div>
                        {p.note && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text3)', marginTop: '4px', fontWeight: '400', lineHeight: '1.4' }}>
                            {p.note}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 8px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          backgroundColor: `${typeStyle.bg}15`, 
                          color: typeStyle.bg 
                        }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '12px 8px' }}>
                        {getPriorityBadge(p.priority)}
                      </td>
                      <td className="font-mono" style={{ fontWeight: '700', textAlign: 'right', color: 'var(--accent)', verticalAlign: 'top', padding: '12px 8px' }}>
                        {formatMthb(p.estimatedBudgetMthb)}
                      </td>
                      
                      {/* Interactive Milestone Checkboxes toggled inside the row directly for ease of use! */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleToggleGateCheckbox(p, 'budgetApproved', p.budgetApproved)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                          aria-label={`Toggle budget approved for ${p.item}`}
                        >
                          {p.budgetApproved ? <CheckSquare size={17} className="text--green" style={{ color: 'var(--green)' }} /> : <Square size={17} className="text3" />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleToggleGateCheckbox(p, 'scopeReady', p.scopeReady)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                          aria-label={`Toggle scope ready for ${p.item}`}
                        >
                          {p.scopeReady ? <CheckSquare size={17} className="text--green" style={{ color: 'var(--green)' }} /> : <Square size={17} className="text3" />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleToggleGateCheckbox(p, 'prDone', p.prDone)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                          aria-label={`Toggle PR done for ${p.item}`}
                        >
                          {p.prDone ? <CheckSquare size={17} className="text--green" style={{ color: 'var(--green)' }} /> : <Square size={17} className="text3" />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleToggleGateCheckbox(p, 'poDone', p.poDone)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                          aria-label={`Toggle PO done for ${p.item}`}
                        >
                          {p.poDone ? <CheckSquare size={17} className="text--green" style={{ color: 'var(--green)' }} /> : <Square size={17} className="text3" />}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <button 
                          className="btn btn-sm" 
                          onClick={() => handleToggleGateCheckbox(p, 'workCompleted', p.workCompleted)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                          aria-label={`Toggle work completed for ${p.item}`}
                        >
                          {p.workCompleted ? <CheckSquare size={17} className="text--green" style={{ color: 'var(--green)' }} /> : <Square size={17} className="text3" />}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button className="btn btn-sm" onClick={() => handleOpenEdit(p)} aria-label="Edit project planning">
                            <Edit2 size={12} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.item)} aria-label="Delete project planning">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="mobile-cards-view" style={{ display: 'none' }} id="pp-mobile-view">
            {sortedTableItems.map(p => {
              const typeStyle = getTypeStyle(p.type);
              const cardClass = `mobile-table-card ${getRowBgClass(p.plant)}`;
              return (
                <div key={p.id} className={cardClass} id={`pp-card-${p.id}`} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{p.item}</h4>
                      {p.note && (
                        <p style={{ fontSize: '11.5px', color: 'var(--text3)', marginTop: '4px', fontWeight: '400', lineHeight: '1.4' }}>
                          {p.note}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span className="font-mono" style={{ backgroundColor: `${typeStyle.bg}20`, color: typeStyle.bg, padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: '600' }}>
                        {p.type}
                      </span>
                      <span className="font-mono" style={{ backgroundColor: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', color: 'var(--text2)', fontWeight: '600' }}>
                        {p.plant}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent)' }}>
                      Forecast: {formatMthb(p.estimatedBudgetMthb)}
                    </div>
                    <div>
                      {getPriorityBadge(p.priority)}
                    </div>
                  </div>

                  {/* Grid checklist on mobile */}
                  <div style={{ padding: '10px', backgroundColor: 'var(--surface2)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Budget Approved:</span>
                      <span>{p.budgetApproved ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Scope Ready:</span>
                      <span>{p.scopeReady ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>PR Done:</span>
                      <span>{p.prDone ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>PO Done:</span>
                      <span>{p.poDone ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Technical Complete:</span>
                      <strong style={{ color: p.workCompleted ? 'var(--green)' : 'var(--text2)' }}>
                        {p.workCompleted ? '✅ Yes' : '❌ No'}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                    <button className="btn btn-sm" onClick={() => handleOpenEdit(p)}>
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.item)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Editing dialog */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? 'Edit Forecast Item' : 'New Forecast Investment'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} id="submit-pp-btn">
              {editingItem ? 'Save Updates' : 'Commit Budget Plan'}
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
            <label className="form-label">Capital Horizon Asset / Project Description *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Line 2 MIR main cutting machine control cabin remodel" 
              value={item}
              onChange={(e) => setItemName(e.target.value)}
              required
              id="form-item"
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Technical Notes & Constraints (Context / SPOF details)</label>
            <textarea 
              className="form-input" 
              placeholder="Provide key notes, urgency justification, dependencies, or structural risks..." 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', width: '100%' }}
              id="form-note"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category Classification *</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)} id="form-type">
              <option value="Yearly">Yearly PM Program</option>
              <option value="Sparepart">Critical Spare Parts</option>
              <option value="Project">Capital Projects</option>
              <option value="Aging">Aging Asset Replacement</option>
              <option value="Improve">Plant Efficiency Improvement</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Plant Line / Unit</label>
            <select className="form-select" value={plant} onChange={(e) => setPlant(e.target.value)} id="form-plant">
              <option value="General">General Plant</option>
              <option value="RFG">RFG Plant Line</option>
              <option value="MIR">MIR Plant Line</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority Ranks *</label>
            <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)} id="form-priority">
              <option value="S">Priority S (Safety & Regulatory SPOF)</option>
              <option value="A">Priority A (High Plant Urgency)</option>
              <option value="B">Priority B (Medium Standard Upkeep)</option>
              <option value="C">Priority C (Low / Housekeeping)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Budget (MTHB) *</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              step="0.0001" 
              min="0.0001" 
              placeholder="e.g. 1.25" 
              value={estimatedBudgetMthb}
              onChange={(e) => setEstimatedBudgetMthb(e.target.value)}
              required
              id="form-estimatedBudgetMthb"
            />
          </div>

          {/* Timeline Multi check items */}
          <div className="form-group form-full" style={{ padding: '10px', background: 'var(--surface2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span className="form-label">Active Years Span (Check all planned years)</span>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px' }}>
              {YEARS.map(y => (
                <label key={y.id} className="checkbox-group font-mono" style={{ fontSize: '12px' }}>
                  <input 
                    type="checkbox" 
                    className="checkbox-custom" 
                    checked={timelineYears[y.id]} 
                    onChange={() => toggleYearCheckbox(y.id)}
                  />
                  <span>{y.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Gate Checklist subform layout */}
          <div className="form-group form-full" style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="form-label">Planning Gate Milestones Checklist</span>
            
            <label className="checkbox-group" style={{ fontSize: '12.5px' }}>
              <input 
                type="checkbox" 
                className="checkbox-custom" 
                checked={budgetApproved} 
                onChange={() => setBudgetApproved(!budgetApproved)}
              />
              <span>1. Budget Approved?</span>
            </label>

            <label className="checkbox-group" style={{ fontSize: '12.5px' }}>
              <input 
                type="checkbox" 
                className="checkbox-custom" 
                checked={scopeReady} 
                onChange={() => setScopeReady(!scopeReady)}
              />
              <span>2. Scope / Specs Ready?</span>
            </label>

            <label className="checkbox-group" style={{ fontSize: '12.5px' }}>
              <input 
                type="checkbox" 
                className="checkbox-custom" 
                checked={prDone} 
                onChange={() => setPrDone(!prDone)}
              />
              <span>3. Purchase Request (PR) Done?</span>
            </label>

            <label className="checkbox-group" style={{ fontSize: '12.5px' }}>
              <input 
                type="checkbox" 
                className="checkbox-custom" 
                checked={poDone} 
                onChange={() => setPoDone(!poDone)}
              />
              <span>4. Purchase Order (PO) Released?</span>
            </label>

            <label className="checkbox-group" style={{ fontSize: '12.5px' }}>
              <input 
                type="checkbox" 
                className="checkbox-custom" 
                checked={workCompleted} 
                onChange={() => setWorkCompleted(!workCompleted)}
              />
              <strong>5. Field Installation Completed?</strong>
            </label>
          </div>
        </form>
      </Modal>

      {/* MODAL: CLEAR ALL PROJECT PLANNING DATA CONFIRMATION */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title="Clear All Project Planning Data"
        footerActions={
          <>
            <button className="btn" onClick={() => setIsClearAllModalOpen(false)} disabled={isClearing}>Cancel</button>
            <button className="btn btn-danger" onClick={handleClearAllData} disabled={isClearing} id="confirm-clear-project-planning-btn">
              {isClearing ? 'Clearing Data...' : 'Yes, Clear All Data'}
            </button>
          </>
        }
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: '#dc2626' }}>
            <AlertTriangle size={24} />
            <span style={{ fontSize: '15px', fontWeight: '700' }}>Confirm Reset Project Timeline</span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: '1.6' }}>
            Are you sure you want to clear all <strong>{items.length} project planning items</strong>? 
            This action cannot be undone and will remove all 5-year capital project timeline horizons.
          </p>
        </div>
      </Modal>
    </div>
  );
}
