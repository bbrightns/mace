import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  FileSpreadsheet, 
  Download, 
  RefreshCw,
  RotateCcw, 
  Building2, 
  Layers, 
  CheckCircle2, 
  Filter,
  Save,
  Server,
  Zap,
  Info, 
  MapPin, 
  Tag,
  History,
  Wrench,
  Calendar,
  ChevronRight,
  UserCheck,
  CheckCircle,
  Activity,
  AlertCircle,
  DollarSign,
  PlusCircle,
  ClipboardList
} from 'lucide-react';
import { 
  subscribeServicesDatabase, 
  saveServicesDatabaseToCloud,
  getServicesDatabaseFromCloud
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';

// 37 Initial Records based on factory master data
const RAW_INITIAL_SERVICES_DATA = [
  {
    id: "service_unit_001",
    supplier: "SiamTemp",
    plant: "MIR",
    itemNo: 1,
    newCode: "MIR-DE-1",
    brand: "Carrier",
    location: "CDU 38AE016 1 ตัว",
    btu: "160,000",
    specModel: "Belt:B-50",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:33.509Z"
  },
  {
    id: "service_unit_002",
    supplier: "SiamTemp",
    plant: "MIR",
    itemNo: 2,
    newCode: "MIR-DE-1",
    brand: "Carrier",
    location: "CDU 38AE050 2 ตัว",
    btu: "548,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:34.017Z"
  },
  {
    id: "service_unit_003",
    supplier: "SiamTemp",
    plant: "MIR",
    itemNo: 3,
    newCode: "MIR-DE-1",
    brand: "Carrier",
    location: "AHU 39G1319 1 ตัว",
    btu: "200,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:34.586Z"
  },
  {
    id: "service_unit_004",
    supplier: "SiamTemp",
    plant: "MIR",
    itemNo: 4,
    newCode: "MIR-DE-1",
    brand: "",
    location: "AHU 120,000-200,000 BTU 1 ตัว",
    btu: "120,000-200,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:35.850Z"
  },
  {
    id: "service_unit_005",
    supplier: "SiamTemp",
    plant: "MIR",
    itemNo: 5,
    newCode: "MIR-DE-1",
    brand: "",
    location: "OAU 39G1319 2 ตัว",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:36.512Z"
  },
  {
    id: "service_unit_006",
    supplier: "SiamTemp",
    plant: "MIR",
    itemNo: 6,
    newCode: "MIR-DE-1",
    brand: "",
    location: "CDU 38LHU1505301",
    btu: "150,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:37.041Z"
  },
  {
    id: "service_unit_009",
    supplier: "Thai-Top-Therm",
    plant: "MIR",
    itemNo: 3,
    newCode: "MIR-CP-1",
    brand: "Linkwell Electric",
    location: "SB04 Control panel no.1",
    btu: "",
    specModel: "EIA10CPNC1A (220V, 7A/7.5A, R134a), 1100W/1300W",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:48.323Z"
  },
  {
    id: "service_unit_010",
    supplier: "Thai-Top-Therm",
    plant: "MIR",
    itemNo: 4,
    newCode: "MIR-CP-2",
    brand: "Linkwell Electric",
    location: "SB04 Control panel no.2",
    btu: "",
    specModel: "EIA10CPNC1A (220V, 7A/7.5A, R134a), 1100W/1300W",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:49.992Z"
  },
  {
    id: "service_unit_011",
    supplier: "Thai-Top-Therm",
    plant: "MIR",
    itemNo: 5,
    newCode: "MIR-CP-3",
    brand: "",
    location: "SB04 Magnetic panel no.1",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:50.712Z"
  },
  {
    id: "service_unit_012",
    supplier: "Thai-Top-Therm",
    plant: "MIR",
    itemNo: 6,
    newCode: "MIR-CP-4",
    brand: "",
    location: "SB04 Magnetic panel no.2",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:51.558Z"
  },
  {
    id: "service_unit_013",
    supplier: "Thai-Top-Therm",
    plant: "MIR",
    itemNo: 7,
    newCode: "MIR-CP-5",
    brand: "Toptherm",
    location: "Cutting Botero",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:52.470Z"
  },
  {
    id: "service_unit_014",
    supplier: "Thai-Top-Therm",
    plant: "MIR",
    itemNo: 8,
    newCode: "MIR-CP-6",
    brand: "STAR AIRE",
    location: "SB03 Interlock Cabinet",
    btu: "1,800",
    specModel: "M-18",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:53.087Z"
  },
  {
    id: "service_unit_007",
    supplier: "Thai-Top-Therm",
    plant: "RFG",
    itemNo: 1,
    newCode: "RFG-CP-1",
    brand: "Linkwell Electric",
    location: "Benteler Washing Machine",
    btu: "",
    specModel: "EIA05CPNC1A (220V, 1.7A, R134a), 500W/550W",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:46.723Z"
  },
  {
    id: "service_unit_008",
    supplier: "Thai-Top-Therm",
    plant: "RFG",
    itemNo: 2,
    newCode: "RFG-CP-2",
    brand: "Linkwell Electric",
    location: "DVT Unload",
    btu: "",
    specModel: "EIA05CPNC1A (220V, 1.7A, R134a), 500W/550W",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:42:47.877Z"
  },
  {
    id: "service_unit_015",
    supplier: "Carrier",
    plant: "RFG",
    itemNo: 1,
    newCode: "RFG-CH-1",
    brand: "Toyo Carrier",
    location: "Chiller 1",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:38.930Z"
  },
  {
    id: "service_unit_016",
    supplier: "Carrier",
    plant: "RFG",
    itemNo: 2,
    newCode: "RFG-CH-2",
    brand: "Toyo Carrier",
    location: "Chiller 2",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:40.111Z"
  },
  {
    id: "service_unit_017",
    supplier: "Carrier",
    plant: "RFG",
    itemNo: 3,
    newCode: "RFG-CH-3",
    brand: "Carrier",
    location: "Chiller 3",
    btu: "",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:40.673Z"
  },
  {
    id: "service_unit_018",
    supplier: "Carrier",
    plant: "RFG",
    itemNo: 4,
    newCode: "RFG-CH-4",
    brand: "Carrier",
    location: "Chiller 4",
    btu: "",
    specModel: "454 kW",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:42.193Z"
  },
  {
    id: "service_unit_019",
    supplier: "Carrier",
    plant: "RFG",
    itemNo: 5,
    newCode: "RFG-CH-5",
    brand: "Carrier",
    location: "Chiller 5",
    btu: "",
    specModel: "454 kW",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:43:43.656Z"
  },
  {
    id: "service_unit_034",
    supplier: "KB Cool",
    plant: "MIR",
    itemNo: 15,
    newCode: "MIR-3",
    brand: "Daikin",
    location: "SB03 Control Cabinet",
    btu: "24,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_035",
    supplier: "KB Cool",
    plant: "MIR",
    itemNo: 16,
    newCode: "MIR-4",
    brand: "Carrier",
    location: "LOGO Control Room",
    btu: "12200",
    specModel: "38TSAA013 / 42TSAA013",
    note: "เสีย ไม่ได้ล้าง",
    noteUpdatedAt: "2026-09-17T03:15:07.277Z",
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_036",
    supplier: "KB Cool",
    plant: "MIR",
    itemNo: 17,
    newCode: "MIR-5",
    brand: "Carrier",
    location: "SB-01 Control Room",
    btu: "25,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_037",
    supplier: "KB Cool",
    plant: "MIR",
    itemNo: 18,
    newCode: "MIR-6",
    brand: "Daikin",
    location: "SB-02 Control Room",
    btu: "24,000",
    specModel: "",
    note: "ไม่เย็น (รั่ว)",
    noteUpdatedAt: "2026-09-16T16:00:00.000Z",
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_020",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 1,
    newCode: "RFG-1",
    brand: "Carrier",
    location: "P/S Room Entry/ตั้งพื้น",
    btu: "60,000",
    specModel: "40QBY060X-10FW",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:07.422Z"
  },
  {
    id: "service_unit_021",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 2,
    newCode: "RFG-2",
    brand: "",
    location: "O/P Room เล็ก",
    btu: "12,500",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:08.100Z"
  },
  {
    id: "service_unit_022",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 3,
    newCode: "RFG-3",
    brand: "Carrier",
    location: "P/S Room",
    btu: "25,419",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_023",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 4,
    newCode: "RFG-4",
    brand: "Carrier",
    location: "P/S Room หน้าตู้ Auxiliary",
    btu: "25,419",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_024",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 5,
    newCode: "RFG-5",
    brand: "Carrier",
    location: "P/S Room ตัวกลางห้องตั้งพื้น",
    btu: "60,000",
    specModel: "40QBY060X-10FW",
    note: "น้ำยารั่ว",
    noteUpdatedAt: "2026-09-16T16:00:00.000Z",
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:13.621Z"
  },
  {
    id: "service_unit_025",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 6,
    newCode: "RFG-6",
    brand: "Carrier",
    location: "P/S Room ตั้งพื้น ติดประตู",
    btu: "100,000",
    specModel: "ติดตั้ง 2025",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:14.218Z"
  },
  {
    id: "service_unit_026",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 7,
    newCode: "RFG-7",
    brand: "Carrier",
    location: "O/P Room ใหญ่",
    btu: "36,100",
    specModel: "42TGF0361CP",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:14.858Z"
  },
  {
    id: "service_unit_027",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 8,
    newCode: "RFG-8",
    brand: "Carrier",
    location: "P/S Room unload ติดประตู",
    btu: "24,918",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_028",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 9,
    newCode: "RFG-9",
    brand: "Carrier",
    location: "P/S Room unload ติดกำแพง office",
    btu: "100,000",
    specModel: "ติดตั้ง 2024",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:29.779Z"
  },
  {
    id: "service_unit_029",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 10,
    newCode: "RFG-10",
    brand: "Carrier",
    location: "Dark room",
    btu: "25,419",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_030",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 11,
    newCode: "RFG-11",
    brand: "Carrier",
    location: "Optoplex No.1",
    btu: "24,918",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_031",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 12,
    newCode: "RFG-12",
    brand: "Carrier",
    location: "Optoplex No.2",
    btu: "24,918",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_032",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 13,
    newCode: "RFG-13",
    brand: "Daikin",
    location: "Small Temper ซ้าย",
    btu: "13,000",
    specModel: "",
    note: "คอมเสีย",
    noteUpdatedAt: "2026-09-16T16:00:00.000Z",
    isCleaned: false,
    cleanedAt: null
  },
  {
    id: "service_unit_033",
    supplier: "KB Cool",
    plant: "RFG",
    itemNo: 14,
    newCode: "RFG-14",
    brand: "Daikin",
    location: "Small Temper ขวา",
    btu: "13,000",
    specModel: "",
    note: "",
    noteUpdatedAt: null,
    isCleaned: true,
    cleanedAt: "2026-09-16T09:39:33.951Z"
  }
];

export const INITIAL_SERVICES_DATA = RAW_INITIAL_SERVICES_DATA.map((item, idx) => ({
  id: item.id || `service_unit_${String(idx + 1).padStart(3, '0')}`,
  isCleaned: Boolean(item.isCleaned),
  cleanedAt: item.cleanedAt || null,
  note: item.note || '',
  noteUpdatedAt: item.noteUpdatedAt || null,
  history: item.history || [],
  ...item
}));

// Helper to format ISO timestamp into readable Date & Time (Thai/English)
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
}

// Helper to format Date string (YYYY-MM-DD or ISO) into readable Thai date (e.g. 17 ก.ย. 2026)
export function formatDateThai(dateStr) {
  if (!dateStr) return '—';
  try {
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${day} ${thMonths[monthIdx] || parts[1]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return `${day} ${thMonths[d.getMonth()]} ${d.getFullYear()}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

// Helper to retrieve and sort a unit's breakdown and repair history logs
export function getUnitHistory(unit) {
  if (!unit) return [];
  if (Array.isArray(unit.history) && unit.history.length > 0) {
    return [...unit.history].sort((a, b) => {
      const dateA = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '') || '';
      const dateB = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '') || '';
      return dateB.localeCompare(dateA);
    });
  }
  // Synthesize initial entry if unit has legacy note so zero data is lost
  if (unit.note && unit.note.trim()) {
    const legacyDate = unit.noteUpdatedAt ? unit.noteUpdatedAt.split('T')[0] : '2026-09-16';
    return [{
      id: `legacy_${unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}`}`,
      date: legacyDate,
      type: 'breakdown',
      title: unit.note.trim(),
      details: 'บันทึกประวัติเริ่มต้นจากฐานข้อมูลหมายเหตุเดิม',
      status: 'pending',
      technician: unit.supplier || 'ผู้รับเหมา',
      cost: '',
      createdAt: unit.noteUpdatedAt || '2026-09-16T09:00:00.000Z'
    }];
  }
  return [];
}

// Helper to determine equipment condition summary from its history logs
export function getUnitStatusInfo(unit) {
  const history = getUnitHistory(unit);
  if (history.length === 0) {
    return {
      status: 'normal',
      label: 'ปกติ',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: '#a7f3d0',
      activeCount: 0,
      totalCount: 0,
      latestIssue: null,
      latestEntry: null
    };
  }

  // Find active pending or monitoring issues
  const pendingIssues = history.filter(h => h.status === 'pending' || h.status === 'monitoring');
  if (pendingIssues.length > 0) {
    const latest = pendingIssues[0];
    const isMonitoring = latest.status === 'monitoring';
    return {
      status: isMonitoring ? 'monitoring' : 'breakdown',
      label: isMonitoring ? 'เฝ้าระวัง' : 'เสีย/รอดำเนินการ',
      color: isMonitoring ? '#d97706' : '#dc2626',
      bg: isMonitoring ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: isMonitoring ? '#fde68a' : '#fca5a5',
      activeCount: pendingIssues.length,
      totalCount: history.length,
      latestIssue: latest.title,
      latestEntry: latest
    };
  }

  return {
    status: 'resolved',
    label: 'ซ่อมแล้ว/ปกติ',
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: '#a7f3d0',
    activeCount: 0,
    totalCount: history.length,
    latestIssue: null,
    latestEntry: history[0]
  };
}

// Visual color badges for Suppliers matching the original spreadsheet colors
const SUPPLIER_THEMES = {
  'SiamTemp': {
    badgeBg: 'rgba(236, 72, 153, 0.12)',
    badgeColor: '#db2777',
    borderColor: '#f472b6',
    softBg: 'rgba(236, 72, 153, 0.04)'
  },
  'Thai-Top-Therm': {
    badgeBg: 'rgba(99, 102, 241, 0.12)',
    badgeColor: '#4f46e5',
    borderColor: '#818cf8',
    softBg: 'rgba(99, 102, 241, 0.04)'
  },
  'Carrier': {
    badgeBg: 'rgba(249, 115, 22, 0.12)',
    badgeColor: '#ea580c',
    borderColor: '#fb923c',
    softBg: 'rgba(249, 115, 22, 0.04)'
  },
  'KB Cool': {
    badgeBg: 'rgba(6, 182, 212, 0.12)',
    badgeColor: '#0891b2',
    borderColor: '#22d3ee',
    softBg: 'rgba(6, 182, 212, 0.04)'
  }
};

export default function ServicesDatabase() {
  const { showToast } = useToast();

  // Load from local storage cache first for instant UI response
  const [units, setUnits] = useState(() => {
    try {
      const cached = localStorage.getItem('mace_services_database_cache');
      return cached ? JSON.parse(cached) : INITIAL_SERVICES_DATA;
    } catch (e) {
      return INITIAL_SERVICES_DATA;
    }
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterPlant, setFilterPlant] = useState('all');
  const [filterCleaned, setFilterCleaned] = useState('all'); // 'all', 'cleaned', 'pending'
  const [filterIssueOnly, setFilterIssueOnly] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState('cards'); // 'cards' or 'table'

  // Inline editing state for "หมายเหตุ"
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineNoteValue, setInlineNoteValue] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Breakdown & Repair History Drawer State (Desktop Slide-Drawer / Mobile Bottom-Sheet)
  const [historyDrawerUnit, setHistoryDrawerUnit] = useState(null);
  const [isHistoryFormOpen, setIsHistoryFormOpen] = useState(false);
  const [editingHistoryEntry, setEditingHistoryEntry] = useState(null);

  // History Form Inputs
  const [histDate, setHistDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [histType, setHistType] = useState('breakdown'); // breakdown, repair, maintenance, inspection
  const [histTitle, setHistTitle] = useState('');
  const [histDetails, setHistDetails] = useState('');
  const [histStatus, setHistStatus] = useState('pending'); // pending, monitoring, resolved
  const [histTechnician, setHistTechnician] = useState('');
  const [histCost, setHistCost] = useState('');
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // Full Item Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formSupplier, setFormSupplier] = useState('KB Cool');
  const [formPlant, setFormPlant] = useState('RFG');
  const [formItemNo, setFormItemNo] = useState('');
  const [formNewCode, setFormNewCode] = useState('');
  const [formBrand, setFormBrand] = useState('Carrier');
  const [formLocation, setFormLocation] = useState('');
  const [formBtu, setFormBtu] = useState('');
  const [formSpecModel, setFormSpecModel] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formIsCleaned, setFormIsCleaned] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });

  // Sync with Cloud Firestore (mace_audits/services_database_master)
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeServicesDatabase(
      (cloudItems) => {
        if (cloudItems && Array.isArray(cloudItems) && cloudItems.length > 0) {
          const sorted = [...cloudItems].sort((a, b) => {
            const supplierOrder = ['SiamTemp', 'Thai-Top-Therm', 'Carrier', 'KB Cool'];
            const sDiff = supplierOrder.indexOf(a.supplier) - supplierOrder.indexOf(b.supplier);
            if (sDiff !== 0) return sDiff;
            const pDiff = (a.plant || '').localeCompare(b.plant || '');
            if (pDiff !== 0) return pDiff;
            return (Number(a.itemNo) || 0) - (Number(b.itemNo) || 0);
          });
          setUnits(sorted);
          try {
            localStorage.setItem('mace_services_database_cache', JSON.stringify(sorted));
          } catch (e) {}
        } else {
          // If cloud document is temporarily not loaded, fallback to local cache
          try {
            const cached = localStorage.getItem('mace_services_database_cache');
            if (cached) {
              const localParsed = JSON.parse(cached);
              if (Array.isArray(localParsed) && localParsed.length > 0) {
                setUnits(localParsed);
              }
            }
          } catch (e) {}
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Cloud sync fallback to local cache:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Manual re-sync from Cloud Firestore
  const handleRefreshFromCloud = async () => {
    setIsRefreshing(true);
    try {
      const cloudData = await getServicesDatabaseFromCloud();
      if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
        setUnits(cloudData);
        try {
          localStorage.setItem('mace_services_database_cache', JSON.stringify(cloudData));
        } catch (e) {}
        showToast('ซิงค์ข้อมูลล่าสุดจาก Cloud สำเร็จแล้ว', 'success');
      } else {
        showToast('ข้อมูลบน Cloud พร้อมใช้งานแล้ว', 'info');
      }
    } catch (err) {
      console.error('Refresh from cloud failed:', err);
      showToast('เชื่อมต่อ Cloud ไม่สำเร็จ', 'warning');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset / Reseed master data from default 37 units (Factory Reset)
  const handleResetMasterData = async () => {
    if (!window.confirm('⚠️ คำเตือน: คุณต้องการรีเซ็ตข้อมูลทั้งหมด 37 รายการกลับเป็นค่าเริ่มต้นโรงงานใช่หรือไม่?\n\n(หากกดตกลง ข้อมูลจะถูกบันทึกลง Cloud ใหม่)')) {
      return;
    }
    try {
      await saveServicesDatabaseToCloud(INITIAL_SERVICES_DATA);
      setUnits(INITIAL_SERVICES_DATA);
      localStorage.setItem('mace_services_database_cache', JSON.stringify(INITIAL_SERVICES_DATA));
      showToast('รีเซ็ตข้อมูลเริ่มต้น 37 รายการเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Failed to reset master data:', err);
      showToast('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล', 'error');
    }
  };

  // Derive live active unit being inspected in the history drawer
  const activeUnitInDrawer = useMemo(() => {
    if (!historyDrawerUnit) return null;
    return units.find(u => 
      (u.id && u.id === historyDrawerUnit.id) || 
      (u.supplier === historyDrawerUnit.supplier && u.plant === historyDrawerUnit.plant && Number(u.itemNo) === Number(historyDrawerUnit.itemNo))
    ) || historyDrawerUnit;
  }, [units, historyDrawerUnit]);

  // Open history drawer for a unit
  const handleOpenHistoryDrawer = (unit) => {
    setHistoryDrawerUnit(unit);
    setIsHistoryFormOpen(false);
    setEditingHistoryEntry(null);
  };

  // Close history drawer
  const handleCloseHistoryDrawer = () => {
    setHistoryDrawerUnit(null);
    setIsHistoryFormOpen(false);
    setEditingHistoryEntry(null);
  };

  // Toggle or open Add History Entry form
  const handleOpenAddHistory = () => {
    setEditingHistoryEntry(null);
    setHistDate(new Date().toISOString().split('T')[0]);
    setHistType('breakdown');
    setHistTitle('');
    setHistDetails('');
    setHistStatus('pending');
    setHistTechnician(activeUnitInDrawer?.supplier || 'KB Cool');
    setHistCost('');
    setIsHistoryFormOpen(true);
  };

  // Open Edit History Entry form
  const handleOpenEditHistory = (entry) => {
    setEditingHistoryEntry(entry);
    setHistDate(entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]));
    setHistType(entry.type || 'breakdown');
    setHistTitle(entry.title || '');
    setHistDetails(entry.details || '');
    setHistStatus(entry.status || 'pending');
    setHistTechnician(entry.technician || '');
    setHistCost(entry.cost || '');
    setIsHistoryFormOpen(true);
  };

  // Save history entry (Add or Update) and sync to Cloud Firestore
  const handleSaveHistoryEntry = async (e) => {
    if (e) e.preventDefault();
    if (!activeUnitInDrawer) return;
    if (!histTitle.trim()) {
      showToast('กรุณาระบุหัวข้อหรืออาการเสีย', 'warning');
      return;
    }

    setIsSavingHistory(true);
    const existingHistory = getUnitHistory(activeUnitInDrawer);
    const nowIso = new Date().toISOString();

    const entryToSave = {
      id: editingHistoryEntry ? editingHistoryEntry.id : `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: histDate || new Date().toISOString().split('T')[0],
      type: histType,
      title: histTitle.trim(),
      details: histDetails.trim(),
      status: histStatus,
      technician: histTechnician.trim(),
      cost: histCost.trim(),
      createdAt: editingHistoryEntry?.createdAt || nowIso,
      updatedAt: nowIso
    };

    let updatedHistory;
    if (editingHistoryEntry) {
      updatedHistory = existingHistory.map(item => item.id === editingHistoryEntry.id ? entryToSave : item);
    } else {
      updatedHistory = [entryToSave, ...existingHistory];
    }

    // Sort updated history by date descending
    updatedHistory.sort((a, b) => {
      const dateA = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '') || '';
      const dateB = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '') || '';
      return dateB.localeCompare(dateA);
    });

    // Determine synced note and noteUpdatedAt for backward-compatibility with search and KPI counts
    const activeIssues = updatedHistory.filter(h => h.status === 'pending' || h.status === 'monitoring');
    let syncedNote = '';
    let syncedNoteUpdatedAt = null;

    if (activeIssues.length > 0) {
      syncedNote = activeIssues[0].title;
      syncedNoteUpdatedAt = activeIssues[0].date ? `${activeIssues[0].date}T12:00:00.000Z` : nowIso;
    } else if (updatedHistory.length > 0) {
      syncedNote = '';
      syncedNoteUpdatedAt = updatedHistory[0].date ? `${updatedHistory[0].date}T12:00:00.000Z` : nowIso;
    }

    const nextUnits = units.map(u => {
      const matchById = activeUnitInDrawer.id && u.id === activeUnitInDrawer.id;
      const matchByCompound = u.supplier === activeUnitInDrawer.supplier && u.plant === activeUnitInDrawer.plant && Number(u.itemNo) === Number(activeUnitInDrawer.itemNo);
      if (matchById || matchByCompound) {
        return {
          ...u,
          history: updatedHistory,
          note: syncedNote,
          noteUpdatedAt: syncedNoteUpdatedAt
        };
      }
      return u;
    });

    setUnits(nextUnits);
    try {
      localStorage.setItem('mace_services_database_cache', JSON.stringify(nextUnits));
    } catch (err) {}

    try {
      await saveServicesDatabaseToCloud(nextUnits);
      showToast(editingHistoryEntry ? 'แก้ไขประวัติการเสีย/ซ่อมเรียบร้อย' : 'บันทึกประวัติการเสีย/ซ่อมใหม่สำเร็จ', 'success');
      setIsHistoryFormOpen(false);
      setEditingHistoryEntry(null);
    } catch (err) {
      console.error('Failed to sync history to cloud:', err);
      showToast('บันทึกลงเครื่องแล้ว (เชื่อมต่อ Cloud ขัดข้อง)', 'warning');
      setIsHistoryFormOpen(false);
      setEditingHistoryEntry(null);
    } finally {
      setIsSavingHistory(false);
    }
  };

  // Delete history entry
  const handleDeleteHistoryEntry = async (entryId) => {
    if (!activeUnitInDrawer) return;
    if (!window.confirm('คุณต้องการลบรายการประวัตินี้ใช่หรือไม่?')) return;

    const existingHistory = getUnitHistory(activeUnitInDrawer);
    const updatedHistory = existingHistory.filter(h => h.id !== entryId);
    const nowIso = new Date().toISOString();

    const activeIssues = updatedHistory.filter(h => h.status === 'pending' || h.status === 'monitoring');
    let syncedNote = '';
    let syncedNoteUpdatedAt = null;

    if (activeIssues.length > 0) {
      syncedNote = activeIssues[0].title;
      syncedNoteUpdatedAt = activeIssues[0].date ? `${activeIssues[0].date}T12:00:00.000Z` : nowIso;
    } else if (updatedHistory.length > 0) {
      syncedNote = '';
      syncedNoteUpdatedAt = updatedHistory[0].date ? `${updatedHistory[0].date}T12:00:00.000Z` : nowIso;
    }

    const nextUnits = units.map(u => {
      const matchById = activeUnitInDrawer.id && u.id === activeUnitInDrawer.id;
      const matchByCompound = u.supplier === activeUnitInDrawer.supplier && u.plant === activeUnitInDrawer.plant && Number(u.itemNo) === Number(activeUnitInDrawer.itemNo);
      if (matchById || matchByCompound) {
        return {
          ...u,
          history: updatedHistory,
          note: syncedNote,
          noteUpdatedAt: syncedNoteUpdatedAt
        };
      }
      return u;
    });

    setUnits(nextUnits);
    try {
      localStorage.setItem('mace_services_database_cache', JSON.stringify(nextUnits));
    } catch (err) {}

    try {
      await saveServicesDatabaseToCloud(nextUnits);
      showToast('ลบรายการประวัติเรียบร้อยแล้ว', 'info');
    } catch (err) {
      console.error('Failed to delete history on cloud:', err);
      showToast('ลบออกจากเครื่องแล้ว (เชื่อมต่อ Cloud ขัดข้อง)', 'warning');
    }
  };

  // Start inline editing for a note
  const handleStartInlineEdit = (unit) => {
    setInlineEditingId(unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}`);
    setInlineNoteValue(unit.note || '');
  };

  // Cancel inline editing
  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineNoteValue('');
  };

  // Save inline note directly to Cloud Firestore
  const handleSaveInlineNote = async (unit) => {
    setIsSavingInline(true);
    const newNote = inlineNoteValue.trim();
    const nowIso = new Date().toISOString();

    // Optimistically update local state immediately
    const updatedUnits = units.map(u => {
      if ((u.id && u.id === unit.id) || (u.supplier === unit.supplier && u.plant === unit.plant && u.itemNo === unit.itemNo)) {
        return {
          ...u,
          note: newNote,
          noteUpdatedAt: newNote ? nowIso : null
        };
      }
      return u;
    });
    setUnits(updatedUnits);
    try {
      localStorage.setItem('mace_services_database_cache', JSON.stringify(updatedUnits));
    } catch (e) {}

    // Save directly to Cloud Firestore
    try {
      await saveServicesDatabaseToCloud(updatedUnits);
      showToast('อัปเดตหมายเหตุเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Error saving inline note to cloud:', err);
      showToast('บันทึกลงเครื่องแล้ว (เชื่อมต่อ Cloud ขัดข้อง)', 'warning');
    } finally {
      setIsSavingInline(false);
      setInlineEditingId(null);
      setInlineNoteValue('');
    }
  };

  // Toggle Cleaned Checkbox directly from table row & sync with Cloud Firestore
  const handleToggleCleaned = async (unit) => {
    const nextVal = !unit.isCleaned;
    const nowIso = new Date().toISOString();
    const nextCleanedAt = nextVal ? nowIso : null;

    // Optimistic local state update
    const updatedUnits = units.map(u => {
      if ((u.id && u.id === unit.id) || (u.supplier === unit.supplier && u.plant === unit.plant && u.itemNo === unit.itemNo)) {
        return {
          ...u,
          isCleaned: nextVal,
          cleanedAt: nextCleanedAt
        };
      }
      return u;
    });
    setUnits(updatedUnits);
    try {
      localStorage.setItem('mace_services_database_cache', JSON.stringify(updatedUnits));
    } catch (e) {}

    // Save directly to Cloud Firestore
    try {
      await saveServicesDatabaseToCloud(updatedUnits);
      showToast(nextVal ? `✓ บันทึกติ๊กล้างแอร์แล้ว: ${unit.newCode || unit.location}` : `ยกเลิกการติ๊กล้างแอร์: ${unit.newCode || unit.location}`, 'success');
    } catch (err) {
      console.error('Failed to persist tick to cloud:', err);
      showToast('บันทึกลงเครื่องแล้ว (เชื่อมต่อ Cloud ขัดข้อง)', 'warning');
    }
  };

  // Open modal to add new unit
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormSupplier('KB Cool');
    setFormPlant('RFG');
    setFormItemNo(units.length + 1);
    setFormNewCode('');
    setFormBrand('Carrier');
    setFormLocation('');
    setFormBtu('');
    setFormSpecModel('');
    setFormNote('');
    setFormIsCleaned(false);
    setIsModalOpen(true);
  };

  // Open modal to edit existing unit
  const handleOpenEdit = (unit) => {
    setEditingItem(unit);
    setFormSupplier(unit.supplier || 'KB Cool');
    setFormPlant(unit.plant || 'RFG');
    setFormItemNo(unit.itemNo || '');
    setFormNewCode(unit.newCode || '');
    setFormBrand(unit.brand || '');
    setFormLocation(unit.location || '');
    setFormBtu(unit.btu || '');
    setFormSpecModel(unit.specModel || '');
    setFormNote(unit.note || '');
    setFormIsCleaned(Boolean(unit.isCleaned));
    setIsModalOpen(true);
  };

  // Submit Modal Form & sync to Cloud Firestore
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      id: editingItem?.id || `service_unit_${Date.now()}`,
      supplier: formSupplier,
      plant: formPlant,
      itemNo: Number(formItemNo) || formItemNo,
      newCode: formNewCode.trim(),
      brand: formBrand.trim(),
      location: formLocation.trim(),
      btu: formBtu.trim(),
      specModel: formSpecModel.trim(),
      note: formNote.trim(),
      noteUpdatedAt: formNote.trim() ? (editingItem?.note !== formNote.trim() ? new Date().toISOString() : editingItem?.noteUpdatedAt || new Date().toISOString()) : null,
      history: editingItem?.history || [],
      isCleaned: formIsCleaned,
      cleanedAt: formIsCleaned ? (editingItem?.isCleaned ? editingItem?.cleanedAt || new Date().toISOString() : new Date().toISOString()) : null
    };

    let nextUnits;
    if (editingItem) {
      nextUnits = units.map(u => {
        const matchById = editingItem.id && u.id === editingItem.id;
        const matchByCompound = u.supplier === editingItem.supplier && u.plant === editingItem.plant && Number(u.itemNo) === Number(editingItem.itemNo);
        if (matchById || matchByCompound) {
          return { ...u, ...payload };
        }
        return u;
      });
    } else {
      nextUnits = [...units, payload];
    }

    setUnits(nextUnits);
    try {
      localStorage.setItem('mace_services_database_cache', JSON.stringify(nextUnits));
    } catch (e) {}

    try {
      await saveServicesDatabaseToCloud(nextUnits);
      showToast(editingItem ? 'แก้ไขข้อมูลอุปกรณ์เรียบร้อยแล้ว' : 'เพิ่มอุปกรณ์ใหม่เข้าสู่ Services Database สำเร็จ', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save service unit to cloud:', err);
      showToast('บันทึกลงเครื่องแล้ว (เชื่อมต่อ Cloud ขัดข้อง)', 'warning');
      setIsModalOpen(false);
    }
  };

  // Handle Delete Unit & sync to Cloud Firestore
  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    const targetId = deleteModal.item.id;
    const nextUnits = units.filter(u => (u.id ? u.id !== targetId : u !== deleteModal.item));
    setUnits(nextUnits);
    try {
      localStorage.setItem('mace_services_database_cache', JSON.stringify(nextUnits));
    } catch (e) {}

    try {
      await saveServicesDatabaseToCloud(nextUnits);
      showToast('ลบรายการออกจากฐานข้อมูลเรียบร้อยแล้ว', 'info');
    } catch (err) {
      console.error('Error deleting unit from cloud:', err);
      showToast('ลบออกจากเครื่องแล้ว (เชื่อมต่อ Cloud ขัดข้อง)', 'warning');
    } finally {
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    if (!units.length) return;
    const headers = ['Supplier', 'Plant', 'No.', 'ชื่อใหม่ (New Code)', 'Brand', 'Location', 'BTU', 'spec/model', 'สถานะล้างแอร์ (Cleaned)', 'วันที่ล้าง (Cleaned Date)', 'หมายเหตุ (Remarks)', 'แก้ไขล่าสุด (Last Updated)'];
    const rows = filteredUnits.map(u => [
      `"${u.supplier || ''}"`,
      `"${u.plant || ''}"`,
      `"${u.itemNo || ''}"`,
      `"${u.newCode || ''}"`,
      `"${u.brand || ''}"`,
      `"${(u.location || '').replace(/"/g, '""')}"`,
      `"${u.btu || ''}"`,
      `"${(u.specModel || '').replace(/"/g, '""')}"`,
      `"${u.isCleaned ? 'ล้างแล้ว' : 'ยังไม่ได้ล้าง'}"`,
      `"${formatDateTime(u.cleanedAt)}"`,
      `"${(u.note || '').replace(/"/g, '""')}"`,
      `"${formatDateTime(u.noteUpdatedAt)}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MACE_Services_Database_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว', 'success');
  };

  // Filtered & Searched Data
  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = (u.newCode || '').toLowerCase().includes(q);
        const matchLoc = (u.location || '').toLowerCase().includes(q);
        const matchBrand = (u.brand || '').toLowerCase().includes(q);
        const matchSpec = (u.specModel || '').toLowerCase().includes(q);
        const matchBtu = (u.btu || '').toLowerCase().includes(q);
        const matchSupplier = (u.supplier || '').toLowerCase().includes(q);
        const matchNote = (u.note || '').toLowerCase().includes(q);
        const sInfo = getUnitStatusInfo(u);
        const matchIssue = (sInfo.latestIssue || '').toLowerCase().includes(q);
        if (!matchCode && !matchLoc && !matchBrand && !matchSpec && !matchBtu && !matchSupplier && !matchNote && !matchIssue) {
          return false;
        }
      }

      // Filter Supplier
      if (filterSupplier !== 'all' && u.supplier !== filterSupplier) {
        return false;
      }

      // Filter Plant
      if (filterPlant !== 'all' && u.plant !== filterPlant) {
        return false;
      }

      // Filter Cleaned Status
      if (filterCleaned === 'cleaned' && !u.isCleaned) {
        return false;
      }
      if (filterCleaned === 'pending' && u.isCleaned) {
        return false;
      }

      // Filter Issue Only
      if (filterIssueOnly) {
        const sInfo = getUnitStatusInfo(u);
        if (sInfo.status !== 'breakdown' && sInfo.status !== 'monitoring') {
          return false;
        }
      }

      return true;
    });
  }, [units, search, filterSupplier, filterPlant, filterCleaned, filterIssueOnly]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = units.length;
    const rfgCount = units.filter(u => u.plant === 'RFG').length;
    const mirCount = units.filter(u => u.plant === 'MIR').length;
    const issueCount = units.filter(u => {
      const sInfo = getUnitStatusInfo(u);
      return sInfo.status === 'breakdown' || sInfo.status === 'monitoring';
    }).length;
    const cleanedCount = units.filter(u => Boolean(u.isCleaned)).length;
    const cleanedPercent = total > 0 ? Math.round((cleanedCount / total) * 100) : 0;
    const bySupplier = {
      'SiamTemp': units.filter(u => u.supplier === 'SiamTemp').length,
      'Thai-Top-Therm': units.filter(u => u.supplier === 'Thai-Top-Therm').length,
      'Carrier': units.filter(u => u.supplier === 'Carrier').length,
      'KB Cool': units.filter(u => u.supplier === 'KB Cool').length
    };
    return { total, rfgCount, mirCount, issueCount, cleanedCount, cleanedPercent, bySupplier };
  }, [units]);

  return (
    <div className="services-database-container" id="services-database-root">
      {/* Top Banner & Title */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        flexWrap: 'wrap', 
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text)' }}>
              Services Database
            </h2>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              background: 'rgba(59, 130, 246, 0.1)', 
              color: 'var(--accent)', 
              fontWeight: '600' 
            }}>
              {units.length} Equipment Units
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '4px 0 0 0' }}>
            ฐานข้อมูลระบบปรับอากาศ, ตู้คูลเลอร์คอนโทรลพาเนล และชิลเลอร์ (SiamTemp, Thai-Top-Therm, Carrier, KB Cool) • รองรับการพิมพ์แก้ไขหมายเหตุและบันทึกเวลาอัปเดตอัตโนมัติ
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn" 
            onClick={handleRefreshFromCloud}
            disabled={isRefreshing}
            title="ดึงข้อมูลสถานะล่าสุดจาก Cloud Firestore"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'กำลังซิงค์...' : 'รีเฟรช Cloud'}</span>
          </button>

          <button 
            className="btn hide-on-mobile" 
            onClick={handleResetMasterData}
            title="คำเตือน: รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นโรงงาน 37 รายการ"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ef4444', borderColor: '#fca5a5' }}
          >
            <RotateCcw size={12} />
            <span>รีเซ็ตค่าเริ่มต้น</span>
          </button>

          <button 
            className="btn hide-on-mobile" 
            onClick={handleExportCSV}
            title="ส่งออกไฟล์ Excel / CSV"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <Download size={14} style={{ color: '#059669' }} />
            <span>Export CSV</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <Plus size={15} />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        {/* Card 1: Total Units */}
        <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} style={{ color: 'var(--accent)' }} />
            Total Equipment
          </span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', marginTop: '4px' }}>
            {metrics.total} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text3)' }}>units</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text3)', marginTop: '4px' }}>
            Plant RFG: <strong style={{ color: '#3b82f6' }}>{metrics.rfgCount}</strong> | MIR: <strong style={{ color: '#8b5cf6' }}>{metrics.mirCount}</strong>
          </div>
        </div>

        {/* Card 2: Cleaned Progress (ผรม. ล้างแอร์แล้ว) */}
        <div 
          className="card" 
          onClick={() => setFilterCleaned(prev => prev === 'cleaned' ? 'all' : 'cleaned')}
          style={{ 
            padding: '14px 18px', 
            background: filterCleaned === 'cleaned' ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)', 
            border: `1px solid ${filterCleaned === 'cleaned' ? '#10b981' : 'var(--border)'}`,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          title="คลิกเพื่อกรองดูเฉพาะตัวที่ ผรม. ล้างแอร์แล้ว"
        >
          <span style={{ fontSize: '11.5px', color: '#059669', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            ผรม. ล้างแอร์แล้ว
          </span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>
            {metrics.cleanedCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text3)' }}>/ {metrics.total} ({metrics.cleanedPercent}%)</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--surface3)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${metrics.cleanedPercent}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Card 3: Issues / Repairs Pending */}
        <div 
          className="card" 
          onClick={() => setFilterIssueOnly(prev => !prev)}
          style={{ 
            padding: '14px 18px', 
            background: filterIssueOnly ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)', 
            border: `1px solid ${filterIssueOnly ? '#ef4444' : 'var(--border)'}`,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          title="คลิกเพื่อกรองเฉพาะรายการที่มีหมายเหตุ / ปัญหา"
        >
          <span style={{ fontSize: '11.5px', color: '#dc2626', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} style={{ color: '#dc2626' }} />
            Issues / หมายเหตุเสีย
          </span>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>
            {metrics.issueCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text3)' }}>issues</span>
          </div>
          <div style={{ fontSize: '11.5px', color: filterIssueOnly ? '#b91c1c' : 'var(--text3)', marginTop: '4px', fontWeight: filterIssueOnly ? '600' : 'normal' }}>
            {filterIssueOnly ? '✓ กำลังกรองเฉพาะรายการเสีย' : 'คลิกเพื่อดูเฉพาะเครื่องมีปัญหา'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar (Desktop) */}
      <div 
        className="card controls-bar hide-on-mobile" 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '10px', 
          alignItems: 'center', 
          padding: '10px 14px', 
          marginBottom: '16px' 
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '240px', minWidth: '180px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text3)' }} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อใหม่, Brand, Location, รุ่น, หมายเหตุ..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '32px', paddingRight: search ? '28px' : '10px', height: '32px', fontSize: '12.5px', width: '100%' }}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Supplier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: '500' }}>Supplier:</span>
          <select 
            className="form-select" 
            value={filterSupplier} 
            onChange={(e) => setFilterSupplier(e.target.value)}
            style={{ height: '32px', fontSize: '12.5px', padding: '0 8px' }}
          >
            <option value="all">All Suppliers ({metrics.total})</option>
            <option value="SiamTemp">SiamTemp ({metrics.bySupplier['SiamTemp']})</option>
            <option value="Thai-Top-Therm">Thai-Top-Therm ({metrics.bySupplier['Thai-Top-Therm']})</option>
            <option value="Carrier">Carrier ({metrics.bySupplier['Carrier']})</option>
            <option value="KB Cool">KB Cool ({metrics.bySupplier['KB Cool']})</option>
          </select>
        </div>

        {/* Filter Plant */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: '500' }}>Plant:</span>
          <select 
            className="form-select" 
            value={filterPlant} 
            onChange={(e) => setFilterPlant(e.target.value)}
            style={{ height: '32px', fontSize: '12.5px', padding: '0 8px' }}
          >
            <option value="all">All Plants</option>
            <option value="RFG">RFG ({metrics.rfgCount})</option>
            <option value="MIR">MIR ({metrics.mirCount})</option>
          </select>
        </div>

        {/* Filter Cleaned Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text3)', fontWeight: '500' }}>สถานะล้าง:</span>
          <select 
            className="form-select" 
            value={filterCleaned} 
            onChange={(e) => setFilterCleaned(e.target.value)}
            style={{ 
              height: '32px', 
              fontSize: '12.5px', 
              padding: '0 8px',
              borderColor: filterCleaned === 'cleaned' ? '#10b981' : undefined,
              color: filterCleaned === 'cleaned' ? '#059669' : undefined,
              fontWeight: filterCleaned === 'cleaned' ? '600' : 'normal'
            }}
          >
            <option value="all">สถานะล้าง: ทั้งหมด</option>
            <option value="cleaned">✓ ล้างแล้ว ({metrics.cleanedCount})</option>
            <option value="pending">⏳ ยังไม่ล้าง ({metrics.total - metrics.cleanedCount})</option>
          </select>
        </div>

        {/* Quick Issue Filter Pill */}
        <button
          type="button"
          onClick={() => setFilterIssueOnly(prev => !prev)}
          className="btn"
          style={{
            height: '32px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: filterIssueOnly ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface2)',
            color: filterIssueOnly ? '#dc2626' : 'var(--text)',
            borderColor: filterIssueOnly ? '#ef4444' : 'var(--border)'
          }}
        >
          <AlertTriangle size={13} style={{ color: filterIssueOnly ? '#dc2626' : 'var(--text3)' }} />
          <span>มีหมายเหตุเสีย ({metrics.issueCount})</span>
        </button>

        {/* Item Counter */}
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text3)' }}>
          Showing <strong>{filteredUnits.length}</strong> of {units.length} items
        </div>
      </div>

      {/* Filter & View Switcher (Mobile) */}
      <div className="card mobile-only" style={{ padding: '10px 12px', marginBottom: '12px' }}>
        {/* Row 1: Search + View Mode Switcher */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ, Brand, Location..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', paddingRight: search ? '28px' : '10px', height: '34px', fontSize: '12px', width: '100%' }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMobileViewMode('cards')}
              style={{
                padding: '5px 9px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: mobileViewMode === 'cards' ? 'var(--accent)' : 'var(--surface)',
                color: mobileViewMode === 'cards' ? '#fff' : 'var(--text2)',
                cursor: 'pointer'
              }}
            >
              📱 การ์ด
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('table')}
              style={{
                padding: '5px 9px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: mobileViewMode === 'table' ? 'var(--accent)' : 'var(--surface)',
                color: mobileViewMode === 'table' ? '#fff' : 'var(--text2)',
                cursor: 'pointer'
              }}
            >
              📊 ตาราง
            </button>
          </div>
        </div>

        {/* Row 2: 2-Column Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
          <select 
            className="form-select" 
            value={filterSupplier} 
            onChange={(e) => setFilterSupplier(e.target.value)}
            style={{ height: '32px', fontSize: '11.5px', padding: '0 6px', width: '100%' }}
          >
            <option value="all">🏢 ผู้รับเหมา: ทั้งหมด</option>
            <option value="SiamTemp">SiamTemp ({metrics.bySupplier['SiamTemp']})</option>
            <option value="Thai-Top-Therm">Thai-Top-Therm ({metrics.bySupplier['Thai-Top-Therm']})</option>
            <option value="Carrier">Carrier ({metrics.bySupplier['Carrier']})</option>
            <option value="KB Cool">KB Cool ({metrics.bySupplier['KB Cool']})</option>
          </select>

          <select 
            className="form-select" 
            value={filterPlant} 
            onChange={(e) => setFilterPlant(e.target.value)}
            style={{ height: '32px', fontSize: '11.5px', padding: '0 6px', width: '100%' }}
          >
            <option value="all">🏭 Plant: ทั้งหมด</option>
            <option value="RFG">RFG ({metrics.rfgCount})</option>
            <option value="MIR">MIR ({metrics.mirCount})</option>
          </select>
        </div>

        {/* Row 3: Cleaned Status & Issue Toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
          <select 
            className="form-select" 
            value={filterCleaned} 
            onChange={(e) => setFilterCleaned(e.target.value)}
            style={{ 
              height: '32px', 
              fontSize: '11.5px', 
              padding: '0 6px',
              width: '100%',
              borderColor: filterCleaned === 'cleaned' ? '#10b981' : undefined,
              color: filterCleaned === 'cleaned' ? '#059669' : undefined,
              fontWeight: filterCleaned === 'cleaned' ? '600' : 'normal'
            }}
          >
            <option value="all">สถานะล้าง: ทั้งหมด</option>
            <option value="cleaned">✓ ล้างแล้ว ({metrics.cleanedCount})</option>
            <option value="pending">⏳ ยังไม่ล้าง ({metrics.total - metrics.cleanedCount})</option>
          </select>

          <button
            type="button"
            onClick={() => setFilterIssueOnly(prev => !prev)}
            className="btn"
            style={{
              height: '32px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '0 4px',
              background: filterIssueOnly ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface2)',
              color: filterIssueOnly ? '#dc2626' : 'var(--text)',
              borderColor: filterIssueOnly ? '#ef4444' : 'var(--border)',
              whiteSpace: 'nowrap'
            }}
          >
            <AlertTriangle size={12} style={{ color: filterIssueOnly ? '#dc2626' : 'var(--text3)' }} />
            <span>มีปัญหา ({metrics.issueCount})</span>
          </button>
        </div>

        {/* Row 4: Summary count & quick reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
            แสดง <strong>{filteredUnits.length}</strong> จาก {units.length} รายการ
          </span>
          {(filterSupplier !== 'all' || filterPlant !== 'all' || filterCleaned !== 'all' || filterIssueOnly || search) && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setSearch('');
                setFilterSupplier('all');
                setFilterPlant('all');
                setFilterCleaned('all');
                setFilterIssueOnly(false);
              }}
              style={{ fontSize: '10.5px', padding: '2px 6px', height: '22px' }}
            >
              รีเซ็ตตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Notice Banner (Desktop) */}
      {(filterCleaned !== 'all' || filterIssueOnly || filterSupplier !== 'all' || filterPlant !== 'all' || search.trim()) && (
        <div className="hide-on-mobile" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'rgba(59, 130, 246, 0.08)', 
          border: '1px solid rgba(59, 130, 246, 0.2)', 
          borderRadius: '8px', 
          padding: '8px 12px', 
          marginBottom: '12px',
          fontSize: '12.5px',
          color: 'var(--text)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Filter size={14} style={{ color: 'var(--accent)' }} />
            <span>กำลังกรองข้อมูล: <strong>แสดง {filteredUnits.length} จาก {units.length} รายการ</strong></span>
            {filterCleaned === 'pending' && <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '600' }}>เฉพาะที่ยังไม่ได้ล้าง</span>}
            {filterCleaned === 'cleaned' && <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#d1fae5', color: '#065f46', fontSize: '11px', fontWeight: '600' }}>เฉพาะที่ล้างแล้ว</span>}
            {filterIssueOnly && <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: '600' }}>เฉพาะมีหมายเหตุเสีย</span>}
          </div>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setSearch('');
              setFilterSupplier('all');
              setFilterPlant('all');
              setFilterCleaned('all');
              setFilterIssueOnly(false);
            }}
            style={{ fontSize: '11.5px', padding: '2px 8px' }}
          >
            แสดงทั้งหมด 37 รายการ
          </button>
        </div>
      )}

      {/* Mobile Scroll Table Hint */}
      {mobileViewMode === 'table' && (
        <div className="mobile-only" style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text3)', background: 'var(--surface2)', borderRadius: '6px', marginBottom: '8px' }}>
          👉 ปัดเลื่อนซ้าย-ขวาเพื่อดูคอลัมน์ทั้งหมดของตาราง
        </div>
      )}

      {/* Main Database Table (Always on Desktop; on Mobile shown only when mobileViewMode === 'table') */}
      <div 
        className={`card table-container ${mobileViewMode === 'cards' ? 'hide-on-mobile' : ''}`} 
        style={{ overflowX: 'auto', padding: 0 }}
      >
        <table className="data-table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ width: '56px', padding: '10px 4px', textAlign: 'center' }} title="ติ๊กเมื่อผู้รับเหมาล้างแอร์แล้ว">
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700' }}>ล้าง</span>
                  <span style={{ fontSize: '9px', color: 'var(--text3)', fontWeight: 'normal' }}>({metrics.cleanedCount})</span>
                </div>
              </th>
              <th style={{ width: '120px', padding: '10px 12px', textAlign: 'left' }}>Supplier</th>
              <th style={{ width: '60px', padding: '10px 8px', textAlign: 'center' }}>Plant</th>
              <th style={{ width: '45px', padding: '10px 8px', textAlign: 'center' }}>No.</th>
              <th style={{ width: '105px', padding: '10px 10px', textAlign: 'left' }}>ชื่อใหม่</th>
              <th style={{ width: '110px', padding: '10px 10px', textAlign: 'left' }}>Brand</th>
              <th style={{ width: '220px', padding: '10px 12px', textAlign: 'left' }}>Location</th>
              <th style={{ width: '110px', padding: '10px 10px', textAlign: 'right' }}>BTU</th>
              <th style={{ width: '180px', padding: '10px 10px', textAlign: 'left' }}>spec/model</th>
              <th style={{ width: '270px', padding: '10px 12px', textAlign: 'left', background: 'rgba(245, 158, 11, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <History size={13} style={{ color: '#d97706' }} />
                  <span>ประวัติการเสียและซ่อม / หมายเหตุ</span>
                </div>
              </th>
              <th style={{ width: '145px', padding: '10px 10px', textAlign: 'left' }} title="บันทึกวันและเวลาที่มีการแก้ไขช่องหมายเหตุล่าสุดให้อัตโนมัติ (จะแสดงเป็น — หากไม่มีการแก้ไขหมายเหตุ)">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} style={{ color: 'var(--accent)' }} />
                  <span>แก้ไขล่าสุด</span>
                  <Info size={11} style={{ color: 'var(--text3)', cursor: 'help' }} />
                </div>
              </th>
              <th style={{ width: '80px', padding: '10px 8px', textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text3)' }}>
                  <Info size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</div>
                </td>
              </tr>
            ) : (
              filteredUnits.map((unit, index) => {
                const theme = SUPPLIER_THEMES[unit.supplier] || { badgeBg: 'var(--surface2)', badgeColor: 'var(--text)', borderColor: 'var(--border)' };
                const isEditingThis = inlineEditingId === (unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}`);
                const statusInfo = getUnitStatusInfo(unit);
                const hasIssue = statusInfo.status === 'breakdown' || statusInfo.status === 'monitoring';

                return (
                  <tr 
                    key={unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}-${index}`}
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: hasIssue ? 'rgba(239, 68, 68, 0.02)' : (unit.isCleaned ? 'rgba(16, 185, 129, 0.03)' : undefined),
                      transition: 'background-color 0.15s'
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* Tick Cleaned Checkbox */}
                    <td 
                      style={{ 
                        padding: '8px 4px', 
                        textAlign: 'center', 
                        backgroundColor: unit.isCleaned ? 'rgba(16, 185, 129, 0.08)' : undefined 
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={Boolean(unit.isCleaned)}
                        onChange={() => handleToggleCleaned(unit)}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#10b981',
                          verticalAlign: 'middle'
                        }}
                        title={unit.isCleaned ? `ผรม. ล้างแล้ว (${formatDateTime(unit.cleanedAt) || 'บันทึกแล้ว'}) - คลิกเพื่อยกเลิก` : 'คลิกเพื่อติ๊กบันทึกว่า ผรม. ล้างแอร์แล้ว'}
                      />
                    </td>

                    {/* Supplier */}
                    <td style={{ padding: '8px 12px' }}>
                      <span 
                        style={{ 
                          display: 'inline-block',
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600',
                          backgroundColor: theme.badgeBg, 
                          color: theme.badgeColor,
                          border: `1px solid ${theme.borderColor}40`
                        }}
                      >
                        {unit.supplier}
                      </span>
                    </td>

                    {/* Plant */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <span className={`plant-badge ${(unit.plant || 'RFG').toLowerCase()}`}>
                        {unit.plant || 'RFG'}
                      </span>
                    </td>

                    {/* No. */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--text3)', fontFamily: 'monospace' }}>
                      {unit.itemNo}
                    </td>

                    {/* ชื่อใหม่ (New Code) */}
                    <td style={{ padding: '8px 10px', fontWeight: '600', color: 'var(--accent)', fontFamily: 'monospace' }}>
                      {unit.newCode || '—'}
                    </td>

                    {/* Brand */}
                    <td style={{ padding: '8px 10px', color: unit.brand ? 'var(--text)' : 'var(--text3)' }}>
                      {unit.brand || '—'}
                    </td>

                    {/* Location */}
                    <td style={{ padding: '8px 12px', fontWeight: '500' }}>
                      {unit.location || '—'}
                    </td>

                    {/* BTU */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: unit.btu ? 'var(--text)' : 'var(--text3)' }}>
                      {unit.btu || '—'}
                    </td>

                    {/* spec/model */}
                    <td style={{ padding: '8px 10px', fontSize: '11.5px', color: unit.specModel ? 'var(--text)' : 'var(--text3)' }}>
                      {unit.specModel || '—'}
                    </td>

                    {/* ประวัติการเสียและซ่อม / หมายเหตุ (Click to Open History Drawer) */}
                    <td 
                      style={{ 
                        padding: '6px 10px', 
                        backgroundColor: statusInfo.status === 'breakdown' ? 'rgba(239, 68, 68, 0.04)' : (statusInfo.status === 'monitoring' ? 'rgba(245, 158, 11, 0.04)' : undefined),
                        borderRadius: '4px'
                      }}
                    >
                      <div 
                        onClick={() => handleOpenHistoryDrawer(unit)}
                        style={{ 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '6px',
                          minHeight: '28px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${statusInfo.status !== 'normal' ? statusInfo.border : 'var(--border)'}`,
                          backgroundColor: statusInfo.status !== 'normal' ? statusInfo.bg : 'var(--surface2)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = statusInfo.status !== 'normal' ? statusInfo.border : 'var(--border)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        title="คลิกเพื่อดูประวัติการเสียและซ่อมทั้งหมด (เปิดสมุดประวัติ)"
                      >
                        {statusInfo.status === 'breakdown' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                            <AlertTriangle size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                            <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '11.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                              {statusInfo.latestIssue || 'เสีย/รอดำเนินการ'}
                            </span>
                          </div>
                        ) : statusInfo.status === 'monitoring' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                            <Activity size={13} style={{ color: '#d97706', flexShrink: 0 }} />
                            <span style={{ color: '#d97706', fontWeight: '600', fontSize: '11.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                              {statusInfo.latestIssue || 'เฝ้าระวัง'}
                            </span>
                          </div>
                        ) : statusInfo.status === 'resolved' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0 }} />
                            <span style={{ color: '#059669', fontWeight: '600', fontSize: '11.5px' }}>
                              ปกติ (ซ่อมแล้ว)
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={12} /> บันทึกประวัติ
                          </span>
                        )}

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: statusInfo.totalCount > 0 ? 'var(--surface)' : 'transparent',
                          color: statusInfo.totalCount > 0 ? 'var(--accent)' : 'var(--text3)',
                          border: statusInfo.totalCount > 0 ? '1px solid var(--border)' : 'none',
                          flexShrink: 0
                        }}>
                          <History size={10} />
                          <span>{statusInfo.totalCount}</span>
                        </span>
                      </div>
                    </td>

                    {/* วันที่แก้ไขล่าสุด (Last Updated Date) */}
                    <td style={{ padding: '8px 10px', fontSize: '11px', color: unit.noteUpdatedAt ? 'var(--text2)' : 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {unit.noteUpdatedAt ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span>{formatDateTime(unit.noteUpdatedAt)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleOpenEdit(unit)}
                          style={{ padding: '3px 6px', height: '24px' }}
                          title="แก้ไขรายละเอียดอุปกรณ์ทั้งหมด"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteModal({ isOpen: true, item: unit })}
                          style={{ padding: '3px 6px', height: '24px' }}
                          title="ลบรายการ"
                        >
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

      {/* Mobile Equipment Cards (Optimized for field check on narrow screens) */}
      {mobileViewMode === 'cards' && (
        <div className="mobile-cards-view mobile-only" id="services-db-mobile-cards" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        {filteredUnits.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text3)' }}>
            <Info size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</div>
          </div>
        ) : (
          filteredUnits.map((unit, index) => {
            const theme = SUPPLIER_THEMES[unit.supplier] || { badgeBg: 'var(--surface2)', badgeColor: 'var(--text)', borderColor: 'var(--border)' };
            const statusInfo = getUnitStatusInfo(unit);
            const hasIssue = statusInfo.status === 'breakdown' || statusInfo.status === 'monitoring';

            return (
              <div 
                key={unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}-${index}`}
                className="card"
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface)',
                  border: `1px solid ${hasIssue ? 'rgba(239, 68, 68, 0.4)' : (unit.isCleaned ? 'rgba(16, 185, 129, 0.35)' : 'var(--border)')}`,
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative'
                }}
              >
                {/* Header: Plant, Supplier, Code & Wash Toggle Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`plant-badge ${(unit.plant || 'RFG').toLowerCase()}`} style={{ fontWeight: 700 }}>
                      {unit.plant}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: theme.badgeBg,
                      color: theme.badgeColor,
                      border: `1px solid ${theme.borderColor}`
                    }}>
                      {unit.supplier} No.{unit.itemNo}
                    </span>
                    {unit.newCode && (
                      <span className="font-mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>
                        {unit.newCode}
                      </span>
                    )}
                  </div>

                  {/* 1-Tap Wash Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleCleaned(unit)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: unit.isCleaned ? '1px solid #10b981' : '1px solid var(--border)',
                      backgroundColor: unit.isCleaned ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface2)',
                      color: unit.isCleaned ? '#059669' : 'var(--text3)',
                      transition: 'all 0.15s ease'
                    }}
                    title="แตะเพื่อสลับสถานะล้างแอร์แล้ว"
                  >
                    <CheckCircle2 size={13} style={{ color: unit.isCleaned ? '#10b981' : 'var(--text3)' }} />
                    <span>{unit.isCleaned ? 'ล้างแล้ว' : 'ยังไม่ล้าง'}</span>
                  </button>
                </div>

                {/* Location & Brand */}
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                    {unit.location || '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                    {unit.brand ? `Brand: ${unit.brand}` : ''} {unit.btu ? `• ${Number(unit.btu).toLocaleString()} BTU` : ''}
                  </div>
                  {unit.specModel && (
                    <div className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text3)', marginTop: '2px' }}>
                      Spec: {unit.specModel}
                    </div>
                  )}
                </div>

                {/* ประวัติการเสียและซ่อม (Touch Card to Open Mobile Bottom Sheet) */}
                <div 
                  onClick={() => handleOpenHistoryDrawer(unit)}
                  style={{ 
                    backgroundColor: statusInfo.status === 'breakdown' 
                      ? 'rgba(239, 68, 68, 0.08)' 
                      : (statusInfo.status === 'monitoring' 
                        ? 'rgba(245, 158, 11, 0.08)' 
                        : 'var(--surface2)'), 
                    border: `1px solid ${statusInfo.status !== 'normal' ? statusInfo.border : 'var(--border)'}`, 
                    borderRadius: '8px', 
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <History size={13} style={{ color: statusInfo.color }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.3px' }}>
                        ประวัติการเสียและซ่อม
                      </span>
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: 'rgba(59, 130, 246, 0.08)'
                    }}>
                      <span>{statusInfo.totalCount} รายการ</span>
                      <ChevronRight size={12} />
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      {statusInfo.status === 'breakdown' ? (
                        <>
                          <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {statusInfo.latestIssue || 'มีอาการเสีย / รอดำเนินการ'}
                            </div>
                            {statusInfo.latestEntry?.date && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '1px' }}>
                                แจ้งเมื่อ: {formatDateThai(statusInfo.latestEntry.date)} {statusInfo.latestEntry.technician ? `• ${statusInfo.latestEntry.technician}` : ''}
                              </div>
                            )}
                          </div>
                        </>
                      ) : statusInfo.status === 'monitoring' ? (
                        <>
                          <Activity size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {statusInfo.latestIssue || 'เฝ้าระวังอาการ'}
                            </div>
                            {statusInfo.latestEntry?.date && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '1px' }}>
                                ล่าสุด: {formatDateThai(statusInfo.latestEntry.date)}
                              </div>
                            )}
                          </div>
                        </>
                      ) : statusInfo.status === 'resolved' ? (
                        <>
                          <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
                              เครื่องปกติ (ซ่อมเสร็จแล้ว)
                            </div>
                            {statusInfo.latestEntry?.title && (
                              <div style={{ fontSize: '10.5px', color: 'var(--text3)', marginTop: '1px' }}>
                                ล่าสุด: {statusInfo.latestEntry.title} ({formatDateThai(statusInfo.latestEntry.date)})
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text3)', fontSize: '12px' }}>
                          <PlusCircle size={14} style={{ color: 'var(--accent)' }} />
                          <span>แตะเพื่อบันทึกประวัติการเสียหรือซ่อม</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer: Last Update & Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text3)' }}>
                    {unit.noteUpdatedAt ? `แก้ไข: ${formatDateTime(unit.noteUpdatedAt)}` : 'ยังไม่มีการแก้ไข'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleOpenEdit(unit)}
                      style={{ padding: '4px 8px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit2 size={12} />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteModal({ isOpen: true, item: unit })}
                      style={{ padding: '4px 8px', fontSize: '11.5px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* Mobile Floating Action Button (FAB) for Add Equipment */}
      <div className="mobile-only" style={{ position: 'fixed', right: '18px', bottom: '70px', zIndex: 980 }}>
        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '24px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
          title="Add New Equipment"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* ======================================================================= */}
      {/* BREAKDOWN & REPAIR HISTORY DRAWER / BOTTOM SHEET                         */}
      {/* ======================================================================= */}
      {activeUnitInDrawer && (
        <div 
          className="history-drawer-overlay" 
          onClick={handleCloseHistoryDrawer}
          id="service-history-drawer-overlay"
        >
          <div 
            className="history-drawer-panel" 
            onClick={(e) => e.stopPropagation()}
            id="service-history-drawer-panel"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="mobile-only" style={{ width: '38px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--border)', margin: '10px auto 4px auto' }} />

            {/* Drawer Header */}
            {(() => {
              const unitTheme = SUPPLIER_THEMES[activeUnitInDrawer.supplier] || { badgeBg: 'var(--surface2)', badgeColor: 'var(--text)', borderColor: 'var(--border)' };
              const unitStatus = getUnitStatusInfo(activeUnitInDrawer);
              const historyLogs = getUnitHistory(activeUnitInDrawer);

              return (
                <>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Top Row: Tags & Close Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`plant-badge ${(activeUnitInDrawer.plant || 'RFG').toLowerCase()}`} style={{ fontWeight: 700 }}>
                          {activeUnitInDrawer.plant || 'RFG'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: unitTheme.badgeBg,
                          color: unitTheme.badgeColor,
                          border: `1px solid ${unitTheme.borderColor}`
                        }}>
                          {activeUnitInDrawer.supplier} No.{activeUnitInDrawer.itemNo}
                        </span>
                        {activeUnitInDrawer.newCode && (
                          <span className="font-mono" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>
                            {activeUnitInDrawer.newCode}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleCloseHistoryDrawer}
                        className="btn btn-sm"
                        style={{ width: '32px', height: '32px', padding: 0, borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="ปิด (Close)"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Middle Row: Title & Location */}
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                        {activeUnitInDrawer.newCode ? `${activeUnitInDrawer.newCode} — ` : ''}{activeUnitInDrawer.location || 'ไม่ระบุตำแหน่ง'}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                        {activeUnitInDrawer.brand ? `Brand: ${activeUnitInDrawer.brand}` : ''} {activeUnitInDrawer.btu ? `• ${activeUnitInDrawer.btu} BTU` : ''} {activeUnitInDrawer.specModel ? `• Spec: ${activeUnitInDrawer.specModel}` : ''}
                      </div>
                    </div>

                    {/* Bottom Row: Status Badge Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 700,
                        backgroundColor: unitStatus.bg,
                        color: unitStatus.color,
                        border: `1px solid ${unitStatus.border}`
                      }}>
                        {unitStatus.status === 'breakdown' ? (
                          <>
                            <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                            <span>มีอาการเสีย / รอดำเนินการ ({unitStatus.activeCount} รายการ)</span>
                          </>
                        ) : unitStatus.status === 'monitoring' ? (
                          <>
                            <Activity size={14} style={{ color: '#d97706' }} />
                            <span>เฝ้าระวังอาการ ({unitStatus.activeCount} รายการ)</span>
                          </>
                        ) : unitStatus.status === 'resolved' ? (
                          <>
                            <CheckCircle2 size={14} style={{ color: '#059669' }} />
                            <span>ทำงานปกติ (ซ่อมเสร็จแล้ว)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                            <span>ทำงานปกติ (ยังไม่มีประวัติเสีย)</span>
                          </>
                        )}
                      </div>

                      {/* Cleaned Status Badge */}
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: activeUnitInDrawer.isCleaned ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface2)',
                        color: activeUnitInDrawer.isCleaned ? '#059669' : 'var(--text3)',
                        border: activeUnitInDrawer.isCleaned ? '1px solid #a7f3d0' : '1px solid var(--border)',
                        fontWeight: 600
                      }}>
                        {activeUnitInDrawer.isCleaned ? '✓ ผรม. ล้างแอร์แล้ว' : '⏳ ยังไม่ได้รับการล้าง'}
                      </span>
                    </div>
                  </div>

                  {/* Sub-header Bar: Log Count & Add Button */}
                  <div style={{
                    padding: '10px 20px',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--surface2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <History size={15} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        สมุดประวัติการเสียและซ่อม ({historyLogs.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => isHistoryFormOpen ? setIsHistoryFormOpen(false) : handleOpenAddHistory()}
                      className={`btn btn-sm ${isHistoryFormOpen ? '' : 'btn-primary'}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}
                    >
                      {isHistoryFormOpen ? (
                        <>
                          <X size={13} />
                          <span>ซ่อนฟอร์ม</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>+ บันทึกประวัติใหม่</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Scrollable Timeline & Form Container */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* ADD / EDIT HISTORY FORM */}
                    {isHistoryFormOpen && (
                      <div style={{
                        background: 'var(--surface)',
                        border: '2px solid var(--accent)',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wrench size={15} />
                            {editingHistoryEntry ? 'แก้ไขบันทึกประวัติ' : 'บันทึกประวัติการเสียและซ่อมใหม่'}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setIsHistoryFormOpen(false); setEditingHistoryEntry(null); }}
                            className="btn btn-sm"
                            style={{ padding: '2px 6px', height: '22px' }}
                          >
                            <X size={12} />
                          </button>
                        </div>

                        {/* Quick Presets (1-Tap Fast Fill) */}
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, marginBottom: '6px' }}>
                            เลือกด่วน (Quick Presets):
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                              { label: 'น้ำยารั่ว', type: 'breakdown', status: 'pending', title: 'น้ำยารั่ว รอยเชื่อมท่อทองแดง' },
                              { label: 'คอมเสีย', type: 'breakdown', status: 'pending', title: 'คอมเพรสเซอร์เสีย มีเสียงดังผิดปกติ' },
                              { label: 'ไม่เย็น (รั่ว)', type: 'breakdown', status: 'pending', title: 'แอร์ไม่เย็น ลมออกไม่ฉ่ำ' },
                              { label: 'ซ่อมแซม/เติมน้ำยา', type: 'repair', status: 'resolved', title: 'ซ่อมรอยรั่ว เติมน้ำยาแอร์เสร็จสมบูรณ์' },
                              { label: 'เปลี่ยนคอมเพรสเซอร์', type: 'repair', status: 'resolved', title: 'เปลี่ยนคอมเพรสเซอร์ลูกใหม่' },
                              { label: 'เปลี่ยนสายพาน/ลูกปืน', type: 'repair', status: 'resolved', title: 'เปลี่ยนสายพานและลูกปืนพัดลม' },
                              { label: 'ล้างใหญ่ PM', type: 'maintenance', status: 'resolved', title: 'ล้างใหญ่ประจำรอบและตรวจเช็คระบบ' }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setHistType(preset.type);
                                  setHistStatus(preset.status);
                                  setHistTitle(preset.title);
                                }}
                                style={{
                                  fontSize: '11px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  backgroundColor: histTitle === preset.title ? 'var(--accent)' : 'var(--surface2)',
                                  color: histTitle === preset.title ? '#fff' : 'var(--text2)',
                                  cursor: 'pointer',
                                  transition: 'all 0.1s'
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Form Row 1: Date & Type */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                              วันที่พบเหตุ/ซ่อม <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                              type="date"
                              value={histDate}
                              onChange={(e) => setHistDate(e.target.value)}
                              required
                              className="form-input"
                              style={{ height: '34px', fontSize: '12px' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                              ประเภทรายการ <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                              value={histType}
                              onChange={(e) => setHistType(e.target.value)}
                              className="form-select"
                              style={{ height: '34px', fontSize: '12px' }}
                            >
                              <option value="breakdown">⚡ อาการเสีย (Breakdown)</option>
                              <option value="repair">🔧 การซ่อมแซม (Repair)</option>
                              <option value="maintenance">📋 บำรุงรักษา (PM)</option>
                              <option value="inspection">🔍 ตรวจเช็คทั่วไป (Inspection)</option>
                            </select>
                          </div>
                        </div>

                        {/* Form Row 2: Title / Symptom */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                            หัวข้อ / อาการเสีย <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={histTitle}
                            onChange={(e) => setHistTitle(e.target.value)}
                            placeholder="เช่น น้ำยารั่ว, คอมเสีย, มีเสียงดัง, ไม่เย็น..."
                            required
                            className="form-input"
                            style={{ height: '34px', fontSize: '12.5px', fontWeight: 600 }}
                          />
                        </div>

                        {/* Form Row 3: Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                            รายละเอียดการตรวจเช็ค / การดำเนินการซ่อม
                          </label>
                          <textarea
                            rows={3}
                            value={histDetails}
                            onChange={(e) => setHistDetails(e.target.value)}
                            placeholder="ระบุรายละเอียด เช่น ช่างเข้ามาตรวจพบรอยรั่วที่แฟลร์นัท ทำการบานแฟลร์ใหม่ เติมน้ำยา R22 จำนวน 3 กก. ทดสอบแรงดันปกติ..."
                            className="form-input"
                            style={{ fontSize: '12px', minHeight: '65px', resize: 'vertical' }}
                          />
                        </div>

                        {/* Form Row 4: Status & Technician */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                              สถานะเครื่องหลังดำเนินการ <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <select
                              value={histStatus}
                              onChange={(e) => setHistStatus(e.target.value)}
                              className="form-select"
                              style={{
                                height: '34px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: histStatus === 'pending' ? '#dc2626' : (histStatus === 'monitoring' ? '#d97706' : '#059669'),
                                borderColor: histStatus === 'pending' ? '#fca5a5' : (histStatus === 'monitoring' ? '#fde68a' : '#a7f3d0')
                              }}
                            >
                              <option value="pending">🔴 ยังไม่เสร็จ / รอดำเนินการ (Pending)</option>
                              <option value="monitoring">🟡 เฝ้าระวัง / ทดสอบ (Monitoring)</option>
                              <option value="resolved">🟢 ซ่อมเสร็จแล้ว / ปกติ (Resolved)</option>
                            </select>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                              ช่าง / ผู้รับเหมา
                            </label>
                            <input
                              type="text"
                              value={histTechnician}
                              onChange={(e) => setHistTechnician(e.target.value)}
                              placeholder={`เช่น ${activeUnitInDrawer.supplier}`}
                              className="form-input"
                              style={{ height: '34px', fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        {/* Form Row 5: Cost & Save Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'flex-end', marginTop: '2px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text2)' }}>
                              ค่าใช้จ่าย (บาท) ถ้ามี
                            </label>
                            <input
                              type="text"
                              value={histCost}
                              onChange={(e) => setHistCost(e.target.value)}
                              placeholder="เช่น 12,000"
                              className="form-input"
                              style={{ height: '34px', fontSize: '12px' }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => { setIsHistoryFormOpen(false); setEditingHistoryEntry(null); }}
                              className="btn btn-sm"
                              style={{ height: '34px', padding: '0 12px', fontSize: '12px' }}
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveHistoryEntry}
                              disabled={isSavingHistory}
                              className="btn btn-sm btn-primary"
                              style={{ height: '34px', padding: '0 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Save size={13} />
                              <span>{isSavingHistory ? 'กำลังบันทึก...' : 'บันทึกประวัติ'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TIMELINE LIST */}
                    {historyLogs.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: 'var(--text3)',
                        background: 'var(--surface)',
                        borderRadius: '12px',
                        border: '1px dashed var(--border)'
                      }}>
                        <History size={36} style={{ margin: '0 auto 12px', opacity: 0.4, color: 'var(--accent)' }} />
                        <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>ยังไม่มีประวัติการเสียหรือซ่อม</h4>
                        <p style={{ margin: '6px 0 16px 0', fontSize: '12px' }}>
                          อุปกรณ์เครื่องนี้ยังไม่มีประวัติแจ้งซ่อม หรือยังไม่เคยถูกบันทึกปัญหา
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAddHistory}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={14} />
                          <span>บันทึกประวัติรายการแรก</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: '24px' }}>
                        {/* Continuous Vertical Timeline Line */}
                        <div style={{
                          position: 'absolute',
                          left: '9px',
                          top: '12px',
                          bottom: '12px',
                          width: '2px',
                          backgroundColor: 'var(--border)',
                          zIndex: 0
                        }} />

                        {/* List of History Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {historyLogs.map((entry, idx) => {
                            const isBreakdown = entry.type === 'breakdown' || entry.status === 'pending';
                            const isMonitoring = entry.status === 'monitoring';
                            const isResolved = entry.status === 'resolved';

                            const nodeColor = isBreakdown ? '#ef4444' : (isMonitoring ? '#f59e0b' : '#10b981');
                            const nodeBg = isBreakdown ? 'rgba(239, 68, 68, 0.15)' : (isMonitoring ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)');

                            return (
                              <div key={entry.id || idx} style={{ position: 'relative', zIndex: 1 }}>
                                {/* Timeline Node Dot */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-24px',
                                  top: '10px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--surface)',
                                  border: `2.5px solid ${nodeColor}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: `0 0 0 3px ${nodeBg}`
                                }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: nodeColor }} />
                                </div>

                                {/* Timeline Item Card */}
                                <div style={{
                                  backgroundColor: 'var(--surface)',
                                  border: `1px solid ${isBreakdown ? 'rgba(239, 68, 68, 0.3)' : (isMonitoring ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)')}`,
                                  borderRadius: '10px',
                                  padding: '12px 14px',
                                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}>
                                  {/* Card Header: Date, Badges & Actions */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                      {/* Date */}
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: 'var(--text)'
                                      }}>
                                        <Calendar size={13} style={{ color: 'var(--accent)' }} />
                                        <span>{formatDateThai(entry.date)}</span>
                                      </span>

                                      {/* Type Badge */}
                                      <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: 600,
                                        padding: '1px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: entry.type === 'breakdown' ? 'rgba(239, 68, 68, 0.1)' : (entry.type === 'repair' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                                        color: entry.type === 'breakdown' ? '#dc2626' : (entry.type === 'repair' ? '#2563eb' : '#059669')
                                      }}>
                                        {entry.type === 'breakdown' ? '⚡ อาการเสีย' : (entry.type === 'repair' ? '🔧 งานซ่อมแซม' : (entry.type === 'maintenance' ? '📋 PM' : '🔍 ตรวจเช็ค'))}
                                      </span>

                                      {/* Status Badge */}
                                      <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        padding: '1px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: isBreakdown ? 'rgba(239, 68, 68, 0.15)' : (isMonitoring ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                                        color: isBreakdown ? '#dc2626' : (isMonitoring ? '#d97706' : '#059669')
                                      }}>
                                        {isBreakdown ? '🔴 รอดำเนินการ' : (isMonitoring ? '🟡 เฝ้าระวัง' : '🟢 ซ่อมแล้ว')}
                                      </span>
                                    </div>

                                    {/* Action Buttons: Edit & Delete */}
                                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditHistory(entry)}
                                        className="btn btn-sm"
                                        style={{ padding: '2px 6px', height: '24px' }}
                                        title="แก้ไขรายการนี้"
                                      >
                                        <Edit2 size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteHistoryEntry(entry.id)}
                                        className="btn btn-sm btn-danger"
                                        style={{ padding: '2px 6px', height: '24px' }}
                                        title="ลบรายการนี้"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Title / Symptom */}
                                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isBreakdown ? '#dc2626' : 'var(--text)' }}>
                                    {entry.title}
                                  </div>

                                  {/* Details */}
                                  {entry.details && (
                                    <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.45, whiteSpace: 'pre-wrap', backgroundColor: 'var(--surface2)', padding: '8px 10px', borderRadius: '6px' }}>
                                      {entry.details}
                                    </div>
                                  )}

                                  {/* Card Footer: Tech & Cost */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      {entry.technician && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                          <UserCheck size={12} style={{ color: 'var(--accent)' }} />
                                          <span>{entry.technician}</span>
                                        </span>
                                      )}
                                      {entry.cost && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: '#d97706' }}>
                                          <DollarSign size={12} />
                                          <span>{entry.cost} บ.</span>
                                        </span>
                                      )}
                                    </div>

                                    {entry.createdAt && (
                                      <span style={{ fontSize: '10px', opacity: 0.8 }}>
                                        บันทึก: {formatDateTime(entry.createdAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE UNIT */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        maxWidth="680px"
        title={editingItem ? 'Edit Equipment Details' : 'Add New Equipment'}
        subtitle={editingItem ? `${editingItem.supplier} • Plant ${editingItem.plant} • Code: ${editingItem.newCode || 'No Code'}` : 'Add an air conditioning unit, chiller, or control panel cooler to Services Database'}
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {editingItem ? (
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  setIsModalOpen(false);
                  setDeleteModal({ isOpen: true, item: editingItem });
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} />
                <span>Delete Unit</span>
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" form="service-unit-form" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Save size={14} />
                <span>Save Equipment</span>
              </button>
            </div>
          </div>
        }
      >
        <form id="service-unit-form" onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* SECTION 1: General & Location Info */}
          <div style={{ 
            background: 'var(--surface2)', 
            border: '1px solid var(--border)', 
            borderRadius: '10px', 
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} /> General &amp; Location
            </div>

            {/* Row 1: Supplier & Plant */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px' }}>
                  Supplier <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select 
                  value={formSupplier} 
                  onChange={(e) => setFormSupplier(e.target.value)}
                  required
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 10px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                >
                  <option value="SiamTemp">SiamTemp</option>
                  <option value="Thai-Top-Therm">Thai-Top-Therm</option>
                  <option value="Carrier">Carrier</option>
                  <option value="KB Cool">KB Cool</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px' }}>
                  Plant <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', height: '38px' }}>
                  <button
                    type="button"
                    onClick={() => setFormPlant('RFG')}
                    style={{
                      border: formPlant === 'RFG' ? '2px solid #3b82f6' : '1px solid var(--border)',
                      background: formPlant === 'RFG' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface)',
                      color: formPlant === 'RFG' ? '#2563eb' : 'var(--text2)',
                      fontWeight: formPlant === 'RFG' ? '700' : '500',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    RFG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPlant('MIR')}
                    style={{
                      border: formPlant === 'MIR' ? '2px solid #8b5cf6' : '1px solid var(--border)',
                      background: formPlant === 'MIR' ? 'rgba(139, 92, 246, 0.12)' : 'var(--surface)',
                      color: formPlant === 'MIR' ? '#7c3aed' : 'var(--text2)',
                      fontWeight: formPlant === 'MIR' ? '700' : '500',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    MIR
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: No. & New Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px' }}>
                  No. <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="number" 
                  value={formItemNo} 
                  onChange={(e) => setFormItemNo(e.target.value)} 
                  required 
                  placeholder="1"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 10px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} /> ชื่อใหม่ (New Code) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  value={formNewCode} 
                  onChange={(e) => setFormNewCode(e.target.value)} 
                  required 
                  placeholder="เช่น MIR-DE-1, RFG-CP-1, RFG-1"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 12px', fontSize: '13px', background: 'var(--surface)', fontWeight: '600', fontFamily: 'monospace', color: 'var(--accent)', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Row 3: Location */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> Location / ตำแหน่งติดตั้ง <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="text" 
                value={formLocation} 
                onChange={(e) => setFormLocation(e.target.value)} 
                required
                placeholder="เช่น CDU 38AE016 1 ตัว, P/S Room หน้าตู้ Auxiliary, O/P Room ใหญ่"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 12px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* SECTION 2: Technical Specifications & Power */}
          <div style={{ 
            background: 'var(--surface2)', 
            border: '1px solid var(--border)', 
            borderRadius: '10px', 
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} /> Equipment Specs &amp; Power
            </div>

            {/* Brand & BTU */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px' }}>
                  Brand (ยี่ห้อ)
                </label>
                <input 
                  type="text" 
                  value={formBrand} 
                  onChange={(e) => setFormBrand(e.target.value)} 
                  placeholder="Carrier, Daikin, Linkwell..."
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 10px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
                {/* Brand quick selection badges */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {['Carrier', 'Daikin', 'Linkwell Electric', 'STAR AIRE', 'Toptherm'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setFormBrand(b)}
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: formBrand === b ? 'var(--accent)' : 'var(--surface)',
                        color: formBrand === b ? '#ffffff' : 'var(--text3)',
                        fontWeight: formBrand === b ? '600' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px' }}>
                  BTU / Cooling Capacity
                </label>
                <input 
                  type="text" 
                  value={formBtu} 
                  onChange={(e) => setFormBtu(e.target.value)} 
                  placeholder="เช่น 160,000 หรือ 454 kW"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 10px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Spec/Model */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={12} /> spec / model
              </label>
              <input 
                type="text" 
                value={formSpecModel} 
                onChange={(e) => setFormSpecModel(e.target.value)} 
                placeholder="เช่น 40QBY060X-10FW, EIA05CPNC1A, Belt:B-50"
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border)', padding: '0 12px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* SECTION 3: Maintenance Remarks & Status */}
          <div style={{ 
            background: 'var(--surface2)', 
            border: `1px solid ${formNote ? '#fca5a5' : 'var(--border)'}`, 
            borderRadius: '10px', 
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: formNote ? '#dc2626' : 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} style={{ color: formNote ? '#dc2626' : 'var(--accent)' }} /> 
                Maintenance Remarks &amp; Status (หมายเหตุ)
              </div>
              {editingItem?.noteUpdatedAt && (
                <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} style={{ color: 'var(--accent)' }} /> 
                  แก้ไขล่าสุด: <strong>{formatDateTime(editingItem.noteUpdatedAt)}</strong>
                </span>
              )}
            </div>

            {/* Quick Status Presets for instant single-click filling */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: 'ปกติ (Normal)', val: '', bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '#a7f3d0' },
                { label: 'น้ำยารั่ว', val: 'น้ำยารั่ว', bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '#fca5a5' },
                { label: 'คอมเสีย', val: 'คอมเสีย', bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '#fca5a5' },
                { label: 'ไม่เย็น (รั่ว)', val: 'ไม่เย็น (รั่ว)', bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '#fca5a5' },
                { label: 'เสีย ไม่ได้ล้าง', val: 'เสีย ไม่ได้ล้าง', bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '#fde68a' },
                { label: 'รออะไหล่', val: 'รออะไหล่', bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '#fde68a' }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setFormNote(preset.val)}
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: formNote === preset.val ? preset.bg : 'var(--surface)',
                    color: formNote === preset.val ? preset.color : 'var(--text2)',
                    border: `1px solid ${formNote === preset.val ? preset.border : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Remarks Textarea */}
            <textarea 
              rows={3} 
              value={formNote} 
              onChange={(e) => setFormNote(e.target.value)} 
              placeholder="พิมพ์หมายเหตุ หรือคลิกเลือกสถานะด่วนด้านบน..."
              style={{ 
                width: '100%', 
                boxSizing: 'border-box',
                borderRadius: '8px', 
                border: `1px solid ${formNote ? '#fca5a5' : 'var(--border)'}`, 
                padding: '8px 12px', 
                fontSize: '13px', 
                background: 'var(--surface)',
                color: 'var(--text)',
                resize: 'vertical',
                minHeight: '70px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            {/* Checkbox for Cleaned Status */}
            <div 
              onClick={() => setFormIsCleaned(!formIsCleaned)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: formIsCleaned ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)',
                border: `1px solid ${formIsCleaned ? '#10b981' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <input 
                type="checkbox"
                checked={formIsCleaned}
                onChange={(e) => setFormIsCleaned(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                onClick={(e) => e.stopPropagation()}
              />
              <div>
                <strong style={{ fontSize: '13px', color: formIsCleaned ? '#059669' : 'var(--text)' }}>
                  ผรม. ล้างแอร์เรียบร้อยแล้ว (Cleaned by Contractor)
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block' }}>
                  {formIsCleaned ? '✓ ติ๊กไว้แล้วว่าเครื่องนี้ผ่านการล้างทำความสะอาดแล้ว' : 'ติ๊กเลือกหากผู้รับเหมาทำการล้างแอร์เครื่องนี้แล้ว'}
                </span>
              </div>
            </div>

            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              💡 ระบบจะบันทึกวันที่และเวลาแก้ไขล่าสุดลงฐานข้อมูลให้อัตโนมัติเมื่อกดบันทึก
            </span>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Equipment Unit"
        message={`Are you sure you want to remove "${deleteModal.item?.newCode || deleteModal.item?.location}" (${deleteModal.item?.supplier} No.${deleteModal.item?.itemNo}) from the Services Database?`}
        confirmText="Delete Unit"
      />
    </div>
  );
}
