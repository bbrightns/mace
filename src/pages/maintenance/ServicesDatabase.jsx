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
  Building2, 
  Layers, 
  CheckCircle2, 
  Filter,
  Save,
  Server,
  Zap,
  Info
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  batchWriteOperations 
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/Toast';

// 37 Initial Records based on factory master data
export const INITIAL_SERVICES_DATA = [
  // SiamTemp - Plant MIR (No. 1-6)
  {
    supplier: 'SiamTemp',
    plant: 'MIR',
    itemNo: 1,
    newCode: 'MIR-DE-1',
    brand: 'Carrier',
    location: 'CDU 38AE016 1 ตัว',
    btu: '160,000',
    specModel: 'Belt:B-50',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'SiamTemp',
    plant: 'MIR',
    itemNo: 2,
    newCode: 'MIR-DE-1',
    brand: 'Carrier',
    location: 'CDU 38AE050 2 ตัว',
    btu: '548,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'SiamTemp',
    plant: 'MIR',
    itemNo: 3,
    newCode: 'MIR-DE-1',
    brand: 'Carrier',
    location: 'AHU 39G1319 1 ตัว',
    btu: '200,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'SiamTemp',
    plant: 'MIR',
    itemNo: 4,
    newCode: 'MIR-DE-1',
    brand: '',
    location: 'AHU 120,000-200,000 BTU 1 ตัว',
    btu: '120,000-200,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'SiamTemp',
    plant: 'MIR',
    itemNo: 5,
    newCode: 'MIR-DE-1',
    brand: '',
    location: 'OAU 39G1319 2 ตัว',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'SiamTemp',
    plant: 'MIR',
    itemNo: 6,
    newCode: 'MIR-DE-1',
    brand: '',
    location: 'CDU 38LHU1505301',
    btu: '150,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },

  // Thai-Top-Therm - Plant RFG (No. 1-2)
  {
    supplier: 'Thai-Top-Therm',
    plant: 'RFG',
    itemNo: 1,
    newCode: 'RFG-CP-1',
    brand: 'Linkwell Electric',
    location: 'Benteler Washing Machine',
    btu: '',
    specModel: 'EIA05CPNC1A (220V, 1.7A, R134a), 500W/550W',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Thai-Top-Therm',
    plant: 'RFG',
    itemNo: 2,
    newCode: 'RFG-CP-2',
    brand: 'Linkwell Electric',
    location: 'DVT Unload',
    btu: '',
    specModel: 'EIA05CPNC1A (220V, 1.7A, R134a), 500W/550W',
    note: '',
    noteUpdatedAt: null
  },

  // Thai-Top-Therm - Plant MIR (No. 3-8)
  {
    supplier: 'Thai-Top-Therm',
    plant: 'MIR',
    itemNo: 3,
    newCode: 'MIR-CP-1',
    brand: 'Linkwell Electric',
    location: 'SB04 Control panel no.1',
    btu: '',
    specModel: 'EIA10CPNC1A (220V, 7A/7.5A, R134a), 1100W/1300W',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Thai-Top-Therm',
    plant: 'MIR',
    itemNo: 4,
    newCode: 'MIR-CP-2',
    brand: 'Linkwell Electric',
    location: 'SB04 Control panel no.2',
    btu: '',
    specModel: 'EIA10CPNC1A (220V, 7A/7.5A, R134a), 1100W/1300W',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Thai-Top-Therm',
    plant: 'MIR',
    itemNo: 5,
    newCode: 'MIR-CP-3',
    brand: '',
    location: 'SB04 Magnetic panel no.1',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Thai-Top-Therm',
    plant: 'MIR',
    itemNo: 6,
    newCode: 'MIR-CP-4',
    brand: '',
    location: 'SB04 Magnetic panel no.2',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Thai-Top-Therm',
    plant: 'MIR',
    itemNo: 7,
    newCode: 'MIR-CP-5',
    brand: 'Toptherm',
    location: 'Cutting Botero',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Thai-Top-Therm',
    plant: 'MIR',
    itemNo: 8,
    newCode: 'MIR-CP-6',
    brand: 'STAR AIRE',
    location: 'SB03 Interlock Cabinet',
    btu: '1,800',
    specModel: 'M-18',
    note: '',
    noteUpdatedAt: null
  },

  // Carrier - Plant RFG (No. 1-5)
  {
    supplier: 'Carrier',
    plant: 'RFG',
    itemNo: 1,
    newCode: 'RFG-CH-1',
    brand: 'Toyo Carrier',
    location: 'Chiller 1',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Carrier',
    plant: 'RFG',
    itemNo: 2,
    newCode: 'RFG-CH-2',
    brand: 'Toyo Carrier',
    location: 'Chiller 2',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Carrier',
    plant: 'RFG',
    itemNo: 3,
    newCode: 'RFG-CH-3',
    brand: 'Carrier',
    location: 'Chiller 3',
    btu: '',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Carrier',
    plant: 'RFG',
    itemNo: 4,
    newCode: 'RFG-CH-4',
    brand: 'Carrier',
    location: 'Chiller 4',
    btu: '',
    specModel: '454 kW',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'Carrier',
    plant: 'RFG',
    itemNo: 5,
    newCode: 'RFG-CH-5',
    brand: 'Carrier',
    location: 'Chiller 5',
    btu: '',
    specModel: '454 kW',
    note: '',
    noteUpdatedAt: null
  },

  // KB Cool - Plant RFG (No. 1-14)
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 1,
    newCode: 'RFG-1',
    brand: 'Carrier',
    location: 'P/S Room Entry/ตั้งพื้น',
    btu: '60,000',
    specModel: '40QBY060X-10FW',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 2,
    newCode: 'RFG-2',
    brand: '',
    location: 'O/P Room เล็ก',
    btu: '12,500',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 3,
    newCode: 'RFG-3',
    brand: 'Carrier',
    location: 'P/S Room',
    btu: '25,419',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 4,
    newCode: 'RFG-4',
    brand: 'Carrier',
    location: 'P/S Room หน้าตู้ Auxiliary',
    btu: '25,419',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 5,
    newCode: 'RFG-5',
    brand: 'Carrier',
    location: 'P/S Room ตัวกลางห้องตั้งพื้น',
    btu: '60,000',
    specModel: '40QBY060X-10FW',
    note: 'น้ำยารั่ว',
    noteUpdatedAt: '2026-09-16T16:00:00.000Z'
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 6,
    newCode: 'RFG-6',
    brand: 'Carrier',
    location: 'P/S Room ตั้งพื้น ติดประตู',
    btu: '100,000',
    specModel: 'ติดตั้ง 2025',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 7,
    newCode: 'RFG-7',
    brand: 'Carrier',
    location: 'O/P Room ใหญ่',
    btu: '36,100',
    specModel: '42TGF0361CP',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 8,
    newCode: 'RFG-8',
    brand: 'Carrier',
    location: 'P/S Room unload ติดประตู',
    btu: '24,918',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 9,
    newCode: 'RFG-9',
    brand: 'Carrier',
    location: 'P/S Room unload ติดกำแพง office',
    btu: '100,000',
    specModel: 'ติดตั้ง 2024',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 10,
    newCode: 'RFG-10',
    brand: 'Carrier',
    location: 'Dark room',
    btu: '25,419',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 11,
    newCode: 'RFG-11',
    brand: 'Carrier',
    location: 'Optoplex No.1',
    btu: '24,918',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 12,
    newCode: 'RFG-12',
    brand: 'Carrier',
    location: 'Optoplex No.2',
    btu: '24,918',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 13,
    newCode: 'RFG-13',
    brand: 'Daikin',
    location: 'Small Temper ซ้าย',
    btu: '13,000',
    specModel: '',
    note: 'คอมเสีย',
    noteUpdatedAt: '2026-09-16T16:00:00.000Z'
  },
  {
    supplier: 'KB Cool',
    plant: 'RFG',
    itemNo: 14,
    newCode: 'RFG-14',
    brand: 'Daikin',
    location: 'Small Temper ขวา',
    btu: '13,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },

  // KB Cool - Plant MIR (No. 15-18)
  {
    supplier: 'KB Cool',
    plant: 'MIR',
    itemNo: 15,
    newCode: 'MIR-3',
    brand: 'Daikin',
    location: 'SB03 Control Cabinet',
    btu: '24,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'MIR',
    itemNo: 16,
    newCode: 'MIR-4',
    brand: 'Carrier',
    location: 'LOGO Control Room',
    btu: '9,000',
    specModel: '',
    note: 'เสีย ไม่ได้ล้าง',
    noteUpdatedAt: '2026-09-16T16:00:00.000Z'
  },
  {
    supplier: 'KB Cool',
    plant: 'MIR',
    itemNo: 17,
    newCode: 'MIR-5',
    brand: 'Carrier',
    location: 'SB-01 Control Room',
    btu: '25,000',
    specModel: '',
    note: '',
    noteUpdatedAt: null
  },
  {
    supplier: 'KB Cool',
    plant: 'MIR',
    itemNo: 18,
    newCode: 'MIR-6',
    brand: 'Daikin',
    location: 'SB-02 Control Room',
    btu: '24,000',
    specModel: '',
    note: 'ไม่เย็น (รั่ว)',
    noteUpdatedAt: '2026-09-16T16:00:00.000Z'
  }
];

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
  const [filterIssueOnly, setFilterIssueOnly] = useState(false);

  // Inline editing state for "หมายเหตุ"
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineNoteValue, setInlineNoteValue] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);

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

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });

  // Sync with Firestore collection: mace_services_database
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCollection(
      'mace_services_database',
      (items) => {
        if (items && items.length > 0) {
          // Sort items naturally: by supplier, plant, itemNo
          const sorted = [...items].sort((a, b) => {
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
          // If Firestore collection is empty, automatically seed with 37 initial items!
          seedInitialData();
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore subscription fallback to local cache:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Seed default 37 records to Firestore
  const seedInitialData = async () => {
    try {
      const ops = INITIAL_SERVICES_DATA.map((item, idx) => ({
        type: 'set',
        collectionName: 'mace_services_database',
        id: `service_unit_${String(idx + 1).padStart(3, '0')}`,
        data: {
          ...item,
          createdAt: new Date().toISOString()
        }
      }));
      await batchWriteOperations(ops);
      setUnits(INITIAL_SERVICES_DATA);
      try {
        localStorage.setItem('mace_services_database_cache', JSON.stringify(INITIAL_SERVICES_DATA));
      } catch (e) {}
    } catch (err) {
      console.error('Failed to seed initial data:', err);
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

  // Save inline note
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

    // Save to Firestore
    try {
      if (unit.id) {
        await updateDocument('mace_services_database', unit.id, {
          note: newNote,
          noteUpdatedAt: newNote ? nowIso : null
        });
      } else {
        // Find by itemNo & supplier if ID was not yet attached
        const createdId = await createDocument('mace_services_database', {
          ...unit,
          note: newNote,
          noteUpdatedAt: newNote ? nowIso : null
        });
        unit.id = createdId;
      }
      showToast('อัปเดตหมายเหตุเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Error saving inline note:', err);
      showToast('บันทึกลงฐานข้อมูลไม่สำเร็จ แต่บันทึกลงเครื่องแล้ว', 'info');
    } finally {
      setIsSavingInline(false);
      setInlineEditingId(null);
      setInlineNoteValue('');
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
    setIsModalOpen(true);
  };

  // Submit Modal Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      supplier: formSupplier,
      plant: formPlant,
      itemNo: Number(formItemNo) || formItemNo,
      newCode: formNewCode.trim(),
      brand: formBrand.trim(),
      location: formLocation.trim(),
      btu: formBtu.trim(),
      specModel: formSpecModel.trim(),
      note: formNote.trim(),
      noteUpdatedAt: formNote.trim() ? (editingItem?.note !== formNote.trim() ? new Date().toISOString() : editingItem?.noteUpdatedAt || new Date().toISOString()) : null
    };

    try {
      if (editingItem && editingItem.id) {
        await updateDocument('mace_services_database', editingItem.id, payload);
        showToast('แก้ไขข้อมูลอุปกรณ์เรียบร้อยแล้ว', 'success');
      } else {
        await createDocument('mace_services_database', payload);
        showToast('เพิ่มอุปกรณ์ใหม่เข้าสู่ Services Database สำเร็จ', 'success');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save service unit:', err);
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  // Handle Delete Unit
  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    try {
      if (deleteModal.item.id) {
        await deleteDocument('mace_services_database', deleteModal.item.id);
      } else {
        const next = units.filter(u => u !== deleteModal.item);
        setUnits(next);
        localStorage.setItem('mace_services_database_cache', JSON.stringify(next));
      }
      showToast('ลบรายการออกจากฐานข้อมูลเรียบร้อยแล้ว', 'info');
      setDeleteModal({ isOpen: false, item: null });
    } catch (err) {
      console.error('Error deleting unit:', err);
      showToast('ไม่สามารถลบรายการได้', 'error');
    }
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    if (!units.length) return;
    const headers = ['Supplier', 'Plant', 'No.', 'ชื่อใหม่ (New Code)', 'Brand', 'Location', 'BTU', 'spec/model', 'หมายเหตุ (Remarks)', 'แก้ไขล่าสุด (Last Updated)'];
    const rows = filteredUnits.map(u => [
      `"${u.supplier || ''}"`,
      `"${u.plant || ''}"`,
      `"${u.itemNo || ''}"`,
      `"${u.newCode || ''}"`,
      `"${u.brand || ''}"`,
      `"${(u.location || '').replace(/"/g, '""')}"`,
      `"${u.btu || ''}"`,
      `"${(u.specModel || '').replace(/"/g, '""')}"`,
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
        if (!matchCode && !matchLoc && !matchBrand && !matchSpec && !matchBtu && !matchSupplier && !matchNote) {
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

      // Filter Issue Only
      if (filterIssueOnly && !u.note) {
        return false;
      }

      return true;
    });
  }, [units, search, filterSupplier, filterPlant, filterIssueOnly]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = units.length;
    const rfgCount = units.filter(u => u.plant === 'RFG').length;
    const mirCount = units.filter(u => u.plant === 'MIR').length;
    const issueCount = units.filter(u => u.note && u.note.trim().length > 0).length;
    const bySupplier = {
      'SiamTemp': units.filter(u => u.supplier === 'SiamTemp').length,
      'Thai-Top-Therm': units.filter(u => u.supplier === 'Thai-Top-Therm').length,
      'Carrier': units.filter(u => u.supplier === 'Carrier').length,
      'KB Cool': units.filter(u => u.supplier === 'KB Cool').length
    };
    return { total, rfgCount, mirCount, issueCount, bySupplier };
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn" 
            onClick={seedInitialData}
            title="คืนค่าข้อมูลเริ่มต้น 37 รายการ"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
          >
            <RefreshCw size={14} />
            <span>Reset Master Data</span>
          </button>

          <button 
            className="btn" 
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        {/* Card 1: Total Units */}
        <div className="card" style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Server size={13} style={{ color: 'var(--accent)' }} />
            Total Equipment
          </span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text)', marginTop: '4px' }}>
            {metrics.total} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text3)' }}>units</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
            Plant RFG: <strong style={{ color: '#3b82f6' }}>{metrics.rfgCount}</strong> | MIR: <strong style={{ color: '#8b5cf6' }}>{metrics.mirCount}</strong>
          </div>
        </div>

        {/* Card 2: KB Cool */}
        <div className="card" style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: '#0891b2', textTransform: 'uppercase', fontWeight: '600' }}>
            KB Cool (Air Cond)
          </span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0891b2', marginTop: '4px' }}>
            {metrics.bySupplier['KB Cool']} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text3)' }}>units</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
            RFG (14) • MIR (4)
          </div>
        </div>

        {/* Card 3: Thai-Top-Therm */}
        <div className="card" style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: '#4f46e5', textTransform: 'uppercase', fontWeight: '600' }}>
            Thai-Top-Therm (C/P)
          </span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4f46e5', marginTop: '4px' }}>
            {metrics.bySupplier['Thai-Top-Therm']} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text3)' }}>units</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
            RFG (2) • MIR (6)
          </div>
        </div>

        {/* Card 4: SiamTemp & Carrier */}
        <div className="card" style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', color: '#db2777', textTransform: 'uppercase', fontWeight: '600' }}>
            SiamTemp & Carrier
          </span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text)', marginTop: '4px' }}>
            {metrics.bySupplier['SiamTemp'] + metrics.bySupplier['Carrier']} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text3)' }}>units</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
            SiamTemp: 6 • Carrier Chiller: 5
          </div>
        </div>

        {/* Card 5: Issues / Repairs Pending */}
        <div 
          className="card" 
          onClick={() => setFilterIssueOnly(prev => !prev)}
          style={{ 
            padding: '12px 16px', 
            background: filterIssueOnly ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)', 
            border: `1px solid ${filterIssueOnly ? '#ef4444' : 'var(--border)'}`,
            cursor: 'pointer'
          }}
          title="คลิกเพื่อกรองเฉพาะรายการที่มีหมายเหตุ / ปัญหา"
        >
          <span style={{ fontSize: '11px', color: '#dc2626', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={13} style={{ color: '#dc2626' }} />
            Issues / หมายเหตุเสีย
          </span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>
            {metrics.issueCount} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text3)' }}>issues</span>
          </div>
          <div style={{ fontSize: '11px', color: filterIssueOnly ? '#b91c1c' : 'var(--text3)', marginTop: '2px', fontWeight: filterIssueOnly ? '600' : 'normal' }}>
            {filterIssueOnly ? '✓ กำลังกรองเฉพาะรายการเสีย' : 'คลิกเพื่อดูเฉพาะเครื่องมีปัญหา'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div 
        className="card controls-bar" 
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
        <div style={{ position: 'relative', width: '260px', minWidth: '200px' }}>
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

      {/* Main Database Table */}
      <div className="card table-container" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="data-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ width: '120px', padding: '10px 12px', textAlign: 'left' }}>Supplier</th>
              <th style={{ width: '60px', padding: '10px 8px', textAlign: 'center' }}>Plant</th>
              <th style={{ width: '45px', padding: '10px 8px', textAlign: 'center' }}>No.</th>
              <th style={{ width: '105px', padding: '10px 10px', textAlign: 'left' }}>ชื่อใหม่</th>
              <th style={{ width: '110px', padding: '10px 10px', textAlign: 'left' }}>Brand</th>
              <th style={{ width: '220px', padding: '10px 12px', textAlign: 'left' }}>Location</th>
              <th style={{ width: '110px', padding: '10px 10px', textAlign: 'right' }}>BTU</th>
              <th style={{ width: '180px', padding: '10px 10px', textAlign: 'left' }}>spec/model</th>
              <th style={{ width: '240px', padding: '10px 12px', textAlign: 'left', background: 'rgba(245, 158, 11, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>หมายเหตุ</span>
                  <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 'normal' }}>(คลิกเพื่อแก้ไข)</span>
                </div>
              </th>
              <th style={{ width: '135px', padding: '10px 10px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} style={{ color: 'var(--text3)' }} />
                  <span>แก้ไขล่าสุด</span>
                </div>
              </th>
              <th style={{ width: '80px', padding: '10px 8px', textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text3)' }}>
                  <Info size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</div>
                </td>
              </tr>
            ) : (
              filteredUnits.map((unit, index) => {
                const theme = SUPPLIER_THEMES[unit.supplier] || { badgeBg: 'var(--surface2)', badgeColor: 'var(--text)', borderColor: 'var(--border)' };
                const isEditingThis = inlineEditingId === (unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}`);
                const hasIssue = Boolean(unit.note && unit.note.trim());

                return (
                  <tr 
                    key={unit.id || `${unit.supplier}-${unit.plant}-${unit.itemNo}-${index}`}
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: hasIssue ? 'rgba(239, 68, 68, 0.02)' : undefined,
                      transition: 'background-color 0.15s'
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
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

                    {/* หมายเหตุ (Inline Editable!) */}
                    <td 
                      style={{ 
                        padding: '6px 10px', 
                        backgroundColor: isEditingThis ? 'rgba(59, 130, 246, 0.08)' : (hasIssue ? 'rgba(239, 68, 68, 0.06)' : undefined),
                        borderRadius: '4px'
                      }}
                    >
                      {isEditingThis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <input 
                            type="text"
                            value={inlineNoteValue}
                            onChange={(e) => setInlineNoteValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInlineNote(unit);
                              } else if (e.key === 'Escape') {
                                handleCancelInlineEdit();
                              }
                            }}
                            autoFocus
                            placeholder="พิมพ์หมายเหตุ (เช่น น้ำยารั่ว, เสีย, ปกติ)..."
                            className="form-input"
                            style={{ 
                              height: '30px', 
                              fontSize: '12px', 
                              padding: '2px 8px',
                              width: '100%',
                              borderColor: 'var(--accent)'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineNote(unit)}
                              disabled={isSavingInline}
                              className="btn btn-sm btn-primary"
                              style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Check size={12} />
                              <span>บันทึก</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelInlineEdit}
                              disabled={isSavingInline}
                              className="btn btn-sm"
                              style={{ height: '24px', padding: '0 6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                              <X size={12} />
                              <span>ยกเลิก</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleStartInlineEdit(unit)}
                          style={{ 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: '6px',
                            minHeight: '26px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px dashed transparent',
                            transition: 'border-color 0.15s, background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.backgroundColor = 'var(--surface2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="คลิกเพื่อแก้ไขหมายเหตุ"
                        >
                          {hasIssue ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              color: '#dc2626', 
                              fontWeight: '600' 
                            }}>
                              <AlertTriangle size={12} style={{ color: '#dc2626', flexShrink: 0 }} />
                              <span>{unit.note}</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '11.5px' }}>
                              + เพิ่มหมายเหตุ
                            </span>
                          )}
                          <Edit2 size={11} style={{ color: 'var(--text3)', opacity: 0.6, flexShrink: 0 }} />
                        </div>
                      )}
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

      {/* MODAL: ADD / EDIT SERVICE UNIT */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? `Edit Equipment (${editingItem.newCode || editingItem.location})` : 'Add New Equipment to Services Database'}
        footerActions={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="service-unit-form" className="btn btn-primary">
              <Save size={14} style={{ marginRight: '4px' }} />
              <span>Save Equipment</span>
            </button>
          </div>
        }
      >
        <form id="service-unit-form" onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Supplier *</label>
              <select 
                className="form-select"
                value={formSupplier} 
                onChange={(e) => setFormSupplier(e.target.value)}
                required
              >
                <option value="SiamTemp">SiamTemp</option>
                <option value="Thai-Top-Therm">Thai-Top-Therm</option>
                <option value="Carrier">Carrier</option>
                <option value="KB Cool">KB Cool</option>
              </select>
            </div>
            <div>
              <label className="form-label">Plant *</label>
              <select 
                className="form-select"
                value={formPlant} 
                onChange={(e) => setFormPlant(e.target.value)}
                required
              >
                <option value="RFG">RFG</option>
                <option value="MIR">MIR</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <div>
              <label className="form-label">No. *</label>
              <input 
                type="number" 
                className="form-input" 
                value={formItemNo} 
                onChange={(e) => setFormItemNo(e.target.value)} 
                required 
                placeholder="1, 2, 3..."
              />
            </div>
            <div>
              <label className="form-label">ชื่อใหม่ (New Code) *</label>
              <input 
                type="text" 
                className="form-input" 
                value={formNewCode} 
                onChange={(e) => setFormNewCode(e.target.value)} 
                required 
                placeholder="เช่น RFG-1, MIR-CP-1, MIR-DE-1"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Brand</label>
              <input 
                type="text" 
                className="form-input" 
                value={formBrand} 
                onChange={(e) => setFormBrand(e.target.value)} 
                placeholder="Carrier, Daikin, Linkwell Electric..."
              />
            </div>
            <div>
              <label className="form-label">BTU / Power</label>
              <input 
                type="text" 
                className="form-input" 
                value={formBtu} 
                onChange={(e) => setFormBtu(e.target.value)} 
                placeholder="60,000 หรือ 454 kW"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Location / ตำแหน่งติดตั้ง *</label>
            <input 
              type="text" 
              className="form-input" 
              value={formLocation} 
              onChange={(e) => setFormLocation(e.target.value)} 
              required
              placeholder="เช่น P/S Room หน้าตู้ Auxiliary, O/P Room ใหญ่"
            />
          </div>

          <div>
            <label className="form-label">spec/model</label>
            <input 
              type="text" 
              className="form-input" 
              value={formSpecModel} 
              onChange={(e) => setFormSpecModel(e.target.value)} 
              placeholder="40QBY060X-10FW, EIA05CPNC1A..."
            />
          </div>

          <div>
            <label className="form-label">หมายเหตุ (Remarks)</label>
            <textarea 
              className="form-input" 
              rows={3} 
              value={formNote} 
              onChange={(e) => setFormNote(e.target.value)} 
              placeholder="ระบุสถานะ เช่น น้ำยารั่ว, คอมเสีย, รออะไหล่ หรือข้อความอื่นๆ..."
            />
            <span style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px', display: 'block' }}>
              * เมื่อบันทึกหมายเหตุ ระบบจะอัปเดตวันที่แก้ไขล่าสุดให้อัตโนมัติ
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
