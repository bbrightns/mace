import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  CalendarDays, 
  Clock, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  batchWriteOperations
} from '../../firebase/collections';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../utils';
import PageHeader from '../../components/PageHeader';

// Helper for Thai/English Date Formatter for header
const getFormattedHeaderDate = (dateObj) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
};

// Section Auto-Suggest List
const SECTION_SUGGESTIONS = [
  "Base paint",
  "Base paint oven",
  "Benteler W/M",
  "Billco W/M",
  "Coater",
  "Cross-X",
  "Detergent W/M",
  "Entry",
  "Exit",
  "Facedown",
  "Load/Unload",
  "Loading",
  "Metal dry",
  "MIR DI water plant 1",
  "MIR DI water plant 2",
  "MIR RO water plant",
  "Mirror line",
  "Offline",
  "Operating room",
  "Optoplex",
  "Painting",
  "Passivation",
  "Polishing",
  "Power supply",
  "Ready",
  "RFG line",
  "RFG Purified Water plant",
  "Sand blast room",
  "Sensitizer",
  "Shop",
  "Sliver",
  "Small temper",
  "Top paint",
  "Top paint cooling",
  "Top paint oven",
  "Unload",
  "Unload A",
  "Unload B",
  "Unload K-star",
  "Utility",
  "Washing machine",
  "Waste Water Plant",
  "Office",
  "Plant"
];

const hasAnyContent = (t) => {
  if (t.plantSection === 'SUBCONTRACTOR' || t.category === 'SUBCONTRACTOR') {
    return !!(
      t.location?.trim() || 
      t.subcontractorName?.trim() || 
      t.taskName?.trim() || 
      (t.progress !== undefined && t.progress !== '0' && t.progress !== 0 && t.progress?.toString().trim() !== '') || 
      t.pic?.trim()
    );
  }
  const checkString = (val) => typeof val === 'string' ? val.trim().length > 0 : !!val;
  return !!(
    t.section?.trim() || 
    t.equipment?.trim() || 
    t.taskName?.trim() || 
    t.detail?.trim() || 
    checkString(t.mechTechnicians) || 
    checkString(t.elecTechnicians)
  );
};

// Standalone SectionCell Component to strictly satisfy React Rules of Hooks
function SectionCell({ task, draftEdits, handleCellChange, handleCellBlur }) {
  const field = 'section';
  const currentDraft = draftEdits[task.id]?.[field];
  const val = currentDraft !== undefined ? currentDraft : (task.section || '');
  const isUrgent = (draftEdits[task.id]?.planType || task.planType || task.mtnType) === 'Urgent';

  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!val) return SECTION_SUGGESTIONS.slice(0, 8);
    return SECTION_SUGGESTIONS.filter(item => 
      item.toLowerCase().includes(val.toLowerCase())
    ).slice(0, 8);
  }, [val]);

  // Auto-adjust height callback ref for initial mount and rerenders
  const textareaRef = (node) => {
    if (node) {
      node.style.height = 'auto';
      node.style.height = `${Math.max(24, node.scrollHeight)}px`;
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea 
        ref={textareaRef}
        className="table-cell-input"
        rows={1}
        value={val}
        placeholder=""
        onChange={(e) => {
          handleCellChange(task.id, field, e.target.value);
          textareaRef(e.target);
          setShowSuggestions(true);
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.background = 'var(--surface)';
          textareaRef(e.target);
          setShowSuggestions(true);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'transparent';
          e.target.style.background = 'transparent';
          setTimeout(() => {
            setShowSuggestions(false);
            handleCellBlur(task, field, e.target.value);
          }, 200);
        }}
        style={{
          width: '100%',
          border: '1px solid transparent',
          background: 'transparent',
          padding: '2px 4px',
          minHeight: '24px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'inherit',
          color: isUrgent ? '#dc2626' : 'var(--text)',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          lineHeight: '1.3',
          display: 'block'
        }}
      />

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          zIndex: 100,
          maxHeight: '160px',
          overflowY: 'auto'
        }}>
          {filteredSuggestions.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '5px 8px',
                fontSize: '11.5px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                color: 'var(--text)'
              }}
              onMouseDown={() => {
                handleCellChange(task.id, field, item);
                handleCellBlur(task, field, item);
                setShowSuggestions(false);
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskManagement() {
  const [activeView, setActiveView] = useState('daily'); // 'daily' | 'planning'
  const [tasks, setTasks] = useState(() => {
    const localSaved = localStorage.getItem('mace_tasks_cache');
    if (!localSaved) return [];
    try {
      const parsed = JSON.parse(localSaved);
      return parsed.filter(t => 
        !(t.id?.startsWith('temp-') || t.id?.startsWith('local-')) || hasAnyContent(t)
      );
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);

  // Daily View Date Selector (persisted in localStorage, default to today)
  const [selectedDate, setSelectedDate] = useState(() => {
    return localStorage.getItem('mace_task_selected_date') || new Date().toISOString().substring(0, 10);
  });

  useEffect(() => {
    localStorage.setItem('mace_task_selected_date', selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (tasks) {
      const tasksToCache = tasks.filter(t => 
        !(t.id?.startsWith('temp-') || t.id?.startsWith('local-')) || hasAnyContent(t)
      );
      localStorage.setItem('mace_tasks_cache', JSON.stringify(tasksToCache));
    }
  }, [tasks]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Editing Local Changes state { [taskId]: { field: value } }
  const [draftEdits, setDraftEdits] = useState({});

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_tasks', (data) => {
      if (data) {
        setTasks(prev => {
          const tempRows = prev.filter(t => t.id?.startsWith('temp-') || t.isTemp);
          const merged = [...data];
          tempRows.forEach(tr => {
            if (!merged.some(m => m.id === tr.id)) {
              merged.push(tr);
            }
          });
          return merged;
        });
        localStorage.setItem('mace_tasks_cache', JSON.stringify(data));
      }
      setLoading(false);
    }, (error) => {
      console.warn('mace_tasks sync fallback:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Find planning row status for selected date if available
  const currentPlanningRow = useMemo(() => {
    return tasks.find(t => t.taskDate === selectedDate && (t.rfgRev || t.mirRev));
  }, [tasks, selectedDate]);

  const currentRfgStatus = currentPlanningRow?.rfgRev || 'PROD';
  const currentMirStatus = currentPlanningRow?.mirRev || 'PROD';

  // Quick Inline Edit Cell Handler
  const handleCellChange = (taskId, field, value) => {
    setDraftEdits(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        [field]: value
      }
    }));
  };

  // Blur/Save cell to Firestore automatically
  const handleCellBlur = async (task, field, overrideVal) => {
    const changes = draftEdits[task.id];
    const newValue = overrideVal !== undefined ? overrideVal : changes?.[field];

    if (newValue === undefined) return;

    try {
      if (task.id.startsWith('temp-')) {
        // Prevent creating a document if there is no actual content entered
        const isString = typeof newValue === 'string';
        const newValHasContent = isString ? newValue.trim().length > 0 : !!newValue;
        
        const hasContent = newValHasContent || 
          Object.entries(changes || {}).some(([k, v]) => {
            if (k === field) return false;
            return typeof v === 'string' ? v.trim().length > 0 : !!v;
          });
          
        if (!hasContent) {
          return;
        }

        // Create new document if it's a temp row created inline
        const payload = {
          plantSection: task.plantSection,
          category: task.category,
          taskDate: selectedDate,
          planType: field === 'planType' ? newValue : (task.planType || 'Plan'),
          safety: field === 'safety' ? newValue : (task.safety || 'PPE'),
          section: field === 'section' ? newValue : (task.section || ''),
          equipment: field === 'equipment' ? newValue : (task.equipment || ''),
          rank: field === 'rank' ? newValue : (task.rank || ''),
          taskName: field === 'taskName' ? newValue : (task.taskName || ''),
          subcontractorName: field === 'subcontractorName' ? newValue : (task.subcontractorName || ''),
          detail: field === 'detail' ? newValue : (task.detail || ''),
          status: field === 'status' ? newValue : (task.status || ''),
          mechTechnicians: field === 'mechTechnicians' ? newValue : (task.mechTechnicians || ''),
          elecTechnicians: field === 'elecTechnicians' ? newValue : (task.elecTechnicians || ''),
          plant: field === 'plant' ? newValue : (task.plant || 'RFG'),
          location: field === 'location' ? newValue : (task.location || ''),
          progress: field === 'progress' ? newValue : (task.progress !== undefined ? task.progress : '0'),
          pic: field === 'pic' ? newValue : (task.pic || '')
        };
        
        try {
          const docId = await createDocument('mace_tasks', payload);
          setTasks(prev => {
            const filtered = prev.filter(t => t.id !== task.id);
            return [...filtered, { id: docId, ...payload }];
          });
        } catch (err) {
          // Local fallback for offline/temp state
          const tempId = `local-${Date.now()}`;
          setTasks(prev => {
            const filtered = prev.filter(t => t.id !== task.id);
            return [...filtered, { id: tempId, ...payload }];
          });
        }

        setDraftEdits(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      } else {
        const updatedTask = {
          ...task,
          ...changes,
          [field]: newValue
        };
        if (!hasAnyContent(updatedTask)) {
          try {
            await deleteDocument('mace_tasks', task.id);
            setTasks(prev => prev.filter(t => t.id !== task.id));
            setDraftEdits(prev => {
              const next = { ...prev };
              delete next[task.id];
              return next;
            });
          } catch (err) {
            console.error('Delete empty task error:', err);
          }
        } else {
          try {
            await updateDocument('mace_tasks', task.id, { [field]: newValue });
          } catch (err) {
            // Local fallback update
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, [field]: newValue } : t));
          }
        }
      }
    } catch (e) {
      console.warn('Cell save note:', e);
    }
  };

  // Add Row directly to table
  const handleAddNewRow = (plantSection, category) => {
    const tempId = `temp-${plantSection}-add-${Date.now()}`;
    const newTempRow = {
      id: tempId,
      plantSection,
      category,
      taskDate: selectedDate,
      planType: 'Plan',
      safety: 'PPE',
      section: '',
      equipment: '',
      rank: '',
      taskName: '',
      subcontractorName: '',
      detail: '',
      status: '',
      mechTechnicians: '',
      elecTechnicians: '',
      plant: plantSection === 'SUBCONTRACTOR' ? 'RFG' : plantSection,
      location: '',
      progress: '0',
      pic: '',
      isTemp: true
    };
    setTasks(prev => [...prev, newTempRow]);
    showToast(`Added new ${plantSection} row`);
  };

  // Delete Row with confirmation
  const handleDeleteRow = async (task) => {
    const isLocalOnly = task.id.startsWith('temp-') || task.id.startsWith('local-');
    const hasContent = hasAnyContent(task) || (draftEdits[task.id] && Object.values(draftEdits[task.id]).some(val => typeof val === 'string' ? val.trim().length > 0 : !!val));
    
    if (task.id.startsWith('temp-') && !tasks.some(t => t.id === task.id)) {
      if (hasContent) {
        if (!window.confirm('Are you sure you want to clear this row?')) return;
      }
      setDraftEdits(prev => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      return;
    }

    if (hasContent || !isLocalOnly) {
      if (!window.confirm('Are you sure you want to delete this row?')) return;
    }

    if (!isLocalOnly) {
      try {
        await deleteDocument('mace_tasks', task.id);
        setTasks(prev => prev.filter(t => t.id !== task.id));
        showToast('Row deleted successfully');
      } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete row');
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== task.id));
    }

    setDraftEdits(prev => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });
  };

  // Pre-seed mock data matching exact user screenshots
  const handleSeedMockData = async () => {
    const mockData = [
      // RFG Block Tasks for 2026-07-23
      {
        plantSection: 'RFG',
        category: 'MTN',
        planType: 'Urgent',
        safety: 'LOTO',
        section: 'Offline',
        equipment: 'Crane RFG no.10',
        rank: 'B',
        taskName: 'RFG - Check Crane RFG no.10 (Hoist ไม่สามารถ ขึ้น ลง ได้)',
        detail: 'ถอด PCB, ถอด Magnetic ออกมา cleaning หน้า contact',
        status: 'Finished',
        mechTechnicians: 'วานิช',
        elecTechnicians: 'เริงฤทธิ์, จิราวุธ, ธวัชชัย',
        taskDate: '2026-07-23',
        rfgRev: 'MTN'
      },
      {
        plantSection: 'RFG',
        category: 'MTN',
        planType: 'Plan',
        safety: 'LOTO',
        section: 'Small temper',
        equipment: 'Blower panel',
        rank: 'B',
        taskName: 'RFG - Small temper ตู้ Blower panel อุดรุ่ย (MTN)',
        detail: '',
        status: 'Postpone',
        mechTechnicians: '',
        elecTechnicians: 'เริงฤทธิ์, จิราวุธ, ธวัชชัย',
        taskDate: '2026-07-23',
        rfgRev: 'MTN'
      },
      {
        plantSection: 'RFG',
        category: 'MTN',
        planType: 'Plan',
        safety: 'PPE',
        section: 'Cross-X',
        equipment: 'Air tube',
        rank: 'A',
        taskName: 'RFG - PM Unload table',
        detail: 'เช้า',
        status: 'Pending',
        mechTechnicians: 'บุญวัง, จิรายุ, วานิช, อำนาจ',
        elecTechnicians: '',
        taskDate: '2026-07-23',
        rfgRev: 'MTN'
      },
      {
        plantSection: 'RFG',
        category: 'MTN',
        planType: 'Plan',
        safety: 'LOTO',
        section: 'Unload A',
        equipment: 'Unload table A',
        rank: 'A',
        taskName: 'RFG - PM Cross-X transfer เช้า',
        detail: 'เช้า',
        status: 'Pending',
        mechTechnicians: 'บุญวัง, จิรายุ, วานิช, อำนาจ',
        elecTechnicians: '',
        taskDate: '2026-07-23',
        rfgRev: 'MTN'
      },
      // MIR Block Tasks for 2026-07-23
      {
        plantSection: 'MIR',
        category: 'PROD',
        planType: 'Plan',
        safety: 'Mirror',
        section: 'Base paint',
        equipment: 'Chain',
        rank: 'A',
        taskName: 'MIR - PM Vacuum chuck',
        detail: 'บ่าย',
        status: 'Pending',
        mechTechnicians: 'บุญวัง, จิรายุ, วานิช, อำนาจ',
        elecTechnicians: 'เริงฤทธิ์, จิราวุธ, ธวัชชัย',
        taskDate: '2026-07-23',
        mirRev: 'Mirror'
      },
      {
        plantSection: 'MIR',
        category: 'PROD',
        planType: 'Plan',
        safety: 'LOTO',
        section: 'Base paint',
        equipment: 'Clutch',
        rank: 'A',
        taskName: 'MIR - PM overhead clamp',
        detail: 'บ่าย',
        status: 'Pending',
        mechTechnicians: 'บุญวัง, จิรายุ, วานิช, อำนาจ',
        elecTechnicians: '',
        taskDate: '2026-07-23',
        mirRev: 'Mirror'
      },
      {
        plantSection: 'MIR',
        category: 'PROD',
        planType: 'Plan',
        safety: 'LOTO',
        section: 'Mirror line',
        equipment: 'Cover',
        rank: 'B',
        taskName: 'MIR - ติดตั้ง Cover ของโต๊ะตัดข้างห้อง มุราคามิ ที่หลุด',
        detail: 'บ่าย',
        status: 'Pending',
        mechTechnicians: 'บุญวัง, จิรายุ, วานิช, อำนาจ',
        elecTechnicians: '',
        taskDate: '2026-07-23',
        mirRev: 'Mirror'
      },
      {
        plantSection: 'MIR',
        category: 'PROD',
        planType: 'Plan',
        safety: 'PPE',
        section: 'Coater',
        equipment: 'encoder',
        rank: 'A',
        taskName: 'MIR - ทยอยถอด case แบริ่งมาเปลี่ยนแบริ่ง',
        detail: 'บ่าย',
        status: 'Pending',
        mechTechnicians: 'บุญวัง, จิรายุ, วานิช, อำนาจ',
        elecTechnicians: '',
        taskDate: '2026-07-23',
        mirRev: 'Mirror'
      },
      // SUBCONTRACTOR Tasks
      {
        plantSection: 'SUBCONTRACTOR',
        category: 'SUBCONTRACTOR',
        plant: 'RFG',
        location: 'Plant 1',
        taskName: '',
        detail: '',
        pic: '',
        taskDate: '2026-07-23'
      },
      // Planning View Mock Data matching screenshot 2
      {
        taskDate: '2026-06-09',
        rfgRev: 'CSS14',
        mirRev: 'Prod',
        eeWorkAft: 'ทำใบ Cert. pH EC ทั้งหมด 28 รายการ\nSF-72-818 pH\nSF-72-819 EC',
        mechWorkAft: '',
        taskName: 'ทำใบ Cert. pH EC ทั้งหมด 28 รายการ'
      },
      {
        taskDate: '2026-06-10',
        rfgRev: 'CSS14',
        mirRev: 'MTN 2mm',
        eeWorkAft: 'จัด store\nCheck heater metal dry ถังขึ้นลงอลูมิเนียม',
        mechWorkAft: 'MIR - PM polishing No.1-6 (เปลี่ยนแบริ่ง)\nMIR - เปลี่ยน Coupling No.2',
        taskName: 'Check heater metal dry & PM polishing'
      },
      {
        taskDate: '2026-06-11',
        rfgRev: 'CSS14',
        mirRev: 'MTN 2mm',
        eeWorkSupp: 'LT Power เก็บงาน TBM',
        eeWorkAft: '[MIR] ลองติดตั้ง sensor นับกระจก ด้านโหลด\nติดตั้ง power meter วัด Base paint blower\nถอด/ต่อ สายไฟ มอเตอร์กวาดสี Zone 1 ทั้ง 2 ห้อง\nre-check metal heater พันกันความร้อน',
        mechWorkAft: 'MIR - เปลี่ยนมอเตอร์ห้องกวาดสี 2\nMIR - PM Gear Motor ของ Roller หน้าห้องสี 2\nMIR - PM Blower บนห้องพักพนักงาน',
        taskName: 'LT Power & Sensor installation'
      }
    ];

    const ops = mockData.map(d => ({
      type: 'create',
      collectionName: 'mace_tasks',
      data: d
    }));

    try {
      await batchWriteOperations(ops);
      showToast('Sample tasks seeded successfully!');
    } catch (e) {
      showToast('Failed to seed tasks.', 'error');
    }
  };

  const rawDailyTasks = tasks.filter(t => t.taskDate === selectedDate && (
    t.id?.startsWith('temp-') || t.id?.startsWith('local-') || t.isTemp || hasAnyContent(t)
  ) && (
    !searchQuery || 
    t.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.equipment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.eeWorkAft?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.mechWorkAft?.toLowerCase().includes(searchQuery.toLowerCase())
  ));

  // Extract tasks or planning details for selected date
  const planningTasksForDate = useMemo(() => {
    return tasks.filter(t => t.taskDate === selectedDate && (t.eeWorkAft || t.mechWorkAft || t.eeWorkSupp || t.mechWorkSupp));
  }, [tasks, selectedDate]);

  // Partition tasks into RFG, MIR, and SUBCONTRACTOR sections
  const existingRfgTasks = rawDailyTasks.filter(t => t.plantSection === 'RFG' || (!t.plantSection && (t.taskName?.startsWith('RFG') || t.plant === 'RFG' || t.category === 'MTN')));
  const existingMirTasks = rawDailyTasks.filter(t => t.plantSection === 'MIR' || (!t.plantSection && (t.taskName?.startsWith('MIR') || t.plant === 'MIR' || t.category === 'PROD')));
  const existingSubTasks = rawDailyTasks.filter(t => t.plantSection === 'SUBCONTRACTOR' || t.category === 'SUBCONTRACTOR');

  // Fill up minimum rows: RFG (min 4), MIR (min 4), SUBCONTRACTOR (min 2)
  const getPaddedRows = (existing, minCount, plantSection, category) => {
    const list = [...existing];
    const missing = minCount - list.length;
    for (let i = 0; i < missing; i++) {
      list.push({
        id: `temp-${plantSection}-${i}`,
        plantSection,
        category,
        taskDate: selectedDate,
        planType: 'Plan',
        safety: 'PPE',
        section: '',
        equipment: '',
        rank: '',
        taskName: '',
        subcontractorName: '',
        detail: '',
        status: '',
        mechTechnicians: '',
        elecTechnicians: '',
        plant: plantSection === 'SUBCONTRACTOR' ? 'RFG' : plantSection,
        location: '',
        progress: '0',
        pic: '',
        isTemp: true
      });
    }
    return list;
  };

  const dailyRfgRows = useMemo(() => getPaddedRows(existingRfgTasks, 4, 'RFG', 'MTN'), [existingRfgTasks, selectedDate]);
  const dailyMirRows = useMemo(() => getPaddedRows(existingMirTasks, 4, 'MIR', 'PROD'), [existingMirTasks, selectedDate]);
  const dailySubRows = useMemo(() => getPaddedRows(existingSubTasks, 2, 'SUBCONTRACTOR', 'SUBCONTRACTOR'), [existingSubTasks, selectedDate]);

  // Filter tasks for Planning View
  const planningTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.taskDate) return false;
      const matchesSearch = !searchQuery || 
        t.taskName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.eeWorkAft?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.mechWorkAft?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.rfgRev?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.mirRev?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.taskDate?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).sort((a, b) => new Date(a.taskDate || 0) - new Date(b.taskDate || 0));
  }, [tasks, searchQuery]);

  // Change selected date
  const changeDateByDays = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().substring(0, 10));
  };

  const selectedDateObj = new Date(selectedDate);
  const formattedSelectedDateHeader = getFormattedHeaderDate(selectedDateObj);

  // Helper to render editable text input/textarea cell (Auto-expanding multiline)
  const renderCell = (task, field, placeholder = '', style = {}) => {
    const currentDraft = draftEdits[task.id]?.[field];
    const val = currentDraft !== undefined ? currentDraft : (task[field] || '');
    const isUrgent = (draftEdits[task.id]?.planType || task.planType || task.mtnType) === 'Urgent';

    // Auto-adjust height callback ref for initial mount and rerenders
    const textareaRef = (node) => {
      if (node) {
        node.style.height = 'auto';
        node.style.height = `${Math.max(24, node.scrollHeight)}px`;
      }
    };

    return (
      <textarea 
        ref={textareaRef}
        className="table-cell-input"
        rows={1}
        value={val}
        placeholder={placeholder}
        onChange={(e) => {
          handleCellChange(task.id, field, e.target.value);
          textareaRef(e.target);
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.background = 'var(--surface)';
          textareaRef(e.target);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'transparent';
          e.target.style.background = 'transparent';
          handleCellBlur(task, field);
        }}
        style={{
          width: '100%',
          border: '1px solid transparent',
          background: 'transparent',
          padding: '2px 4px',
          minHeight: '24px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'inherit',
          color: isUrgent ? '#dc2626' : 'var(--text)',
          fontWeight: isUrgent ? '700' : 'normal',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          lineHeight: '1.3',
          display: 'block',
          ...style
        }}
      />
    );
  };

  // Helper for Section Auto-Suggest Cell
  const renderSectionCell = (task) => {
    return (
      <SectionCell 
        task={task} 
        draftEdits={draftEdits} 
        handleCellChange={handleCellChange} 
        handleCellBlur={handleCellBlur} 
      />
    );
  };

  return (
    <div className="workspace-container">
      <PageHeader 
        title="Task Management"
        subtitle="Daily shop floor task execution board and schedule planning matrix."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            {tasks.length === 0 && (
              <button className="btn" onClick={handleSeedMockData}>
                Seed Sample Data
              </button>
            )}
          </div>
        }
        id="task-mgmt-header"
      />

      {/* Tabs navigation & Top Controls Bar */}
      <div style={{ 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border)',
        marginBottom: '8px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className={`btn ${activeView === 'daily' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('daily')}
            style={{ borderRadius: '8px 8px 0 0', padding: '8px 18px', fontWeight: '600', fontSize: '13px' }}
            id="tab-daily-view"
          >
            <CalendarDays size={15} style={{ marginRight: '6px' }} />
            Daily Task (งานประจำวัน)
          </button>
          <button 
            className={`btn ${activeView === 'planning' ? 'btn-primary' : ''}`}
            onClick={() => setActiveView('planning')}
            style={{ borderRadius: '8px 8px 0 0', padding: '8px 18px', fontWeight: '600', fontSize: '13px' }}
            id="tab-planning-view"
          >
            <Clock size={15} style={{ marginRight: '6px' }} />
            Planning Matrix (ตารางงาน)
          </button>
        </div>

        {activeView === 'daily' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <button className="btn btn-sm" onClick={() => changeDateByDays(-1)}>
              <ChevronLeft size={16} />
            </button>
            <input 
              type="date" 
              className="form-input font-mono" 
              style={{ width: '150px', padding: '4px 8px' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              id="daily-date-picker"
            />
            <button className="btn btn-sm" onClick={() => changeDateByDays(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* TOP SEARCH BAR - Moved to top above Blue Date Banner as requested */}
      <div className="card controls-bar" style={{ padding: '8px 16px', marginBottom: '8px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text3)' }} />
          <input 
            type="text" 
            placeholder="Search daily tasks, equipment, planning..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '34px', width: '100%' }}
            id="task-mgmt-top-search"
          />
        </div>
        <div className="font-mono text3" style={{ fontSize: '12.5px' }}>
          {activeView === 'daily' ? `Total ${rawDailyTasks.length} tasks scheduled for ${selectedDate}` : `${planningTasks.length} planning rows`}
        </div>
      </div>

      {/* VIEW 1: DAILY TASK VIEW */}
      {activeView === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Banner - Matching Excel Design Blue Header */}
          <div style={{ 
            backgroundColor: '#1d4ed8', 
            color: '#ffffff', 
            textAlign: 'center', 
            padding: '12px 16px', 
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            {formattedSelectedDateHeader}
          </div>

          {/* Planning Tasks pull alert for this date if present */}
          {planningTasksForDate.length > 0 && (
            <div style={{ 
              backgroundColor: '#eff6ff', 
              border: '1px solid #bfdbfe', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              color: '#1e40af', 
              fontSize: '13px' 
            }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>📋 Planning tasks auto-pulled for {selectedDate}:</strong>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {planningTasksForDate.map((pt, idx) => (
                  <li key={idx}>
                    {pt.eeWorkAft && <span><strong>EE:</strong> {pt.eeWorkAft} </span>}
                    {pt.mechWorkAft && <span><strong>MECH:</strong> {pt.mechWorkAft}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading ? (
            <div className="skeleton-row" style={{ height: '200px' }}></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* SECTION 1: RFG BLOCK TABLE */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ 
                  backgroundColor: '#fef08a', 
                  color: '#854d0e', 
                  padding: '8px 16px', 
                  fontWeight: '800', 
                  fontSize: '14px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #fde047'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>RFG</span>
                    <span className="badge font-mono" style={{ backgroundColor: currentRfgStatus === 'STOP' ? '#fca5a5' : currentRfgStatus === 'MTN' ? '#fef08a' : '#dcfce7', color: currentRfgStatus === 'STOP' ? '#991b1b' : currentRfgStatus === 'MTN' ? '#854d0e' : '#166534', border: '1px solid #fde047', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      {currentRfgStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <span className="font-mono" style={{ fontSize: '12px' }}>{existingRfgTasks.length} items</span>
                    <button className="btn btn-sm" style={{ backgroundColor: '#ffffff', color: '#854d0e', border: '1px solid #fde047', fontWeight: '600' }} onClick={() => handleAddNewRow('RFG', 'MTN')}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                  <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fefce8' }}>
                        <th style={{ width: '60px', color: '#854d0e', fontWeight: '700', textAlign: 'center' }}>Mech</th>
                        <th style={{ width: '60px', color: '#854d0e', fontWeight: '700', textAlign: 'center' }}>Elec</th>
                        <th style={{ width: '75px', color: '#854d0e', fontWeight: '700' }}>Plan</th>
                        <th style={{ width: '85px', color: '#854d0e', fontWeight: '700' }}>Safety</th>
                        <th style={{ width: '160px', color: '#854d0e', fontWeight: '700' }}>Section</th>
                        <th style={{ width: '130px', color: '#854d0e', fontWeight: '700' }}>Equipment</th>
                        <th style={{ minWidth: '320px', color: '#854d0e', fontWeight: '700' }}>Task Name / Description</th>
                        <th style={{ minWidth: '220px', color: '#854d0e', fontWeight: '700' }}>Detail</th>
                        <th style={{ width: '100px', color: '#854d0e', fontWeight: '700', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '50px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRfgRows.map((t) => {
                        const planVal = draftEdits[t.id]?.planType || t.planType || t.mtnType || 'Plan';
                        const safetyVal = draftEdits[t.id]?.safety || t.safety || t.refective || 'PPE';
                        const isUrgent = planVal === 'Urgent';

                        return (
                          <tr key={t.id} style={{ color: isUrgent ? '#dc2626' : 'inherit' }}>
                            {/* Column 1: Mech */}
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={!!(draftEdits[t.id]?.mechTechnicians !== undefined ? draftEdits[t.id]?.mechTechnicians : t.mechTechnicians)}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  handleCellChange(t.id, 'mechTechnicians', val);
                                  handleCellBlur(t, 'mechTechnicians', val);
                                }}
                                style={{ transform: 'scale(1.25)', cursor: 'pointer', margin: '4px auto', display: 'block' }}
                              />
                            </td>

                            {/* Column 2: Elec */}
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={!!(draftEdits[t.id]?.elecTechnicians !== undefined ? draftEdits[t.id]?.elecTechnicians : t.elecTechnicians)}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  handleCellChange(t.id, 'elecTechnicians', val);
                                  handleCellBlur(t, 'elecTechnicians', val);
                                }}
                                style={{ transform: 'scale(1.25)', cursor: 'pointer', margin: '4px auto', display: 'block' }}
                              />
                            </td>

                            {/* Column 3: Plan Dropdown */}
                            <td>
                              <select 
                                className="table-cell-select font-mono" 
                                style={{ fontWeight: '700', color: isUrgent ? '#dc2626' : 'inherit' }}
                                value={planVal} 
                                onChange={(e) => {
                                  handleCellChange(t.id, 'planType', e.target.value);
                                  handleCellBlur(t, 'planType', e.target.value);
                                }}
                              >
                                <option value=""></option>
                                <option value="Plan">Plan</option>
                                <option value="Urgent">Urgent</option>
                              </select>
                            </td>

                            {/* Column 4: Safety Dropdown */}
                            <td>
                              <select 
                                className="table-cell-select font-mono" 
                                style={{ color: isUrgent ? '#dc2626' : 'inherit' }}
                                value={safetyVal} 
                                onChange={(e) => {
                                  handleCellChange(t.id, 'safety', e.target.value);
                                  handleCellBlur(t, 'safety', e.target.value);
                                }}
                              >
                                <option value=""></option>
                                <option value="PPE">PPE</option>
                                <option value="LOTO">LOTO</option>
                                <option value="ที่สูง">ที่สูง</option>
                              </select>
                            </td>

                            {/* Column 5: Section Auto-Suggest */}
                            <td>{renderSectionCell(t)}</td>

                            {/* Column 6: Equipment */}
                            <td>{renderCell(t, 'equipment', '', { fontWeight: '600' })}</td>

                            {/* Column 7: Task Name / Description (WIDER) */}
                            <td>{renderCell(t, 'taskName', '', { fontWeight: '600' })}</td>

                            {/* Column 8: Detail (WIDER) */}
                            <td>{renderCell(t, 'detail', '')}</td>

                            {/* Column 9: Status */}
                            <td style={{ textAlign: 'center' }}>
                              <select 
                                className="table-cell-select font-mono" 
                                style={{
                                  backgroundColor: 
                                    (draftEdits[t.id]?.status || t.status) === 'Finished' ? '#dcfce7' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Continue' ? '#fef08a' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Postpone' ? '#fca5a5' : 'transparent',
                                  color: 
                                    (draftEdits[t.id]?.status || t.status) === 'Finished' ? '#166534' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Continue' ? '#854d0e' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Postpone' ? '#991b1b' : 'var(--text)',
                                  fontWeight: '700',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  border: '1px solid transparent',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                                value={draftEdits[t.id]?.status || t.status || ''} 
                                onChange={(e) => {
                                  handleCellChange(t.id, 'status', e.target.value);
                                  handleCellBlur(t, 'status', e.target.value);
                                }}
                              >
                                <option value="" style={{ backgroundColor: '#ffffff', color: 'var(--text)' }}></option>
                                <option value="Finished" style={{ backgroundColor: '#ffffff', color: '#166534' }}>Finished</option>
                                <option value="Continue" style={{ backgroundColor: '#ffffff', color: '#854d0e' }}>Continue</option>
                                <option value="Postpone" style={{ backgroundColor: '#ffffff', color: '#991b1b' }}>Postpone</option>
                              </select>
                            </td>

                            {/* Column 10: Delete Action */}
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <button 
                                className="btn-icon" 
                                style={{ 
                                  color: '#ef4444', 
                                  background: 'transparent', 
                                  border: 'none', 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto'
                                }}
                                onClick={() => handleDeleteRow(t)}
                                title="Delete row"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: MIR BLOCK TABLE */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ 
                  backgroundColor: '#bbf7d0', 
                  color: '#166534', 
                  padding: '8px 16px', 
                  fontWeight: '800', 
                  fontSize: '14px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #86efac'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>MIR</span>
                    <span className="badge font-mono" style={{ backgroundColor: currentMirStatus === 'STOP' ? '#fca5a5' : currentMirStatus?.includes('MTN') ? '#fef08a' : '#dcfce7', color: currentMirStatus === 'STOP' ? '#991b1b' : currentMirStatus?.includes('MTN') ? '#854d0e' : '#166534', border: '1px solid #86efac', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      {currentMirStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <span className="font-mono" style={{ fontSize: '12px' }}>{existingMirTasks.length} items</span>
                    <button className="btn btn-sm" style={{ backgroundColor: '#ffffff', color: '#166534', border: '1px solid #86efac', fontWeight: '600' }} onClick={() => handleAddNewRow('MIR', 'PROD')}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                  <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <th style={{ width: '60px', color: '#166534', fontWeight: '700', textAlign: 'center' }}>Mech</th>
                        <th style={{ width: '60px', color: '#166534', fontWeight: '700', textAlign: 'center' }}>Elec</th>
                        <th style={{ width: '75px', color: '#166534', fontWeight: '700' }}>Plan</th>
                        <th style={{ width: '85px', color: '#166534', fontWeight: '700' }}>Safety</th>
                        <th style={{ width: '160px', color: '#166534', fontWeight: '700' }}>Section</th>
                        <th style={{ width: '130px', color: '#166534', fontWeight: '700' }}>Equipment</th>
                        <th style={{ minWidth: '320px', color: '#166534', fontWeight: '700' }}>Task Name / Description</th>
                        <th style={{ minWidth: '220px', color: '#166534', fontWeight: '700' }}>Detail</th>
                        <th style={{ width: '100px', color: '#166534', fontWeight: '700', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '50px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMirRows.map((t) => {
                        const planVal = draftEdits[t.id]?.planType || t.planType || t.mtnType || 'Plan';
                        const safetyVal = draftEdits[t.id]?.safety || t.safety || t.refective || 'PPE';
                        const isUrgent = planVal === 'Urgent';

                        return (
                          <tr key={t.id} style={{ color: isUrgent ? '#dc2626' : 'inherit' }}>
                            {/* Column 1: Mech */}
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={!!(draftEdits[t.id]?.mechTechnicians !== undefined ? draftEdits[t.id]?.mechTechnicians : t.mechTechnicians)}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  handleCellChange(t.id, 'mechTechnicians', val);
                                  handleCellBlur(t, 'mechTechnicians', val);
                                }}
                                style={{ transform: 'scale(1.25)', cursor: 'pointer', margin: '4px auto', display: 'block' }}
                              />
                            </td>

                            {/* Column 2: Elec */}
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox"
                                checked={!!(draftEdits[t.id]?.elecTechnicians !== undefined ? draftEdits[t.id]?.elecTechnicians : t.elecTechnicians)}
                                onChange={(e) => {
                                  const val = e.target.checked;
                                  handleCellChange(t.id, 'elecTechnicians', val);
                                  handleCellBlur(t, 'elecTechnicians', val);
                                }}
                                style={{ transform: 'scale(1.25)', cursor: 'pointer', margin: '4px auto', display: 'block' }}
                              />
                            </td>

                            {/* Column 3: Plan Dropdown */}
                            <td>
                              <select 
                                className="table-cell-select font-mono" 
                                style={{ fontWeight: '700', color: isUrgent ? '#dc2626' : 'inherit' }}
                                value={planVal} 
                                onChange={(e) => {
                                  handleCellChange(t.id, 'planType', e.target.value);
                                  handleCellBlur(t, 'planType', e.target.value);
                                }}
                              >
                                <option value=""></option>
                                <option value="Plan">Plan</option>
                                <option value="Urgent">Urgent</option>
                              </select>
                            </td>

                            {/* Column 4: Safety Dropdown */}
                            <td>
                              <select 
                                className="table-cell-select font-mono" 
                                style={{ color: isUrgent ? '#dc2626' : 'inherit' }}
                                value={safetyVal} 
                                onChange={(e) => {
                                  handleCellChange(t.id, 'safety', e.target.value);
                                  handleCellBlur(t, 'safety', e.target.value);
                                }}
                              >
                                <option value=""></option>
                                <option value="PPE">PPE</option>
                                <option value="LOTO">LOTO</option>
                                <option value="ที่สูง">ที่สูง</option>
                              </select>
                            </td>

                            {/* Column 5: Section Auto-Suggest */}
                            <td>{renderSectionCell(t)}</td>

                            {/* Column 6: Equipment */}
                            <td>{renderCell(t, 'equipment', '', { fontWeight: '600' })}</td>

                            {/* Column 7: Task Name / Description (WIDER) */}
                            <td>{renderCell(t, 'taskName', '', { fontWeight: '600' })}</td>

                            {/* Column 8: Detail (WIDER) */}
                            <td>{renderCell(t, 'detail', '')}</td>

                            {/* Column 9: Status */}
                            <td style={{ textAlign: 'center' }}>
                              <select 
                                className="table-cell-select font-mono" 
                                style={{
                                  backgroundColor: 
                                    (draftEdits[t.id]?.status || t.status) === 'Finished' ? '#dcfce7' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Continue' ? '#fef08a' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Postpone' ? '#fca5a5' : 'transparent',
                                  color: 
                                    (draftEdits[t.id]?.status || t.status) === 'Finished' ? '#166534' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Continue' ? '#854d0e' : 
                                    (draftEdits[t.id]?.status || t.status) === 'Postpone' ? '#991b1b' : 'var(--text)',
                                  fontWeight: '700',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  border: '1px solid transparent',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                                value={draftEdits[t.id]?.status || t.status || ''} 
                                onChange={(e) => {
                                  handleCellChange(t.id, 'status', e.target.value);
                                  handleCellBlur(t, 'status', e.target.value);
                                }}
                              >
                                <option value="" style={{ backgroundColor: '#ffffff', color: 'var(--text)' }}></option>
                                <option value="Finished" style={{ backgroundColor: '#ffffff', color: '#166534' }}>Finished</option>
                                <option value="Continue" style={{ backgroundColor: '#ffffff', color: '#854d0e' }}>Continue</option>
                                <option value="Postpone" style={{ backgroundColor: '#ffffff', color: '#991b1b' }}>Postpone</option>
                              </select>
                            </td>

                            {/* Column 10: Delete Action */}
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <button 
                                className="btn-icon" 
                                style={{ 
                                  color: '#ef4444', 
                                  background: 'transparent', 
                                  border: 'none', 
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto'
                                }}
                                onClick={() => handleDeleteRow(t)}
                                title="Delete row"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 3: SUBCONTRACTOR BLOCK TABLE */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ 
                  backgroundColor: '#bae6fd', 
                  color: '#0369a1', 
                  padding: '8px 16px', 
                  fontWeight: '800', 
                  fontSize: '14px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #7dd3fc'
                }}>
                  <span>SUBCONTRACTOR</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <span className="font-mono" style={{ fontSize: '12px' }}>{existingSubTasks.length} items</span>
                    <button className="btn btn-sm" style={{ backgroundColor: '#ffffff', color: '#0369a1', border: '1px solid #7dd3fc', fontWeight: '600' }} onClick={() => handleAddNewRow('SUBCONTRACTOR', 'SUBCONTRACTOR')}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                  <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0f9ff' }}>
                        <th style={{ width: '100px', color: '#0369a1', fontWeight: '700' }}>Plant</th>
                        <th style={{ width: '150px', color: '#0369a1', fontWeight: '700' }}>Location</th>
                        <th style={{ width: '150px', color: '#0369a1', fontWeight: '700' }}>Subcontractor Name</th>
                        <th style={{ minWidth: '300px', color: '#0369a1', fontWeight: '700' }}>Task Name</th>
                        <th style={{ width: '120px', color: '#0369a1', fontWeight: '700', textAlign: 'center' }}>Progress (%)</th>
                        <th style={{ width: '150px', color: '#0369a1', fontWeight: '700' }}>PIC</th>
                        <th style={{ width: '50px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySubRows.map((t) => (
                        <tr key={t.id}>
                          {/* Column 1: Plant Dropdown */}
                          <td>
                            <select 
                              className="table-cell-select font-mono" 
                              style={{ fontWeight: '700' }}
                              value={draftEdits[t.id]?.plant || t.plant || ''} 
                              onChange={(e) => {
                                handleCellChange(t.id, 'plant', e.target.value);
                                handleCellBlur(t, 'plant', e.target.value);
                              }}
                            >
                              <option value=""></option>
                              <option value="RFG">RFG</option>
                              <option value="MIR">MIR</option>
                            </select>
                          </td>

                          {/* Column 2: Location */}
                          <td>{renderCell(t, 'location', '')}</td>

                          {/* Column 3: Subcontractor Name */}
                          <td>{renderCell(t, 'subcontractorName', '')}</td>

                          {/* Column 4: Task Name */}
                          <td>{renderCell(t, 'taskName', '')}</td>

                          {/* Column 5: Progress (0-100% color bar) */}
                          <td style={{ textAlign: 'center' }}>
                            {(() => {
                              const currentDraft = draftEdits[t.id]?.progress;
                              const val = currentDraft !== undefined ? currentDraft : (t.progress || '');
                              const parsed = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
                              const p = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
                              
                              return (
                                <input 
                                  className="table-cell-input font-mono"
                                  style={{
                                    width: '100%',
                                    border: '1px solid transparent',
                                    background: p > 0 ? `linear-gradient(to right, #dcfce7 ${p}%, transparent ${p}%)` : 'transparent',
                                    fontWeight: '700',
                                    textAlign: 'center'
                                  }}
                                  value={val}
                                  onChange={(e) => handleCellChange(t.id, 'progress', e.target.value)}
                                  onBlur={(e) => handleCellBlur(t, 'progress', e.target.value)}
                                />
                              );
                            })()}
                          </td>

                          {/* Column 6: PIC */}
                          <td>{renderCell(t, 'pic', '')}</td>

                          {/* Column 7: Delete Action */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <button 
                              className="btn-icon" 
                              style={{ 
                                color: '#ef4444', 
                                background: 'transparent', 
                                border: 'none', 
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto'
                              }}
                              onClick={() => handleDeleteRow(t)}
                              title="Delete row"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PLANNING MATRIX VIEW */}
      {activeView === 'planning' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Planning Matrix Table - Matching Excel Layout 2 */}
          <div className="table-container" style={{ margin: 0, overflowX: 'auto' }}>
            <table className="data-table font-mono" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '100px', textAlign: 'center', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }}>DATE</th>
                  <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#bfdbfe', color: '#1e3a8a', border: '1px solid #93c5fd' }}>LINE SCHEDULE</th>
                  <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#2563eb', color: '#ffffff', border: '1px solid #1d4ed8' }}>EE Work (Electrical)</th>
                  <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#ec4899', color: '#ffffff', border: '1px solid #db2777' }}>MECH Work (Mechanical)</th>
                </tr>
                <tr>
                  <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>RFG</th>
                  <th style={{ width: '90px', textAlign: 'center', backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' }}>MIR</th>
                  <th style={{ width: '140px', backgroundColor: '#93c5fd', color: '#1e3a8a', border: '1px solid #60a5fa' }}>SUPP</th>
                  <th style={{ minWidth: '220px', backgroundColor: '#bfdbfe', color: '#1e40af', border: '1px solid #60a5fa' }}>AFT</th>
                  <th style={{ width: '140px', backgroundColor: '#fbcfe8', color: '#831843', border: '1px solid #f472b6' }}>SUPP</th>
                  <th style={{ minWidth: '220px', backgroundColor: '#fce7f3', color: '#831843', border: '1px solid #f472b6' }}>AFT</th>
                </tr>
              </thead>
              <tbody>
                {planningTasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
                      No planning schedule records found.
                    </td>
                  </tr>
                ) : (
                  planningTasks.map((t) => {
                    const isWeekend = t.taskDate ? (new Date(t.taskDate).getDay() === 0 || new Date(t.taskDate).getDay() === 6) : false;
                    const dateFormatted = formatDate(t.taskDate);
                    
                    return (
                      <tr 
                        key={t.id}
                        style={{ 
                          backgroundColor: isWeekend ? '#fef2f2' : 'transparent'
                        }}
                      >
                        <td style={{ fontWeight: '700', textAlign: 'center', backgroundColor: isWeekend ? '#fee2e2' : '#f8fafc', color: isWeekend ? '#dc2626' : 'var(--text)' }}>
                          {dateFormatted}
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: t.rfgRev === 'STOP' ? '#fca5a5' : t.rfgRev === 'Maintenance' ? '#fef08a' : '#e0f2fe', fontWeight: '600' }}>
                          {renderCell(t, 'rfgRev', 'CSS14', { textAlign: 'center', fontWeight: '600' })}
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: t.mirRev === 'STOP' ? '#fca5a5' : t.mirRev?.includes('MTN') ? '#fef08a' : '#e0f2fe', fontWeight: '600' }}>
                          {renderCell(t, 'mirRev', 'Prod', { textAlign: 'center', fontWeight: '600' })}
                        </td>
                        <td style={{ color: '#2563eb', fontSize: '11.5px' }}>{renderCell(t, 'eeWorkSupp', 'Supp...')}</td>
                        <td style={{ whiteSpace: 'pre-line', fontSize: '11.5px' }}>{renderCell(t, 'eeWorkAft', 'EE work details...')}</td>
                        <td style={{ color: '#db2777', fontSize: '11.5px' }}>{renderCell(t, 'mechWorkSupp', 'Supp...')}</td>
                        <td style={{ whiteSpace: 'pre-line', fontSize: '11.5px' }}>{renderCell(t, 'mechWorkAft', 'MECH work details...')}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
