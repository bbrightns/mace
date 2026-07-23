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
  Filter
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

  // Daily View Date Selector (default to 2026-07-23 to match mockup, or current date)
  const [selectedDate, setSelectedDate] = useState(() => '2026-07-23');

  // Planning View Date Range / Search
  const [planningSearch, setPlanningSearch] = useState('');

  // Daily View Filter
  const [dailySearch, setDailySearch] = useState('');

  // Modal & Form State for Creating/Editing Task
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form Fields
  const [plantSection, setPlantSection] = useState('RFG'); // 'RFG', 'MIR', 'SUBCONTRACTOR'
  const [category, setCategory] = useState('MTN'); // 'MTN', 'PROD', 'SUBCONTRACTOR'
  const [mtnType, setMtnType] = useState('Plan'); // Urgent, Plan, LOTO, etc.
  const [refective, setRefective] = useState(''); // LOTO, Mirror, etc.
  const [section, setSection] = useState(''); // Offline, Small temper, Section name
  const [equipment, setEquipment] = useState(''); // Blower panel, Crane RFG no.10
  const [rank, setRank] = useState('B'); // A, B, C
  const [taskName, setTaskName] = useState(''); // Name / Description
  const [detail, setDetail] = useState(''); // Detail / Action
  const [status, setStatus] = useState('Pending'); // 'Finished', 'Postpone', 'In Process', 'Pending'
  const [mechTechnicians, setMechTechnicians] = useState('');
  const [elecTechnicians, setElecTechnicians] = useState('');
  const [pic, setPic] = useState('');
  const [taskDate, setTaskDate] = useState(() => '2026-07-23');
  const [rfgRev, setRfgRev] = useState('CSS14'); // For Planning Status (MTN, STOP, CSS14, Maintenance, etc.)
  const [mirRev, setMirRev] = useState('Prod'); // For Planning Status (Prod, MTN 2mm, STOP, etc.)
  const [eeWorkSupp, setEeWorkSupp] = useState('');
  const [eeWorkAft, setEeWorkAft] = useState('');
  const [mechWorkSupp, setMechWorkSupp] = useState('');
  const [mechWorkAft, setMechWorkAft] = useState('');
  const [formError, setFormError] = useState('');

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

  const handleOpenAdd = () => {
    setEditingTask(null);
    setPlantSection('RFG');
    setCategory('MTN');
    setMtnType('Plan');
    setRefective('');
    setSection('');
    setEquipment('');
    setRank('B');
    setTaskName('');
    setDetail('');
    setStatus('Pending');
    setMechTechnicians('');
    setElecTechnicians('');
    setPic('');
    setTaskDate(selectedDate || '2026-07-23');
    setRfgRev('CSS14');
    setMirRev('Prod');
    setEeWorkSupp('');
    setEeWorkAft('');
    setMechWorkSupp('');
    setMechWorkAft('');
    setFormError('');
    setIsOpen(true);
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setPlantSection(task.plantSection || task.plant || 'RFG');
    setCategory(task.category || 'MTN');
    setMtnType(task.mtnType || 'Plan');
    setRefective(task.refective || '');
    setSection(task.section || '');
    setEquipment(task.equipment || '');
    setRank(task.rank || 'B');
    setTaskName(task.taskName || task.name || '');
    setDetail(task.detail || '');
    setStatus(task.status || 'Pending');
    setMechTechnicians(task.mechTechnicians || '');
    setElecTechnicians(task.elecTechnicians || '');
    setPic(task.pic || '');
    setTaskDate(toInputDate(task.taskDate) || selectedDate);
    setRfgRev(task.rfgRev || 'CSS14');
    setMirRev(task.mirRev || 'Prod');
    setEeWorkSupp(task.eeWorkSupp || '');
    setEeWorkAft(task.eeWorkAft || '');
    setMechWorkSupp(task.mechWorkSupp || '');
    setMechWorkAft(task.mechWorkAft || '');
    setFormError('');
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!taskName.trim() && !eeWorkAft.trim() && !mechWorkAft.trim()) {
      setFormError('Task description or work details are required.');
      return;
    }

    const payload = {
      plantSection,
      plant: plantSection,
      category,
      mtnType,
      refective: refective.trim(),
      section: section.trim(),
      equipment: equipment.trim(),
      rank,
      taskName: taskName.trim() || eeWorkAft.trim() || mechWorkAft.trim(),
      detail: detail.trim(),
      status,
      mechTechnicians: mechTechnicians.trim(),
      elecTechnicians: elecTechnicians.trim(),
      pic: pic.trim(),
      taskDate,
      rfgRev,
      mirRev,
      eeWorkSupp: eeWorkSupp.trim(),
      eeWorkAft: eeWorkAft.trim(),
      mechWorkSupp: mechWorkSupp.trim(),
      mechWorkAft: mechWorkAft.trim()
    };

    try {
      if (editingTask) {
        await updateDocument('mace_tasks', editingTask.id, payload);
        showToast('Task updated successfully.');
      } else {
        await createDocument('mace_tasks', payload);
        showToast('New task added successfully.');
      }
      setIsOpen(false);
    } catch (err) {
      showToast('Failed to save task.', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (confirm(`Delete task "${name}"?`)) {
      try {
        await deleteDocument('mace_tasks', id);
        showToast('Task deleted successfully.');
      } catch (err) {
        showToast('Error deleting task.', 'error');
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
  const dailyTasks = tasks.filter(t => t.taskDate === selectedDate && (
    !dailySearch || 
    t.taskName?.toLowerCase().includes(dailySearch.toLowerCase()) ||
    t.equipment?.toLowerCase().includes(dailySearch.toLowerCase()) ||
    t.section?.toLowerCase().includes(dailySearch.toLowerCase())
  ));

  // Partition tasks into RFG, MIR, and SUBCONTRACTOR sections
  const dailyRfgTasks = dailyTasks.filter(t => t.plantSection === 'RFG' || (!t.plantSection && (t.taskName?.startsWith('RFG') || t.plant === 'RFG' || t.category === 'MTN')));
  const dailyMirTasks = dailyTasks.filter(t => t.plantSection === 'MIR' || (!t.plantSection && (t.taskName?.startsWith('MIR') || t.plant === 'MIR' || t.category === 'PROD')));
  const dailySubcontractorTasks = dailyTasks.filter(t => t.plantSection === 'SUBCONTRACTOR' || t.category === 'SUBCONTRACTOR');

  // Filter tasks for Planning View
  const planningTasks = tasks.filter(t => {
    const matchesSearch = !planningSearch || 
      t.taskName?.toLowerCase().includes(planningSearch.toLowerCase()) ||
      t.eeWorkAft?.toLowerCase().includes(planningSearch.toLowerCase()) ||
      t.mechWorkAft?.toLowerCase().includes(planningSearch.toLowerCase()) ||
      t.rfgRev?.toLowerCase().includes(planningSearch.toLowerCase()) ||
      t.mirRev?.toLowerCase().includes(planningSearch.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => new Date(a.taskDate || 0) - new Date(b.taskDate || 0));

  // Change selected date
  const changeDateByDays = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().substring(0, 10));
  };

  const selectedDateObj = new Date(selectedDate);
  const formattedSelectedDateHeader = getFormattedHeaderDate(selectedDateObj);

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
            <button className="btn btn-primary" onClick={handleOpenAdd} id="add-task-btn">
              <Plus size={16} />
              <span>New Task Entry</span>
            </button>
          </div>
        }
        id="task-mgmt-header"
      />

      {/* Tabs navigation for Daily View vs Planning View */}
      <div style={{ 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
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

          {/* Controls / Filter Bar */}
          <div className="card controls-bar" style={{ padding: '12px 16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
              <input 
                type="text" 
                placeholder="Search daily tasks, equipment..." 
                value={dailySearch}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', width: '100%' }}
              />
            </div>
            <div className="font-mono text3" style={{ fontSize: '12.5px' }}>
              Total {dailyTasks.length} tasks scheduled for {selectedDate}
            </div>
          </div>

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
                    <span className="badge font-mono" style={{ backgroundColor: currentRfgStatus === 'STOP' ? '#fca5a5' : '#fef9c3', color: currentRfgStatus === 'STOP' ? '#991b1b' : '#854d0e', border: '1px solid #fde047', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      Status: {currentRfgStatus}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '12px' }}>{dailyRfgTasks.length} items</span>
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
                        <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRfgTasks.length === 0 ? (
                        <tr>
                          <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                            No RFG tasks scheduled for this date.
                          </td>
                        </tr>
                      ) : (
                        dailyRfgTasks.map((t) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: '700', color: t.mtnType === 'Urgent' ? '#dc2626' : 'var(--text)' }}>
                              {t.mtnType}
                            </td>
                            <td style={{ color: t.refective === 'LOTO' ? '#dc2626' : 'var(--text)', fontWeight: '600' }}>
                              {t.refective}
                            </td>
                            <td style={{ color: t.section === 'Offline' ? '#dc2626' : 'var(--text)' }}>
                              {t.section}
                            </td>
                            <td style={{ fontWeight: '600' }}>{t.equipment}</td>
                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{t.rank}</td>
                            <td style={{ fontWeight: '600', color: t.mtnType === 'Urgent' ? '#dc2626' : 'var(--text)' }}>
                              {t.taskName}
                            </td>
                            <td style={{ fontSize: '12px' }}>{t.detail}</td>
                            <td style={{ textAlign: 'center' }}>
                              <StatusBadge status={t.status} />
                            </td>
                            <td style={{ fontSize: '12px' }}>{t.mechTechnicians}</td>
                            <td style={{ fontSize: '12px' }}>{t.elecTechnicians}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                <button className="btn btn-sm" onClick={() => handleOpenEdit(t)}>
                                  <Edit2 size={12} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id, t.taskName)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
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
                    <span className="badge font-mono" style={{ backgroundColor: currentMirStatus === 'STOP' ? '#fca5a5' : '#dcfce7', color: currentMirStatus === 'STOP' ? '#991b1b' : '#166534', border: '1px solid #86efac', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      Status: {currentMirStatus}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '12px' }}>{dailyMirTasks.length} items</span>
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
                        <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyMirTasks.length === 0 ? (
                        <tr>
                          <td colSpan="11" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                            No MIR tasks scheduled for this date.
                          </td>
                        </tr>
                      ) : (
                        dailyMirTasks.map((t) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: '700', color: '#166534' }}>{t.mtnType || 'PROD'}</td>
                            <td style={{ color: '#166534', fontWeight: '600' }}>{t.refective || 'Mirror'}</td>
                            <td>{t.section}</td>
                            <td style={{ fontWeight: '600' }}>{t.equipment}</td>
                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{t.rank}</td>
                            <td style={{ fontWeight: '600' }}>{t.taskName}</td>
                            <td style={{ fontSize: '12px' }}>{t.detail}</td>
                            <td style={{ textAlign: 'center' }}>
                              <StatusBadge status={t.status} />
                            </td>
                            <td style={{ fontSize: '12px' }}>{t.mechTechnicians}</td>
                            <td style={{ fontSize: '12px' }}>{t.elecTechnicians}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                <button className="btn btn-sm" onClick={() => handleOpenEdit(t)}>
                                  <Edit2 size={12} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id, t.taskName)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
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
                  <span className="font-mono" style={{ fontSize: '12px' }}>{dailySubcontractorTasks.length} items</span>
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
                        <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySubcontractorTasks.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)' }}>
                            No Subcontractor tasks scheduled for this date.
                          </td>
                        </tr>
                      ) : (
                        dailySubcontractorTasks.map((t) => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: '700' }}>{t.plant || 'RFG'}</td>
                            <td>{t.section || t.location}</td>
                            <td style={{ fontWeight: '600' }}>{t.taskName}</td>
                            <td style={{ fontSize: '12px' }}>{t.detail}</td>
                            <td style={{ fontSize: '12px' }}>{t.pic || t.elecTechnicians || t.mechTechnicians}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                <button className="btn btn-sm" onClick={() => handleOpenEdit(t)}>
                                  <Edit2 size={12} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id, t.taskName)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
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
          
          {/* Controls Bar */}
          <div className="card controls-bar" style={{ padding: '12px 16px' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
              <input 
                type="text" 
                placeholder="Search planning schedule..." 
                value={planningSearch}
                onChange={(e) => setPlanningSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', width: '100%' }}
              />
            </div>
            <div className="font-mono text3" style={{ fontSize: '12.5px' }}>
              Showing {planningTasks.length} planning schedule rows
            </div>
          </div>

          {/* Planning Matrix Table - Matching Excel Layout 2 */}
          <div className="table-container" style={{ margin: 0, overflowX: 'auto' }}>
            <table className="data-table font-mono" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ width: '100px', textAlign: 'center', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }}>DATE</th>
                  <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#bfdbfe', color: '#1e3a8a', border: '1px solid #93c5fd' }}>LINE SCHEDULE</th>
                  <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#2563eb', color: '#ffffff', border: '1px solid #1d4ed8' }}>EE Work (Electrical)</th>
                  <th colSpan="2" style={{ textAlign: 'center', backgroundColor: '#ec4899', color: '#ffffff', border: '1px solid #db2777' }}>MECH Work (Mechanical)</th>
                  <th rowSpan="2" style={{ width: '80px', textAlign: 'right', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }}>Actions</th>
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
                      No planning schedule records found. Click "New Task Entry" to add.
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
                          {t.rfgRev || (t.plantSection === 'RFG' ? 'CSS14' : '')}
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: t.mirRev === 'STOP' ? '#fca5a5' : t.mirRev?.includes('MTN') ? '#fef08a' : '#e0f2fe', fontWeight: '600' }}>
                          {t.mirRev || (t.plantSection === 'MIR' ? 'Prod' : '')}
                        </td>
                        <td style={{ color: '#2563eb', fontSize: '11.5px' }}>{t.eeWorkSupp}</td>
                        <td style={{ whiteSpace: 'pre-line', fontSize: '11.5px' }}>{t.eeWorkAft || t.taskName}</td>
                        <td style={{ color: '#db2777', fontSize: '11.5px' }}>{t.mechWorkSupp}</td>
                        <td style={{ whiteSpace: 'pre-line', fontSize: '11.5px' }}>{t.mechWorkAft || t.detail}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <button className="btn btn-sm" onClick={() => handleOpenEdit(t)}>
                              <Edit2 size={12} />
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id, t.taskName)}>
                              <Trash2 size={12} />
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
      )}

      {/* Task Modal for Adding / Editing */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingTask ? 'Edit Task Entry' : 'New Task Entry'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="form-grid">
          {formError && (
            <div className="form-full" style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: 'var(--red)', fontSize: '12px' }}>
              {formError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Plant Block / Section *</label>
            <select 
              className="form-select" 
              value={plantSection} 
              onChange={(e) => setPlantSection(e.target.value)}
            >
              <option value="RFG">RFG Block</option>
              <option value="MIR">MIR Block</option>
              <option value="SUBCONTRACTOR">SUBCONTRACTOR</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Task Date *</label>
            <input 
              type="date" 
              className="form-input font-mono" 
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">RFG Line Status (Planning)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. CSS14, MTN, STOP, Maintenance" 
              value={rfgRev}
              onChange={(e) => setRfgRev(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">MIR Line Status (Planning)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Prod, MTN 2mm, STOP" 
              value={mirRev}
              onChange={(e) => setMirRev(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">MTN Type / Tag</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Urgent, Plan, PROD" 
              value={mtnType}
              onChange={(e) => setMtnType(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Refective</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. LOTO, Mirror" 
              value={refective}
              onChange={(e) => setRefective(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Section / Sub-location</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Offline, Small temper" 
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Equipment</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Crane RFG no.10, Blower panel" 
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rank</label>
            <select className="form-select" value={rank} onChange={(e) => setRank(e.target.value)}>
              <option value="A">Rank A</option>
              <option value="B">Rank B</option>
              <option value="C">Rank C</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Finished">Finished</option>
              <option value="Postpone">Postpone</option>
              <option value="In Process">In Process</option>
            </select>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Task Name / Main Description *</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. RFG - Check Crane RFG no.10 (Hoist ไม่สามารถ ขึ้น ลง ได้)" 
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Task Detail / Action Log</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. ถอด PCB, ถอด Magnetic ออกมา cleaning หน้า contact" 
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mechanical Techs (Mech)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. วานิช, บุญวัง, จิรายุ" 
              value={mechTechnicians}
              onChange={(e) => setMechTechnicians(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Electrical Techs (Elec)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. เริงฤทธิ์, จิราวุธ, ธวัชชัย" 
              value={elecTechnicians}
              onChange={(e) => setElecTechnicians(e.target.value)}
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Electrical Work Detail (EE Work AFT)</label>
            <textarea 
              className="form-textarea" 
              placeholder="Detail for Planning view EE column" 
              value={eeWorkAft}
              onChange={(e) => setEeWorkAft(e.target.value)}
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Mechanical Work Detail (MECH Work AFT)</label>
            <textarea 
              className="form-textarea" 
              placeholder="Detail for Planning view MECH column" 
              value={mechWorkAft}
              onChange={(e) => setMechWorkAft(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
