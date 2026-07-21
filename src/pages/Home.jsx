import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MessageSquare, 
  AlertTriangle, 
  ShoppingBag, 
  Layers, 
  FileText, 
  BookOpen, 
  FileCheck2,
  ListTodo,
  TrendingUp,
  Inbox,
  CheckCircle2,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
  Zap,
  CheckSquare
} from 'lucide-react';
import { formatDate } from '../utils';

export default function Home({ 
  setCurrentPage, 
  pmPlans = [], 
  pmLogs = [],
  longTermPlans = [], 
  vosfItems = [], 
  troubleRecords = [], 
  purchasingItems = [], 
  projectRequests = [], 
  projectPlanning = [], 
  drawings = [], 
  audits = [] 
}) {
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [toDoSearch, setToDoSearch] = useState('');

  // Get current month/year to filter PM plans due this month that are not finished yet
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1 to 12
  const currentMonthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const isMonthRequired = (item, year, month) => {
    if (item.cycle === 'monthly') return true;
    const startM = item.startMonth ? Number(item.startMonth) : (item.lastDoneDate ? (new Date(item.lastDoneDate).getMonth() + 1) : 1);
    const diff = (year - 2026) * 12 + (month - startM);
    let interval = 1;
    if (item.cycle === 'every 2 months') interval = 2;
    else if (item.cycle === 'every 6 months') interval = 6;
    else if (item.cycle === 'yearly') interval = 12;
    return (diff % interval + interval) % interval === 0;
  };

  const isMonthFinished = (item, year, month) => {
    const hasLog = pmLogs.some(
      (log) => log.planId === item.id && Number(log.year) === year && Number(log.month) === month
    );
    if (hasLog) return true;

    if (item.lastDoneDate) {
      const d = new Date(item.lastDoneDate);
      if (!isNaN(d.getTime())) {
        if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
          return true;
        }
      }
    }
    return false;
  };

  // Filter PM plans for current month
  const pmTasksDueThisMonth = pmPlans.filter(item => {
    const isRequired = isMonthRequired(item, currentYear, currentMonth);
    const isFinished = isMonthFinished(item, currentYear, currentMonth);
    return isRequired && !isFinished;
  });

  const pmTasksFinishedThisMonth = pmPlans.filter(item => {
    const isRequired = isMonthRequired(item, currentYear, currentMonth);
    const isFinished = isMonthFinished(item, currentYear, currentMonth);
    return isRequired && isFinished;
  });

  const totalPmRequiredThisMonth = pmTasksDueThisMonth.length + pmTasksFinishedThisMonth.length;
  const pmCompletionPercent = totalPmRequiredThisMonth > 0 
    ? Math.round((pmTasksFinishedThisMonth.length / totalPmRequiredThisMonth) * 100) 
    : 100;

  // Dynamic status-based counters
  const openPMs = pmTasksDueThisMonth.length;
  const openVOSF = vosfItems.filter(p => p.status?.toLowerCase() === 'open' || p.status?.toLowerCase() === 'in process').length;
  const activeTroubles = troubleRecords.filter(p => p.status?.toLowerCase() === 'open' || p.status?.toLowerCase() === 'in process').length;
  const pendingPurchasing = purchasingItems.filter(p => {
    const s = p.status?.toLowerCase();
    return s && s !== 'received' && s !== 'declined' && s !== 'cancel';
  }).length;
  const openProjReqs = projectRequests.filter(p => p.status?.toLowerCase() === 'open' || p.status?.toLowerCase() === 'in process').length;

  // Monthly Actionable Focus List compilation
  const monthlyPmItems = pmTasksDueThisMonth.map(item => ({
    id: `pm-${item.id}`,
    originalId: item.id,
    type: 'pm',
    category: 'PM Task',
    title: item.machineName || item.machineEquipment || 'Equipment PM',
    plant: item.plant || 'RFG',
    responsible: item.responsible || item.team || 'Maintenance',
    badgeText: item.cycle || 'Monthly',
    detail: item.checksheetId ? `Checksheet: ${item.checksheetId}` : `Code: ${item.pmCode || item.id}`,
    targetPage: 'pm-plan',
    urgent: false,
    color: '#0284c7'
  }));

  const monthlyTroubleItems = troubleRecords
    .filter(p => p.status?.toLowerCase() === 'open' || p.status?.toLowerCase() === 'in process')
    .map(item => ({
      id: `trouble-${item.id}`,
      originalId: item.id,
      type: 'trouble',
      category: 'Breakdown',
      title: item.machineEquipment || 'Equipment Breakdown',
      plant: item.plant || 'RFG',
      responsible: item.informer || 'Operator',
      badgeText: item.status || 'Active',
      detail: item.breakdownType || item.problem || 'Needs urgent maintenance',
      targetPage: 'trouble-record',
      urgent: true,
      color: '#dc2626'
    }));

  const monthlyPurchasingItems = purchasingItems
    .filter(p => {
      const s = p.status?.toLowerCase();
      return s && s !== 'received' && s !== 'declined' && s !== 'cancel';
    })
    .map(item => ({
      id: `purchasing-${item.id}`,
      originalId: item.id,
      type: 'purchasing',
      category: 'Spare Part',
      title: item.itemName || item.description || 'Spare Part Request',
      plant: item.plant || 'General',
      responsible: item.requestedBy || 'Purchasing',
      badgeText: item.status || 'Pending',
      detail: item.quantity ? `Qty: ${item.quantity} | Part #: ${item.partNumber || 'N/A'}` : `Part #: ${item.partNumber || 'N/A'}`,
      targetPage: 'purchasing',
      urgent: false,
      color: '#d97706'
    }));

  const monthlyVosfItems = vosfItems
    .filter(p => p.status?.toLowerCase() === 'open' || p.status?.toLowerCase() === 'in process')
    .map(item => ({
      id: `vosf-${item.id}`,
      originalId: item.id,
      type: 'vosf',
      category: 'Floor Issue',
      title: item.problemDescription || item.title || 'Shop Floor Complaint',
      plant: item.plant || 'MIR',
      responsible: item.reportedBy || 'Shop Floor',
      badgeText: item.status || 'Open',
      detail: item.location ? `Location: ${item.location}` : 'Awaiting inspection',
      targetPage: 'vosf',
      urgent: false,
      color: '#8b5cf6'
    }));

  const allMonthlyActionItems = [
    ...monthlyTroubleItems,
    ...monthlyPmItems,
    ...monthlyPurchasingItems,
    ...monthlyVosfItems
  ];

  // Filtering for Action Items Hub
  const filteredActionItems = allMonthlyActionItems.filter(item => {
    const matchesTab = activeFilterTab === 'all' || item.type === activeFilterTab;
    const q = toDoSearch.toLowerCase();
    const matchesSearch = !q || 
      item.title.toLowerCase().includes(q) || 
      item.plant.toLowerCase().includes(q) || 
      item.detail.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  // Dynamic stats calculation for bottom bar
  const sortedFuturePMs = [...pmPlans]
    .filter(p => p.nextDueDate && p.status?.toLowerCase() !== 'closed')
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  const nextPm = sortedFuturePMs[0];

  const sortedTroubles = [...troubleRecords]
    .filter(t => t.machineEquipment)
    .sort((a, b) => new Date(b.dateTime || 0) - new Date(a.dateTime || 0));
  const recentTrouble = sortedTroubles[sortedTroubles.length - 1];

  const modulesData = [
    {
      title: 'Maintenance Work',
      description: 'Manage preventive maintenance lists, equipment failure logs, floor complaints, and spare parts.',
      color: 'var(--accent)',
      items: [
        { id: 'pm-plan', label: 'PM Plan', desc: 'Recurring cycle machine PM schedule', icon: Calendar, count: openPMs, countLabel: 'Remaining' },
        { id: 'long-term-plan', label: 'Long Term Plan', desc: 'Horizon > 1 year replacement plan', icon: Clock, count: longTermPlans.length, countLabel: 'Items' },
        { id: 'vosf', label: 'Voice of Shop Floor', desc: 'Floor problems and complaint reporter', icon: MessageSquare, count: openVOSF, countLabel: 'Open' },
        { id: 'trouble-record', label: 'Trouble Record', desc: 'Equipment breakdown & downtime log', icon: AlertTriangle, count: activeTroubles, countLabel: 'Active' },
        { id: 'purchasing', label: 'Purchasing', desc: 'List of pending machine spare parts', icon: ShoppingBag, count: pendingPurchasing, countLabel: 'Pending' }
      ]
    },
    {
      title: 'Project Work',
      description: 'Supplier contract scopes, specifications, budgeting, and 5-year glass plant lifecycle planning.',
      color: 'var(--yellow)',
      items: [
        { id: 'project-requests', label: 'Project Requests', desc: 'Supplier contract scope registry & status', icon: Layers, count: openProjReqs, countLabel: 'Active' },
        { id: 'project-planning', label: 'Project Planning', desc: '5-year aging & improvement timeline', icon: FileText, count: projectPlanning.length, countLabel: 'Plans' }
      ]
    },
    {
      title: 'Document Work',
      description: 'Review electrical wiring drawings registry and yearly audits readiness checksheets.',
      color: 'var(--green)',
      items: [
        { id: 'drawings', label: 'Drawings', desc: 'Cabinet physical location drawing index', icon: BookOpen, count: drawings.length, countLabel: 'Drawings' },
        { id: 'audit', label: 'Audit', desc: 'Annual ISO preparation checklists', icon: FileCheck2, count: audits.length, countLabel: 'Audits' }
      ]
    }
  ];

  return (
    <div className="workspace-container" id="home-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Welcome Banner Card */}
      <div 
        className="card card-glow-blue" 
        style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, var(--surface2) 100%)', 
          borderColor: 'var(--border2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent)', backgroundColor: 'var(--blue-soft)', padding: '4px 10px', borderRadius: '20px', marginBottom: '8px' }}>
              <Zap size={13} /> Plant Console • {currentMonthName}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text)', margin: 0 }}>
              Electrical Maintenance Dashboard
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px', maxWidth: '600px' }}>
              Calm, real-time overview of current equipment PM tasks, active breakdown tickets, spare part requests, and module shortcuts.
            </p>
          </div>

          {/* PM Progress Indicator */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 18px', borderRadius: '12px', textAlign: 'right', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: '700', letterSpacing: '0.5px' }}>Monthly PM Execution</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: pmCompletionPercent === 100 ? 'var(--green)' : 'var(--accent)', marginTop: '2px' }}>
              {pmCompletionPercent}% <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)' }}>({pmTasksFinishedThisMonth.length}/{totalPmRequiredThisMonth})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '18px' }}>
        
        {/* PM Tasks */}
        <div 
          onClick={() => setCurrentPage('pm-plan')}
          className="card card-glow-blue interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            backgroundColor: 'var(--surface)',
            minHeight: '125px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px' }}>Remaining PM Tasks</div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--blue-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ListTodo size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>{openPMs}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', marginTop: '6px' }}>Cycle: {currentMonthName}</div>
          </div>
        </div>

        {/* Breakdowns */}
        <div 
          onClick={() => setCurrentPage('trouble-record')}
          className="card card-glow-red interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            backgroundColor: 'var(--surface)',
            minHeight: '125px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px' }}>Active Failures</div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: activeTroubles > 0 ? '#fee2e2' : 'var(--surface2)', color: activeTroubles > 0 ? 'var(--red)' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '30px', fontWeight: '800', color: activeTroubles > 0 ? 'var(--red)' : 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>{activeTroubles}</div>
            <div style={{ fontSize: '11px', color: activeTroubles > 0 ? 'var(--red)' : 'var(--green)', fontWeight: '600', marginTop: '6px' }}>
              {activeTroubles > 0 ? 'Needs Attention' : 'All Clear'}
            </div>
          </div>
        </div>

        {/* Pending Spares */}
        <div 
          onClick={() => setCurrentPage('purchasing')}
          className="card card-glow-yellow interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            backgroundColor: 'var(--surface)',
            minHeight: '125px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px' }}>Pending Spares</div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShoppingBag size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>{pendingPurchasing}</div>
            <div style={{ fontSize: '11px', color: 'var(--yellow)', fontWeight: '600', marginTop: '6px' }}>Awaiting Parts</div>
          </div>
        </div>

        {/* Floor Issues */}
        <div 
          onClick={() => setCurrentPage('vosf')}
          className="card card-glow-green interactive-card"
          style={{ 
            padding: '18px 20px', 
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            backgroundColor: 'var(--surface)',
            minHeight: '125px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '2px' }}>Shop Floor Issues</div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#d1fae5', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>{openVOSF}</div>
            <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '600', marginTop: '6px' }}>Open Reports</div>
          </div>
        </div>

      </div>

      {/* Navigation Bento Grid */}
      <div className="bento-grid" id="dashboard-bento">
        {modulesData.map((group, groupIdx) => (
          <div 
            key={groupIdx} 
            className={`card ${group.color === 'var(--yellow)' ? 'card-glow-yellow' : group.color === 'var(--green)' ? 'card-glow-green' : 'card-glow-blue'}`} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              border: '1px solid var(--border)', 
              paddingTop: '20px',
              backgroundColor: 'var(--surface)'
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>{group.title}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '16px', lineHeight: '1.4' }}>{group.description}</p>
            
            <div className="module-card-list">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button 
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className="module-card-link"
                    style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
                    id={`bento-link-${item.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="module-card-icon-container">
                        <ItemIcon size={14} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px' }}>{item.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{item.desc}</div>
                      </div>
                    </div>
                    {item.count > 0 ? (
                      <span className="badge-count">
                        {item.count} {item.countLabel}
                      </span>
                    ) : (
                      <span className="badge-count" style={{ opacity: 0.4 }}>—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Stats Footer Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 px-2 text-[#9b9b97] border-t border-[var(--border)] pt-6" id="dashboard-bottom-stats">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#9b9b97]">Recent Incident</span>
            <span className="font-mono text-xs text-[var(--text)]" style={{ marginTop: '2px' }}>
              {recentTrouble ? (
                `${recentTrouble.machineEquipment} (${formatDate(recentTrouble.dateTime)})`
              ) : (
                'None active'
              )}
            </span>
          </div>
          <div className="flex flex-col sm:border-l sm:border-[var(--border)] sm:pl-6">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#9b9b97]">Next Scheduled PM</span>
            <span className="font-mono text-xs text-[var(--text)]" style={{ marginTop: '2px' }}>
              {nextPm ? (
                `${nextPm.machineName} (${formatDate(nextPm.nextDueDate)})`
              ) : (
                'None scheduled'
              )}
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right flex flex-col sm:items-end">
           <span className="text-[10px] uppercase font-bold tracking-widest text-[#9b9b97]">Local Environment</span>
           <span className="font-mono text-xs text-[var(--text)]" style={{ marginTop: '2px' }}>29.4°C / 64% RH</span>
        </div>
      </div>

    </div>
  );
}

