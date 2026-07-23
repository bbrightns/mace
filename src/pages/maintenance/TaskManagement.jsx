import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar as CalendarIcon, 
  User, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  batchWriteOperations
} from '../../firebase/collections';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate } from '../../utils';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';

// Helper for Thai/English Date Formatter for header
const getFormattedHeaderDate = (dateObj) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
};

export default function TaskManagement() {
  const [activeView, setActiveView] = useState('daily'); // 'daily' | 'planning'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Daily View Date Selector (default to 2026-07-23)
  const [selectedDate, setSelectedDate] = useState('2026-07-23');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Editing Local Changes state { [taskId]: { field: value } }
  const [draftEdits, setDraftEdits] = useState({});

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_tasks', (data) => {
      setTasks(data);
      setLoading(false);
    }, (error) => {
      showToast('Error syncing tasks collection.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  // Find planning row status for selected date if available
  const currentPlanningRow = useMemo(() => {
    return tasks.find(t => t.taskDate === selectedDate && (t.rfgRev || t.mirRev));
  }, [tasks, selectedDate]);

  const currentRfgStatus = currentPlanningRow?.rfgRev || 'MTN';
  const currentMirStatus = currentPlanningRow?.mirRev || 'Mirror';

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
  const handleCellBlur = async (task, field) => {
    const changes = draftEdits[task.id];
    if (!changes || changes[field] === undefined) return;

    const newValue = changes[field];
    try {
      if (task.id.startsWith('temp-')) {
        // Create new document if it's a temp row created inline
        const payload = {
          plantSection: task.plantSection,
          category: task.category,
          taskDate: selectedDate,
          mtnType: field === 'mtnType' ? newValue : (task.mtnType || ''),
          refective: field === 'refective' ? newValue : (task.refective || ''),
          section: field === 'section' ? newValue : (task.section || ''),
          equipment: field === 'equipment' ? newValue : (task.equipment || ''),
          rank: field === 'rank' ? newValue : (task.rank || ''),
          taskName: field === 'taskName' ? newValue : (task.taskName || ''),
          detail: field === 'detail' ? newValue : (task.detail || ''),
          status: field === 'status' ? newValue : (task.status || 'Pending'),
          mechTechnicians: field === 'mechTechnicians' ? newValue : (task.mechTechnicians || ''),
          elecTechnicians: field === 'elecTechnicians' ? newValue : (task.elecTechnicians || ''),
          plant: field === 'plant' ? newValue : (task.plant || 'RFG'),
          location: field === 'location' ? newValue : (task.location || ''),
          pic: field === 'pic' ? newValue : (task.pic || '')
        };
        const newId = await createDocument('mace_tasks', payload);
        // Clear temp draft
        setDraftEdits(prev => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
        showToast('New row saved');
      } else {
        await updateDocument('mace_tasks', task.id, { [field]: newValue });
        showToast('Cell updated');
      }
    } catch (e) {
      showToast('Error saving cell', 'error');
    }
  };

  // Add Row directly to table
  const handleAddNewRow = async (plantSection, category) => {
    const payload = {
      plantSection,
      category,
      taskDate: selectedDate,
      mtnType: plantSection === 'RFG' ? 'Plan' : '',
      refective: '',
      section: '',
      equipment: '',
      rank: 'B',
      taskName: '',
      detail: '',
      status: 'Pending',
      mechTechnicians: '',
      elecTechnicians: '',
      plant: plantSection === 'SUBCONTRACTOR' ? 'RFG' : plantSection,
      location: '',
      pic: ''
    };
    try {
      await createDocument('mace_tasks', payload);
      showToast(`Added new ${plantSection} row`);
    } catch (e) {
      showToast('Failed to add row', 'error');
    }
  };

  const handleDeleteTask = async (id, name) => {
    if (confirm(`Delete task entry?`)) {
      try {
        await deleteDocument('mace_tasks', id);
        showToast('Task deleted successfully');
      } catch (err) {
        showToast('Error deleting task', 'error');
      }
    }
  };

  // Pre-seed mock data matching exact user screenshots
  const handleSeedMockData = async () => {
    const mockData = [
      // RFG Block Tasks for 2026-07-23
      {
        plantSection: 'RFG',
        category: 'MTN',
        mtnType: 'Urgent',
        refective: 'LOTO',
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
        mtnType: 'Plan',
        refective: 'LOTO',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: 'RFG - PM Cross-X transfer เช้า',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: 'RFG - PM Unload table A',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: 'RFG - PM Unload tilt table B',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: 'RFG - PM Vacuum pump No.1,2 Unload tilt table B',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: 'RFG - PM UNLOADING STATION_TURN_TABLE',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: 'RFG - ลองตั้งค่า Armor Block',
        detail: '',
        status: 'Pending',
        mechTechnicians: '',
        elecTechnicians: 'เริงฤทธิ์, จิราวุธ, ธวัชชัย',
        taskDate: '2026-07-23',
        rfgRev: 'MTN'
      },
      // MIR Block Tasks for 2026-07-23
      {
        plantSection: 'MIR',
        category: 'PROD',
        mtnType: '',
        refective: 'Mirror',
        section: '',
        equipment: '',
        rank: '',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
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
        mtnType: '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
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
      },
      {
        taskDate: '2026-06-12',
        rfgRev: 'CSS14',
        mirRev: 'MTN 2mm',
        eeWorkAft: 'ติดตั้งกล้องกันระเบิด ตู้ 1\nจัด store',
        mechWorkAft: 'MIR - PM roller Base,Top',
        taskName: 'ติดตั้งกล้องกันระเบิด & PM roller Base,Top'
      },
      {
        taskDate: '2026-06-13',
        rfgRev: 'STOP',
        mirRev: 'STOP',
        eeWorkAft: '',
        mechWorkAft: '',
        taskName: 'Weekend Standby'
      },
      {
        taskDate: '2026-06-14',
        rfgRev: 'STOP',
        mirRev: 'STOP',
        eeWorkAft: '',
        mechWorkAft: '',
        taskName: 'Weekend Standby'
      },
      {
        taskDate: '2026-06-15',
        rfgRev: 'Maintenance',
        mirRev: 'Prod',
        eeWorkAft: 'จัด store',
        mechWorkAft: 'RFG - PM Process Pump No.1,2,3,4',
        taskName: 'RFG - PM Process Pump'
      },
      {
        taskDate: '2026-06-16',
        rfgRev: 'Maintenance',
        mirRev: 'Prod',
        eeWorkSupp: 'LT Power เก็บงาน TBM',
        eeWorkAft: 'PM RFG\n- หน้าจออุณหภูมิ ถังน้ำ Heater อ่านค่าไม่ตรง\n- ซื้อกล่อง หน้าตู้ใส -> ให้ที่เร็วด้านขนาดให้ก่อน',
        mechWorkAft: '',
        taskName: 'PM RFG Temperature Screen'
      },
      {
        taskDate: '2026-06-17',
        rfgRev: 'TSLX',
        mirRev: 'Prod',
        eeWorkAft: 'MIR - DI Water shortage (confirm check alarm at DI tank1 LOW ระดับต่ำกว่า 4Q) --> ติดตั้งหลอดไฟ alarm เพิ่ม',
        mechWorkAft: '',
        taskName: 'MIR - DI Water shortage alarm'
      },
      {
        taskDate: '2026-06-18',
        rfgRev: 'TSLX',
        mirRev: 'Prod',
        eeWorkAft: 'MIR - ต่อสายปั๊มน้ำ',
        mechWorkAft: '',
        taskName: 'MIR - ต่อสายปั๊มน้ำ'
      },
      {
        taskDate: '2026-06-19',
        rfgRev: 'TSLX',
        mirRev: 'PM ล้างโต๊ะ*',
        eeWorkSupp: 'Siamtemp ล้าง AHU ห้องเก็บสีใหม่',
        eeWorkAft: 'RFG - Check หลอดไฟหมุนของ C7\nMIR - Check ตำแหน่งกล้องที่เสียของ Dahua + วางแผนเปลี่ยน',
        mechWorkAft: 'MIR - PM roller Base,Top',
        taskName: 'RFG & MIR Camera / Light Checks'
      },
      {
        taskDate: '2026-06-20',
        rfgRev: 'TSLX',
        mirRev: 'STOP',
        eeWorkSupp: 'N/A',
        eeWorkAft: 'N/A',
        mechWorkAft: '',
        taskName: 'N/A'
      },
      {
        taskDate: '2026-06-21',
        rfgRev: 'STOP',
        mirRev: 'STOP',
        eeWorkAft: '',
        mechWorkAft: '',
        taskName: 'Weekend Standby'
      },
      {
        taskDate: '2026-06-22',
        rfgRev: 'Chamber',
        mirRev: 'Prod',
        eeWorkAft: 'MIR - Local Equipment [SF-71-500]\nMIR - Mirror Switch Board [SF-71-501]',
        mechWorkAft: 'RFG - เคลียร์พื้นที่สำหรับงานเชื่อม chamber Y\nRFG - เปลี่ยน Power Cylinder ของ load table Y\nRFG - PM load table\nRFG - PT Feed through Y',
        taskName: 'Chamber & Equipment Maintenance'
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

  // Filter tasks for Daily View based on selectedDate
  const rawDailyTasks = tasks.filter(t => t.taskDate === selectedDate && (
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
        mtnType: plantSection === 'RFG' ? 'Plan' : '',
        refective: '',
        section: '',
        equipment: '',
        rank: '',
        taskName: '',
        detail: '',
        status: 'Pending',
        mechTechnicians: '',
        elecTechnicians: '',
        plant: plantSection === 'SUBCONTRACTOR' ? 'RFG' : plantSection,
        location: '',
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

  // Helper to render editable cell
  const renderCell = (task, field, placeholder = '', style = {}) => {
    const currentDraft = draftEdits[task.id]?.[field];
    const val = currentDraft !== undefined ? currentDraft : (task[field] || '');

    return (
      <input 
        type="text"
        className="table-cell-input"
        value={val}
        placeholder={placeholder}
        onChange={(e) => handleCellChange(task.id, field, e.target.value)}
        onBlur={() => handleCellBlur(task, field)}
        style={{
          width: '100%',
          border: '1px solid transparent',
          background: 'transparent',
          padding: '4px 6px',
          borderRadius: '4px',
          fontSize: '12.5px',
          fontFamily: 'inherit',
          color: 'var(--text)',
          outline: 'none',
          ...style
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.background = 'var(--surface)';
        }}
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
        marginBottom: '16px',
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
      <div className="card controls-bar" style={{ padding: '12px 16px', marginBottom: '16px' }}>
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
              
              {/* SECTION 1: RFG BLOCK TABLE (Min 4 rows) */}
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
                    <span className="badge font-mono" style={{ backgroundColor: currentRfgStatus === 'STOP' ? '#fca5a5' : '#fef9c3', color: currentRfgStatus === 'STOP' ? '#991b1b' : '#854d0e', border: '1px solid #fde047', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      Status: {currentRfgStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="font-mono" style={{ fontSize: '12px' }}>{existingRfgTasks.length} items</span>
                    <button className="btn btn-sm" style={{ backgroundColor: '#ffffff', color: '#854d0e', border: '1px solid #fde047', fontWeight: '600' }} onClick={() => handleAddNewRow('RFG', 'MTN')}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr style={{ backgroundColor: '#fefce8' }}>
                        <th style={{ width: '70px', color: '#854d0e', fontWeight: '700' }}>MTN</th>
                        <th style={{ width: '80px', color: '#854d0e', fontWeight: '700' }}>Refective</th>
                        <th style={{ width: '110px', color: '#854d0e', fontWeight: '700' }}>Secton</th>
                        <th style={{ width: '140px', color: '#854d0e', fontWeight: '700' }}>Equipment</th>
                        <th style={{ width: '60px', color: '#854d0e', fontWeight: '700', textAlign: 'center' }}>Rank</th>
                        <th style={{ minWidth: '220px', color: '#854d0e', fontWeight: '700' }}>Task Name / Description</th>
                        <th style={{ minWidth: '200px', color: '#854d0e', fontWeight: '700' }}>Detail</th>
                        <th style={{ width: '90px', color: '#854d0e', fontWeight: '700', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '160px', color: '#854d0e', fontWeight: '700' }}>Mech</th>
                        <th style={{ width: '160px', color: '#854d0e', fontWeight: '700' }}>Elec</th>
                        <th style={{ width: '60px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRfgRows.map((t, idx) => (
                        <tr key={t.id}>
                          <td>{renderCell(t, 'mtnType', 'Plan', { fontWeight: '700', color: t.mtnType === 'Urgent' ? '#dc2626' : 'var(--text)' })}</td>
                          <td>{renderCell(t, 'refective', 'LOTO', { color: t.refective === 'LOTO' ? '#dc2626' : 'var(--text)', fontWeight: '600' })}</td>
                          <td>{renderCell(t, 'section', 'Offline')}</td>
                          <td>{renderCell(t, 'equipment', 'Equipment', { fontWeight: '600' })}</td>
                          <td style={{ textAlign: 'center' }}>{renderCell(t, 'rank', 'B', { textAlign: 'center', fontWeight: '700' })}</td>
                          <td>{renderCell(t, 'taskName', 'Click to add task name...', { fontWeight: '600', color: t.mtnType === 'Urgent' ? '#dc2626' : 'var(--text)' })}</td>
                          <td>{renderCell(t, 'detail', 'Detail...')}</td>
                          <td style={{ textAlign: 'center' }}>
                            <select 
                              className="form-select font-mono" 
                              style={{ padding: '2px 4px', fontSize: '11px', height: '26px' }}
                              value={t.status || 'Pending'} 
                              onChange={(e) => handleCellBlur(t, 'status', e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Finished">Finished</option>
                              <option value="Postpone">Postpone</option>
                              <option value="In Process">In Process</option>
                            </select>
                          </td>
                          <td>{renderCell(t, 'mechTechnicians', 'Mech techs')}</td>
                          <td>{renderCell(t, 'elecTechnicians', 'Elec techs')}</td>
                          <td style={{ textAlign: 'right' }}>
                            {!t.isTemp && (
                              <button className="btn btn-sm btn-danger" style={{ padding: '4px 6px' }} onClick={() => handleDeleteTask(t.id, t.taskName)}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: MIR BLOCK TABLE (Min 4 rows) */}
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
                    <span className="badge font-mono" style={{ backgroundColor: currentMirStatus === 'STOP' ? '#fca5a5' : '#dcfce7', color: currentMirStatus === 'STOP' ? '#991b1b' : '#166534', border: '1px solid #86efac', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      Status: {currentMirStatus}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="font-mono" style={{ fontSize: '12px' }}>{existingMirTasks.length} items</span>
                    <button className="btn btn-sm" style={{ backgroundColor: '#ffffff', color: '#166534', border: '1px solid #86efac', fontWeight: '600' }} onClick={() => handleAddNewRow('MIR', 'PROD')}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr style={{ backgroundColor: '#f0fdf4' }}>
                        <th style={{ width: '70px', color: '#166534', fontWeight: '700' }}>PROD</th>
                        <th style={{ width: '80px', color: '#166534', fontWeight: '700' }}>Refective</th>
                        <th style={{ width: '110px', color: '#166534', fontWeight: '700' }}>Secton</th>
                        <th style={{ width: '140px', color: '#166534', fontWeight: '700' }}>Equipment</th>
                        <th style={{ width: '60px', color: '#166534', fontWeight: '700', textAlign: 'center' }}>Rank</th>
                        <th style={{ minWidth: '220px', color: '#166534', fontWeight: '700' }}>Task Name / Description</th>
                        <th style={{ minWidth: '200px', color: '#166534', fontWeight: '700' }}>Detail</th>
                        <th style={{ width: '90px', color: '#166534', fontWeight: '700', textAlign: 'center' }}>Status</th>
                        <th style={{ width: '160px', color: '#166534', fontWeight: '700' }}>Mech</th>
                        <th style={{ width: '160px', color: '#166534', fontWeight: '700' }}>Elec</th>
                        <th style={{ width: '60px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMirRows.map((t, idx) => (
                        <tr key={t.id}>
                          <td>{renderCell(t, 'mtnType', 'PROD', { fontWeight: '700', color: '#166534' })}</td>
                          <td>{renderCell(t, 'refective', 'Mirror', { color: '#166534', fontWeight: '600' })}</td>
                          <td>{renderCell(t, 'section', 'Section')}</td>
                          <td>{renderCell(t, 'equipment', 'Equipment', { fontWeight: '600' })}</td>
                          <td style={{ textAlign: 'center' }}>{renderCell(t, 'rank', 'B', { textAlign: 'center', fontWeight: '700' })}</td>
                          <td>{renderCell(t, 'taskName', 'Click to add task name...', { fontWeight: '600' })}</td>
                          <td>{renderCell(t, 'detail', 'Detail...')}</td>
                          <td style={{ textAlign: 'center' }}>
                            <select 
                              className="form-select font-mono" 
                              style={{ padding: '2px 4px', fontSize: '11px', height: '26px' }}
                              value={t.status || 'Pending'} 
                              onChange={(e) => handleCellBlur(t, 'status', e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Finished">Finished</option>
                              <option value="Postpone">Postpone</option>
                              <option value="In Process">In Process</option>
                            </select>
                          </td>
                          <td>{renderCell(t, 'mechTechnicians', 'Mech techs')}</td>
                          <td>{renderCell(t, 'elecTechnicians', 'Elec techs')}</td>
                          <td style={{ textAlign: 'right' }}>
                            {!t.isTemp && (
                              <button className="btn btn-sm btn-danger" style={{ padding: '4px 6px' }} onClick={() => handleDeleteTask(t.id, t.taskName)}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 3: SUBCONTRACTOR BLOCK TABLE (Min 2 rows) */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="font-mono" style={{ fontSize: '12px' }}>{existingSubTasks.length} items</span>
                    <button className="btn btn-sm" style={{ backgroundColor: '#ffffff', color: '#0369a1', border: '1px solid #7dd3fc', fontWeight: '600' }} onClick={() => handleAddNewRow('SUBCONTRACTOR', 'SUBCONTRACTOR')}>
                      <Plus size={12} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="table-container" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr style={{ backgroundColor: '#f0f9ff' }}>
                        <th style={{ width: '140px', color: '#0369a1', fontWeight: '700' }}>Plant</th>
                        <th style={{ width: '160px', color: '#0369a1', fontWeight: '700' }}>Location</th>
                        <th style={{ minWidth: '200px', color: '#0369a1', fontWeight: '700' }}>Name</th>
                        <th style={{ minWidth: '250px', color: '#0369a1', fontWeight: '700' }}>Detail</th>
                        <th style={{ width: '160px', color: '#0369a1', fontWeight: '700' }}>PIC</th>
                        <th style={{ width: '60px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySubRows.map((t, idx) => (
                        <tr key={t.id}>
                          <td>{renderCell(t, 'plant', 'RFG', { fontWeight: '700' })}</td>
                          <td>{renderCell(t, 'location', 'Location')}</td>
                          <td>{renderCell(t, 'taskName', 'Subcontractor name...')}</td>
                          <td>{renderCell(t, 'detail', 'Detail...')}</td>
                          <td>{renderCell(t, 'pic', 'PIC assignee')}</td>
                          <td style={{ textAlign: 'right' }}>
                            {!t.isTemp && (
                              <button className="btn btn-sm btn-danger" style={{ padding: '4px 6px' }} onClick={() => handleDeleteTask(t.id, t.taskName)}>
                                <Trash2 size={12} />
                              </button>
                            )}
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
                  <th rowSpan="2" style={{ width: '60px', textAlign: 'right', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }}>Actions</th>
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
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
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
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-sm btn-danger" style={{ padding: '4px 6px' }} onClick={() => handleDeleteTask(t.id, t.taskName)}>
                            <Trash2 size={12} />
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
      )}
    </div>
  );
}
