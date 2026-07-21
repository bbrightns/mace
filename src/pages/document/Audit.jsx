import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  Calendar, 
  X, 
  Printer, 
  Download, 
  FileCheck2, 
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  FileText,
  AlertTriangle,
  MapPin,
  Check,
  User,
  Activity,
  Layers,
  Filter
} from 'lucide-react';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';

// Default empty state arrays
const defaultSchedules = [];
const defaultChecklists = [];
const defaultLinkedAssets = [];

const getLocalState = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

export default function Audit() {
  const { showToast } = useToast();

  // Local persistent state
  const [schedules, setSchedules] = useState(() => getLocalState('mace_audit_schedules_v2', defaultSchedules));
  const [checklistItems, setChecklistItems] = useState(() => getLocalState('mace_audit_checklists_v2', defaultChecklists));
  const [linkedAssets, setLinkedAssets] = useState(() => getLocalState('mace_audit_linked_assets_v2', defaultLinkedAssets));

  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select first schedule if selectedAuditId is null or invalid
  useEffect(() => {
    if (schedules.length > 0 && (!selectedAuditId || !schedules.some(s => s.id === selectedAuditId))) {
      setSelectedAuditId(schedules[0].id);
    }
  }, [schedules, selectedAuditId]);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEditingId, setScheduleEditingId] = useState(null); // null means adding a new one
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    date: '',
    scope: '',
    owner: '',
    status: 'Scheduled',
    area: ''
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    text: '',
    code: '',
    owner: '',
    dueDate: '',
    status: 'Pending'
  });

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetForm, setAssetForm] = useState({
    code: '',
    description: '',
    area: '',
    type: 'Asset',
    readiness: 'Ready'
  });

  // Sync back to local storage
  useEffect(() => {
    localStorage.setItem('mace_audit_schedules_v2', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('mace_audit_checklists_v2', JSON.stringify(checklistItems));
  }, [checklistItems]);

  useEffect(() => {
    localStorage.setItem('mace_audit_linked_assets_v2', JSON.stringify(linkedAssets));
  }, [linkedAssets]);

  // Calculations
  const selectedAudit = schedules.find(s => s.id === selectedAuditId) || schedules[0] || null;
  const nextAudit = schedules[0] || null;

  const getDaysLeftCount = (dateStr) => {
    try {
      const target = new Date(dateStr);
      const now = new Date('2026-05-21'); // standard metadata date
      const diffTime = target - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch (_) {
      return 0;
    }
  };

  const daysLeft = nextAudit ? getDaysLeftCount(nextAudit.date) : 0;

  const nextAuditChecklists = checklistItems.filter(item => item.auditId === (nextAudit?.id || ''));
  const checkedCount = nextAuditChecklists.filter(item => item.checked).length;
  const totalCount = nextAuditChecklists.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Actions
  const handleAcceleratePrep = () => {
    if (!nextAudit) return;
    const updated = checklistItems.map(item => {
      if (item.auditId === nextAudit.id) {
        return { ...item, checked: true, status: 'Ready' };
      }
      return item;
    });
    setChecklistItems(updated);
    showToast('Preparation task files accelerated! Checked items have been marked as READY.', 'success');
  };

  const handleSelectAudit = (id) => {
    setSelectedAuditId(id);
  };

  // Scheduled Audits
  const filteredSchedules = schedules.filter(s => 
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.scope || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.owner || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAddSchedule = () => {
    setScheduleEditingId(null);
    setScheduleForm({
      name: '',
      date: '',
      scope: '',
      owner: '',
      status: 'Scheduled',
      area: ''
    });
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (aud) => {
    setScheduleEditingId(aud.id);
    setScheduleForm({
      name: aud.name,
      date: aud.date,
      scope: aud.scope,
      owner: aud.owner,
      status: aud.status,
      area: aud.area || ''
    });
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = (e) => {
    if (e) e.preventDefault();
    if (!scheduleForm.name.trim() || !scheduleForm.date.trim() || !scheduleForm.owner.trim()) {
      showToast('Name, Date, and Lead Owner are required.', 'error');
      return;
    }

    if (scheduleEditingId) {
      const updated = schedules.map(s => s.id === scheduleEditingId ? { ...s, ...scheduleForm } : s);
      setSchedules(updated);
      showToast('Audit schedule updated successfully.', 'success');
    } else {
      const newId = `audit-${Date.now()}`;
      const newSchedule = {
        id: newId,
        ...scheduleForm
      };
      setSchedules([...schedules, newSchedule]);
      setSelectedAuditId(newId);
      showToast('Compliance audit envelope scheduled.', 'success');
    }
    setIsScheduleModalOpen(false);
  };

  const handleDeleteSchedule = (id, event) => {
    if (event) event.stopPropagation();
    if (window.confirm('Are you sure you want to remove this compliance audit schedule block?')) {
      const updated = schedules.filter(s => s.id !== id);
      setSchedules(updated);
      showToast('Audit schedule log removed.', 'success');
      if (selectedAuditId === id && updated.length > 0) {
        setSelectedAuditId(updated[0].id);
      }
    }
  };

  // Preparation Checklist
  const activeTasks = checklistItems.filter(item => item.auditId === selectedAuditId);

  const handleToggleTaskCheck = (taskId) => {
    const updated = checklistItems.map(item => {
      if (item.id === taskId) {
        const nextChecked = !item.checked;
        return { 
          ...item, 
          checked: nextChecked,
          status: nextChecked ? 'Ready' : 'In Progress'
        };
      }
      return item;
    });
    setChecklistItems(updated);
    showToast('Task checked state changed.', 'info');
  };

  const handleCycleTaskStatus = (taskId) => {
    const statusOrder = ['Pending', 'In Progress', 'Ready', 'Missing'];
    const updated = checklistItems.map(item => {
      if (item.id === taskId) {
        const currentIndex = statusOrder.indexOf(item.status);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const nextStatus = statusOrder[nextIndex];
        return { 
          ...item, 
          status: nextStatus,
          checked: nextStatus === 'Ready'
        };
      }
      return item;
    });
    setChecklistItems(updated);
    showToast('Lifecycle state cycled.', 'info');
  };

  const handleDeleteTask = (taskId) => {
    const updated = checklistItems.filter(item => item.id !== taskId);
    setChecklistItems(updated);
    showToast('Checklist requirement item deleted.', 'info');
  };

  const handleOpenAddTask = () => {
    setTaskForm({
      text: '',
      code: '',
      owner: '',
      dueDate: '',
      status: 'Pending'
    });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e) => {
    if (e) e.preventDefault();
    if (!taskForm.text.trim()) {
      showToast('Task/Document name is required.', 'error');
      return;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      auditId: selectedAuditId,
      text: taskForm.text.trim(),
      code: taskForm.code.trim() || 'GEN-DOC',
      owner: taskForm.owner.trim() || 'Staff Team',
      dueDate: taskForm.dueDate || '2026-07-15',
      status: taskForm.status,
      checked: taskForm.status === 'Ready'
    };

    setChecklistItems([...checklistItems, newTask]);
    setIsTaskModalOpen(false);
    showToast('Checklist requirement item appended successfully.', 'success');
  };

  // Linked Assets
  const handleOpenLinkAsset = () => {
    setAssetForm({
      code: '',
      description: '',
      area: '',
      type: 'Asset',
      readiness: 'Ready'
    });
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = (e) => {
    if (e) e.preventDefault();
    if (!assetForm.code.trim() || !assetForm.description.trim()) {
      showToast('Asset Tag and Description are required.', 'error');
      return;
    }

    const newAsset = {
      id: `asset-${Date.now()}`,
      code: assetForm.code.trim().toUpperCase(),
      description: assetForm.description.trim(),
      area: assetForm.area.trim() || 'General',
      type: assetForm.type,
      readiness: assetForm.readiness
    };

    setLinkedAssets([...linkedAssets, newAsset]);
    setIsAssetModalOpen(false);
    showToast('Registered asset linked under the compliance scope envelope.', 'success');
  };

  const handleUnlinkAsset = (id) => {
    if (window.confirm('Unlink this asset mapping from the target audit envelope?')) {
      const updated = linkedAssets.filter(item => item.id !== id);
      setLinkedAssets(updated);
      showToast('Mapped asset unlinked successfully.', 'success');
    }
  };

  return (
    <div className="workspace-container animate-fade-in" id="audit-system-workspace" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Page Header */}
      <PageHeader 
        title="Audit Management"
        subtitle="Track audit schedules, preparation tasks, required documents, and asset readiness."
        actions={
          <button 
            onClick={handleOpenAddSchedule}
            className="btn btn-primary"
            id="add-audit-btn"
          >
            <Plus size={16} />
            <span>New Audit Schedule</span>
          </button>
        }
        id="audit-page-header"
      />

      {/* 2. Hero Card / Next Audit (Styled cleanly in matching MACE theme) */}
      {nextAudit && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border)' }} id="hero-next-audit-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>
                NEXT CRITICAL AUDIT
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                {nextAudit.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--text2)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: 'var(--accent)' }} />
                  {nextAudit.area || 'Main Engineering Hub / RFG & MIR'}
                </span>
                <span style={{ color: 'var(--border2)' }}>|</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: 'var(--accent)' }} />
                  Target Date: <strong style={{ fontFamily: 'var(--font-mono)' }}>{nextAudit.date}</strong>
                </span>
              </div>
            </div>
            
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '120px' }}>
              <div style={{ fontSize: '28px', fontWeight: '850', color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {daysLeft}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                Days Remaining
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text2)', fontWeight: '500' }}>Preparation Progress Goal</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: progressPercent === 100 ? 'var(--green)' : 'var(--text)' }}>
                  {progressPercent}% Completions ({checkedCount}/{totalCount} Items)
                </strong>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: '100%', 
                    transform: `scaleX(${progressPercent / 100})`,
                    transformOrigin: 'left',
                    backgroundColor: progressPercent === 100 ? 'var(--green)' : 'var(--accent)', 
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }} 
                />
              </div>
            </div>

            <button 
              onClick={handleAcceleratePrep}
              className="btn" 
              style={{ color: 'var(--green)', borderColor: 'var(--green)', display: 'flex', alignItems: 'center', gap: '6px' }}
              id="accelerate-prep-btn"
            >
              <Sparkles size={14} />
              <span>Accelerate Prep</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }} id="kpi-metric-row">
        {/* KPI 1 */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(0,102,255,0.08)', color: 'var(--accent)', display: 'flex' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming Audits</div>
            <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text)', marginTop: '2px' }}>
              {schedules.length}
            </div>
          </div>
        </div>
        
        {/* KPI 2 */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.08)', color: 'var(--yellow)', display: 'flex' }}>
            <FileCheck2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Open Prep Tasks</div>
            <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text)', marginTop: '2px' }}>
              {checklistItems.filter(item => item.auditId === selectedAuditId && !item.checked).length}
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--red)', display: 'flex' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Missing Documents</div>
            <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text)', marginTop: '2px' }}>
              {checklistItems.filter(item => item.status === 'Missing').length}
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--green)', display: 'flex' }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Linked Scope Assets</div>
            <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text)', marginTop: '2px' }}>
              {linkedAssets.length}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }} id="split-management-grid">
        {/* Left Column: Scheduled Audits Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '12px' }} id="scheduled-audits-column">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)' }}>
              Scheduled Audits
            </h3>
            <button 
              className="btn btn-sm" 
              onClick={handleOpenAddSchedule}
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}
              id="inline-add-schedule"
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          </div>

          {/* Search box inline */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search audit name, owner, scope..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%', fontSize: '12.5px' }}
              id="schedule-search-box"
            />
          </div>

          {/* Audit List of Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredSchedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                No scheduled audits matches your query.
              </div>
            ) : (
              filteredSchedules.map((aud) => {
                const isSelected = aud.id === selectedAuditId;
                const isHighRisk = aud.status === 'High Risk';
                const isPreparing = aud.status === 'Preparing';
                
                let badgeColor = { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }; // Scheduled
                if (isHighRisk) {
                  badgeColor = { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' };
                } else if (isPreparing) {
                  badgeColor = { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
                }

                return (
                  <div 
                    key={aud.id}
                    onClick={() => handleSelectAudit(aud.id)}
                    style={{ 
                      padding: '12px 14px', 
                      borderRadius: '8px', 
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)', 
                      backgroundColor: isSelected ? 'var(--blue-soft)' : 'var(--surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    id={`schedule-item-${aud.id}`}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: 'var(--accent)', borderRadius: '4px 0 0 4px' }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text3)', fontWeight: '600' }}>
                        {aud.date}
                      </span>
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: '700', 
                        textTransform: 'uppercase', 
                        padding: '1px 6px', 
                        borderRadius: '12px', 
                        backgroundColor: badgeColor.bg, 
                        color: badgeColor.text,
                        border: `1px solid ${badgeColor.border}` 
                      }}>
                        {aud.status}
                      </span>
                    </div>
                    
                    <h4 style={{ fontSize: '13.5px', fontWeight: '650', color: isSelected ? 'var(--accent)' : 'var(--text)', marginTop: '4px', marginBottom: '2px' }}>
                      {aud.name}
                    </h4>
                    
                    <p style={{ fontSize: '12px', color: 'var(--text2)', lineBreak: 'anywhere' }}>
                      {aud.scope}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '6px', fontSize: '11px', color: 'var(--text3)' }}>
                      <span>Lead: <strong style={{ color: 'var(--text2)' }}>{aud.owner}</strong></span>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleOpenEditSchedule(aud)}
                          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px' }}
                          title="Edit Audit Details"
                        >
                          <Edit2 size={13} className="hover:text-accent" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteSchedule(aud.id, e)}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '2px' }}
                          title="Unschedule Event"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Preparation Checklist Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '12px' }} id="checklist-column">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)' }}>
                Preparation Checklist
              </h3>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)' }}>
                Target: {selectedAudit ? selectedAudit.name : 'No Audit Selected'}
              </span>
            </div>
            <button 
              className="btn btn-sm" 
              onClick={handleOpenAddTask}
              disabled={!selectedAudit}
              style={{ color: 'var(--accent)', borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}
              id="inline-add-task"
            >
              <Plus size={14} />
              <span>Add Prep Item</span>
            </button>
          </div>

          {/* Checklist Table */}
          <div className="table-container" style={{ flex: 1, maxHeight: '480px', overflowY: 'auto' }} id="checklist-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', paddingLeft: '12px' }}>Done</th>
                  <th>Required Document / Task</th>
                  <th>Responsible</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ width: '50px', textAlign: 'right', paddingRight: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                      No checklist tasks registered. Click "Add Prep Item" above to append items to this layout.
                    </td>
                  </tr>
                ) : (
                  activeTasks.map((item) => {
                    let badgeStyle = { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }; // Pending
                    if (item.status === 'Ready') {
                      badgeStyle = { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
                    } else if (item.status === 'In Progress') {
                      badgeStyle = { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
                    } else if (item.status === 'Missing') {
                      badgeStyle = { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' };
                    }

                    return (
                      <tr key={item.id} id={`checklist-row-${item.id}`}>
                        <td style={{ paddingLeft: '12px', verticalAlign: 'middle' }}>
                          <button 
                            onClick={() => handleToggleTaskCheck(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px', color: item.checked ? 'var(--green)' : 'var(--text3)' }}
                          >
                            {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td>
                          <div style={{ fontWeight: '500', color: 'var(--text)', textDecoration: item.checked ? 'line-through' : 'none' }}>
                            {item.text}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                            {item.code}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={11} style={{ color: 'var(--text3)' }} />
                            {item.owner}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          {item.dueDate}
                        </td>
                        <td>
                          <span 
                            onClick={() => handleCycleTaskStatus(item.id)}
                            style={{ 
                              fontSize: '9.2px', 
                              fontWeight: '700', 
                              textTransform: 'uppercase', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              backgroundColor: badgeStyle.bg, 
                              color: badgeStyle.text, 
                              border: `1px solid ${badgeStyle.border}`,
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                            title="Click to cycle status state"
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                          <button 
                            onClick={() => handleDeleteTask(item.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '2px' }}
                            title="Delete assignment"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. Bottom Card: Linked Assets & Documents */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} id="linked-assets-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text)' }}>
            Linked Assets and Documents
          </h3>
          <button 
            className="btn btn-sm" 
            onClick={handleOpenLinkAsset}
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}
            id="link-asset-button"
          >
            <Plus size={14} />
            <span>Link Scope Asset</span>
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px', paddingLeft: '16px' }}>Code</th>
                <th>Description Name</th>
                <th>Plant Area</th>
                <th>Object Type</th>
                <th>Readiness Compliance</th>
                <th style={{ width: '85px', textAlign: 'right', paddingRight: '16px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {linkedAssets.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                    No assets or documents registered under this audit envelope.
                  </td>
                </tr>
              ) : (
                linkedAssets.map((asset) => {
                  let readStyle = { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }; // Ready
                  if (asset.readiness === 'Pending Review') {
                    readStyle = { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
                  } else if (asset.readiness === 'Missing Items') {
                    readStyle = { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' };
                  }

                  return (
                    <tr key={asset.id} id={`asset-row-${asset.id}`}>
                      <td style={{ paddingLeft: '16px', fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--accent)' }}>
                        {asset.code}
                      </td>
                      <td style={{ fontWeight: '500', color: 'var(--text)' }}>
                        {asset.description}
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: 'var(--text2)' }}>{asset.area}</span>
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '600', color: 'var(--text3)' }}>
                        {asset.type}
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '700', 
                          textTransform: 'uppercase', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          backgroundColor: readStyle.bg, 
                          color: readStyle.text, 
                          border: `1px solid ${readStyle.border}` 
                        }}>
                          {asset.readiness}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                        <button 
                          onClick={() => handleUnlinkAsset(asset.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '2px' }}
                          title="Unlink asset"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paper Simulation Logic Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '11px', color: 'var(--text3)', flexWrap: 'wrap', gap: '10px' }}>
          <span>System status clock: Secure ISO Envelope Live State</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                window.print();
                showToast('Triggering system printer preview layout.', 'info');
              }}
              className="btn btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              id="print-preview-btn"
            >
              <Printer size={12} />
              <span>Print Preview</span>
            </button>
            <button 
              onClick={() => {
                showToast('Report file generated securely: MACE_AUDIT_ARCHIVE_REPORT.pdf downloaded.', 'success');
              }}
              className="btn btn-sm btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              id="export-pdf-btn"
            >
              <Download size={12} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Modals Layout */}

      {/* Audit Schedule modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={scheduleEditingId ? 'Edit Audit Schedule' : 'Schedule Compliance Audit Period'}
        footerActions={
          <>
            <button className="btn btn-sm" onClick={() => setIsScheduleModalOpen(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleSaveSchedule} id="confirm-save-schedule">
              {scheduleEditingId ? 'Save Changes' : 'Schedule Audit Slot'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Audit Title / Name *</label>
            <input 
              type="text"
              className="form-input"
              required
              value={scheduleForm.name}
              onChange={e => setScheduleForm({ ...scheduleForm, name: e.target.value })}
              placeholder="e.g. ISO 9001:2015 Recertification"
            />
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Target Date *</label>
              <input 
                type="date"
                className="form-input"
                required
                value={scheduleForm.date}
                onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Lead Liaison/Team *</label>
              <input 
                type="text"
                className="form-input"
                required
                value={scheduleForm.owner}
                onChange={e => setScheduleForm({ ...scheduleForm, owner: e.target.value })}
                placeholder="e.g. QA Team"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Location / Hub Area</label>
              <input 
                type="text"
                className="form-input"
                value={scheduleForm.area}
                onChange={e => setScheduleForm({ ...scheduleForm, area: e.target.value })}
                placeholder="e.g. Main Engineering Hub / Sector 2"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Risk Rating State</label>
              <select 
                className="form-select"
                value={scheduleForm.status}
                onChange={e => setScheduleForm({ ...scheduleForm, status: e.target.value })}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Preparing">Preparing</option>
                <option value="High Risk">High Risk</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Scope Description</label>
            <textarea 
              className="form-textarea"
              value={scheduleForm.scope}
              onChange={e => setScheduleForm({ ...scheduleForm, scope: e.target.value })}
              placeholder="Provide a brief description of compliance bounds..."
            />
          </div>
        </form>
      </Modal>

      {/* Task Requirement modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Preparation Checklist Item"
        footerActions={
          <>
            <button className="btn btn-sm" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleSaveTask} id="confirm-save-task">
              <span>Append Task Requirement</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Requirement Document / Task Title *</label>
            <input 
              type="text"
              className="form-input"
              required
              value={taskForm.text}
              onChange={e => setTaskForm({ ...taskForm, text: e.target.value })}
              placeholder="e.g. Arc Flash Clearance Reports"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Document ID/Code Code</label>
              <input 
                type="text"
                className="form-input"
                value={taskForm.code}
                onChange={e => setTaskForm({ ...taskForm, code: e.target.value })}
                placeholder="e.g. DOC-2026-CAL-1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Liaison Lead</label>
              <input 
                type="text"
                className="form-input"
                value={taskForm.owner}
                onChange={e => setTaskForm({ ...taskForm, owner: e.target.value })}
                placeholder="e.g. M. Kuznetsova"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Due Date *</label>
              <input 
                type="date"
                className="form-input"
                required
                value={taskForm.dueDate}
                onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Status Phase</label>
              <select 
                className="form-select"
                value={taskForm.status}
                onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready">Ready</option>
                <option value="Missing">Missing</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Link Asset scope modal */}
      <Modal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="Link Asset to Audit Scope"
        footerActions={
          <>
            <button className="btn btn-sm" onClick={() => setIsAssetModalOpen(false)}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={handleSaveAsset} id="confirm-save-asset">
              <span>Register Mapped Asset</span>
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveAsset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Asset Tag/Code *</label>
              <input 
                type="text"
                className="form-input font-mono"
                required
                value={assetForm.code}
                onChange={e => setAssetForm({ ...assetForm, code: e.target.value })}
                placeholder="e.g. SW-G11"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Type Category</label>
              <select 
                className="form-select"
                value={assetForm.type}
                onChange={e => setAssetForm({ ...assetForm, type: e.target.value })}
              >
                <option value="Asset">Asset</option>
                <option value="Drawing">Drawing</option>
                <option value="Procedure">Procedure</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Hub Area Plant Space</label>
              <input 
                type="text"
                className="form-input"
                value={assetForm.area}
                onChange={e => setAssetForm({ ...assetForm, area: e.target.value })}
                placeholder="e.g. RFG"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Readiness Category Status</label>
              <select 
                className="form-select"
                value={assetForm.readiness}
                onChange={e => setAssetForm({ ...assetForm, readiness: e.target.value })}
              >
                <option value="Ready">Ready</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Missing Items">Missing Items</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Asset Name / Title Description *</label>
            <input 
              type="text"
              className="form-input"
              required
              value={assetForm.description}
              onChange={e => setAssetForm({ ...assetForm, description: e.target.value })}
              placeholder="e.g. Switchgear Gen-Set"
            />
          </div>
        </form>
      </Modal>

    </div>
  );
}
