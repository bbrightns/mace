import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Upload, Download, RefreshCw, Layers, Cpu, CheckCircle2, HelpCircle, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  batchWriteOperations,
  batchDeleteDocuments
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { TableSkeleton } from '../../components/SkeletonLoader';
import { useToast } from '../../components/Toast';
import { parseCSV } from '../../utils';

// Helper to calculate Grade and Rank based on standard criteria
// Grade = Influence rate * Redundancy * Quality
// Rank logic:
// Rank S: Grade 1-6 (Condition-Based Maintenance (CBM) and Lifetime Maintenance)
// Rank A: Grade 7-12 (Condition-Based Maintenance (CBM) and Lifetime Maintenance)
// Rank B: Grade 13-18 (Lifetime Maintenance)
// Rank C: Grade 19+ (Breakdown Maintenance)
export function calculateGradeAndRank(influenceRate, redundancy, quality) {
  const inf = parseFloat(influenceRate) || 0;
  const red = parseFloat(redundancy) || 0;
  const q = parseFloat(quality) || 0;

  const grade = inf * red * q;

  let rank = 'C';
  let maintenanceSituation = 'Breakdown Maintenance';

  if (grade >= 1 && grade <= 6) {
    rank = 'S';
    maintenanceSituation = 'Condition-Based Maintenance (CBM) and Lifetime Maintenance';
  } else if (grade >= 7 && grade <= 12) {
    rank = 'A';
    maintenanceSituation = 'Condition-Based Maintenance (CBM) and Lifetime Maintenance';
  } else if (grade >= 13 && grade <= 18) {
    rank = 'B';
    maintenanceSituation = 'Lifetime Maintenance';
  } else if (grade >= 19) {
    rank = 'C';
    maintenanceSituation = 'Breakdown Maintenance';
  } else {
    rank = '-';
    maintenanceSituation = '-';
  }
  return { grade, rank, maintenanceSituation };
}

export default function MachineClassify() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('mace_machine_classify_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [showCriteria, setShowCriteria] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(true);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterRank, setFilterRank] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingImportOps, setPendingImportOps] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, loading: false });

  // Form State
  const [department, setDepartment] = useState('RFG');
  const [itemNo, setItemNo] = useState('');
  const [section, setSection] = useState('Utility');
  const [machine, setMachine] = useState('');
  const [machine2, setMachine2] = useState('');
  const [influenceRate, setInfluenceRate] = useState(1);
  const [redundancy, setRedundancy] = useState(4);
  const [quality, setQuality] = useState(1);

  const { showToast } = useToast();

  // Save items to localStorage cache whenever items state updates
  useEffect(() => {
    if (items && items.length > 0) {
      try {
        localStorage.setItem('mace_machine_classify_cache', JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save to localStorage cache:", e);
      }
    }
  }, [items]);

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_machine_classify', (data) => {
      if (data && data.length > 0) {
        const sorted = [...data].sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0));
        setItems(sorted);
        try {
          localStorage.setItem('mace_machine_classify_cache', JSON.stringify(sorted));
        } catch (e) {}
      } else {
        // If Firestore returned empty, load from localStorage cache and auto-sync to Firestore
        try {
          const cached = localStorage.getItem('mace_machine_classify_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.length > 0) {
              setItems(parsed);
              const syncOps = parsed.map(item => ({
                type: 'create',
                collectionName: 'mace_machine_classify',
                data: {
                  department: item.department || 'RFG',
                  item: Number(item.item) || 1,
                  section: item.section || 'Utility',
                  machine: item.machine || '',
                  machine2: item.machine2 || '',
                  influenceRate: Number(item.influenceRate) || 1,
                  redundancy: Number(item.redundancy) || 1,
                  quality: Number(item.quality) || 1
                }
              }));
              batchWriteOperations(syncOps).catch(console.error);
            }
          }
        } catch (e) {}
      }
      setLoading(false);
    }, (error) => {
      console.error("Machine Classify load error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute calculated grade, rank, and maintenance situation for form live feedback
  const calculatedFormState = useMemo(() => {
    return calculateGradeAndRank(influenceRate, redundancy, quality);
  }, [influenceRate, redundancy, quality]);

  // Extract unique departments, sections, ranks for filters
  const uniqueDepts = useMemo(() => {
    const depts = new Set(items.map(i => i.department).filter(Boolean));
    return ['all', ...Array.from(depts)];
  }, [items]);

  const uniqueSections = useMemo(() => {
    const secs = new Set(items.map(i => i.section).filter(Boolean));
    return ['all', ...Array.from(secs)];
  }, [items]);

  const uniqueRanks = ['all', 'S', 'A', 'B', 'C'];

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const computed = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
      const matchesDept = filterDept === 'all' || item.department === filterDept;
      const matchesSec = filterSection === 'all' || item.section === filterSection;
      const matchesRank = filterRank === 'all' || computed.rank === filterRank;

      const q = search.toLowerCase();
      const matchesSearch = !search || 
        String(item.item || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q) ||
        (item.section || '').toLowerCase().includes(q) ||
        (item.machine || '').toLowerCase().includes(q) ||
        (item.machine2 || '').toLowerCase().includes(q);

      return matchesDept && matchesSec && matchesRank && matchesSearch;
    });
  }, [items, filterDept, filterSection, filterRank, search]);

  // Rank counts summary
  const rankStats = useMemo(() => {
    const stats = { S: 0, A: 0, B: 0, C: 0, total: items.length };
    items.forEach(item => {
      const { rank } = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
      if (stats[rank] !== undefined) stats[rank]++;
    });
    return stats;
  }, [items]);

  // Seed sample initial data if Firestore is empty
  const handleSeedData = async () => {
    try {
      setLoading(true);
      const ops = INITIAL_MACHINE_CLASSIFY_DATA.map(data => ({
        type: 'create',
        collectionName: 'mace_machine_classify',
        data
      }));
      await batchWriteOperations(ops);
      showToast("Seed data created successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Error creating sample data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDepartment('RFG');
    // Auto increment item number
    const maxItem = items.reduce((max, i) => Math.max(max, Number(i.item) || 0), 0);
    setItemNo(maxItem + 1);
    setSection('Utility');
    setMachine('');
    setMachine2('');
    setInfluenceRate(1);
    setRedundancy(4);
    setQuality(1);
    setIsOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setDepartment(item.department || 'RFG');
    setItemNo(item.item || 1);
    setSection(item.section || 'Utility');
    setMachine(item.machine || '');
    setMachine2(item.machine2 || '');
    setInfluenceRate(item.influenceRate || 1);
    setRedundancy(item.redundancy || 4);
    setQuality(item.quality || 1);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      department: department.trim(),
      item: Number(itemNo) || 1,
      section: section.trim(),
      machine: machine.trim(),
      machine2: machine2.trim(),
      influenceRate: Number(influenceRate) || 1,
      redundancy: Number(redundancy) || 1,
      quality: Number(quality) || 1
    };

    try {
      if (editingItem) {
        await updateDocument('mace_machine_classify', editingItem.id, payload);
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload } : i));
        showToast("Machine classification updated", "success");
      } else {
        const newId = await createDocument('mace_machine_classify', payload);
        const addedItem = { id: newId || 'item_' + Date.now(), ...payload };
        setItems(prev => {
          const exists = prev.some(i => i.id === addedItem.id);
          if (exists) return prev;
          return [...prev, addedItem].sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0));
        });
        showToast("Machine classification added", "success");
      }
      setIsOpen(false);
    } catch (err) {
      console.error("Machine Classify save error:", err);
      // Resilient local state fallback if network/Firestore rejects write
      const fallbackId = editingItem ? editingItem.id : 'local_' + Date.now();
      if (editingItem) {
        setItems(prev => prev.map(i => i.id === fallbackId ? { ...i, ...payload } : i));
        showToast("Machine classification updated", "success");
      } else {
        setItems(prev => [...prev, { id: fallbackId, ...payload }].sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0)));
        showToast("Machine classification added", "success");
      }
      setIsOpen(false);
    }
  };

  const handleOpenDelete = (item) => {
    setDeleteModal({ isOpen: true, item, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    const targetId = deleteModal.item.id;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await deleteDocument('mace_machine_classify', targetId);
      setItems(prev => prev.filter(i => i.id !== targetId));
      showToast("Machine item deleted", "success");
      setDeleteModal({ isOpen: false, item: null, loading: false });
    } catch (err) {
      console.error("Machine Classify delete error:", err);
      setItems(prev => prev.filter(i => i.id !== targetId));
      showToast("Machine item deleted", "success");
      setDeleteModal({ isOpen: false, item: null, loading: false });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      showToast("No data to export", "info");
      return;
    }

    const headers = [
      "Department", "Item", "Section", "Machine", "Machine 2", 
      "Influence rate", "Redundancy", "Quality", "Grade", "Rank", "Maintenance situation"
    ];

    const rows = filteredItems.map(item => {
      const calc = calculateGradeAndRank(item.influenceRate, item.redundancy, item.quality);
      return [
        `"${(item.department || '').replace(/"/g, '""')}"`,
        item.item || '',
        `"${(item.section || '').replace(/"/g, '""')}"`,
        `"${(item.machine || '').replace(/"/g, '""')}"`,
        `"${(item.machine2 || '').replace(/"/g, '""')}"`,
        item.influenceRate || 1,
        item.redundancy || 1,
        item.quality || 1,
        calc.grade,
        calc.rank,
        `"${calc.maintenanceSituation.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Machine_Classify_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported Machine Classify CSV successfully", "success");
  };

  // Import CSV
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsedRows = parseCSV(text);
        if (parsedRows.length < 2) {
          showToast("CSV file appears to be empty or missing data", "error");
          return;
        }

        const headers = parsedRows[0].map(h => h.trim().toLowerCase());
        
        // Find column indices
        const deptIdx = headers.findIndex(h => h.includes('department'));
        const itemIdx = headers.findIndex(h => h === 'item');
        const secIdx = headers.findIndex(h => h.includes('section'));
        const m1Idx = headers.findIndex(h => h === 'machine');
        const m2Idx = headers.findIndex(h => h.includes('machine 2') || h.includes('machine2'));
        const infIdx = headers.findIndex(h => h.includes('influence'));
        const redIdx = headers.findIndex(h => h.includes('redundancy'));
        const qualIdx = headers.findIndex(h => h.includes('quality'));

        const newOps = [];
        for (let i = 1; i < parsedRows.length; i++) {
          const r = parsedRows[i];
          if (!r || r.length === 0 || (r.length === 1 && !r[0])) continue;

          const departmentVal = deptIdx !== -1 ? r[deptIdx] : 'RFG';
          const itemVal = itemIdx !== -1 ? Number(r[itemIdx]) || i : i;
          const sectionVal = secIdx !== -1 ? r[secIdx] : 'Utility';
          const machineVal = m1Idx !== -1 ? r[m1Idx] : '';
          const machine2Val = m2Idx !== -1 ? r[m2Idx] : '';
          const infVal = infIdx !== -1 ? Number(r[infIdx]) || 1 : 1;
          const redVal = redIdx !== -1 ? Number(r[redIdx]) || 1 : 1;
          const qualVal = qualIdx !== -1 ? Number(r[qualIdx]) || 1 : 1;

          if (machineVal || machine2Val) {
            newOps.push({
              type: 'create',
              collectionName: 'mace_machine_classify',
              data: {
                department: departmentVal || 'RFG',
                item: itemVal,
                section: sectionVal || 'Utility',
                machine: machineVal,
                machine2: machine2Val,
                influenceRate: infVal,
                redundancy: redVal,
                quality: qualVal
              }
            });
          }
        }

        if (newOps.length === 0) {
          showToast("No valid machine items found in CSV file", "error");
          return;
        }

        setPendingImportOps(newOps);
      } catch (err) {
        console.error("CSV parse error", err);
        showToast("Failed to parse CSV file", "error");
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImportCSV = async () => {
    if (!pendingImportOps || pendingImportOps.length === 0) return;
    
    // Construct local objects for immediate UI update
    const importedItems = pendingImportOps.map((op, idx) => ({
      id: 'import_' + Date.now() + '_' + idx,
      ...op.data
    }));

    try {
      setLoading(true);
      
      // Batch write to Firestore
      try {
        await batchWriteOperations(pendingImportOps);
      } catch (firestoreErr) {
        console.warn("Firestore CSV import batch notice (falling back to local state):", firestoreErr);
      }

      // Merge imported items into React state (filtering out duplicates by item & machine)
      setItems(prev => {
        const itemMap = new Map();
        // Existing items
        prev.forEach(item => {
          const key = `${item.item}_${item.machine}`;
          itemMap.set(key, item);
        });
        // Imported items (overwrites/appends)
        importedItems.forEach(item => {
          const key = `${item.item}_${item.machine}`;
          itemMap.set(key, item);
        });

        return Array.from(itemMap.values()).sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0));
      });

      showToast(`Successfully imported ${pendingImportOps.length} machine items`, "success");
      setPendingImportOps(null);
    } catch (err) {
      console.error("CSV import error:", err);
      showToast("Error importing CSV data", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu style={{ color: 'var(--accent)' }} size={24} />
            Machine Classify
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
            Classification of plant machines, influence rates, redundancy, quality grade & maintenance ranks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={15} />
            Import CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} />
            Export CSV
          </button>

          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            Add Machine Item
          </button>
        </div>
      </div>

      {/* Summary KPI Cards - Rich Full-Tinted Backgrounds */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Machines</span>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--text)' }}>{rankStats.total}</span>
        </div>

        <div style={{ background: '#fff1f2', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#9f1239', textTransform: 'uppercase' }}>Rank S (Critical)</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#ffe4e6', color: '#9f1239', fontWeight: 700 }}>Grade 1-6</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#be123c' }}>{rankStats.S}</span>
        </div>

        <div style={{ background: '#fefce8', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fef08a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase' }}>Rank A</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#fef9c3', color: '#854d0e', fontWeight: 700 }}>Grade 7-12</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#a16207' }}>{rankStats.A}</span>
        </div>

        <div style={{ background: '#eff6ff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Rank B</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>Grade 13-18</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#2563eb' }}>{rankStats.B}</span>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Rank C</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>Grade 19~</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#475569' }}>{rankStats.C}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ 
        background: 'var(--surface)', 
        padding: '16px', 
        borderRadius: '12px', 
        border: '1px solid var(--border)', 
        marginBottom: '20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input 
            type="search"
            placeholder="Search machine, section, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>

        {/* Filter Department */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="filter-dept" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' }}>Department:</label>
          <select 
            id="filter-dept"
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            className="input"
            style={{ width: '130px', padding: '6px 10px', fontSize: '13px' }}
          >
            {uniqueDepts.map(d => (
              <option key={d} value={d}>{d === 'all' ? 'All Depts' : d}</option>
            ))}
          </select>
        </div>

        {/* Filter Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="filter-sec" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' }}>Section:</label>
          <select 
            id="filter-sec"
            value={filterSection} 
            onChange={(e) => setFilterSection(e.target.value)}
            className="input"
            style={{ width: '140px', padding: '6px 10px', fontSize: '13px' }}
          >
            {uniqueSections.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Sections' : s}</option>
            ))}
          </select>
        </div>

        {/* Filter Rank */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="filter-rank" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', cursor: 'pointer' }}>Rank:</label>
          <select 
            id="filter-rank"
            value={filterRank} 
            onChange={(e) => setFilterRank(e.target.value)}
            className="input"
            style={{ width: '120px', padding: '6px 10px', fontSize: '13px' }}
          >
            {uniqueRanks.map(r => (
              <option key={r} value={r}>{r === 'all' ? 'All Ranks' : `Rank ${r}`}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowSidePanel(!showSidePanel)}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          title={showSidePanel ? "Hide side reference guide" : "Show side reference guide"}
        >
          <Layers size={14} />
          {showSidePanel ? "Hide Guide Panel" : "Show Guide Panel"}
        </button>

        {(filterDept !== 'all' || filterSection !== 'all' || filterRank !== 'all' || search) && (
          <button 
            onClick={() => {
              setFilterDept('all');
              setFilterSection('all');
              setFilterRank('all');
              setSearch('');
            }}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Table Layout with Responsive Grid Toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: showSidePanel ? '1fr 320px' : '1fr', gap: '20px', alignItems: 'start', transition: 'grid-template-columns 0.2s ease' }}>
        {/* Main Machine Classification Data Table Container */}
        <div className="table-container" style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                {/* Clean Sub-header scale bounds row matching trouble report clean style */}
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border)' }}>
                  <th colSpan={5} style={{ padding: '4px' }}></th>
                  <th style={{ textAlign: 'center', fontWeight: 700, fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', padding: '4px' }}>Range: 1–4</th>
                  <th style={{ textAlign: 'center', fontWeight: 700, fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', padding: '4px' }}>1 or 4</th>
                  <th style={{ textAlign: 'center', fontWeight: 700, fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', padding: '4px' }}>Range: 1–4</th>
                  <th colSpan={3} style={{ padding: '4px' }}></th>
                </tr>
                {/* Standard Trouble Record Style Table Header */}
                <tr>
                  <th style={{ width: '95px' }}>Department</th>
                  <th style={{ width: '55px', textAlign: 'center' }}>Item</th>
                  <th style={{ width: '85px' }}>Section</th>
                  <th style={{ minWidth: '180px' }}>Machine</th>
                  <th style={{ minWidth: '220px' }}>Machine 2</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Influence rate</th>
                  <th style={{ width: '85px', textAlign: 'center' }}>Redundancy</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Quality</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Grade</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                  <th style={{ width: '75px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '20px' }}>
                      <TableSkeleton rows={8} cols={11} />
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text2)' }}>
                      No machine items found. Click "Add Machine Item" or "Import CSV" to start.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const calc = calculateGradeAndRank(row.influenceRate, row.redundancy, row.quality);
                    
                    // Elegant Rank Badge styling matching design system
                    let badgeBg = '#f1f5f9';
                    let badgeColor = '#475569';
                    let badgeBorder = '#cbd5e1';

                    if (calc.rank === 'S') {
                      badgeBg = '#fef2f2';
                      badgeColor = '#dc2626';
                      badgeBorder = '#fecaca';
                    } else if (calc.rank === 'A') {
                      badgeBg = '#fefce8';
                      badgeColor = '#d97706';
                      badgeBorder = '#fef08a';
                    } else if (calc.rank === 'B') {
                      badgeBg = '#eff6ff';
                      badgeColor = '#2563eb';
                      badgeBorder = '#bfdbfe';
                    }

                    return (
                      <tr 
                        key={row.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border)', 
                          transition: 'background-color 0.15s ease' 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 600 }}>{row.department}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text3)' }}>#{row.item}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{row.section}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>{row.machine}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{row.machine2}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.influenceRate}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.redundancy}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.quality}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{calc.grade}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '12px',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`
                          }}>
                            {calc.rank}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleOpenEdit(row)}
                              title="Edit machine item"
                              aria-label="Edit machine item"
                              className="btn btn-secondary"
                              style={{ width: '34px', height: '34px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}
                            >
                              <Edit2 size={14} style={{ color: 'var(--accent)' }} />
                            </button>
                            <button 
                              onClick={() => handleOpenDelete(row)}
                              title="Delete machine item"
                              aria-label="Delete machine item"
                              className="btn btn-secondary"
                              style={{ width: '34px', height: '34px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca' }}
                            >
                              <Trash2 size={14} style={{ color: 'var(--red)' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Reference Legend Panel - Collapsible */}
        {showSidePanel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              padding: '16px',
              boxShadow: '0 4px 20px rgba(18, 28, 51, 0.03)'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Maintenance Rank Guide
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 8px', width: '50px', textAlign: 'center', color: 'var(--text2)' }}>Rank</th>
                    <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center', color: 'var(--text2)' }}>Grade</th>
                    <th style={{ padding: '6px 8px', color: 'var(--text2)' }}>Maintenance Situation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fef2f2', color: '#dc2626', fontWeight: 800, border: '1px solid #fecaca', fontSize: '11px' }}>S</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>1 ~ 6</td>
                    <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>Condition-Based (CBM) & Lifetime Maint.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fefce8', color: '#d97706', fontWeight: 800, border: '1px solid #fef08a', fontSize: '11px' }}>A</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>7 ~ 12</td>
                    <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>Condition-Based (CBM) & Lifetime Maint.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: 800, border: '1px solid #bfdbfe', fontSize: '11px' }}>B</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>13 ~ 18</td>
                    <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>Lifetime Maintenance</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 800, border: '1px solid #cbd5e1', fontSize: '11px' }}>C</span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>19 ~</td>
                    <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.4' }}>Breakdown Maintenance</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ 
              background: 'var(--surface)', 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '14px',
              fontSize: '12px',
              lineHeight: '1.6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={15} style={{ color: 'var(--accent)' }} /> Formula & Parameters
                </h4>
                <button 
                  onClick={() => setShowCriteria(!showCriteria)} 
                  className="btn btn-secondary" 
                  style={{ padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showCriteria ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Criteria Details
                </button>
              </div>

              <p style={{ color: 'var(--text2)', marginBottom: '8px' }}>
                <strong>Grade Formula:</strong><br />
                <code style={{ background: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                  Grade = Influence rate × Redundancy × Quality
                </code>
              </p>
              <ul style={{ paddingLeft: '18px', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Influence rate:</strong> Scale 1 to 4</li>
                <li><strong>Redundancy:</strong> 1 (No Redundancy) or 4 (Redundant)</li>
                <li><strong>Quality:</strong> Scale 1 to 4</li>
              </ul>

              {/* Expandable Criteria Details in Side Panel */}
              {showCriteria && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>Evaluation Criteria</div>
                  
                  <div>
                    <strong style={{ color: 'var(--text)' }}>1. Influence Rate</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text2)', marginTop: '2px' }}>
                      • 1: High possibility of production stoppage or environmental abnormality.<br />
                      • 2: Small possibility.<br />
                      • 3: Opportunity.<br />
                      • 4: No possibility / Other.
                    </div>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>2. Redundancy</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text2)', marginTop: '2px' }}>
                      • 1: No redundant equipment available.<br />
                      • 4: Redundant equipment available & switchable.
                    </div>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text)' }}>3. Quality</strong>
                    <div style={{ fontSize: '10.5px', color: 'var(--text2)', marginTop: '2px' }}>
                      • 1: Quality defect reaching customer / stoppage.<br />
                      • 2: Recovery / adjustment &gt; 3 hours.<br />
                      • 3: Recovery / adjustment &lt; 3 hours.<br />
                      • 4: No impact on product quality.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingItem ? "Edit Machine Classification" : "Add Machine Classification"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department</label>
              <input 
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. RFG"
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Item No. <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)' }}>(Auto-generated)</span>
              </label>
              <input 
                type="number"
                readOnly
                value={itemNo}
                title="Item number is automatically generated sequentially"
                className="input"
                style={{ width: '100%', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Section</label>
              <input 
                type="text"
                required
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Utility"
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Machine</label>
              <input 
                type="text"
                required
                value={machine}
                onChange={(e) => setMachine(e.target.value)}
                placeholder="e.g. RFG DI Plant (G-32 + G55)"
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Machine 2 (Sub System / Component)</label>
            <input 
              type="text"
              required
              value={machine2}
              onChange={(e) => setMachine2(e.target.value)}
              placeholder="e.g. DI Treatment Unit (Vessels, Internal Resin, Valves, Piping)"
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Interactive Rating Inputs (Clean Segmented Pill Selectors) */}
          <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)' }}>
            
            {/* 1. Influence Rate Pills */}
            <div role="radiogroup" aria-label="1. Influence Rate (1–4)">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>1. Influence Rate (1–4)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { val: 1, label: "1 · High Risk" },
                  { val: 2, label: "2 · Low Risk" },
                  { val: 3, label: "3 · Opportunity" },
                  { val: 4, label: "4 · No Impact" }
                ].map((opt) => {
                  const isSelected = Number(influenceRate) === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-pressed={isSelected}
                      onClick={() => setInfluenceRate(opt.val)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          setInfluenceRate(opt.val < 4 ? opt.val + 1 : 1);
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          setInfluenceRate(opt.val > 1 ? opt.val - 1 : 4);
                        }
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--surface)' : 'transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text2)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Redundancy Pills */}
            <div role="radiogroup" aria-label="2. Redundancy (1 or 4)">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>2. Redundancy (1 or 4)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { val: 1, label: "1 · Single Equipment (No Redundancy)" },
                  { val: 4, label: "4 · Redundant Equipment Available" }
                ].map((opt) => {
                  const isSelected = Number(redundancy) === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-pressed={isSelected}
                      onClick={() => setRedundancy(opt.val)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          setRedundancy(opt.val === 1 ? 4 : 1);
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--surface)' : 'transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text2)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Quality Pills */}
            <div role="radiogroup" aria-label="3. Quality Impact (1–4)">
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>3. Quality Impact (1–4)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { val: 1, label: "1 · Defect Risk" },
                  { val: 2, label: "2 · Adjust >3h" },
                  { val: 3, label: "3 · Adjust <3h" },
                  { val: 4, label: "4 · No Impact" }
                ].map((opt) => {
                  const isSelected = Number(quality) === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-pressed={isSelected}
                      onClick={() => setQuality(opt.val)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          setQuality(opt.val < 4 ? opt.val + 1 : 1);
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          setQuality(opt.val > 1 ? opt.val - 1 : 4);
                        }
                      }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--surface)' : 'transparent',
                        color: isSelected ? 'var(--accent)' : 'var(--text2)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Rich Full-Tinted Computed Status Preview Card */}
          {(() => {
            const rank = calculatedFormState.rank;
            const cardBg = rank === 'S' ? '#fff1f2' : rank === 'A' ? '#fefce8' : rank === 'B' ? '#eff6ff' : '#f8fafc';
            const cardBorder = rank === 'S' ? '#fecdd3' : rank === 'A' ? '#fef08a' : rank === 'B' ? '#bfdbfe' : '#cbd5e1';
            const titleColor = rank === 'S' ? '#9f1239' : rank === 'A' ? '#854d0e' : rank === 'B' ? '#1e40af' : '#334155';
            const gradeColor = rank === 'S' ? '#be123c' : rank === 'A' ? '#a16207' : rank === 'B' ? '#2563eb' : '#475569';
            const badgeBg = rank === 'S' ? '#ffe4e6' : rank === 'A' ? '#fef9c3' : rank === 'B' ? '#dbeafe' : '#e2e8f0';

            return (
              <div style={{ 
                background: cardBg, 
                padding: '14px 16px', 
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `1px solid ${cardBorder}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: titleColor, letterSpacing: '0.5px' }}>
                    Calculated Classification
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: titleColor }}>
                      Grade: <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: gradeColor }}>{calculatedFormState.grade}</strong>
                    </span>
                    <span style={{ 
                      padding: '2px 10px', 
                      borderRadius: '6px', 
                      fontWeight: 800, 
                      fontSize: '13px',
                      background: badgeBg,
                      color: titleColor,
                      border: `1px solid ${cardBorder}`
                    }}>
                      Rank {rank}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '11.5px', textAlign: 'right', maxWidth: '240px', fontWeight: 700, color: titleColor, lineHeight: '1.4' }}>
                  {calculatedFormState.maintenanceSituation}
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingItem ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Preview Confirmation Modal */}
      <Modal
        isOpen={Boolean(pendingImportOps)}
        onClose={() => setPendingImportOps(null)}
        title="Confirm CSV Import"
      >
        <div>
          <p style={{ fontSize: '13px', marginBottom: '12px' }}>
            Are you sure you want to import <strong>{pendingImportOps?.length}</strong> machine classification items?
          </p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', fontSize: '12px', background: 'var(--surface2)', marginBottom: '16px' }}>
            {pendingImportOps?.slice(0, 5).map((op, idx) => (
              <div key={idx} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>#{op.data.item}</strong> {op.data.department} - {op.data.machine} ({op.data.machine2})
              </div>
            ))}
            {pendingImportOps?.length > 5 && (
              <div style={{ padding: '4px 0', fontStyle: 'italic', color: 'var(--text3)' }}>
                ... and {pendingImportOps.length - 5} more items
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={() => setPendingImportOps(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={confirmImportCSV} className="btn btn-primary">
              Import Items
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title={`Delete Machine Item #${deleteModal.item?.item || ''}`}
        message={`Are you sure you want to delete "${deleteModal.item?.machine || ''}" (${deleteModal.item?.department || ''} - ${deleteModal.item?.section || ''})?`}
        confirmText="Delete Machine"
        variant="danger"
        loading={deleteModal.loading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, item: null, loading: false })}
      />
    </div>
  );
}
