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

// Initial sample data if collection is empty
const INITIAL_MACHINE_CLASSIFY_DATA = [
  { department: 'RFG', item: 1, section: 'Utility', machine: 'RFG DI Plant (G-32 + G55)', machine2: 'DI Treatment Unit (Vessels, Internal Resin, Valves, Piping)', influenceRate: 1, redundancy: 4, quality: 2 },
  { department: 'RFG', item: 2, section: 'Utility', machine: 'RFG DI Plant (G-32 + G55)', machine2: 'Regeneration Tank System', influenceRate: 2, redundancy: 4, quality: 2 },
  { department: 'RFG', item: 3, section: 'Utility', machine: 'RFG DI Plant (G-32 + G55)', machine2: 'DI Feed / Transfer Pumps (Motor & Pump, Check Valves, Strainers)', influenceRate: 1, redundancy: 4, quality: 3 },
  { department: 'RFG', item: 4, section: 'Utility', machine: 'RFG DI Plant (G-32 + G55)', machine2: 'Storage Tank System', influenceRate: 2, redundancy: 4, quality: 2 },
  { department: 'RFG', item: 5, section: 'Utility', machine: 'RFG DI Plant (G-32 + G55)', machine2: 'Control Panel & Instruments (PLC, pH/EC Meter, Pressure Gauges, Flow Meters)', influenceRate: 1, redundancy: 4, quality: 3 },
  { department: 'RFG', item: 6, section: 'Utility', machine: 'RFG DI Regeneration (G-79)', machine2: 'DI Treatment Unit (Vessels, Internal Resin, Valves, Piping)', influenceRate: 2, redundancy: 1, quality: 2 },
  { department: 'RFG', item: 7, section: 'Utility', machine: 'RFG DI Regeneration (G-79)', machine2: 'DI Feed / Transfer Pumps (Motor & Pump, Check Valves, Strainers)', influenceRate: 2, redundancy: 1, quality: 2 },
  { department: 'RFG', item: 8, section: 'Utility', machine: 'RFG DI Regeneration (G-79)', machine2: 'Storage Tank System', influenceRate: 2, redundancy: 1, quality: 2 },
  { department: 'RFG', item: 9, section: 'Utility', machine: 'RFG DI Regeneration (G-79)', machine2: 'Control Panel & Instruments (PLC, pH/EC Meter, Pressure Gauges, Flow Meters)', influenceRate: 2, redundancy: 1, quality: 3 },
  { department: 'RFG', item: 10, section: 'Utility', machine: 'RFG RO Plant', machine2: 'RO Membrane Unit (Housing & Elements)', influenceRate: 2, redundancy: 1, quality: 2 },
  { department: 'RFG', item: 11, section: 'Utility', machine: 'RFG RO Plant', machine2: 'High Pressure Pump Set and Feed / Transfer Pumps', influenceRate: 1, redundancy: 1, quality: 2 },
  { department: 'RFG', item: 12, section: 'Utility', machine: 'RFG RO Plant', machine2: 'Pre-Treatment System', influenceRate: 2, redundancy: 1, quality: 2 },
  { department: 'RFG', item: 13, section: 'Utility', machine: 'RFG RO Plant', machine2: 'RO Control & Monitoring Panel', influenceRate: 1, redundancy: 1, quality: 3 },
  { department: 'RFG', item: 14, section: 'Utility', machine: 'RFG Water Treatment (G55)', machine2: 'Chemical Storage Tank (Acid/Base)', influenceRate: 1, redundancy: 1, quality: 4 },
  { department: 'RFG', item: 15, section: 'Utility', machine: 'RFG Water Treatment (G55)', machine2: 'Chemical Dosing & Transfer Set (Dosing Pumps & Motors)', influenceRate: 1, redundancy: 1, quality: 4 },
  { department: 'RFG', item: 16, section: 'Utility', machine: 'RFG Water Treatment (G55)', machine2: 'Regeneration Control & Valve Set (Solenoid Valves)', influenceRate: 1, redundancy: 1, quality: 4 },
  { department: 'RFG', item: 17, section: 'Utility', machine: 'Water Cooling System', machine2: 'Chiller System (Chiller Unit, Heat Exchanger, Temp Sensor, Flow Switch)', influenceRate: 1, redundancy: 4, quality: 4 },
  { department: 'RFG', item: 18, section: 'Utility', machine: 'Water Cooling System', machine2: 'Cooling Tower (Structure, Support, Motor, Driving Parts, Blades, Level Switch)', influenceRate: 1, redundancy: 4, quality: 4 }
];

export default function MachineClassify() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCriteria, setShowCriteria] = useState(false);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterRank, setFilterRank] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingImportOps, setPendingImportOps] = useState(null);

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

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_machine_classify', (data) => {
      // Sort items by Item number
      const sorted = [...data].sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0));
      setItems(sorted);
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
        showToast("Machine classification updated", "success");
      } else {
        await createDocument('mace_machine_classify', payload);
        showToast("Machine classification added", "success");
      }
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Error saving record", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this machine item?")) return;
    try {
      await deleteDocument('mace_machine_classify', id);
      showToast("Machine item deleted", "success");
    } catch (err) {
      console.error(err);
      showToast("Error deleting item", "error");
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
    if (!pendingImportOps) return;
    try {
      setLoading(true);
      await batchWriteOperations(pendingImportOps);
      showToast(`Imported ${pendingImportOps.length} machine items`, "success");
      setPendingImportOps(null);
    } catch (err) {
      console.error(err);
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
          <button 
            onClick={() => setIsCriteriaModalOpen(true)} 
            className="btn btn-secondary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            <HelpCircle size={16} />
            Evaluation Criteria
          </button>

          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={15} />
            Import CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>

          <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} />
            Export CSV
          </button>

          {items.length === 0 && (
            <button onClick={handleSeedData} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} />
              Load Sample Data
            </button>
          )}

          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            Add Machine Item
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
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

        <div style={{ background: '#fdf2f2', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column' }}>
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

        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>Rank B</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>Grade 13-18</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#475569' }}>{rankStats.B}</span>
        </div>

        <div style={{ background: '#f1f5f9', padding: '16px 20px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Rank C</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#cbd5e1', color: '#1e293b', fontWeight: 700 }}>Grade 19~</span>
          </div>
          <span style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: '#64748b' }}>{rankStats.C}</span>
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
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)' }}>Department:</span>
          <select 
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
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)' }}>Section:</span>
          <select 
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
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)' }}>Rank:</span>
          <select 
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

      {/* Main Table Layout with Reference Guide Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Main Excel-style Machine Table */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '8px', 
          border: '1px solid #000000', 
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000', fontFamily: 'Segoe UI, Tahoma, sans-serif' }}>
              <thead>
                {/* Secondary Header Row matching Example 2 */}
                <tr style={{ background: '#ffffff', borderBottom: '1px solid #000000' }}>
                  <th colSpan={5} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000', padding: '4px' }}></th>
                  <th style={{ background: '#ffffff', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>1-4</th>
                  <th style={{ background: '#ffffff', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>1 or 4</th>
                  <th style={{ background: '#ffffff', borderRight: '1px solid #000000', borderBottom: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>1-4</th>
                  <th colSpan={2} style={{ borderBottom: '1px solid #000000', padding: '4px' }}></th>
                  <th style={{ borderBottom: '1px solid #000000', padding: '4px' }}></th>
                </tr>
                {/* Primary Yellow Excel Header Row */}
                <tr style={{ background: '#ffd700', color: '#000000', textAlign: 'center', fontWeight: 'bold' }}>
                  <th style={{ border: '1px solid #000000', padding: '8px 10px', width: '90px' }}>Department</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 10px', width: '50px' }}>Item</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 10px', width: '80px' }}>Section</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 12px', minWidth: '180px' }}>Machine</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 12px', minWidth: '240px' }}>Machine 2</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '85px' }}>Influence rate</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '85px' }}>Redundancy</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '70px' }}>Quality</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '65px' }}>Grade</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '60px' }}>Rank</th>
                  <th style={{ border: '1px solid #000000', padding: '8px 8px', width: '75px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text2)' }}>
                      Loading machine classification records...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text2)' }}>
                      No machine items found. Click "Add Machine Item" or "Load Sample Data" to start.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const calc = calculateGradeAndRank(row.influenceRate, row.redundancy, row.quality);
                    
                    // Highlight Rank S with soft pink/red tint matching sample image
                    let rankBg = '#ffffff';
                    if (calc.rank === 'S') rankBg = '#ffd3d8'; // Soft pink red tint
                    else if (calc.rank === 'A') rankBg = '#fef08a'; // Soft yellow tint
                    else if (calc.rank === 'B') rankBg = '#ffffff';

                    return (
                      <tr 
                        key={row.id} 
                        style={{ 
                          borderBottom: '1px solid #000000', 
                          height: '32px',
                          transition: 'background-color 0.15s ease' 
                        }}
                      >
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>{row.department}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>{row.item}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>{row.section}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 10px', fontWeight: 500 }}>{row.machine}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 10px' }}>{row.machine2}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>{row.influenceRate}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>{row.redundancy}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>{row.quality}</td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}>{calc.grade}</td>
                        <td style={{ 
                          border: '1px solid #000000', 
                          padding: '4px 8px', 
                          textAlign: 'center', 
                          fontWeight: 'bold',
                          backgroundColor: rankBg,
                          color: calc.rank === 'S' ? '#990000' : '#000000'
                        }}>
                          {calc.rank}
                        </td>
                        <td style={{ border: '1px solid #000000', padding: '4px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleOpenEdit(row)}
                              title="Edit item"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0052cc', padding: '2px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(row.id)}
                              title="Delete item"
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                            >
                              <Trash2 size={14} />
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

        {/* Right Reference Legend Panel matching Example 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ 
            background: '#ffffff', 
            border: '1px solid #000000', 
            borderRadius: '6px', 
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Maintenance Rank Guide
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', color: '#000000', border: '1px solid #000000' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', fontWeight: 'bold', textAlign: 'center' }}>
                  <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '45px' }}>Rank</th>
                  <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '55px' }}>Grade</th>
                  <th style={{ border: '1px solid #000000', padding: '6px 8px' }}>Maintenance situation</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#ffd3d8' }}>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold', color: '#990000' }}>S</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>1 ~ 6</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', fontSize: '10.5px' }}>Condition-Based Maintenance (CBM) and Lifetime Maintenance</td>
                </tr>
                <tr style={{ background: '#fef08a' }}>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>A</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>7 ~ 12</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', fontSize: '10.5px' }}>Condition-Based Maintenance (CBM) and Lifetime Maintenance</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>B</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>13 ~ 18</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', fontSize: '10.5px' }}>Lifetime Maintenance</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>C</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>19 ~</td>
                  <td style={{ border: '1px solid #000000', padding: '6px', fontSize: '10.5px' }}>Breakdown Maintenance</td>
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Item No.</label>
              <input 
                type="number"
                required
                value={itemNo}
                onChange={(e) => setItemNo(e.target.value)}
                placeholder="e.g. 1"
                className="input"
                style={{ width: '100%' }}
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

          {/* Rating Inputs */}
          <div style={{ background: 'var(--surface2)', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Influence rate (1-4)</label>
              <input 
                type="number"
                min="1"
                max="4"
                required
                value={influenceRate}
                onChange={(e) => setInfluenceRate(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Redundancy (1 or 4)</label>
              <select 
                value={redundancy}
                onChange={(e) => setRedundancy(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value={1}>1 (No Redundancy)</option>
                <option value={4}>4 (Redundant)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Quality (1-4)</label>
              <input 
                type="number"
                min="1"
                max="4"
                required
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Computed Preview inside Modal */}
          <div style={{ 
            background: calculatedFormState.rank === 'S' ? '#ffd3d8' : calculatedFormState.rank === 'A' ? '#fef08a' : 'var(--surface3)', 
            padding: '12px', 
            borderRadius: '8px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            border: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text2)' }}>Calculated Rating</div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px', color: 'var(--text)' }}>
                Grade: <strong>{calculatedFormState.grade}</strong> | Rank: <strong style={{ fontSize: '15px' }}>{calculatedFormState.rank}</strong>
              </div>
            </div>
            <div style={{ fontSize: '11px', textAlign: 'right', maxWidth: '200px', fontWeight: 500 }}>
              {calculatedFormState.maintenanceSituation}
            </div>
          </div>

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

      {/* Dedicated Evaluation Criteria Reference Modal */}
      <Modal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
        title="Machine Classification Evaluation Criteria"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Section 1: Influence rate */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
              1. Influence Rate Criteria
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', width: '50px' }}>Rate</th>
                  <th style={{ padding: '8px 10px', width: '160px' }}>Utility</th>
                  <th style={{ padding: '8px 10px', width: '180px' }}>Inspection Line</th>
                  <th style={{ padding: '8px 10px' }}>Other</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>1</td>
                  <td style={{ padding: '8px 10px' }}>[High possibility] Production stoppage or environmental abnormality.</td>
                  <td style={{ padding: '8px 10px' }}>Equipment failure causes production loss and may result in quality defects reaching the customer.</td>
                  <td style={{ padding: '8px 10px' }}>Equipment which affect production loss Over 3 hours with significant failure.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>2</td>
                  <td style={{ padding: '8px 10px' }}>[Small possibility] Production stoppage or environmental abnormality.</td>
                  <td style={{ padding: '8px 10px' }}>—</td>
                  <td style={{ padding: '8px 10px' }}>Production can continue, but productivity must be reduced.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>3</td>
                  <td style={{ padding: '8px 10px' }}>[Opportunity] Production stoppage or environmental abnormality.</td>
                  <td style={{ padding: '8px 10px' }}>—</td>
                  <td style={{ padding: '8px 10px' }}>Equipment which affect production loss Less 3 hours with significant failure.</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>4</td>
                  <td style={{ padding: '8px 10px' }}>[No possibility] Production stoppage or environmental abnormality.</td>
                  <td style={{ padding: '8px 10px' }}>Other</td>
                  <td style={{ padding: '8px 10px' }}>Other</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Redundancy */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
              2. Redundancy Criteria
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', width: '60px' }}>Rate</th>
                  <th style={{ padding: '8px 10px' }}>Contents</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>1</td>
                  <td style={{ padding: '8px 10px' }}>No redundant equipment available.</td>
                </tr>
                <tr style={{ background: 'var(--surface2)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>4</td>
                  <td style={{ padding: '8px 10px' }}>Redundant equipment is available and can be switched over.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Quality */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>
              3. Quality Criteria
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px', width: '60px' }}>Rate</th>
                  <th style={{ padding: '8px 10px' }}>Contents</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>1</td>
                  <td style={{ padding: '8px 10px' }}>Equipment failure may result in quality defects being delivered to the customer, requiring production stoppage.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>2</td>
                  <td style={{ padding: '8px 10px' }}>Equipment failure requires process adjustment or recovery time exceeding 3 hours.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>3</td>
                  <td style={{ padding: '8px 10px' }}>Equipment failure requires process adjustment or recovery time of less than 3 hours.</td>
                </tr>
                <tr style={{ background: 'var(--surface2)' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'center' }}>4</td>
                  <td style={{ padding: '8px 10px' }}>No impact on product quality.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={() => setIsCriteriaModalOpen(false)} className="btn btn-primary">
            Close Reference
          </button>
        </div>
      </Modal>
    </div>
  );
}
