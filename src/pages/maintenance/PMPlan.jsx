import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  User, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  X,
  FileText,
  CalendarDays,
  Grid,
  Download,
  Upload,
  TrendingUp,
  Clock,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  setDocument,
  batchWriteOperations,
  batchDeleteDocuments
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import PMReportPdfModal from '../../components/PMReportPdfModal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate } from '../../utils';
import { calculateGradeAndRank } from './MachineClassify';

// Normalization helper for machine names
export function normalizeMachineName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[#_/\-\\()[\].:,]/g, ' ')
    .replace(/\b(no|num|number|m\/c|mc|machine)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fuzzy rank suggestion helper from Machine Classification
export function findSuggestedRank(pmMachineName, classifyItems = []) {
  if (!pmMachineName || !classifyItems.length) return null;
  const pmClean = normalizeMachineName(pmMachineName);
  if (!pmClean) return null;

  // Tier 1: Exact / normalized match
  for (const item of classifyItems) {
    const mClean = normalizeMachineName(item.machine);
    const m2Clean = normalizeMachineName(item.machine2);
    if (pmClean === mClean || (m2Clean && pmClean === m2Clean)) {
      const calc = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
      return { rank: calc.rank, source: item.machine || item.machine2, confidence: 'exact' };
    }
  }

  // Tier 2: Contains / Substring match
  for (const item of classifyItems) {
    const mClean = normalizeMachineName(item.machine);
    const m2Clean = normalizeMachineName(item.machine2);
    if (mClean && (pmClean.includes(mClean) || mClean.includes(pmClean))) {
      const calc = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
      return { rank: calc.rank, source: item.machine, confidence: 'high' };
    }
    if (m2Clean && (pmClean.includes(m2Clean) || m2Clean.includes(pmClean))) {
      const calc = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
      return { rank: calc.rank, source: item.machine2, confidence: 'high' };
    }
  }

  // Tier 3: Token similarity (words overlap >= 50%)
  const pmTokens = pmClean.split(' ').filter(t => t.length > 1);
  if (pmTokens.length > 0) {
    let bestMatch = null;
    let maxOverlap = 0;
    for (const item of classifyItems) {
      const mTokens = normalizeMachineName(item.machine).split(' ').filter(t => t.length > 1);
      const overlap = pmTokens.filter(t => mTokens.includes(t)).length;
      const score = overlap / Math.max(pmTokens.length, mTokens.length);
      if (score >= 0.5 && score > maxOverlap) {
        maxOverlap = score;
        const calc = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
        bestMatch = { rank: calc.rank, source: item.machine, confidence: 'fuzzy' };
      }
    }
    if (bestMatch) return bestMatch;
  }

  return null;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function PMPlan() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  // Machine Classification dataset for rank auto-sync & suggestions
  const [classifyItems, setClassifyItems] = useState(() => {
    try {
      const cached = localStorage.getItem('mace_machine_classify_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Views and filtration
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' or 'list'
  const [selectedYear, setSelectedYear] = useState(2026);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'pm', 'calibrate'
  const [filterRank, setFilterRank] = useState('all'); // 'all', 'S', 'A', 'B', 'C'
  const [filterCycle, setFilterCycle] = useState('all');
  const [filterPlant, setFilterPlant] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  // Batch Selection & Batch Input Date / Due Date States
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchYear, setBatchYear] = useState(2026);
  const [batchMonth, setBatchMonth] = useState(5);
  const [batchDoneDay, setBatchDoneDay] = useState(20);
  const [batchNote, setBatchNote] = useState('');
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  // Batch Change Schedule / Cycle States
  const [isBatchDueDateModalOpen, setIsBatchDueDateModalOpen] = useState(false);
  const [batchCycle, setBatchCycle] = useState('keep'); // 'keep' or specific cycle
  const [batchStartMonth, setBatchStartMonth] = useState(1);

  // Batch Set Rank & Batch Set Tag States
  const [isBatchRankModalOpen, setIsBatchRankModalOpen] = useState(false);
  const [batchRankValue, setBatchRankValue] = useState('A');
  const [isBatchRankSaving, setIsBatchRankSaving] = useState(false);

  const [isBatchTypeModalOpen, setIsBatchTypeModalOpen] = useState(false);
  const [batchTypeValue, setBatchTypeValue] = useState('pm');
  const [isBatchTypeSaving, setIsBatchTypeSaving] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState('plant'); // 'plant', 'machineName', 'itemType', 'rank', 'cycle', 'checksheetId', 'responsible', 'lastDone', 'nextDue'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortableHeader = (field, label, style = {}) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(field); } }}
        role="columnheader"
        aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        tabIndex={0}
        style={{ ...style, cursor: 'pointer', userSelect: 'none' }}
        title={`Click or press Enter/Space to sort by ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>{label}</span>
          <span style={{ fontSize: '10px', color: isSorted ? 'var(--accent)' : 'var(--text3)', opacity: isSorted ? 1 : 0.4 }}>
            {isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };
  
  // Create/Edit plan modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states (Plans)
  const [machineName, setMachineName] = useState('');
  const [itemType, setItemType] = useState('pm'); // 'pm' or 'calibrate'
  const [rank, setRank] = useState('B'); // 'S', 'A', 'B', 'C'
  const [suggestedRankInfo, setSuggestedRankInfo] = useState(null);
  const [plant, setPlant] = useState('RFG');
  const [responsible, setResponsible] = useState('My team');
  const [cycle, setCycle] = useState('monthly');
  const [startMonth, setStartMonth] = useState(1);
  const [checksheetId, setChecksheetId] = useState('');
  const [lastDoneDate, setLastDoneDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [status, setStatus] = useState('Open');
  const [formError, setFormError] = useState('');

  // Log Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCellItem, setSelectedCellItem] = useState(null);
  const [selectedCellYear, setSelectedCellYear] = useState(2026);
  const [selectedCellMonth, setSelectedCellMonth] = useState(5);
  const [logDoneDate, setLogDoneDate] = useState('2026-05-20');
  const [logDoneDay, setLogDoneDay] = useState(15);
  const [logNote, setLogNote] = useState('');
  const [existingLog, setExistingLog] = useState(null);
  const [showDeleteLogConfirm, setShowDeleteLogConfirm] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);

  // Import Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importMode, setImportMode] = useState('add'); // 'add' or 'overwrite'

  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const { showToast } = useToast();
  const logDoneDayInputRef = useRef(null);

  useEffect(() => {
    if (isLogModalOpen) {
      // Small timeout to ensure the modal elements have fully rendered in the DOM
      const timer = setTimeout(() => {
        if (logDoneDayInputRef.current) {
          logDoneDayInputRef.current.focus();
          try {
            logDoneDayInputRef.current.select();
          } catch (e) {
            console.error(e);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLogModalOpen]);

  // Helper function to format YYYY-MM-DD
  const formatInputDate = (date) => {
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const unsubscribePlans = subscribeCollection('mace_pm_plans', (data) => {
      setItems(data);
      setLoadingPlans(false);
    }, (error) => {
      showToast('Failed to sync PM schedules.', 'error');
      setLoadingPlans(false);
    });

    const unsubscribeLogs = subscribeCollection('mace_pm_logs', (data) => {
      setLogs(data);
      setLoadingLogs(false);
    }, (error) => {
      showToast('Failed to sync PM logs.', 'error');
      setLoadingLogs(false);
    });

    const unsubscribeClassify = subscribeCollection('mace_machine_classify', (data) => {
      if (data && data.length > 0) {
        setClassifyItems(data);
        localStorage.setItem('mace_machine_classify_cache', JSON.stringify(data));
      }
    }, () => {});

    return () => {
      unsubscribePlans();
      unsubscribeLogs();
      unsubscribeClassify();
    };
  }, [showToast]);

  // Live Auto Rank Suggestion when typing Machine Name in Modal
  useEffect(() => {
    if (isOpen && machineName.trim() && classifyItems.length > 0) {
      const suggestion = findSuggestedRank(machineName, classifyItems);
      setSuggestedRankInfo(suggestion);
    } else {
      setSuggestedRankInfo(null);
    }
  }, [machineName, isOpen, classifyItems]);

  // Helper to calculate Next Due Date reactively
  const calculateNextDueDate = (lastDone, cycleValue) => {
    if (!lastDone) return '';
    const date = new Date(lastDone);
    if (isNaN(date.getTime())) return '';
    
    if (cycleValue === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (cycleValue === 'every 2 months') {
      date.setMonth(date.getMonth() + 2);
    } else if (cycleValue === 'every 6 months') {
      date.setMonth(date.getMonth() + 6);
    } else if (cycleValue === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    }
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Update Next Due Date immediately when Last Done or Cycle changes in form
  const handleLastDoneChange = (val) => {
    setLastDoneDate(val);
    if (val && cycle) {
      setNextDueDate(calculateNextDueDate(val, cycle));
    }
  };

  const handleCycleChange = (val) => {
    setCycle(val);
    if (lastDoneDate && val) {
      setNextDueDate(calculateNextDueDate(lastDoneDate, val));
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setMachineName('');
    setItemType('pm');
    setRank('B');
    setSuggestedRankInfo(null);
    setPlant('RFG');
    setResponsible('My team');
    setCycle('monthly');
    setStartMonth(1);
    setChecksheetId('');
    setLastDoneDate('');
    setNextDueDate('');
    setStatus('Open');
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setMachineName(item.machineName || '');
    setItemType(item.itemType || item.type || 'pm');
    setRank(item.rank || 'B');
    setSuggestedRankInfo(null);
    setPlant(item.plant || 'RFG');
    setResponsible(item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team'));
    setCycle(item.cycle || 'monthly');
    const initialStartMonth = item.startMonth ? Number(item.startMonth) : 
      (item.lastDoneDate ? (new Date(item.lastDoneDate).getMonth() + 1) : 1);
    setStartMonth(initialStartMonth);
    setChecksheetId(item.checksheetId || '');
    setLastDoneDate(toInputDate(item.lastDoneDate));
    setNextDueDate(toInputDate(item.nextDueDate));
    setStatus(item.status || 'Open');
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!machineName.trim()) {
      setFormError('Machine Name/Equipment is required.');
      return;
    }

    const payload = {
      machineName: machineName.trim(),
      itemType: itemType || 'pm',
      rank: rank || 'B',
      plant,
      responsible,
      cycle,
      startMonth: Number(startMonth),
      checksheetId: checksheetId.trim()
    };

    try {
      if (editingItem) {
        await updateDocument('mace_pm_plans', editingItem.id, payload);
        showToast('PM Schedule updated successfully.');
      } else {
        await createDocument('mace_pm_plans', payload);
        showToast('New PM Schedule added successfully.');
      }
      setIsOpen(false);
    } catch (error) {
      showToast('Error saving PM Schedule. Please try again.', 'error');
    }
  };

  // Batch Save Rank Handler
  const handleSaveBatchRank = async (e) => {
    if (e) e.preventDefault();
    if (selectedPlanIds.length === 0) return;
    setIsBatchRankSaving(true);
    try {
      const operations = selectedPlanIds.map(id => ({
        type: 'update',
        collectionName: 'mace_pm_plans',
        id,
        data: { rank: batchRankValue }
      }));
      await batchWriteOperations(operations);
      showToast(`Updated Rank to "${batchRankValue}" for ${selectedPlanIds.length} items.`, 'success');
      setIsBatchRankModalOpen(false);
      setSelectedPlanIds([]);
    } catch (err) {
      console.error('Failed to batch save rank:', err);
      showToast('Failed to update rank in batch.', 'error');
    } finally {
      setIsBatchRankSaving(false);
    }
  };

  // Batch Save Tag / Type Handler
  const handleSaveBatchType = async (e) => {
    if (e) e.preventDefault();
    if (selectedPlanIds.length === 0) return;
    setIsBatchTypeSaving(true);
    try {
      const operations = selectedPlanIds.map(id => ({
        type: 'update',
        collectionName: 'mace_pm_plans',
        id,
        data: { itemType: batchTypeValue }
      }));
      await batchWriteOperations(operations);
      const label = batchTypeValue === 'calibrate' ? 'Calibrate' : 'PM';
      showToast(`Updated Activity Type to "${label}" for ${selectedPlanIds.length} items.`, 'success');
      setIsBatchTypeModalOpen(false);
      setSelectedPlanIds([]);
    } catch (err) {
      console.error('Failed to batch save type:', err);
      showToast('Failed to update type in batch.', 'error');
    } finally {
      setIsBatchTypeSaving(false);
    }
  };

  const handleOpenDeleteModal = (item) => {
    setPlanToDelete(item);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await deleteDocument('mace_pm_plans', planToDelete.id);
      showToast(`PM Schedule "${planToDelete.machineName}" deleted.`);
      setPlanToDelete(null);
      setIsOpen(false);
    } catch (error) {
      showToast('Failed to delete PM schedule.', 'error');
    }
  };

  const handleDelete = (item) => {
    setPlanToDelete(item);
  };

  // Dynamic Helpers for item completions and schedules
  const getPlanLastDoneDate = (item) => {
    const itemLogs = logs.filter(log => log.planId === item.id && log.doneDate);
    if (itemLogs.length > 0) {
      const sorted = [...itemLogs].sort((a, b) => b.doneDate.localeCompare(a.doneDate));
      return sorted[0].doneDate;
    }
    return item.lastDoneDate || null;
  };

  const isPlanOverdue = (item) => {
    const currentYear = 2026; // Standard system year
    const currentMonth = 5; // May
    for (let m = 1; m < currentMonth; m++) {
      const status = getCellStatus(item, currentYear, m);
      if (status === 'overdue') return true;
    }
    return false;
  };

  const getNextDueText = (item) => {
    const currentYear = 2026;
    const currentMonth = 5;
    
    for (let m = currentMonth; m <= 12; m++) {
      if (isMonthRequired(item, currentYear, m)) {
        const hasLog = logs.some(l => l.planId === item.id && Number(l.year) === currentYear && Number(l.month) === m);
        if (!hasLog) {
          return `${MONTH_NAMES[m - 1]} ${currentYear}`;
        }
      }
    }
    for (let m = 1; m <= 12; m++) {
      if (isMonthRequired(item, currentYear + 1, m)) {
        return `${MONTH_NAMES[m - 1]} ${currentYear + 1}`;
      }
    }
    return 'No upcoming schedule';
  };

  // Calculate whether a cell requires a PM (by planning intervals starting at startMonth)
  const isMonthRequired = (item, year, month) => {
    if (item.cycle === 'monthly') return true; // Monthly means every single month is required!

    // Use item.startMonth or fallback to item.lastDoneDate month or 1
    const startM = item.startMonth ? Number(item.startMonth) : (item.lastDoneDate ? (new Date(item.lastDoneDate).getMonth() + 1) : 1);
    const diff = (year - 2026) * 12 + (month - startM);
    
    let interval = 1;
    if (item.cycle === 'every 2 months') interval = 2;
    else if (item.cycle === 'every 6 months') interval = 6;
    else if (item.cycle === 'yearly') interval = 12;
    
    return (diff % interval + interval) % interval === 0;
  };

  // Helper to determine active overdue status for the plan list
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dueDate < todayStr;
  };

  // Dynamic Plant options extracted from dataset
  const plantOptions = Array.from(new Set(['RFG', 'MIR', 'BOTH', ...items.map(item => item.plant).filter(Boolean)])).sort();

  // Summary counts for filter badges
  const typeStats = useMemo(() => {
    const stats = { all: items.length, pm: 0, calibrate: 0 };
    items.forEach(item => {
      const t = item.itemType || item.type || 'pm';
      if (t === 'calibrate') stats.calibrate++;
      else stats.pm++;
    });
    return stats;
  }, [items]);

  const rankStats = useMemo(() => {
    const stats = { all: items.length, S: 0, A: 0, B: 0, C: 0 };
    items.forEach(item => {
      const r = item.rank || 'B';
      if (stats[r] !== undefined) stats[r]++;
    });
    return stats;
  }, [items]);

  // Filter & Search logic
  const filteredItems = items.filter((item) => {
    const searchLower = search.toLowerCase().trim();
    const itemTypeVal = (item.itemType || item.type || 'pm').toLowerCase();
    const itemRankVal = (item.rank || 'B').toLowerCase();

    const matchesSearch = !searchLower || 
      item.machineName?.toLowerCase().includes(searchLower) || 
      item.checksheetId?.toLowerCase().includes(searchLower) ||
      itemTypeVal.includes(searchLower) ||
      `rank ${itemRankVal}`.includes(searchLower);

    const matchesPlant = filterPlant === 'all' || (item.plant || 'RFG') === filterPlant;
    
    const displayResp = item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team');
    const matchesResponsible = filterResponsible === 'all' || displayResp === filterResponsible;

    const matchesCycle = filterCycle === 'all' || item.cycle === filterCycle;
    const matchesType = filterType === 'all' || (item.itemType || item.type || 'pm') === filterType;
    const matchesRank = filterRank === 'all' || (item.rank || 'B') === filterRank;

    const matchesMonth = filterMonth === 'all' || isMonthRequired(item, selectedYear, Number(filterMonth));

    return matchesSearch && matchesPlant && matchesResponsible && matchesCycle && matchesType && matchesRank && matchesMonth;
  });

  const trendItems = items.filter((item) => {
    const searchLower = search.toLowerCase().trim();
    const itemTypeVal = (item.itemType || item.type || 'pm').toLowerCase();
    const itemRankVal = (item.rank || 'B').toLowerCase();

    const matchesSearch = !searchLower || 
      item.machineName?.toLowerCase().includes(searchLower) || 
      item.checksheetId?.toLowerCase().includes(searchLower) ||
      itemTypeVal.includes(searchLower) ||
      `rank ${itemRankVal}`.includes(searchLower);

    const matchesPlant = filterPlant === 'all' || (item.plant || 'RFG') === filterPlant;
    const displayResp = item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team');
    const matchesResponsible = filterResponsible === 'all' || displayResp === filterResponsible;

    const matchesCycle = filterCycle === 'all' || item.cycle === filterCycle;
    const matchesType = filterType === 'all' || (item.itemType || item.type || 'pm') === filterType;
    const matchesRank = filterRank === 'all' || (item.rank || 'B') === filterRank;

    return matchesSearch && matchesPlant && matchesResponsible && matchesCycle && matchesType && matchesRank;
  });

  // Shift key range selection state
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // Batch Selection & Execution Handlers
  const handleToggleSelectAll = () => {
    if (selectedPlanIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedPlanIds([]);
    } else {
      setSelectedPlanIds(filteredItems.map(item => item.id));
    }
  };

  const handleToggleSelectItem = (id, e) => {
    const isShiftPressed = e && e.shiftKey;

    if (isShiftPressed && lastSelectedId && sortedItems.some(i => i.id === lastSelectedId)) {
      const currentIndex = sortedItems.findIndex(i => i.id === id);
      const lastIndex = sortedItems.findIndex(i => i.id === lastSelectedId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = sortedItems.slice(start, end + 1).map(i => i.id);

        setSelectedPlanIds(prev => {
          const newSet = new Set(prev);
          rangeIds.forEach(rId => newSet.add(rId));
          return Array.from(newSet);
        });
        setLastSelectedId(id);
        return;
      }
    }

    setSelectedPlanIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setLastSelectedId(id);
  };

  const handleOpenBatchModal = () => {
    if (selectedPlanIds.length === 0) {
      showToast('Please select at least one PM item using the checkboxes.', 'error');
      return;
    }
    setBatchYear(selectedYear);
    setBatchMonth(filterMonth !== 'all' ? Number(filterMonth) : (new Date().getMonth() + 1));
    setBatchDoneDay(new Date().getDate());
    setBatchNote('');
    setIsBatchModalOpen(true);
  };

  const handleSaveBatchLog = async (e) => {
    e.preventDefault();
    if (selectedPlanIds.length === 0) return;

    const dayNum = Number(batchDoneDay);
    const maxDays = new Date(batchYear, batchMonth, 0).getDate();
    if (!dayNum || dayNum < 1 || dayNum > maxDays) {
      showToast(`Please enter a valid day between 1 and ${maxDays}.`, 'error');
      return;
    }

    setIsBatchSaving(true);
    const formattedMonth = String(batchMonth).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const calculatedDateStr = `${batchYear}-${formattedMonth}-${formattedDay}`;

    try {
      const selectedItems = items.filter(i => selectedPlanIds.includes(i.id));
      const operations = [];

      for (const item of selectedItems) {
        // 1. Check if log already exists for this plan in target year/month
        const existing = logs.find(
          (log) => log.planId === item.id && Number(log.year) === Number(batchYear) && Number(log.month) === Number(batchMonth)
        );

        if (existing) {
          operations.push({
            type: 'update',
            collectionName: 'mace_pm_logs',
            id: existing.id,
            data: {
              doneDate: calculatedDateStr,
              note: batchNote ? batchNote : (existing.note || '')
            }
          });
        } else {
          operations.push({
            type: 'create',
            collectionName: 'mace_pm_logs',
            data: {
              planId: item.id,
              year: Number(batchYear),
              month: Number(batchMonth),
              doneDate: calculatedDateStr,
              note: batchNote
            }
          });
        }

        // 2. Check if logged date is latest. If so, update lastDoneDate in main schedule
        const existingLastDone = item.lastDoneDate;
        if (!existingLastDone || calculatedDateStr >= existingLastDone) {
          if (existingLastDone) {
            const oldDate = new Date(existingLastDone);
            if (!isNaN(oldDate.getTime())) {
              const oldYear = oldDate.getFullYear();
              const oldMonth = oldDate.getMonth() + 1;
              const hasOldLog = logs.some(
                (l) => l.planId === item.id && Number(l.year) === oldYear && Number(l.month) === oldMonth
              );
              if (!hasOldLog) {
                operations.push({
                  type: 'create',
                  collectionName: 'mace_pm_logs',
                  data: {
                    planId: item.id,
                    year: oldYear,
                    month: oldMonth,
                    doneDate: existingLastDone,
                    note: 'Preserved initial PM completion log'
                  }
                });
              }
            }
          }

          const calculatedNextDue = calculateNextDueDate(calculatedDateStr, item.cycle);
          operations.push({
            type: 'update',
            collectionName: 'mace_pm_plans',
            id: item.id,
            data: {
              lastDoneDate: calculatedDateStr,
              nextDueDate: calculatedNextDue
            }
          });
        }
      }

      await batchWriteOperations(operations);

      showToast(`Batch updated PM completion logs for ${selectedItems.length} items.`);
      setIsBatchModalOpen(false);
      setSelectedPlanIds([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to save batch PM logs.', 'error');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleOpenBatchDueDateModal = () => {
    if (selectedPlanIds.length === 0) {
      showToast('Please select at least one PM item using the checkboxes.', 'error');
      return;
    }
    setBatchCycle('keep');
    setBatchStartMonth(filterMonth !== 'all' ? Number(filterMonth) : 1);
    setIsBatchDueDateModalOpen(true);
  };

  const handleSaveBatchDueDate = async (e) => {
    e.preventDefault();
    if (selectedPlanIds.length === 0) return;

    setIsBatchSaving(true);
    try {
      const selectedItems = items.filter(i => selectedPlanIds.includes(i.id));
      const operations = [];

      for (const item of selectedItems) {
        const updateData = {
          startMonth: Number(batchStartMonth)
        };
        if (batchCycle !== 'keep') {
          updateData.cycle = batchCycle;
        }

        operations.push({
          type: 'update',
          collectionName: 'mace_pm_plans',
          id: item.id,
          data: updateData
        });
      }

      await batchWriteOperations(operations);

      showToast(`Batch updated schedule for ${selectedItems.length} items.`);
      setIsBatchDueDateModalOpen(false);
      setSelectedPlanIds([]);
    } catch (err) {
      console.error(err);
      showToast('Failed to update schedule.', 'error');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const sortedItems = [...filteredItems].sort((a, b) => {
    let valA, valB;
    
    switch (sortField) {
      case 'plant':
        valA = a.plant || '';
        valB = b.plant || '';
        break;
      case 'itemType':
        valA = a.itemType || a.type || 'pm';
        valB = b.itemType || b.type || 'pm';
        break;
      case 'rank':
        valA = a.rank || 'B';
        valB = b.rank || 'B';
        break;
      case 'machineName':
        valA = a.machineName || '';
        valB = b.machineName || '';
        break;
      case 'cycle':
        valA = a.cycle || '';
        valB = b.cycle || '';
        break;
      case 'checksheetId':
        valA = a.checksheetId || '';
        valB = b.checksheetId || '';
        break;
      case 'responsible':
        const displayRespA = a.responsible === 'Own Team' ? 'My team' : (a.responsible || 'My team');
        const displayRespB = b.responsible === 'Own Team' ? 'My team' : (b.responsible || 'My team');
        valA = displayRespA;
        valB = displayRespB;
        break;
      case 'lastDone':
        valA = getPlanLastDoneDate(a) || '';
        valB = getPlanLastDoneDate(b) || '';
        break;
      case 'nextDue':
        valA = getNextDueText(a) || '';
        valB = getNextDueText(b) || '';
        break;
      default:
        valA = a.plant || '';
        valB = b.plant || '';
    }

    let comparison = 0;
    if (typeof valA === 'string' && typeof valB === 'string') {
      comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
    } else {
      if (valA < valB) comparison = -1;
      if (valA > valB) comparison = 1;
    }

    if (comparison === 0) {
      // Fallback secondary sort to Plant then Machine Name
      const pComp = (a.plant || '').localeCompare(b.plant || '');
      if (pComp !== 0) return pComp;
      return (a.machineName || '').localeCompare(b.machineName || '');
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Determine cell color code & state
  const getCellStatus = (item, year, month) => {
    // 1. Is the month required? If not, it's definitely a grey box (faded) and blank!
    const required = isMonthRequired(item, year, month);
    if (!required) return 'faded';

    // 2. Is there a logged execution inside mace_pm_logs?
    const hasLog = logs.some(
      (log) => log.planId === item.id && Number(log.year) === year && Number(log.month) === month
    );
    if (hasLog) return 'done';

    // 3. Is this the original month and year of the plan's current lastDoneDate?
    let isOriginalLastDone = false;
    if (item.lastDoneDate) {
      const d = new Date(item.lastDoneDate);
      if (!isNaN(d.getTime())) {
        isOriginalLastDone = d.getFullYear() === year && (d.getMonth() + 1) === month;
      }
    }
    if (isOriginalLastDone) return 'done';

    // 4. Has this slot already elapsed (with respect to current today's date)?
    const today = new Date();
    const currentYearVal = today.getFullYear();
    const currentMonthVal = today.getMonth() + 1;
    const isPast = year < currentYearVal || (year === currentYearVal && month < currentMonthVal);
    if (isPast) return 'overdue';

    return 'pending';
  };

  // Helper to get min/max date strings for the selected cell month/year
  const getMinMaxDates = () => {
    if (!selectedCellYear || !selectedCellMonth) return { min: '', max: '' };
    const yearStr = selectedCellYear;
    const monthStr = String(selectedCellMonth).padStart(2, '0');
    const lastDay = new Date(selectedCellYear, selectedCellMonth, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    return {
      min: `${yearStr}-${monthStr}-01`,
      max: `${yearStr}-${monthStr}-${lastDayStr}`
    };
  };

  // Click handler on grid cell
  const handleCellClick = (item, year, month, status) => {
    if (status === 'faded') return;

    setSelectedCellItem(item);
    setSelectedCellYear(year);
    setSelectedCellMonth(month);

    // Look for previous logs
    const existing = logs.find(
      (log) => log.planId === item.id && Number(log.year) === year && Number(log.month) === month
    );

    if (existing) {
      setExistingLog(existing);
      setLogDoneDate(existing.doneDate || '');
      const dayPart = existing.doneDate ? Number(existing.doneDate.split('-')[2]) : 15;
      setLogDoneDay(isNaN(dayPart) ? 15 : dayPart);
      setLogNote(existing.note || '');
    } else {
      setExistingLog(null);
      // Sensible default done date (e.g., today's date if current month/year, else mid-month)
      const formattedMonth = String(month).padStart(2, '0');
      const standardDate = (year === 2026 && month === 5) ? '2026-05-20' : `${year}-${formattedMonth}-15`;
      setLogDoneDate(standardDate);
      setLogDoneDay((year === 2026 && month === 5) ? 20 : 15);
      setLogNote('');
    }

    setShowDeleteLogConfirm(false);
    setIsLogModalOpen(true);
  };

   const handleSaveLog = async (e) => {
    e.preventDefault();
    const dayNum = Number(logDoneDay);
    const maxDays = new Date(selectedCellYear, selectedCellMonth, 0).getDate();
    if (!dayNum || dayNum < 1 || dayNum > maxDays) {
      showToast(`Please enter a valid day between 1 and ${maxDays}.`, 'error');
      return;
    }

    const formattedMonth = String(selectedCellMonth).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const calculatedDateStr = `${selectedCellYear}-${formattedMonth}-${formattedDay}`;

    try {
      if (existingLog) {
        // Update log
        await updateDocument('mace_pm_logs', existingLog.id, {
          doneDate: calculatedDateStr,
          note: logNote
        });
        showToast('Updated PM Log.');
      } else {
        // Create log
        await createDocument('mace_pm_logs', {
          planId: selectedCellItem.id,
          year: Number(selectedCellYear),
          month: Number(selectedCellMonth),
          doneDate: calculatedDateStr,
          note: logNote
        });
        showToast('PM check successfully logged.');
      }

      // Check if logged date is latest. If so, update lastDoneDate in main schedule
      const existingLastDone = selectedCellItem.lastDoneDate;
      if (!existingLastDone || calculatedDateStr >= existingLastDone) {
        // Archive the old lastDoneDate to mace_pm_logs if no log exists for it yet
        if (existingLastDone) {
          const oldDate = new Date(existingLastDone);
          if (!isNaN(oldDate.getTime())) {
            const oldYear = oldDate.getFullYear();
            const oldMonth = oldDate.getMonth() + 1;
            const hasOldLog = logs.some(
              (log) => log.planId === selectedCellItem.id && Number(log.year) === oldYear && Number(log.month) === oldMonth
            );
            if (!hasOldLog) {
              await createDocument('mace_pm_logs', {
                planId: selectedCellItem.id,
                year: oldYear,
                month: oldMonth,
                doneDate: existingLastDone,
                note: 'Preserved initial PM completion log'
              });
            }
          }
        }

        const calculatedNextDue = calculateNextDueDate(calculatedDateStr, selectedCellItem.cycle);
        await updateDocument('mace_pm_plans', selectedCellItem.id, {
          lastDoneDate: calculatedDateStr,
          nextDueDate: calculatedNextDue
        });
      }

      setIsLogModalOpen(false);
    } catch (err) {
      showToast('Failed to save PM log.', 'error');
    }
  };

  const handleDeleteLog = async () => {
    if (!existingLog) return;
    if (!showDeleteLogConfirm) {
      setShowDeleteLogConfirm(true);
      return;
    }
    try {
      await deleteDocument('mace_pm_logs', existingLog.id);
      
      // Find next latest log on Firebase for this plan
      const remainingLogs = logs.filter(l => l.planId === selectedCellItem.id && l.id !== existingLog.id);
      if (remainingLogs.length > 0) {
        const sorted = [...remainingLogs].sort((a, b) => b.doneDate.localeCompare(a.doneDate));
        const latest = sorted[0];
        const newNext = calculateNextDueDate(latest.doneDate, selectedCellItem.cycle);
        await updateDocument('mace_pm_plans', selectedCellItem.id, {
          lastDoneDate: latest.doneDate,
          nextDueDate: newNext
        });
      } else {
        await updateDocument('mace_pm_plans', selectedCellItem.id, {
          lastDoneDate: '',
          nextDueDate: ''
        });
      }

      showToast('PM check log deleted.');
      setIsLogModalOpen(false);
      setShowDeleteLogConfirm(false);
    } catch (err) {
      showToast('Failed to delete PM log.', 'error');
    }
  };

  // --- IMPORT & EXPORT FUNCTIONS ---
  const handleExportJSON = () => {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        plans: items,
        logs: logs
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `PM_Plan_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      showToast('Full backup (JSON) exported successfully.');
    } catch (error) {
      showToast('Failed to export backup.', 'error');
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) {
      showToast('No items to export.', 'error');
      return;
    }

    const formatDateToDDMMYY = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).slice(-2); // last 2 digits, e.g. 26
      return `${day}-${month}-${year}`;
    };

    try {
      const headers = [
        'Machine/Equipment',
        'Activity Type',
        'Rank',
        'Plant',
        'Responsible',
        'Cycle',
        'Start Month',
        'Checksheet ID',
        'Scheduled Year',
        'Scheduled Month',
        'Actual Done Date',
        'Engineer Notes'
      ];
      
      const rows = [];
      for (const item of items) {
        const itemLogs = logs.filter(log => log.planId === item.id);
        const startM = item.cycle === 'monthly' ? '' : (item.startMonth ? Number(item.startMonth) : (item.lastDoneDate ? (new Date(item.lastDoneDate).getMonth() + 1) : 1));
        
        const machineEscaped = `"${(item.machineName || '').replace(/"/g, '""')}"`;
        const typeEscaped = `"${(item.itemType || item.type || 'pm').toUpperCase()}"`;
        const rankEscaped = `"${item.rank || 'B'}"`;
        const plantEscaped = `"${(item.plant || 'RFG').replace(/"/g, '""')}"`;
        const responsibleEscaped = `"${(item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team')).replace(/"/g, '""')}"`;
        const cycleEscaped = `"${(item.cycle || 'monthly').replace(/"/g, '""')}"`;
        const startMonthEscaped = startM !== '' ? `"${startM}"` : '""';
        const checksheetEscaped = `"${(item.checksheetId || '').replace(/"/g, '""')}"`;

        if (itemLogs.length > 0) {
          // Sort logs chronologically by year and month
          const sortedLogs = [...itemLogs].sort((a, b) => {
            const yearDiff = Number(a.year) - Number(b.year);
            if (yearDiff !== 0) return yearDiff;
            return Number(a.month) - Number(b.month);
          });
          
          for (const log of sortedLogs) {
            rows.push([
              machineEscaped,
              typeEscaped,
              rankEscaped,
              plantEscaped,
              responsibleEscaped,
              cycleEscaped,
              startMonthEscaped,
              checksheetEscaped,
              `"${log.year}"`,
              `"${MONTH_NAMES[Number(log.month) - 1] || log.month}"`,
              `"${formatDateToDDMMYY(log.doneDate)}"`,
              `"${(log.notes || '').replace(/"/g, '""')}"`
            ]);
          }
        } else {
          rows.push([
            machineEscaped,
            typeEscaped,
            rankEscaped,
            plantEscaped,
            responsibleEscaped,
            cycleEscaped,
            startMonthEscaped,
            checksheetEscaped,
            '""',
            '""',
            '""',
            '"No completions recorded yet"'
          ]);
        }
      }
      
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `PM_Schedules_With_Logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('PM Schedules with execution logs exported successfully.');
    } catch (error) {
      showToast('Failed to export CSV.', 'error');
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    if (lines.length < 2) return { plans: [], logs: [] };
    const plansMap = {};
    const parsedLogs = [];

    const headerCols = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const hasTypeCol = headerCols.some(h => h.includes('type') || h.includes('tag'));
    const hasRankCol = headerCols.some(h => h.includes('rank'));

    const parseImportDate = (dateStr, yearHint, monthHint) => {
      if (!dateStr) return '';
      const cleanStr = dateStr.trim();
      if (!cleanStr || cleanStr === 'No completions recorded yet') return '';

      // Standard regex check for YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
      }

      // Try splitting by slash, hyphen, or spaces
      const parts = cleanStr.split(/[\-\/\s]+/);
      if (parts.length === 3) {
        let part1 = parts[0].trim();
        let part2 = parts[1].trim();
        let part3 = parts[2].trim();

        let y = yearHint || 2026;
        let m = monthHint || 1;
        let d = 15;

        // Check if first part is 4-digit year (YYYY-MM-DD)
        if (part1.length === 4 && !isNaN(Number(part1))) {
          y = Number(part1);
          if (!isNaN(Number(part2))) {
            m = Number(part2);
          } else {
            const idx = MONTH_NAMES.findIndex(
              name => name.toLowerCase() === part2.toLowerCase() ||
                      part2.toLowerCase().startsWith(name.toLowerCase())
            );
            if (idx !== -1) m = idx + 1;
          }
          d = Number(part3) || 15;
        } else {
          // First part is day (DD-MM-YY)
          d = Number(part1) || 15;

          // Month is second part
          if (!isNaN(Number(part2))) {
            m = Number(part2);
          } else {
            const idx = MONTH_NAMES.findIndex(
              name => name.toLowerCase() === part2.toLowerCase() ||
                      part2.toLowerCase().startsWith(name.toLowerCase())
            );
            if (idx !== -1) m = idx + 1;
          }

          // Year is third part
          if (part3.length === 4) {
            y = Number(part3);
          } else if (part3.length === 2) {
            const val = Number(part3);
            y = val < 50 ? 2000 + val : 1900 + val;
          }
        }

        if (isNaN(y) || y < 1900 || y > 2100) y = yearHint || 2026;
        if (isNaN(m) || m < 1 || m > 12) m = monthHint || 1;
        if (isNaN(d) || d < 1 || d > 31) d = 15;

        const formattedMonth = String(m).padStart(2, '0');
        const formattedDay = String(d).padStart(2, '0');
        return `${y}-${formattedMonth}-${formattedDay}`;
      }

      // Fallback using JS Date parsing
      const parsed = new Date(cleanStr);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }

      return '';
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());

      const machineName = cols[0]?.replace(/^["']|["']$/g, '') || '';
      if (!machineName) continue;

      let itemType = 'pm';
      let rank = 'B';
      let plant = 'RFG';
      let responsible = 'My team';
      let cycle = 'monthly';
      let startMonthValue = '';
      let checksheetId = '';
      let scheduledYearStr = '';
      let scheduledMonthStr = '';
      let actualDoneDate = '';
      let note = '';

      if (hasTypeCol && hasRankCol) {
        // Modern 12-column format
        const rawType = cols[1]?.replace(/^["']|["']$/g, '').toLowerCase() || 'pm';
        itemType = rawType.includes('cal') ? 'calibrate' : 'pm';
        const rawRank = cols[2]?.replace(/^["']|["']$/g, '').toUpperCase() || 'B';
        rank = ['S', 'A', 'B', 'C'].includes(rawRank) ? rawRank : 'B';
        plant = cols[3]?.replace(/^["']|["']$/g, '') || 'RFG';
        responsible = cols[4]?.replace(/^["']|["']$/g, '') || 'My team';
        cycle = cols[5]?.replace(/^["']|["']$/g, '').toLowerCase() || 'monthly';
        startMonthValue = cols[6]?.replace(/^["']|["']$/g, '') || '';
        checksheetId = cols[7]?.replace(/^["']|["']$/g, '') || '';
        scheduledYearStr = cols[8]?.replace(/^["']|["']$/g, '').trim();
        scheduledMonthStr = cols[9]?.replace(/^["']|["']$/g, '').trim();
        actualDoneDate = cols[10]?.replace(/^["']|["']$/g, '').trim();
        note = cols[11]?.replace(/^["']|["']$/g, '').trim();
      } else {
        // Legacy 10-column format
        plant = cols[1]?.replace(/^["']|["']$/g, '') || 'RFG';
        responsible = cols[2]?.replace(/^["']|["']$/g, '') || 'My team';
        cycle = cols[3]?.replace(/^["']|["']$/g, '').toLowerCase() || 'monthly';
        startMonthValue = cols[4]?.replace(/^["']|["']$/g, '') || '';
        checksheetId = cols[5]?.replace(/^["']|["']$/g, '') || '';
        scheduledYearStr = cols[6]?.replace(/^["']|["']$/g, '').trim();
        scheduledMonthStr = cols[7]?.replace(/^["']|["']$/g, '').trim();
        actualDoneDate = cols[8]?.replace(/^["']|["']$/g, '').trim();
        note = cols[9]?.replace(/^["']|["']$/g, '').trim();
      }

      let startMonthNum = 1;
      if (startMonthValue) {
        if (startMonthValue.includes('-')) {
          const d = new Date(startMonthValue);
          if (!isNaN(d.getTime())) {
            startMonthNum = d.getMonth() + 1;
          }
        } else {
          startMonthNum = Number(startMonthValue);
        }
      }

      const key = `${machineName.toLowerCase().trim()}||${plant.toLowerCase().trim()}`;
      if (!plansMap[key]) {
        plansMap[key] = {
          id: 'temp_plan_' + Math.random().toString(36).substring(2, 11),
          machineName,
          itemType,
          rank,
          plant,
          responsible: responsible === 'Own Team' ? 'My team' : responsible,
          cycle,
          startMonth: isNaN(startMonthNum) ? 1 : startMonthNum,
          checksheetId
        };
      }

      if (actualDoneDate && actualDoneDate !== '' && actualDoneDate !== 'No completions recorded yet') {
        const year = Number(scheduledYearStr) || 2026;
        let month = 1;
        if (scheduledMonthStr) {
          const idx = MONTH_NAMES.findIndex(
            m => m.toLowerCase() === scheduledMonthStr.toLowerCase() || 
                 m.substring(0, 3).toLowerCase() === scheduledMonthStr.toLowerCase().substring(0, 3)
          );
          if (idx !== -1) {
            month = idx + 1;
          } else {
            const parsedNum = Number(scheduledMonthStr);
            if (!isNaN(parsedNum)) {
              month = parsedNum;
            }
          }
        }

        const normalizedDoneDate = parseImportDate(actualDoneDate, year, month);

        parsedLogs.push({
          planId: plansMap[key].id,
          year,
          month,
          doneDate: normalizedDoneDate || `${year}-${String(month).padStart(2, '0')}-15`,
          note: note || ''
        });
      }
    }

    return {
      plans: Object.values(plansMap),
      logs: parsedLogs
    };
  };

  const handleCloseImport = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setImportError('');
    setIsImporting(false);
    setImportMode('add');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          if (!data || (typeof data !== 'object')) {
            throw new Error('Invalid JSON structure.');
          }
          let plansCount = 0;
          let logsCount = 0;
          let plansToImport = [];
          let logsToImport = [];

          if (Array.isArray(data)) {
            plansToImport = data;
            plansCount = data.length;
          } else if (data.plans && Array.isArray(data.plans)) {
            plansToImport = data.plans;
            plansCount = data.plans.length;
            if (data.logs && Array.isArray(data.logs)) {
              logsToImport = data.logs;
              logsCount = data.logs.length;
            }
          } else {
            throw new Error('Could not find recognizable plans array in JSON.');
          }

          setImportPreview({
            type: 'JSON',
            plans: plansToImport,
            logs: logsToImport,
            plansCount,
            logsCount
          });
        } else if (file.name.endsWith('.csv')) {
          const { plans, logs } = parseCSV(text);
          if (plans.length === 0) {
            throw new Error('No valid rows found in CSV.');
          }
          setImportPreview({
            type: 'CSV',
            plans,
            logs,
            plansCount: plans.length,
            logsCount: logs.length
          });
        } else {
          throw new Error('Unsupported file extension. Please upload .json or .csv');
        }
      } catch (err) {
        setImportError(err.message || 'Failed to read file.');
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    setImportError('');
    
    let successPlans = 0;
    let successLogs = 0;

    try {
      if (importMode === 'overwrite') {
        // Clear all existing plans and logs before overwriting in batches
        await batchDeleteDocuments('mace_pm_plans', items.map(i => i.id));
        await batchDeleteDocuments('mace_pm_logs', logs.map(l => l.id));
      }

      const planIdMap = {};
      const planOps = [];

      for (const plan of importPreview.plans) {
        const payload = {
          machineName: plan.machineName || 'Unnamed Machine',
          plant: plan.plant || 'RFG',
          responsible: plan.responsible === 'Own Team' ? 'My team' : (plan.responsible || 'My team'),
          cycle: plan.cycle || 'monthly',
          startMonth: plan.startMonth ? Number(plan.startMonth) : (plan.lastDoneDate ? (new Date(plan.lastDoneDate).getMonth() + 1) : 1),
          checksheetId: plan.checksheetId || ''
        };

        if (importPreview.type === 'JSON' && plan.id) {
          planOps.push({
            type: 'set',
            collectionName: 'mace_pm_plans',
            id: plan.id,
            data: payload
          });
          if (plan.id) planIdMap[plan.id] = plan.id;
        } else {
          planOps.push({
            type: 'create',
            collectionName: 'mace_pm_plans',
            data: payload,
            onDocCreated: (generatedId) => {
              if (plan.id) {
                planIdMap[plan.id] = generatedId;
              }
            }
          });
        }
        successPlans++;
      }

      await batchWriteOperations(planOps);

      const logOps = [];
      for (const log of importPreview.logs) {
        let targetPlanId = log.planId;
        if (planIdMap[targetPlanId]) {
          targetPlanId = planIdMap[targetPlanId];
        }

        if (!targetPlanId) continue;
        const payload = {
          planId: targetPlanId,
          year: Number(log.year),
          month: Number(log.month),
          doneDate: log.doneDate,
          note: log.note || ''
        };

        if (log.id && importPreview.type === 'JSON') {
          logOps.push({
            type: 'set',
            collectionName: 'mace_pm_logs',
            id: log.id,
            data: payload
          });
        } else {
          logOps.push({
            type: 'create',
            collectionName: 'mace_pm_logs',
            data: payload
          });
        }
        successLogs++;
      }

      await batchWriteOperations(logOps);

      showToast(`Import completed. Created/Updated ${successPlans} plans and ${successLogs} logs.`);
      handleCloseImport();
    } catch (err) {
      console.error(err);
      setImportError('An error occurred during import: ' + (err.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  const loading = loadingPlans || loadingLogs;

  return (
    <div className="workspace-container" id="pm-plan-workspace">
      {/* Visual stylesheet for calendar grid & cell types matching Vercel feel */}
      <style>{`
        .view-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
          padding-bottom: 2px;
        }
        .view-tab {
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          color: var(--text2);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 8px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.1s ease;
        }
        .view-tab:hover {
          color: var(--text);
          background-color: var(--surface2);
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
        }
        .view-tab.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          font-weight: 600;
        }
        .filter-chips-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 0;
        }
        .filter-label {
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text3);
          letter-spacing: 0.8px;
          min-width: 80px;
        }
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .filter-chip {
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text2);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }
        .filter-chip:hover {
          background-color: var(--surface2);
          color: var(--text);
          border-color: var(--border2);
        }
        .filter-chip.active {
          background-color: var(--accent);
          color: #ffffff;
          border-color: var(--accent);
        }
        .overdue-row {
          background-color: #fff5f5 !important;
        }
        .overdue-indicator {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 700;
          color: #b91c1c;
          background-color: #fee2e2;
          padding: 1px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 6px;
          vertical-align: middle;
        }
        .plant-badge {
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 600;
          padding: 2px 5px;
          border-radius: 4px;
          background: var(--surface2);
          color: var(--text2);
          border: 1px solid var(--border);
        }
        .plant-badge.mir {
          background-color: #F2E3B7 !important;
          color: #5c4a16 !important;
          border-color: #dccba0 !important;
        }
        .plant-badge.rfg {
          background-color: #D7E6DD !important;
          color: #2a4033 !important;
          border-color: #b7c9be !important;
        }
        .plant-badge.both {
          background-color: #BFD7E9 !important;
          color: #1e3a5f !important;
          border-color: #a4c2db !important;
        }

        /* 12-Month Calendar Grid Styles */
        .grid-card {
          border: 1px solid var(--border);
          border-radius: 10px;
          background-color: var(--surface);
          overflow: hidden;
        }
        .grid-header-tools {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background-color: var(--surface);
        }
        .grid-table-container {
          overflow-x: auto;
          width: 100%;
        }
        .grid-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          min-width: 800px;
        }
        .grid-table th, .grid-table td {
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 8px 10px;
          vertical-align: middle;
          text-align: center;
        }
        .grid-table th:last-child, .grid-table td:last-child {
          border-right: none;
        }
        .grid-table th {
          background-color: var(--surface2);
          color: var(--text2);
          font-size: 11px;
          font-weight: 600;
          height: 38px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .grid-table td.machine-cell {
          text-align: left;
          font-weight: 600;
          color: var(--text);
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background-color: var(--surface);
          position: sticky;
          left: 0;
          z-index: 5;
          box-shadow: 2px 0 5px rgba(0,0,0,0.03);
          border-right: 2px solid var(--border2);
        }
        .month-cell {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          height: 44px;
          transition: all 0.12s ease;
        }
        /* Color themes for cells */
        .color-faded {
          background-color: #fafafa;
          color: var(--text3);
          cursor: default;
          opacity: 0.5;
        }
        .color-pending {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
          cursor: pointer;
        }
        .color-pending:hover {
          background: #dbeafe;
          transform: scale(1.02);
        }
        .color-done {
          background: #f0fdf4;
          color: #15803d;
          border-color: #bbf7d0;
          cursor: pointer;
        }
        .color-done:hover {
          background: #dcfce7;
          transform: scale(1.02);
        }
        .color-overdue {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fca5a5;
          cursor: pointer;
          animation: overdueGlow 1.8s infinite alternate;
        }
        .color-overdue:hover {
          background: #fee2e2;
          transform: scale(1.02);
        }
        @keyframes overdueGlow {
          from { box-shadow: inset 0 0 4px rgba(220, 38, 38, 0.05); }
          to { box-shadow: inset 0 0 10px rgba(220, 38, 38, 0.15); }
        }

        /* Type & Rank Badges */
        .pm-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .pm-type-badge.type-pm {
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .pm-type-badge.type-calibrate {
          background-color: #f3e8ff;
          color: #7e22ce;
          border: 1px solid #e9d5ff;
        }
        
        .pm-rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2px;
          font-family: var(--font-mono);
        }
        .pm-rank-badge.rank-S {
          background-color: #ffe4e6;
          color: #be123c;
          border: 1px solid #fecdd3;
        }
        .pm-rank-badge.rank-A {
          background-color: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .pm-rank-badge.rank-B {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }
        .pm-rank-badge.rank-C {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        /* Legend details */
        .schedule-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          background-color: var(--surface2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 14px;
          border: 1px solid var(--border);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--text2);
        }
        .legend-block {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 1px solid transparent;
        }
        .legend-block.pfaded { background: #fafafa; border-color: var(--border); opacity: 0.6; }
        .legend-block.ppending { background: #eff6ff; border-color: #bfdbfe; }
        .legend-block.pdone { background: #f0fdf4; border-color: #bbf7d0; }
        .legend-block.poverdue { background: #fef2f2; border-color: #fca5a5; }

        .year-selector-btn {
          height: 28px;
          padding: 0 10px;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--text2);
          cursor: pointer;
        }
        .year-selector-btn.active {
          background-color: var(--accent);
          color: #ffffff;
          border-color: var(--accent);
        }
        .scroll-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text3);
          background-color: var(--surface2);
          padding: 3px 8px;
          border-radius: 12px;
        }
      `}</style>

      {/* Page Heading details */}
      <div className="page-header" id="pm-plan-top-header">
        <div className="page-title-block">
          <h1 className="page-title">Preventive Maintenance (PM)</h1>
          <p className="page-subtitle">Schedule, verify, and log recurring machines inspect logs to maintain zero factory downtime.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn" onClick={handleExportJSON} id="export-json-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Download full JSON backup of items and completion logs">
            <Download size={14} />
            <span>Export JSON</span>
          </button>
          <button className="btn" onClick={handleExportCSV} id="export-csv-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Download items list in Excel-compatible CSV format">
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button className="btn" onClick={() => setIsPdfModalOpen(true)} id="export-pdf-report-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface2)', borderColor: 'var(--accent)' }} title="Generate multi-page PDF report with schedule table, trend graph, and engineer/manager signature blocks">
            <Printer size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: '600', color: 'var(--accent)' }}>Export PDF Report</span>
          </button>
          <button className="btn" onClick={() => setIsImportModalOpen(true)} id="import-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Import items or completion logs from JSON/CSV files">
            <Upload size={14} />
            <span>Import</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} id="add-pm-btn">
            <Plus size={16} />
            <span>Add PM Item</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs matching SaaS style */}
      <div className="view-tabs" id="pm-view-tabs">
        <button 
          className={`view-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          id="tab-schedule-view"
        >
          <Grid size={15} />
          <span>Schedule View (12 Months)</span>
        </button>
        <button 
          className={`view-tab ${activeTab === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveTab('trend')}
          id="tab-trend-view"
        >
          <TrendingUp size={15} />
          <span>Trend & Achievement</span>
        </button>
        <button 
          className={`view-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
          id="tab-list-view"
        >
          <FileText size={15} />
          <span>List View (Manage Items)</span>
        </button>
      </div>

      {/* Global Filter Bar: Search + Dropdown Filters */}
      <div className="card controls-bar" id="pm-filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Search Machine & Checksheet ID */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search machine, checksheet ID, or keyword..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '30px', paddingRight: search ? '28px' : '10px', height: '32px', fontSize: '13px', width: '100%' }}
              id="pm-search-input"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px' }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Activity Tag Filter Dropdown */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="form-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
              id="filter-type-select"
              title="Filter by Activity Tag"
            >
              <option value="all">🏷️ All Tags ({typeStats.all})</option>
              <option value="pm">🔧 PM ({typeStats.pm})</option>
              <option value="calibrate">⚖️ Calibrate ({typeStats.calibrate})</option>
            </select>
          </div>

          {/* Rank Filter Dropdown */}
          <div style={{ minWidth: '120px' }}>
            <select
              className="form-select"
              value={filterRank}
              onChange={(e) => setFilterRank(e.target.value)}
              style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
              id="filter-rank-select"
              title="Filter by Criticality Rank"
            >
              <option value="all">🏅 All Ranks</option>
              <option value="S">Rank S ({rankStats.S})</option>
              <option value="A">Rank A ({rankStats.A})</option>
              <option value="B">Rank B ({rankStats.B})</option>
              <option value="C">Rank C ({rankStats.C})</option>
            </select>
          </div>

          {/* Plant Filter Dropdown */}
          <div style={{ minWidth: '110px' }}>
            <select
              className="form-select"
              value={filterPlant}
              onChange={(e) => setFilterPlant(e.target.value)}
              style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
              id="filter-plant-select"
              title="Filter by Plant"
            >
              <option value="all">🏭 All Plants</option>
              {plantOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Team / Responsible Filter Dropdown */}
          <div style={{ minWidth: '115px' }}>
            <select
              className="form-select"
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
              id="filter-responsible-select"
              title="Filter by Team"
            >
              <option value="all">👥 All Teams</option>
              <option value="My team">My team</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>

          {/* Cycle Filter Dropdown */}
          <div style={{ minWidth: '120px' }}>
            <select
              className="form-select"
              value={filterCycle}
              onChange={(e) => setFilterCycle(e.target.value)}
              style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
              id="filter-cycle-select"
              title="Filter by Cycle"
            >
              <option value="all">🔄 All Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="every 2 months">Every 2 Months</option>
              <option value="every 6 months">Every 6 Months</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {/* Month Filter Dropdown */}
          <div style={{ minWidth: '125px' }}>
            <select
              className="form-select"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ height: '32px', fontSize: '12px', padding: '4px 8px' }}
              id="filter-month-select"
              title="Filter by Target Month"
            >
              <option value="all">📅 All Months</option>
              {MONTH_NAMES.map((mName, i) => (
                <option key={mName} value={i + 1}>{mName} (M{i + 1})</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          {activeTab === 'schedule' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase' }}>Year:</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[2025, 2026, 2027, 2028].map((yr) => (
                  <button
                    key={yr}
                    className={`year-selector-btn ${selectedYear === yr ? 'active' : ''}`}
                    onClick={() => setSelectedYear(yr)}
                    style={{ padding: '2px 8px', fontSize: '12px', height: '30px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reset Filters Button */}
          {(search || filterPlant !== 'all' || filterResponsible !== 'all' || filterCycle !== 'all' || filterType !== 'all' || filterRank !== 'all' || filterMonth !== 'all') && (
            <button 
              className="btn btn-sm"
              onClick={() => {
                setSearch('');
                setFilterPlant('all');
                setFilterResponsible('all');
                setFilterCycle('all');
                setFilterType('all');
                setFilterRank('all');
                setFilterMonth('all');
              }}
              style={{ fontSize: '11.5px', padding: '4px 10px', height: '30px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text2)' }}
              title="Reset all filters"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating / Sticky Batch Action Bar when items are selected */}
      {selectedPlanIds.length > 0 && (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justify: 'space-between',
            padding: '10px 16px',
            backgroundColor: 'var(--surface2)',
            border: '2px solid var(--accent)',
            borderRadius: '8px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            animation: 'fadeIn 0.2s ease-in-out',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                backgroundColor: 'var(--accent)', 
                color: '#fff', 
                fontWeight: 'bold', 
                borderRadius: '20px', 
                padding: '2px 10px', 
                fontSize: '12px' 
              }}
            >
              {selectedPlanIds.length} Selected
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>
              Batch process PM / Calibration items
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-sm" 
              onClick={() => setSelectedPlanIds([])}
              style={{ fontSize: '12px' }}
            >
              Deselect All
            </button>
            <button 
              className="btn btn-sm" 
              onClick={() => setIsBatchTypeModalOpen(true)}
              id="open-batch-type-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', background: '#f3e8ff', color: '#7e22ce', borderColor: '#d8b4fe' }}
              title="Change Tag / Activity Type for selected items"
            >
              <span>🏷️ Set Tag</span>
            </button>
            <button 
              className="btn btn-sm" 
              onClick={() => setIsBatchRankModalOpen(true)}
              id="open-batch-rank-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}
              title="Change Rank (S/A/B/C) for selected items"
            >
              <span>🏅 Set Rank</span>
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleOpenBatchModal}
              id="open-batch-date-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}
            >
              <Calendar size={14} />
              <span>Batch Input Date</span>
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleOpenBatchDueDateModal}
              id="open-batch-due-date-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold' }}
            >
              <Clock size={14} />
              <span>Batch Change Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Renderers */}
      {loading ? (
        <div id="pm-loading-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-row" style={{ width: '100%', height: '42px' }}></div>
          <div className="skeleton-row" style={{ width: '100%', height: '42px' }}></div>
          <div className="skeleton-row" style={{ width: '100%', height: '42px' }}></div>
          <div className="skeleton-row" style={{ width: '100%', height: '42px' }}></div>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="empty-state" id="pm-empty-state">
          <Calendar className="empty-state-icon" />
          <h4 className="empty-state-title">No PM parameters match</h4>
          <p className="empty-state-desc">Try resetting your filter chips or updating the machine search criteria.</p>
          <button className="btn btn-sm" onClick={() => { setSearch(''); setFilterCycle('all'); setFilterMonth('all'); }}>
            Reset Filters
          </button>
        </div>
      ) : activeTab === 'schedule' ? (
        /* --- VIEW 1: SCHEDULE VIEW (12 MONTHS GRID) --- */
        <div className="grid-card" id="schedule-grid-layout">
          <div className="grid-header-tools">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={16} className="text2" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                AGC Flat Glass PM Plan ({selectedYear})
              </span>
            </div>
            <span className="scroll-pill hide-on-desktop">
              Swipe right/left to scroll <span>➜</span>
            </span>
          </div>

          <div className="grid-table-container">
            <table className="grid-table">
              <thead>
                <tr>
                  <th style={{ width: '42px', position: 'sticky', left: 0, zIndex: 10, background: 'var(--surface2)', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      className="pm-select-checkbox"
                      checked={selectedPlanIds.length > 0 && selectedPlanIds.length === filteredItems.length}
                      onChange={handleToggleSelectAll}
                      title="Select / Deselect all visible items"
                    />
                  </th>
                  {renderSortableHeader('plant', 'Plant', { width: '65px', position: 'sticky', left: '42px', zIndex: 10, background: 'var(--surface2)' })}
                  {renderSortableHeader('machineName', 'Machine / Equipment', { width: '235px', textAlign: 'left', position: 'sticky', left: '107px', zIndex: 10, background: 'var(--surface2)', borderRight: '2px solid var(--border2)' })}
                  {renderSortableHeader('cycle', 'Cycle', { width: '110px' })}
                  {renderSortableHeader('checksheetId', 'Checksheet ID', { width: '120px' })}
                  {MONTH_NAMES.map((name, i) => {
                    const mIndex = i + 1;
                    if (filterMonth !== 'all' && filterMonth !== mIndex) return null;
                    return (
                      <th key={name} style={{ width: '60px' }}>{name}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const displayResponsible = item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team');
                  const isSelected = selectedPlanIds.includes(item.id);
                  return (
                    <tr key={item.id} style={{ backgroundColor: isSelected ? 'rgba(var(--accent-rgb, 59, 130, 246), 0.06)' : undefined }}>
                      {/* Checkbox Column - Click anywhere in cell to select */}
                      <td 
                        className="pm-select-cell"
                        onClick={(e) => handleToggleSelectItem(item.id, e)}
                        style={{ position: 'sticky', left: 0, background: isSelected ? 'var(--surface2)' : 'var(--surface)', zIndex: 5, textAlign: 'center' }}
                        title="Click to select item (Shift+Click to select range)"
                      >
                        <input 
                          type="checkbox" 
                          className="pm-select-checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelectItem(item.id, e.nativeEvent);
                          }}
                        />
                      </td>

                      {/* Fixed Left Plant Column - Also clickable to select */}
                      <td 
                        className="pm-select-cell"
                        onClick={(e) => handleToggleSelectItem(item.id, e)}
                        style={{ position: 'sticky', left: '42px', background: isSelected ? 'var(--surface2)' : 'var(--surface)', zIndex: 5 }}
                        title="Click to select item"
                      >
                        <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`}>{item.plant || 'RFG'}</span>
                      </td>

                      {/* Fixed Left Machine Column, clickable to edit */}
                      <td 
                        className="machine-cell" 
                        style={{ 
                          position: 'sticky', 
                          left: '107px', 
                          zIndex: 5, 
                          background: isSelected ? 'var(--surface2)' : 'var(--surface)', 
                          borderRight: '2px solid var(--border2)',
                          cursor: 'pointer',
                          padding: '6px 10px'
                        }}
                        onClick={() => handleOpenEdit(item)}
                        title="Click to edit schedule"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <span className={`pm-type-badge type-${item.itemType || item.type || 'pm'}`}>
                              {(item.itemType || item.type || 'pm') === 'calibrate' ? '⚖️ Cal' : '🔧 PM'}
                            </span>
                            <span className={`pm-rank-badge rank-${item.rank || 'B'}`}>
                              Rank {item.rank || 'B'}
                            </span>
                            <span style={{ fontSize: '9.5px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', marginLeft: 'auto' }}>
                              {displayResponsible}
                            </span>
                          </div>
                          <span style={{ 
                            fontWeight: '600', 
                            color: 'var(--accent)', 
                            textDecoration: 'underline', 
                            fontSize: '12px',
                            lineHeight: '1.35',
                            wordBreak: 'break-word',
                            whiteSpace: 'normal',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {item.machineName}
                          </span>
                        </div>
                      </td>

                      <td style={{ textTransform: 'capitalize', fontSize: '11.5px', color: 'var(--text2)', fontWeight: '500', textAlign: 'left' }}>
                        {item.cycle}
                      </td>

                      <td className="font-mono text-xs" style={{ color: 'var(--text2)', fontWeight: '500', textAlign: 'left' }}>
                        {item.checksheetId || '-'}
                      </td>

                      {/* 12 Months Cells */}
                      {Array.from({ length: 12 }).map((_, index) => {
                        const mIndex = index + 1; // 1 to 12
                        if (filterMonth !== 'all' && filterMonth !== mIndex) return null;
                        const cellState = getCellStatus(item, selectedYear, mIndex);
                        
                        let cellContent = '';
                        if (cellState === 'done') {
                          const matchingLog = logs.find(
                            (log) => log.planId === item.id && Number(log.year) === selectedYear && Number(log.month) === mIndex
                          );
                          if (matchingLog && matchingLog.doneDate) {
                            const parts = matchingLog.doneDate.split('-');
                            if (parts.length === 3) {
                              cellContent = parseInt(parts[2], 10).toString();
                            } else {
                              const d = new Date(matchingLog.doneDate);
                              if (!isNaN(d.getTime())) {
                                cellContent = d.getDate().toString();
                              }
                            }
                          } else if (item.lastDoneDate) {
                            const d = new Date(item.lastDoneDate);
                            if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear && (d.getMonth() + 1) === mIndex) {
                              cellContent = d.getDate().toString();
                            }
                          }
                          if (!cellContent) cellContent = '✓';
                        }
                        if (cellState === 'overdue') cellContent = '!';

                        return (
                          <td 
                            key={mIndex} 
                            className={`month-cell color-${cellState}`} 
                            onClick={() => handleCellClick(item, selectedYear, mIndex, cellState)}
                            title={
                              cellState === 'faded' ? 'No inspection required' :
                              cellState === 'pending' ? 'Scheduled (Click to log completion)' :
                              cellState === 'done' ? 'Completed (Click to edit log)' : 'Overdue! Click to log completion'
                            }
                            style={{ textAlign: 'center', cursor: cellState !== 'faded' ? 'pointer' : 'default' }}
                          >
                            <span style={{ fontWeight: 'bold' }}>{cellContent}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="schedule-legend">
            <div className="legend-item">
              <span className="legend-block pfaded"></span>
              <span>No Inspection (Faded)</span>
            </div>
            <div className="legend-item">
              <span className="legend-block ppending"></span>
              <span>Pending / Scheduled (Blue)</span>
            </div>
            <div className="legend-item">
              <span className="legend-block pdone"></span>
              <span>Completed / Done (Green with Day Number)</span>
            </div>
            <div className="legend-item">
              <span className="legend-block poverdue"></span>
              <span>Overdue Past Due (Red with !)</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'trend' ? (
        /* --- VIEW 3: TREND & ACHIEVEMENT VIEW --- */
        <div className="card" id="trend-view-layout" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text)', margin: 0 }}>
                Preventive Maintenance Trend &amp; Monthly Achievement ({selectedYear})
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text3)', margin: '4px 0 0 0' }}>
                Compare monthly planned PM inspections against completed inspections to measure schedule compliance.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[2025, 2026, 2027, 2028].map((yr) => (
                <button
                  key={yr}
                  className={`year-selector-btn ${selectedYear === yr ? 'active' : ''}`}
                  onClick={() => setSelectedYear(yr)}
                  style={{ padding: '3px 10px', fontSize: '12px', height: '28px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '600' }}>Annual Target Inspections</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginTop: '4px' }}>
                {trendItems.reduce((acc, item) => acc + MONTH_NAMES.filter((_, mIdx) => isMonthRequired(item, selectedYear, mIdx + 1)).length, 0)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Total required inspections for {selectedYear}</span>
            </div>

            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '600' }}>YTD Planned</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>
                {trendItems.reduce((acc, item) => acc + MONTH_NAMES.filter((_, mIdx) => (mIdx + 1) <= (selectedYear === 2026 ? 5 : 12) && isMonthRequired(item, selectedYear, mIdx + 1)).length, 0)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Year-To-Date Target</span>
            </div>

            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '600' }}>YTD Completed</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {trendItems.reduce((acc, item) => acc + MONTH_NAMES.filter((_, mIdx) => (mIdx + 1) <= (selectedYear === 2026 ? 5 : 12) && isMonthRequired(item, selectedYear, mIdx + 1) && getCellStatus(item, selectedYear, mIdx + 1) === 'done').length, 0)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Completed &amp; logged</span>
            </div>

            <div className="card" style={{ padding: '14px 18px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '600' }}>Schedule Compliance %</span>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginTop: '4px' }}>
                {(() => {
                  const maxM = selectedYear === 2026 ? 5 : 12;
                  const p = trendItems.reduce((acc, item) => acc + MONTH_NAMES.filter((_, mIdx) => (mIdx + 1) <= maxM && isMonthRequired(item, selectedYear, mIdx + 1)).length, 0);
                  const c = trendItems.reduce((acc, item) => acc + MONTH_NAMES.filter((_, mIdx) => (mIdx + 1) <= maxM && isMonthRequired(item, selectedYear, mIdx + 1) && getCellStatus(item, selectedYear, mIdx + 1) === 'done').length, 0);
                  return p > 0 ? `${Math.round((c / p) * 100)}%` : '100%';
                })()}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Overall Achievement rate</span>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MONTH_NAMES.map((name, i) => {
                  const planCount = trendItems.filter(item => isMonthRequired(item, selectedYear, i + 1)).length;
                  const actualCount = trendItems.filter(item => isMonthRequired(item, selectedYear, i + 1) && getCellStatus(item, selectedYear, i + 1) === 'done').length;
                  const pct = planCount > 0 ? Math.round((actualCount / planCount) * 100) : 100;
                  return {
                    name,
                    Plan: planCount,
                    Actual: actualCount,
                    AchievementPct: pct
                  };
                })}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text2)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text2)' }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const plan = payload[0]?.value || 0;
                      const actual = payload[1]?.value || 0;
                      const pct = plan > 0 ? Math.round((actual / plan) * 100) : 100;
                      return (
                        <div className="custom-tooltip card" style={{ padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '11px' }}>
                          <p style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text)' }}>{label}</p>
                          <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#B4CDE6', borderRadius: '50%' }}></span>
                            Plan: <strong>{plan}</strong>
                          </p>
                          <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#C2E2C5', borderRadius: '50%' }}></span>
                            Actual: <strong>{actual}</strong>
                          </p>
                          <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid var(--border)', fontWeight: '600', color: pct >= 100 ? '#10b981' : pct > 0 ? '#f59e0b' : 'var(--text3)' }}>
                            Achievement: {pct}%
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span style={{ fontSize: 12, color: 'var(--text)' }}>{value}</span>}
                />
                <Bar dataKey="Plan" fill="#B4CDE6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Plan" position="top" style={{ fill: 'var(--text2)', fontSize: '10px', fontWeight: '600' }} />
                </Bar>
                <Bar dataKey="Actual" fill="#C2E2C5" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Actual" position="top" style={{ fill: 'var(--text2)', fontSize: '10px', fontWeight: '600' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* --- VIEW 2: LIST VIEW (ORIGINAL CRUD MANAGER) --- */
        <>
          {/* Desktop Table View */}
          <div className="table-container hide-on-mobile" id="pm-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '42px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      className="pm-select-checkbox"
                      checked={selectedPlanIds.length > 0 && selectedPlanIds.length === filteredItems.length}
                      onChange={handleToggleSelectAll}
                      title="Select / Deselect all visible items"
                    />
                  </th>
                  <th style={{ width: '45px' }}>No.</th>
                  {renderSortableHeader('plant', 'Plant', { width: '80px' })}
                  {renderSortableHeader('itemType', 'Tag', { width: '85px', textAlign: 'center' })}
                  {renderSortableHeader('rank', 'Rank', { width: '75px', textAlign: 'center' })}
                  {renderSortableHeader('machineName', 'Machine / Equipment')}
                  {renderSortableHeader('checksheetId', 'Checksheet ID')}
                  {renderSortableHeader('responsible', 'Responsible')}
                  {renderSortableHeader('cycle', 'Cycle')}
                  {renderSortableHeader('lastDone', 'Last Completed')}
                  {renderSortableHeader('nextDue', 'Next Due')}
                  <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, index) => {
                  const overdue = isPlanOverdue(item);
                  const lastDoneVal = getPlanLastDoneDate(item);
                  const nextDueVal = getNextDueText(item);
                  const displayResponsible = item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team');
                  const isSelected = selectedPlanIds.includes(item.id);
                  return (
                    <tr key={item.id} className={overdue ? 'overdue-row' : ''} style={{ backgroundColor: isSelected ? 'rgba(var(--accent-rgb, 59, 130, 246), 0.06)' : undefined }} id={`pm-row-${item.id}`}>
                      <td 
                        className="pm-select-cell"
                        onClick={(e) => handleToggleSelectItem(item.id, e)}
                        style={{ textAlign: 'center' }}
                        title="Click to select item (Shift+Click to select range)"
                      >
                        <input 
                          type="checkbox" 
                          className="pm-select-checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelectItem(item.id, e.nativeEvent);
                          }}
                        />
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text3)' }}>
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td 
                        className="pm-select-cell"
                        onClick={(e) => handleToggleSelectItem(item.id, e)}
                        title="Click to select item"
                      >
                        <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`}>{item.plant || 'RFG'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`pm-type-badge type-${item.itemType || item.type || 'pm'}`}>
                          {(item.itemType || item.type || 'pm') === 'calibrate' ? '⚖️ Cal' : '🔧 PM'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`pm-rank-badge rank-${item.rank || 'B'}`}>
                          Rank {item.rank || 'B'}
                        </span>
                      </td>
                      <td 
                        style={{ fontWeight: '600', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => handleOpenEdit(item)}
                        title="Click to edit schedule"
                      >
                        {item.machineName}
                      </td>
                      <td className="font-mono text-xs">
                        {item.checksheetId || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={12} className="text3" />
                          <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{displayResponsible}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs" style={{ textTransform: 'capitalize', color: 'var(--text2)' }}>
                          {item.cycle}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px' }}>{formatDate(lastDoneVal)}</td>
                      <td className="font-mono" style={{ fontSize: '12px', fontWeight: '500' }}>
                        <span style={{ color: overdue ? '#dc2626' : 'var(--text)' }}>
                          {nextDueVal}
                        </span>
                        {overdue && <span className="overdue-indicator">Overdue</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            className="btn btn-sm" 
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Plan"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            className={`btn btn-sm ${deletingPlanId === item.id ? 'btn-danger bg-red-600 animate-pulse' : 'btn-danger'}`} 
                            onClick={() => handleDelete(item.id)}
                            title={deletingPlanId === item.id ? 'Click again to confirm delete' : 'Delete Plan'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={12} />
                            {deletingPlanId === item.id && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Confirm?</span>}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile responsive cards view */}
          <div className="mobile-cards-view" id="pm-mobile-view">
            {sortedItems.map((item, index) => {
              const overdue = isPlanOverdue(item);
              const nextDueVal = getNextDueText(item);
              const displayResponsible = item.responsible === 'Own Team' ? 'My team' : (item.responsible || 'My team');
              return (
                <div key={item.id} className={`mobile-table-card ${overdue ? 'overdue-row' : ''}`} id={`pm-card-${item.id}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="font-mono text3 text-xs">#{String(index + 1).padStart(2, '0')}</span>
                        <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`}>{item.plant || 'RFG'}</span>
                        <span className={`pm-type-badge type-${item.itemType || item.type || 'pm'}`}>
                          {(item.itemType || item.type || 'pm') === 'calibrate' ? '⚖️ Cal' : '🔧 PM'}
                        </span>
                        <span className={`pm-rank-badge rank-${item.rank || 'B'}`}>
                          Rank {item.rank || 'B'}
                        </span>
                      </div>
                      <h4 
                        style={{ fontSize: '14px', fontWeight: '600', marginTop: '4px', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => handleOpenEdit(item)}
                      >
                        {item.machineName}
                      </h4>
                      {item.checksheetId && (
                        <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>
                          Checksheet ID: <strong className="font-mono">{item.checksheetId}</strong>
                        </div>
                      )}
                      <span className="font-mono text3" style={{ fontSize: '11px', textTransform: 'capitalize', display: 'block', marginTop: '2px' }}>
                        Cycle: {item.cycle}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0', fontSize: '12px' }}>
                    <div>
                      <span className="text3" style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Responsible</span>
                      <span style={{ fontWeight: '500' }}>{displayResponsible}</span>
                    </div>
                    <div>
                      <span className="text3" style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Next Due</span>
                      <span className="font-mono" style={{ fontWeight: '600', color: overdue ? '#dc2626' : 'var(--text)' }}>
                        {nextDueVal}
                        {overdue && <span className="overdue-indicator" style={{ display: 'block', width: 'fit-content', marginTop: '2px' }}>Overdue</span>}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
                    <button className="btn btn-sm" onClick={() => handleOpenEdit(item)}>
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    <button 
                      className={`btn btn-sm ${deletingPlanId === item.id ? 'btn-danger bg-red-600 animate-pulse' : 'btn-danger'}`} 
                      onClick={() => handleDelete(item.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} />
                      {deletingPlanId === item.id && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Confirm?</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL 1: ADD / EDIT PM SCHEDULE PLAN ITEM */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? 'Edit Maintenance Schedule' : 'New Maintenance Schedule'}
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {editingItem ? (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => handleOpenDeleteModal(editingItem)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                id="delete-pm-item-modal-btn"
              >
                <Trash2 size={14} />
                <span>Delete Item</span>
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} id="submit-pm-btn">
                {editingItem ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="form-grid">
          {formError && (
            <div className="form-full" style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
              <AlertCircle size={14} />
              <span style={{ fontSize: '12px' }}>{formError}</span>
            </div>
          )}

          {/* Activity Tag (PM vs Calibrate) */}
          <div className="form-group form-full">
            <label className="form-label" style={{ fontWeight: 'bold' }}>Activity Tag / Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${itemType === 'pm' ? 'btn-primary' : ''}`}
                onClick={() => setItemType('pm')}
                style={{
                  justifyContent: 'center',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: itemType === 'pm' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: itemType === 'pm' ? 'var(--accent)' : 'var(--surface2)',
                  color: itemType === 'pm' ? '#ffffff' : 'var(--text)'
                }}
              >
                <span>🔧 Preventive Maintenance (PM)</span>
              </button>
              <button
                type="button"
                className={`btn ${itemType === 'calibrate' ? 'btn-primary' : ''}`}
                onClick={() => setItemType('calibrate')}
                style={{
                  justifyContent: 'center',
                  padding: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: itemType === 'calibrate' ? '2px solid #7e22ce' : '1px solid var(--border)',
                  backgroundColor: itemType === 'calibrate' ? '#7e22ce' : 'var(--surface2)',
                  color: itemType === 'calibrate' ? '#ffffff' : 'var(--text)'
                }}
              >
                <span>⚖️ Calibration (Calibrate)</span>
              </button>
            </div>
          </div>

          {/* Machine Rank Selector */}
          <div className="form-group form-full">
            <label className="form-label" style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Machine / Task Rank *</span>
              <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'normal' }}>
                Aligned with Machine Classification
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[
                { r: 'S', label: 'Rank S', sub: 'Critical', bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
                { r: 'A', label: 'Rank A', sub: 'High', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                { r: 'B', label: 'Rank B', sub: 'Medium', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
                { r: 'C', label: 'Rank C', sub: 'Low', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
              ].map(opt => {
                const isSelected = rank === opt.r;
                return (
                  <button
                    key={opt.r}
                    type="button"
                    onClick={() => setRank(opt.r)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: isSelected ? `2px solid ${opt.text}` : '1px solid var(--border)',
                      backgroundColor: isSelected ? opt.bg : 'var(--surface2)',
                      color: isSelected ? opt.text : 'var(--text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontWeight: '800', fontSize: '13px' }}>{opt.label}</span>
                    <span style={{ fontSize: '10px', opacity: 0.85 }}>{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Machine Name / Equipment *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. MIR Glass Cutter Line 2" 
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              list="machine-classify-datalist"
              required
              id="form-machineName"
            />
            <datalist id="machine-classify-datalist">
              {classifyItems.map(cItem => {
                const calc = calculateGradeAndRank(cItem.influenceRate, cItem.redundancy, cItem.quality);
                return (
                  <option key={cItem.id} value={cItem.machine}>
                    {cItem.machine} (Rank {calc.rank}) - {cItem.department || ''}
                  </option>
                );
              })}
            </datalist>

            {/* Smart Suggested Rank Pill */}
            {suggestedRankInfo && (
              <div 
                style={{ 
                  marginTop: '8px', 
                  padding: '8px 12px', 
                  backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                  border: '1px dashed var(--accent)', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span>
                  <span>
                    Detected from Machine Classify: <strong>"{suggestedRankInfo.source}"</strong> &rarr; <span className={`pm-rank-badge rank-${suggestedRankInfo.rank}`}>Rank {suggestedRankInfo.rank}</span>
                  </span>
                </div>
                {rank !== suggestedRankInfo.rank ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setRank(suggestedRankInfo.rank)}
                    style={{ fontSize: '11px', padding: '2px 8px', height: '22px' }}
                  >
                    Apply Rank {suggestedRankInfo.rank}
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>✓ Matched</span>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Plant *</label>
            <select 
              className="form-select font-mono" 
              value={plant} 
              onChange={(e) => setPlant(e.target.value)}
              required
              id="form-plant"
            >
              <option value="RFG">RFG (Float Glass)</option>
              <option value="MIR">MIR (Mirror)</option>
              <option value="BOTH">BOTH (Both Plants)</option>
            </select>
          </div>



          <div className="form-group">
            <label className="form-label">Responsible Option *</label>
            <select 
              className="form-select" 
              value={responsible} 
              onChange={(e) => setResponsible(e.target.value)}
              required
              id="form-responsible"
            >
              <option value="My team">My team</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Inspect Cycle *</label>
            <select 
              className="form-select" 
              value={cycle} 
              onChange={(e) => setCycle(e.target.value)}
              id="form-cycle"
            >
              <option value="monthly">Monthly</option>
              <option value="every 2 months">Every 2 Months</option>
              <option value="every 6 months">Every 6 Months</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          {cycle !== 'monthly' && (
            <div className="form-group">
              <label className="form-label">Start Month *</label>
              <select 
                className="form-select font-mono" 
                value={startMonth} 
                onChange={(e) => setStartMonth(Number(e.target.value))}
                required
                id="form-startMonth"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name} ({i + 1})</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Checksheet ID</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. CS-RFG-01" 
              value={checksheetId}
              onChange={(e) => setChecksheetId(e.target.value)}
              id="form-checksheetId"
            />
          </div>
        </form>
      </Modal>

      {/* MODAL 2: LOG PM COMPLETION POPUP (FOR ENTIRE CELL LOGS) */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setShowDeleteLogConfirm(false);
        }}
        title={existingLog ? 'Edit PM Log' : 'Log PM'}
        footerActions={
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
            <div>
              {existingLog && (
                <button 
                  className={`btn ${showDeleteLogConfirm ? 'btn-danger bg-red-600 animate-pulse' : 'btn-danger'}`} 
                  onClick={handleDeleteLog} 
                  id="delete-log-btn"
                  title="Delete this completion record"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} />
                  <span>{showDeleteLogConfirm ? 'Click to Confirm Delete' : 'Delete Log'}</span>
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn" 
                onClick={() => {
                  setIsLogModalOpen(false);
                  setShowDeleteLogConfirm(false);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveLog} id="save-log-btn">
                {existingLog ? 'Update Log' : 'Save Log'}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveLog} className="form-grid">
          {selectedCellItem && (
            <div className="form-full" style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: 'var(--accent)' }}>{selectedCellItem.machineName}</span>
                <span className={`plant-badge ${(selectedCellItem.plant || 'RFG').toLowerCase()}`}>{selectedCellItem.plant || 'RFG'}</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '11.5px', color: 'var(--text3)' }}>
                <span>Cycle: <strong style={{ textTransform: 'capitalize', color: 'var(--text)' }}>{selectedCellItem.cycle}</strong></span>
                <span>Period: <strong style={{ color: 'var(--text)' }}>{MONTH_NAMES[selectedCellMonth - 1]} {selectedCellYear}</strong></span>
              </div>
            </div>
          )}

          <div className="form-group form-full">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Actual Completion Day (1-{new Date(selectedCellYear, selectedCellMonth, 0).getDate()}) *</span>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                Target Month: {MONTH_NAMES[selectedCellMonth - 1]} {selectedCellYear}
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={logDoneDayInputRef}
                type="number"
                className="form-input font-mono"
                required
                min={1}
                max={new Date(selectedCellYear, selectedCellMonth, 0).getDate()}
                value={logDoneDay}
                onChange={(e) => setLogDoneDay(e.target.value)}
                id="form-logDoneDay"
                placeholder="Day"
                style={{ width: '110px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}
              />
              <div style={{ 
                flex: '1', 
                minWidth: '220px',
                padding: '10px 14px', 
                backgroundColor: 'var(--surface)', 
                border: '1px dashed var(--border)', 
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <span>
                  Resulting Date: <strong style={{ fontFamily: 'var(--font-mono)' }}>{String(logDoneDay || '').padStart(2, '0')} - {MONTH_NAMES[selectedCellMonth - 1]} - {selectedCellYear}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Completion Notes / Remarks (Optional)</label>
            <textarea
              className="form-input"
              style={{ minHeight: '70px', fontFamily: 'var(--font-sans)', fontSize: '13px', resize: 'vertical' }}
              placeholder="e.g. Completed without issues. Cleaned filter and checked belt tension."
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              id="form-logNote"
            />
          </div>
        </form>
      </Modal>

      {/* MODAL 3: IMPORT DATA MODAL (JSON / CSV) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportPreview(null);
          setImportError('');
        }}
        title="Import PM Schedule &amp; Execution Data"
        footerActions={
          <>
            <button 
              className="btn" 
              onClick={() => setIsImportModalOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleExecuteImport} 
              disabled={!importPreview || isImporting}
              id="confirm-import-btn"
            >
              {isImporting ? 'Importing...' : 'Confirm Import'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0 }}>
            Upload a previously exported <strong>.json</strong> backup file or an Excel-compatible <strong>.csv</strong> list of PM items.
          </p>

          <div 
            style={{
              border: '2px dashed var(--border2)',
              borderRadius: '8px',
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--surface2)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            onClick={() => document.getElementById('import-file-input').click()}
          >
            <input 
              type="file" 
              id="import-file-input" 
              accept=".json,.csv" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <Upload size={28} style={{ color: 'var(--text3)', marginBottom: '8px', marginLeft: 'auto', marginRight: 'auto' }} />
            <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text)' }}>
              {importFile ? importFile.name : 'Choose a file or drag & drop'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              Accepts .json (Full Backup) or .csv (Schedules list)
            </div>
          </div>

          <div className="form-group" style={{ margin: '4px 0' }}>
            <label className="form-label" style={{ fontWeight: '600', fontSize: '13px' }}>Import Option</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                className={`btn ${importMode === 'add' ? 'btn-primary' : ''}`}
                style={{
                  justifyContent: 'center',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: importMode === 'add' ? 'none' : '1px solid var(--border)',
                  backgroundColor: importMode === 'add' ? 'var(--accent)' : 'var(--surface2)',
                  color: importMode === 'add' ? '#fff' : 'var(--text)'
                }}
                onClick={() => setImportMode('add')}
                id="import-mode-add"
              >
                <Plus size={14} style={{ marginRight: '6px' }} />
                <span>Add &amp; Update (Append)</span>
              </button>
              <button
                type="button"
                className={`btn ${importMode === 'overwrite' ? 'btn-danger' : ''}`}
                style={{
                  justifyContent: 'center',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: importMode === 'overwrite' ? 'none' : '1px solid var(--border)',
                  backgroundColor: importMode === 'overwrite' ? '#ef4444' : 'var(--surface2)',
                  color: importMode === 'overwrite' ? '#fff' : 'var(--text)'
                }}
                onClick={() => setImportMode('overwrite')}
                id="import-mode-overwrite"
              >
                <Trash2 size={14} style={{ marginRight: '6px' }} />
                <span>Overwrite (Replace All)</span>
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px', lineHeight: '1.4' }}>
              {importMode === 'add' 
                ? '💡 Keeps your existing PM schedules and verification logs in the database. Only imports items from the uploaded file.'
                : '⚠️ WARNING: All existing PM schedules and logs will be completely wiped from the database and replaced by this file\'s data.'}
            </p>
          </div>

          {importError && (
            <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '12px' }}>{importError}</span>
            </div>
          )}

          {importPreview && (
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '12.5px' }}>
              <div style={{ fontWeight: 'bold', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} />
                <span>Detected Format: {importPreview.type}</span>
              </div>
              <div style={{ marginTop: '8px', color: 'var(--text2)' }}>
                We found the following data inside this file:
                <ul style={{ paddingLeft: '20px', margin: '4px 0 0 0', listStyleType: 'disc' }}>
                  <li><strong>{importPreview.plansCount}</strong> Maintenance Schedule Items</li>
                  {importPreview.logsCount > 0 && (
                    <li><strong>{importPreview.logsCount}</strong> Completed Verification Logs</li>
                  )}
                </ul>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text3)', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                Note: Importing JSON items will preserve completed historical cell checks, whereas CSV items will register new schedule lists.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 4: BATCH INPUT PM DATE POPUP */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={`Batch Input PM Date (${selectedPlanIds.length} items)`}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsBatchModalOpen(false)} disabled={isBatchSaving}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveBatchLog} 
              disabled={isBatchSaving}
              id="submit-batch-log-btn"
            >
              {isBatchSaving ? 'Saving Batch...' : `Save for ${selectedPlanIds.length} Items`}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBatchLog} className="form-grid">
          <div className="form-full" style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '6px', fontSize: '12.5px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>
              Selected PM Machines ({selectedPlanIds.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '4px' }}>
              {items.filter(i => selectedPlanIds.includes(i.id)).map(item => (
                <span 
                  key={item.id} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    backgroundColor: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '4px', 
                    padding: '2px 8px', 
                    fontSize: '11px' 
                  }}
                >
                  <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{item.plant || 'RFG'}</span>
                  <strong style={{ color: 'var(--text)' }}>{item.machineName}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Year *</label>
            <select 
              className="form-select font-mono" 
              value={batchYear} 
              onChange={(e) => setBatchYear(Number(e.target.value))}
              id="batch-form-year"
            >
              {[2025, 2026, 2027, 2028].map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Month *</label>
            <select 
              className="form-select font-mono" 
              value={batchMonth} 
              onChange={(e) => setBatchMonth(Number(e.target.value))}
              id="batch-form-month"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name} ({i + 1})</option>
              ))}
            </select>
          </div>

          <div className="form-group form-full">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Actual Done Day (1-{new Date(batchYear, batchMonth, 0).getDate()}) *</span>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>
                Period: {MONTH_NAMES[batchMonth - 1]} {batchYear}
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                className="form-input font-mono"
                required
                min={1}
                max={new Date(batchYear, batchMonth, 0).getDate()}
                value={batchDoneDay}
                onChange={(e) => setBatchDoneDay(e.target.value)}
                id="batch-form-done-day"
                placeholder="Day"
                style={{ width: '110px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}
              />
              <div style={{ 
                flex: '1',
                minWidth: '220px',
                padding: '10px 14px', 
                backgroundColor: 'var(--surface)', 
                border: '1px dashed var(--border)', 
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: '600',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <span>
                  Resulting Date: <strong style={{ fontFamily: 'var(--font-mono)' }}>{String(batchDoneDay || '').padStart(2, '0')} - {MONTH_NAMES[batchMonth - 1]} - {batchYear}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Batch Engineer Notes / Remarks (Optional)</label>
            <textarea
              className="form-input"
              style={{ minHeight: '70px', fontFamily: 'var(--font-sans)', fontSize: '13px', resize: 'vertical' }}
              placeholder="e.g. Batch PM completed during line shutdown."
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              id="batch-form-note"
            />
          </div>
        </form>
      </Modal>

      {/* MODAL 5: BATCH CHANGE DUE DATE POPUP */}
      <Modal
        isOpen={isBatchDueDateModalOpen}
        onClose={() => setIsBatchDueDateModalOpen(false)}
        title={`Batch Change Schedule (${selectedPlanIds.length} items)`}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsBatchDueDateModalOpen(false)} disabled={isBatchSaving}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveBatchDueDate} 
              disabled={isBatchSaving}
              id="submit-batch-due-date-btn"
            >
              {isBatchSaving ? 'Updating...' : `Update for ${selectedPlanIds.length} Items`}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBatchDueDate} className="form-grid">
          <div className="form-full" style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '6px', fontSize: '12.5px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>
              Selected PM Machines ({selectedPlanIds.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '4px' }}>
              {items.filter(i => selectedPlanIds.includes(i.id)).map(item => (
                <span 
                  key={item.id} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    backgroundColor: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '4px', 
                    padding: '2px 8px', 
                    fontSize: '11px' 
                  }}
                >
                  <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{item.plant || 'RFG'}</span>
                  <strong style={{ color: 'var(--text)' }}>{item.machineName}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Shift Base Target Month (Shift Schedule To) *</label>
            <select 
              className="form-select font-mono" 
              value={batchStartMonth} 
              onChange={(e) => setBatchStartMonth(Number(e.target.value))}
              id="batch-start-month-select"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name} ({i + 1})</option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', display: 'block' }}>
              Determines which month cell in the annual matrix this schedule aligns with.
            </span>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Inspect Cycle (Optional)</label>
            <select 
              className="form-select" 
              value={batchCycle} 
              onChange={(e) => setBatchCycle(e.target.value)}
              id="batch-cycle-select"
            >
              <option value="keep">-- Keep Original Cycle --</option>
              <option value="monthly">Monthly</option>
              <option value="every 2 months">Every 2 Months</option>
              <option value="every 6 months">Every 6 Months</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: BATCH SET RANK POPUP */}
      <Modal
        isOpen={isBatchRankModalOpen}
        onClose={() => setIsBatchRankModalOpen(false)}
        title={`Batch Set Rank (${selectedPlanIds.length} items)`}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsBatchRankModalOpen(false)} disabled={isBatchRankSaving}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveBatchRank} 
              disabled={isBatchRankSaving}
              id="submit-batch-rank-btn"
            >
              {isBatchRankSaving ? 'Updating...' : `Set Rank for ${selectedPlanIds.length} Items`}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBatchRank} className="form-grid">
          <div className="form-full" style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '6px', fontSize: '12.5px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>
              Selected Machines ({selectedPlanIds.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '4px' }}>
              {items.filter(i => selectedPlanIds.includes(i.id)).map(item => (
                <span 
                  key={item.id} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    backgroundColor: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '4px', 
                    padding: '2px 8px', 
                    fontSize: '11px' 
                  }}
                >
                  <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{item.plant || 'RFG'}</span>
                  <strong style={{ color: 'var(--text)' }}>{item.machineName}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group form-full">
            <label className="form-label" style={{ fontWeight: 'bold' }}>Choose New Rank for Selected Items *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '6px' }}>
              {[
                { r: 'S', label: 'Rank S', sub: 'Critical (CBM)', bg: '#ffe4e6', text: '#be123c' },
                { r: 'A', label: 'Rank A', sub: 'High (CBM)', bg: '#fef3c7', text: '#b45309' },
                { r: 'B', label: 'Rank B', sub: 'Medium (Lifetime)', bg: '#e0f2fe', text: '#0369a1' },
                { r: 'C', label: 'Rank C', sub: 'Low (Breakdown)', bg: '#f1f5f9', text: '#475569' }
              ].map(opt => {
                const isSelected = batchRankValue === opt.r;
                return (
                  <button
                    key={opt.r}
                    type="button"
                    onClick={() => setBatchRankValue(opt.r)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 6px',
                      borderRadius: '6px',
                      border: isSelected ? `2px solid ${opt.text}` : '1px solid var(--border)',
                      backgroundColor: isSelected ? opt.bg : 'var(--surface2)',
                      color: isSelected ? opt.text : 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontWeight: '800', fontSize: '14px' }}>{opt.label}</span>
                    <span style={{ fontSize: '10.5px', opacity: 0.85, marginTop: '2px', textAlign: 'center' }}>{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL 7: BATCH SET TAG / TYPE POPUP */}
      <Modal
        isOpen={isBatchTypeModalOpen}
        onClose={() => setIsBatchTypeModalOpen(false)}
        title={`Batch Set Tag (${selectedPlanIds.length} items)`}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsBatchTypeModalOpen(false)} disabled={isBatchTypeSaving}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveBatchType} 
              disabled={isBatchTypeSaving}
              id="submit-batch-type-btn"
            >
              {isBatchTypeSaving ? 'Updating...' : `Set Tag for ${selectedPlanIds.length} Items`}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBatchType} className="form-grid">
          <div className="form-full" style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '6px', fontSize: '12.5px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--text)', marginBottom: '6px' }}>
              Selected Machines ({selectedPlanIds.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '4px' }}>
              {items.filter(i => selectedPlanIds.includes(i.id)).map(item => (
                <span 
                  key={item.id} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    backgroundColor: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '4px', 
                    padding: '2px 8px', 
                    fontSize: '11px' 
                  }}
                >
                  <span className={`plant-badge ${(item.plant || 'RFG').toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{item.plant || 'RFG'}</span>
                  <strong style={{ color: 'var(--text)' }}>{item.machineName}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group form-full">
            <label className="form-label" style={{ fontWeight: 'bold' }}>Choose Activity Tag / Type *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setBatchTypeValue('pm')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '6px',
                  border: batchTypeValue === 'pm' ? '2px solid var(--accent)' : '1px solid var(--border)',
                  backgroundColor: batchTypeValue === 'pm' ? 'var(--accent)' : 'var(--surface2)',
                  color: batchTypeValue === 'pm' ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                <span>🔧 Preventive Maintenance (PM)</span>
              </button>
              <button
                type="button"
                onClick={() => setBatchTypeValue('calibrate')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '6px',
                  border: batchTypeValue === 'calibrate' ? '2px solid #7e22ce' : '1px solid var(--border)',
                  backgroundColor: batchTypeValue === 'calibrate' ? '#7e22ce' : 'var(--surface2)',
                  color: batchTypeValue === 'calibrate' ? '#fff' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                <span>⚖️ Calibration (Calibrate)</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRM DELETE PM PLAN ITEM */}
      <Modal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        title="Confirm Delete PM Plan"
        footerActions={
          <>
            <button className="btn" onClick={() => setPlanToDelete(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDeletePlan} id="confirm-delete-pm-btn">
              Yes, Delete Item
            </button>
          </>
        }
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: '#dc2626' }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: '15px', fontWeight: '700' }}>Are you sure you want to delete this PM item?</span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: '1.6' }}>
            You are about to delete <strong>{planToDelete?.machineName}</strong> ({planToDelete?.plant} - {planToDelete?.cycle}). This action will permanently remove this PM item from the schedule.
          </p>
        </div>
      </Modal>

      {/* MODAL: PM REPORT PDF 2-PAGE EXPORT */}
      <PMReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        items={sortedItems}
        logs={logs}
        selectedYear={selectedYear}
        filterPlant={filterPlant}
        filterType={filterType}
        filterRank={filterRank}
        isMonthRequired={isMonthRequired}
        getCellStatus={getCellStatus}
      />
    </div>
  );
}
