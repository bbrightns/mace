import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ShoppingBag, 
  CheckSquare, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Check, 
  X, 
  TrendingUp, 
  Calendar, 
  Filter, 
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Upload,
  Download
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  batchWriteOperations
} from '../../firebase/collections';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate, formatBaht } from '../../utils';

// Sample data to seed matched to Notion and Excel screenshots
const SAMPLE_EXCEL_ITEMS = [
  { name: "MIR - Card I/O CC-Link IE for Loading cabinet", plant: "MIR", type: "Project", plan: "Out of plan", price: 15160, budget: "Repairing", issueDate: "2025-12-18", status: "Received" },
  { name: "RFG - Heater for water tank Benteler", plant: "RFG", type: "Spare part", plan: "Out of plan", price: 9300, budget: "Repairing", issueDate: "2025-12-18", status: "Received" },
  { name: "MIR - CCTV Explosion proof for Base paint room", plant: "MIR", type: "Project", plan: "Out of plan", price: 24900, budget: "Repairing", issueDate: "2025-12-30", status: "Received" },
  { name: "MIR - Signal light of Interlock system at Load and Unload", plant: "MIR", type: "Project", plan: "Out of plan", price: 19770, budget: "Repairing", issueDate: "2026-01-14", status: "PR" },
  { name: "MIR - Replace new pH electrode for Waste water plant", plant: "MIR", type: "Repair", plan: "Out of plan", price: 56500, budget: "Repairing", issueDate: "2026-01-16", status: "New" },
  { name: "RFG - Replace new pH electrode for Water plant", plant: "RFG", type: "Repair", plan: "Out of plan", price: 35500, budget: "Repairing", issueDate: "2026-01-16", status: "Wait Budget Unlock" },
  { name: "RFG - WAGO Inline splicing connector with lever", plant: "RFG", type: "Spare part", plan: "Out of plan", price: 2660.8, budget: "Repairing", issueDate: "2026-01-16", status: "PO" },
  { name: "RFG - Tower lamp LED for Vacuum chuck", plant: "RFG", type: "Spare part", plan: "Out of plan", price: 6780, budget: "Repairing", issueDate: "2026-01-17", status: "Request Quo." },
  { name: "RFG - Profibus connector", plant: "RFG", type: "Spare part", plan: "Out of plan", price: 37050, budget: "Repairing", issueDate: "2026-01-20", status: "PR" },
  { name: "MIR - Power meter for measure power consumption", plant: "MIR", type: "Project", plan: "Out of plan", price: 23940, budget: "Repairing", issueDate: "2026-01-20", status: "PR" },
  { name: "MIR - Pipe and tools for laying new cable at WWA", plant: "MIR", type: "Project", plan: "Out of plan", price: 7465, budget: "Repairing", issueDate: "2026-01-20", status: "New" },
  { name: "MIR - Router and LAN cable for Com datalog", plant: "MIR", type: "Project", plan: "Out of plan", price: 7980, budget: "Repairing", issueDate: "2026-01-22", status: "PO" },
  { name: "MIR - New motor mix paint zone1 Ex", plant: "MIR", type: "Spare part", plan: "Out of plan", price: 88800, budget: "Investment", issueDate: "2026-01-22", status: "Wait Budget Unlock" },
  { name: "MIR - Speaker TOA in Office", plant: "MIR", type: "Spare part", plan: "Out of plan", price: 2200, budget: "Repairing", issueDate: "2026-01-22", status: "Received" },
  { name: "RFG - Float level switch DIY", plant: "RFG", type: "Spare part", plan: "Out of plan", price: 2170, budget: "Repairing", issueDate: "2026-01-22", status: "Declined" },
  { name: "MIR - Cable for Waste water plant", plant: "MIR", type: "Project", plan: "Out of plan", price: 50764, budget: "Repairing", issueDate: "2026-02-03", status: "PO" },
  { name: "MIR - Pressure Switch for Paint Oven", plant: "MIR", type: "Spare part", plan: "Out of plan", price: 18950, budget: "Repairing", issueDate: "2026-02-03", status: "Received" },
  { name: "MIR - pH Buffer for Validate pH sensor", plant: "MIR", type: "Project", plan: "Out of plan", price: 2900, budget: "Repairing", issueDate: "2026-02-03", status: "New" },
  { name: "RFG - Nitride glove for Validate pH sensor", plant: "RFG", type: "Project", plan: "Out of plan", price: 240, budget: "Repairing", issueDate: "2026-02-03", status: "New" }
];

// Configuration of status styles matching Notion look
const STATUS_CONFIG = {
  'New': { label: 'New', color: '#94a3b8', bg: '#e2e8f0', border: '#cbd5e1', text: '#475569' },
  'Wait Budget Unlock': { label: 'Wait Budget Unlock', color: '#a855f7', bg: '#f3e8ff', border: '#e9d5ff', text: '#7e22ce' },
  'Request Quo.': { label: 'Request Quo.', color: '#eab308', bg: '#fef9c3', border: '#fde68a', text: '#a16207' },
  'PR': { label: 'PR', color: '#c27850', bg: '#f5ebe6', border: '#e6d5cb', text: '#8c5230' },
  'PO': { label: 'PO', color: '#3b82f6', bg: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8' },
  'Received': { label: 'Received', color: '#10b981', bg: '#dcfce7', border: '#bbf7d0', text: '#15803d' },
  'Declined': { label: 'Declined', color: '#ef4444', bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c' }
};

const STATUS_KEYS = ['New', 'Wait Budget Unlock', 'Request Quo.', 'PR', 'PO', 'Received', 'Declined'];

// Robust CSV Parser (RFC 4180 compliant)
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // Skip the next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

export default function Purchasing() {
  const [items, setItems] = useState([]); // Section 1: Shopping Board (mace_purchasing)
  const [ledgerItems, setLedgerItems] = useState([]); // Section 2: Budget Ledger (mace_budget_ledger)
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  
  // Search and Filter State
  const [globalFilter, setGlobalFilter] = useState('All'); // All, MIR, RFG
  const [boardSearch, setBoardSearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  // Standard Modal State for Add/Edit Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formPrice, setFormPrice] = useState('');
  const [formPlant, setFormPlant] = useState('MIR');
  const [formType, setFormType] = useState('Spare part');
  const [formPlan, setFormPlan] = useState('Out of plan');
  const [formBudget, setFormBudget] = useState('Repairing');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formStatus, setFormStatus] = useState('New');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Spreadsheet Table Inline State
  const [inlineEditingId, setInlineEditingId] = useState(null); // 'new-draft' or item ID
  const [inlineState, setInlineState] = useState({
    plant: 'MIR',
    name: '',
    type: 'Spare part',
    plan: 'Out of plan',
    price: 0,
    budget: 'Repairing',
    issueDate: '',
    status: 'New'
  });

  // Table Sorting State
  const [sortBy, setSortBy] = useState('issueDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Clear All Data State
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Editable Plant Budget Targets State (stored in localStorage)
  const [mirYearlyBudget, setMirYearlyBudget] = useState(() => {
    const saved = localStorage.getItem('mace_mir_yearly_budget');
    return saved ? Number(saved) : 1300000;
  });
  const [rfgYearlyBudget, setRfgYearlyBudget] = useState(() => {
    const saved = localStorage.getItem('mace_rfg_yearly_budget');
    return saved ? Number(saved) : 2300000;
  });

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [tempMirBudget, setTempMirBudget] = useState(mirYearlyBudget);
  const [tempRfgBudget, setTempRfgBudget] = useState(rfgYearlyBudget);

  const handleOpenBudgetModal = () => {
    setTempMirBudget(mirYearlyBudget);
    setTempRfgBudget(rfgYearlyBudget);
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudgets = (e) => {
    if (e) e.preventDefault();
    const mirVal = Number(tempMirBudget) || 0;
    const rfgVal = Number(tempRfgBudget) || 0;
    setMirYearlyBudget(mirVal);
    setRfgYearlyBudget(rfgVal);
    localStorage.setItem('mace_mir_yearly_budget', String(mirVal));
    localStorage.setItem('mace_rfg_yearly_budget', String(rfgVal));
    setIsBudgetModalOpen(false);
    showToast('Plant budget targets updated successfully!');
  };

  const { showToast } = useToast();

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      localStorage.setItem('mace_purchasing_cleared', 'true');
      for (const item of items) {
        await deleteDocument('mace_purchasing', item.id);
      }
      for (const item of ledgerItems) {
        await deleteDocument('mace_budget_ledger', item.id);
      }
      showToast('All purchasing items and budget ledger records have been cleared.');
      setIsClearAllModalOpen(false);
    } catch (err) {
      showToast('Failed to clear purchasing data.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const loading = loadingBoard || loadingLedger;

  // Helper: Calculate week in a year from issue date
  const calculateWeekNum = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Copy date
    const tempDate = new Date(date.valueOf());
    // Get nearest Thursday
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    // Get first day of year
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  // Helper: format spreadsheet date (e.g., 18-Dec-25)
  const formatSpreadsheetDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const yearShort = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${yearShort}`;
  };

  // Helper: format CSV issue date (e.g., 18-Dec-25)
  const formatCsvIssueDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const yearShort = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${yearShort}`;
  };

  // Helper: parse CSV issue date (supports YYYY-MM-DD, d-mmm-yy like 18-Dec-25)
  const parseCsvIssueDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const s = dateStr.trim();
    
    // First try manual match for d-mmm-yy / d-mmm-yyyy (e.g. 18-Dec-25 or 18-Dec-2025 or 3-Feb-26)
    const match = s.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const yearStr = match[3];
      
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = months.indexOf(monthStr);
      
      if (monthIndex !== -1) {
        let year = parseInt(yearStr, 10);
        if (yearStr.length === 2) {
          year = year < 80 ? 2000 + year : 1900 + year;
        }
        
        const d = new Date(year, monthIndex, day);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }
    }

    // Otherwise use standard parsing
    const parsedD = new Date(s);
    if (!isNaN(parsedD.getTime())) {
      return parsedD.toISOString().split('T')[0];
    }

    return s;
  };

  // Synchronize with database
  useEffect(() => {
    // 1. Subscribe to mace_purchasing (Section 1: Shopping Board)
    const unsubscribeBoard = subscribeCollection('mace_purchasing', (data) => {
      const sanitized = data.map(doc => {
        let plant = doc.plant;
        if (!plant && doc.item) {
          if (doc.item.toUpperCase().includes('MIR')) plant = 'MIR';
          else if (doc.item.toUpperCase().includes('RFG')) plant = 'RFG';
        }
        
        let status = doc.status;
        if (status === 'Pending') status = 'New';
        if (status === 'Purchased') status = 'Received';
        if (!STATUS_KEYS.includes(status)) status = 'New';

        return {
          ...doc,
          plant: plant || 'General',
          name: doc.name || doc.item || 'Unnamed Item',
          type: doc.type || 'Spare part',
          plan: doc.plan || 'Out of plan',
          price: doc.price !== undefined ? doc.price : (doc.estimatedPrice || 0),
          qty: doc.qty || 1,
          budget: doc.budget || 'Repairing',
          issueDate: doc.issueDate || doc.requiredBy || new Date().toISOString().split('T')[0],
          status: status,
          remarks: doc.remarks || ''
        };
      });
      // Automatically seed mace_purchasing if it is empty and not explicitly cleared
      const isCleared = localStorage.getItem('mace_purchasing_cleared') === 'true';
      if (data.length === 0 && !isCleared) {
        Promise.all(
          SAMPLE_EXCEL_ITEMS.map(item => createDocument('mace_purchasing', {
            name: item.name,
            item: item.name,
            qty: 1,
            price: item.price,
            estimatedPrice: item.price,
            plant: item.plant,
            type: item.type,
            plan: item.plan,
            budget: item.budget,
            issueDate: item.issueDate,
            requiredBy: item.issueDate,
            status: item.status,
            remarks: 'Pre-seeded realistic shopping item'
          }))
        ).catch(err => console.error("Error auto-seeding shopping board:", err));
      }

      setItems(sanitized);
      setLoadingBoard(false);
    }, (error) => {
      showToast('Error syncing shopping list.', 'error');
      setLoadingBoard(false);
    });

    // 2. Subscribe to mace_budget_ledger (Section 2: Budget Spreadsheet Ledger)
    const unsubscribeLedger = subscribeCollection('mace_budget_ledger', (data) => {
      const sanitized = data.map(doc => {
        let plant = doc.plant || 'General';
        let status = doc.status || 'New';
        if (!STATUS_KEYS.includes(status)) status = 'New';

        return {
          ...doc,
          plant: plant,
          name: doc.name || doc.item || 'Unnamed Budget Entry',
          type: doc.type || 'Spare part',
          plan: doc.plan || 'Out of plan',
          price: doc.price !== undefined ? doc.price : 0,
          qty: doc.qty || 1,
          budget: doc.budget || 'Repairing',
          issueDate: doc.issueDate || new Date().toISOString().split('T')[0],
          status: status,
          remarks: doc.remarks || ''
        };
      });

      // Automatically seed mace_budget_ledger if it is empty and not explicitly cleared
      const isCleared = localStorage.getItem('mace_purchasing_cleared') === 'true';
      if (data.length === 0 && !isCleared) {
        Promise.all(
          SAMPLE_EXCEL_ITEMS.map(item => createDocument('mace_budget_ledger', {
            name: item.name,
            item: item.name,
            qty: 1,
            price: item.price,
            estimatedPrice: item.price,
            plant: item.plant,
            type: item.type,
            plan: item.plan,
            budget: item.budget,
            issueDate: item.issueDate,
            requiredBy: item.issueDate,
            status: item.status,
            remarks: 'Pre-seeded realistic budget item'
          }))
        ).catch(err => console.error("Error auto-seeding budget ledger:", err));
      }

      setLedgerItems(sanitized);
      setLoadingLedger(false);
    }, (error) => {
      showToast('Error syncing budget ledger.', 'error');
      setLoadingLedger(false);
    });

    return () => {
      unsubscribeBoard();
      unsubscribeLedger();
    };
  }, [showToast]);

  // Export Board (Section 1) to CSV
  const handleExportBoardCSV = () => {
    const dataToExport = boardFilteredItems;
    if (dataToExport.length === 0) {
      showToast("No board data available to export.", "error");
      return;
    }

    const headers = ["Plant", "Name", "Price (THB)", "Issue Date", "Status", "Remarks"];
    const rows = dataToExport.map(item => {
      const plant = item.plant || "";
      const name = item.name || "";
      const price = item.price || 0;
      const issueDate = formatCsvIssueDate(item.issueDate);
      const status = item.status || "";
      const remarks = item.remarks || "";
      
      return [plant, name, price, issueDate, status, remarks];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => {
        const stringVal = String(val === null || val === undefined ? '' : val);
        const cleanVal = stringVal.replace(/"/g, '""');
        if (cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"')) {
          return `"${cleanVal}"`;
        }
        return cleanVal;
      }).join(","))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `purchasing_shopping_board_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Shopping Board exported successfully as CSV!");
  };

  // Import Board (Section 1) from CSV
  const handleImportBoardCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      try {
        const rows = parseCSV(text);
        if (rows.length < 2) {
          showToast("Invalid CSV file: file is empty or lacks headers.", "error");
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        const plantIdx = headers.findIndex(h => h.includes("plant"));
        const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("item") || h.includes("material") || h.includes("part"));
        const priceIdx = headers.findIndex(h => h.includes("price") || h.includes("cost") || h.includes("baht") || h.includes("amount"));
        const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("issue") || h.includes("required"));
        const statusIdx = headers.findIndex(h => h.includes("status") || h.includes("procure") || h.includes("stage"));
        const remarksIdx = headers.findIndex(h => h.includes("remarks") || h.includes("supplier") || h.includes("note"));

        if (nameIdx === -1) {
          showToast("CSV must contain a 'Name' or 'Item' column.", "error");
          return;
        }

        setLoadingBoard(true);
        let count = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 1 && row[0] === "") continue;

          const nameVal = row[nameIdx]?.trim();
          if (!nameVal) continue;

          const plantVal = plantIdx !== -1 ? (row[plantIdx]?.trim() || "General") : "General";
          let plant = "General";
          if (plantVal.toUpperCase().includes("MIR")) plant = "MIR";
          else if (plantVal.toUpperCase().includes("RFG")) plant = "RFG";

          const priceStr = priceIdx !== -1 ? row[priceIdx]?.replace(/[^\d.-]/g, '') : "0";
          const priceVal = priceStr ? Number(priceStr) : 0;

          const dateVal = dateIdx !== -1 ? row[dateIdx]?.trim() : "";
          const issueDate = parseCsvIssueDate(dateVal);

          const statusVal = statusIdx !== -1 ? (row[statusIdx]?.trim() || "New") : "New";
          let status = "New";
          const matchedStatus = STATUS_KEYS.find(k => k.toLowerCase() === statusVal.toLowerCase() || STATUS_CONFIG[k].label.toLowerCase() === statusVal.toLowerCase());
          if (matchedStatus) {
            status = matchedStatus;
          } else {
            if (statusVal.toLowerCase().includes("wait") || statusVal.toLowerCase().includes("unlock")) status = "Wait Budget Unlock";
            else if (statusVal.toLowerCase().includes("quo") || statusVal.toLowerCase().includes("request")) status = "Request Quo.";
            else if (statusVal.toLowerCase() === "pr") status = "PR";
            else if (statusVal.toLowerCase() === "po") status = "PO";
            else if (statusVal.toLowerCase().includes("received") || statusVal.toLowerCase().includes("done") || statusVal.toLowerCase().includes("delivered")) status = "Received";
            else if (statusVal.toLowerCase().includes("decline") || statusVal.toLowerCase().includes("reject") || statusVal.toLowerCase().includes("cancel")) status = "Declined";
          }

          const remarksVal = remarksIdx !== -1 ? (row[remarksIdx]?.trim() || "Imported to Board") : "Imported to Board";

          const payload = {
            name: nameVal,
            item: nameVal,
            qty: 1,
            price: priceVal,
            estimatedPrice: priceVal,
            plant,
            type: "Spare part",
            plan: "Out of plan",
            budget: "Repairing",
            issueDate,
            requiredBy: issueDate,
            status,
            remarks: remarksVal
          };

          await createDocument('mace_purchasing', payload);
          count++;
        }

        showToast(`Successfully imported ${count} items to Shopping Board!`);
      } catch (err) {
        console.error(err);
        showToast("Failed to parse board CSV file.", "error");
      } finally {
        setLoadingBoard(false);
        if (event.target) event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Export Ledger (Section 2) to CSV
  const handleExportLedgerCSV = () => {
    const dataToExport = tableFilteredItems.length > 0 ? sortedTableItems : ledgerItems;
    if (dataToExport.length === 0) {
      showToast("No ledger data available to export.", "error");
      return;
    }

    const headers = ["Week", "Plant", "Name", "Type", "Plan", "Price (THB)", "Budget", "Issue Date", "Status", "Remarks"];
    const rows = dataToExport.map(item => {
      const week = calculateWeekNum(item.issueDate) || "";
      const plant = item.plant || "";
      const name = item.name || "";
      const type = item.type || "";
      const plan = item.plan || "";
      const price = item.price || 0;
      const budget = item.budget || "";
      const issueDate = formatCsvIssueDate(item.issueDate);
      const status = item.status || "";
      const remarks = item.remarks || "";
      
      return [
        week,
        plant,
        name,
        type,
        plan,
        price,
        budget,
        issueDate,
        status,
        remarks
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.map(val => {
        const stringVal = String(val === null || val === undefined ? '' : val);
        const cleanVal = stringVal.replace(/"/g, '""');
        if (cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"')) {
          return `"${cleanVal}"`;
        }
        return cleanVal;
      }).join(","))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `purchasing_budget_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Budget Ledger exported successfully as CSV!");
  };

  // Import Ledger (Section 2) from CSV
  const handleImportLedgerCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      try {
        const rows = parseCSV(text);
        if (rows.length < 2) {
          showToast("Invalid CSV file: file is empty or lacks headers.", "error");
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        const plantIdx = headers.findIndex(h => h.includes("plant"));
        const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("item") || h.includes("material") || h.includes("part"));
        const typeIdx = headers.findIndex(h => h.includes("type"));
        const planIdx = headers.findIndex(h => h.includes("plan"));
        const priceIdx = headers.findIndex(h => h.includes("price") || h.includes("cost") || h.includes("baht") || h.includes("amount"));
        const budgetIdx = headers.findIndex(h => h.includes("budget"));
        const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("issue") || h.includes("required"));
        const statusIdx = headers.findIndex(h => h.includes("status") || h.includes("procure") || h.includes("stage"));
        const remarksIdx = headers.findIndex(h => h.includes("remarks") || h.includes("supplier") || h.includes("note"));

        if (nameIdx === -1) {
          showToast("CSV must contain a 'Name' or 'Item' column.", "error");
          return;
        }

        setLoadingLedger(true);
        const operations = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 1 && row[0] === "") continue;

          const nameVal = row[nameIdx]?.trim();
          if (!nameVal) continue;

          const plantVal = plantIdx !== -1 ? (row[plantIdx]?.trim() || "General") : "General";
          let plant = "General";
          if (plantVal.toUpperCase().includes("MIR")) plant = "MIR";
          else if (plantVal.toUpperCase().includes("RFG")) plant = "RFG";

          const typeVal = typeIdx !== -1 ? (row[typeIdx]?.trim() || "Spare part") : "Spare part";
          let type = "Spare part";
          if (typeVal.toLowerCase().includes("project")) type = "Project";
          else if (typeVal.toLowerCase().includes("repair")) type = "Repair";

          const planVal = planIdx !== -1 ? (row[planIdx]?.trim() || "Out of plan") : "Out of plan";
          let plan = "Out of plan";
          if (planVal.toLowerCase().includes("in plan") || planVal.toLowerCase() === "in") plan = "In plan";

          const priceStr = priceIdx !== -1 ? row[priceIdx]?.replace(/[^\d.-]/g, '') : "0";
          const priceVal = priceStr ? Number(priceStr) : 0;

          const budgetVal = budgetIdx !== -1 ? (row[budgetIdx]?.trim() || "Repairing") : "Repairing";
          let budget = "Repairing";
          if (budgetVal.toLowerCase().includes("investment") || budgetVal.toLowerCase() === "capex") budget = "Investment";

          const dateVal = dateIdx !== -1 ? row[dateIdx]?.trim() : "";
          const issueDate = parseCsvIssueDate(dateVal);

          const statusVal = statusIdx !== -1 ? (row[statusIdx]?.trim() || "New") : "New";
          let status = "New";
          const matchedStatus = STATUS_KEYS.find(k => k.toLowerCase() === statusVal.toLowerCase() || STATUS_CONFIG[k].label.toLowerCase() === statusVal.toLowerCase());
          if (matchedStatus) {
            status = matchedStatus;
          } else {
            if (statusVal.toLowerCase().includes("wait") || statusVal.toLowerCase().includes("unlock")) status = "Wait Budget Unlock";
            else if (statusVal.toLowerCase().includes("quo") || statusVal.toLowerCase().includes("request")) status = "Request Quo.";
            else if (statusVal.toLowerCase() === "pr") status = "PR";
            else if (statusVal.toLowerCase() === "po") status = "PO";
            else if (statusVal.toLowerCase().includes("received") || statusVal.toLowerCase().includes("done") || statusVal.toLowerCase().includes("delivered")) status = "Received";
            else if (statusVal.toLowerCase().includes("decline") || statusVal.toLowerCase().includes("reject") || statusVal.toLowerCase().includes("cancel")) status = "Declined";
          }

          const remarksVal = remarksIdx !== -1 ? (row[remarksIdx]?.trim() || "Imported to Ledger") : "Imported to Ledger";

          operations.push({
            type: 'create',
            collectionName: 'mace_budget_ledger',
            data: {
              name: nameVal,
              item: nameVal,
              qty: 1,
              price: priceVal,
              estimatedPrice: priceVal,
              plant,
              type,
              plan,
              budget,
              issueDate,
              requiredBy: issueDate,
              status,
              remarks: remarksVal
            }
          });
        }

        if (operations.length > 0) {
          await batchWriteOperations(operations);
          showToast(`Successfully imported ${operations.length} items to Budget Ledger!`);
        } else {
          showToast("No valid rows found to import.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to parse ledger CSV file.", "error");
      } finally {
        setLoadingLedger(false);
        if (event.target) event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Open Add Dialog
  const handleOpenAdd = (initialStatus = 'New') => {
    setEditingItem(null);
    setFormName('');
    setFormQty(1);
    setFormPrice('');
    setFormPlant('MIR');
    setFormType('Spare part');
    setFormPlan('Out of plan');
    setFormBudget('Repairing');
    setFormIssueDate(new Date().toISOString().split('T')[0]);
    setFormStatus(initialStatus);
    setFormRemarks('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setFormName(target.name || '');
    setFormQty(target.qty || 1);
    setFormPrice(target.price || '');
    setFormPlant(target.plant || 'MIR');
    setFormType(target.type || 'Spare part');
    setFormPlan(target.plan || 'Out of plan');
    setFormBudget(target.budget || 'Repairing');
    setFormIssueDate(toInputDate(target.issueDate));
    setFormStatus(target.status || 'New');
    setFormRemarks(target.remarks || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Modal Form (Standard Add/Edit)
  const handleSubmitModal = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Item/part name is required.');
      return;
    }

    const priceVal = formPrice === '' ? 0 : Number(formPrice);
    const qtyVal = Number(formQty || 1);

    const payload = {
      name: formName.trim(),
      item: formName.trim(), // sync older name
      qty: qtyVal,
      price: priceVal,
      estimatedPrice: priceVal, // sync older price
      plant: formPlant,
      type: formType,
      plan: formPlan,
      budget: formBudget,
      issueDate: formIssueDate || new Date().toISOString().split('T')[0],
      requiredBy: formIssueDate || new Date().toISOString().split('T')[0], // sync older date
      status: formStatus,
      remarks: formRemarks.trim()
    };

    try {
      if (editingItem) {
        await updateDocument('mace_purchasing', editingItem.id, payload);
        showToast('Shopping item updated successfully.');
      } else {
        localStorage.removeItem('mace_purchasing_cleared');
        await createDocument('mace_purchasing', payload);
        showToast('New shopping item registered.');
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast('Error saving item details.', 'error');
    }
  };

  // Delete Action
  const handleDeleteItem = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteDocument('mace_purchasing', id);
        showToast('Item deleted successfully.');
        if (inlineEditingId === id) {
          setInlineEditingId(null);
        }
      } catch (err) {
        showToast('Error removing item.', 'error');
      }
    }
  };

  // Delete action for ledger items specifically
  const handleDeleteLedgerItem = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete budget item "${name}" from the spreadsheet?`)) {
      try {
        await deleteDocument('mace_budget_ledger', id);
        showToast('Budget item deleted successfully.');
        if (inlineEditingId === id) {
          setInlineEditingId(null);
        }
      } catch (err) {
        showToast('Error removing budget item.', 'error');
      }
    }
  };

  // Change Card Status on Board (quick dropdown)
  const handleMoveStatus = async (item, nextStatus) => {
    try {
      await updateDocument('mace_purchasing', item.id, { status: nextStatus });
      showToast(`Moved to ${STATUS_CONFIG[nextStatus]?.label}`);
    } catch (err) {
      showToast('Failed to move item status.', 'error');
    }
  };

  // Initiate Inline Spreadsheet Editing
  const startInlineEdit = (item) => {
    setInlineEditingId(item.id);
    setInlineState({
      plant: item.plant,
      name: item.name,
      type: item.type,
      plan: item.plan,
      price: item.price,
      budget: item.budget,
      issueDate: toInputDate(item.issueDate),
      status: item.status
    });
  };

  // Initiate Inline New Row (Inserting a new line)
  const startInlineAddRow = () => {
    setInlineEditingId('new-draft');
    setInlineState({
      plant: 'MIR',
      name: '',
      type: 'Spare part',
      plan: 'Out of plan',
      price: 0,
      budget: 'Repairing',
      issueDate: new Date().toISOString().split('T')[0],
      status: 'New'
    });
  };

  // Save Inline Edit or New Row
  const saveInlineEdit = async () => {
    if (!inlineState.name.trim()) {
      showToast('Item name is required for budget entry.', 'error');
      return;
    }

    const payload = {
      name: inlineState.name.trim(),
      item: inlineState.name.trim(),
      qty: 1,
      price: Number(inlineState.price || 0),
      estimatedPrice: Number(inlineState.price || 0),
      plant: inlineState.plant,
      type: inlineState.type,
      plan: inlineState.plan,
      budget: inlineState.budget,
      issueDate: inlineState.issueDate || new Date().toISOString().split('T')[0],
      requiredBy: inlineState.issueDate || new Date().toISOString().split('T')[0],
      status: inlineState.status || 'New',
      remarks: 'Saved from spreadsheet ledger'
    };

    try {
      if (inlineEditingId === 'new-draft') {
        await createDocument('mace_budget_ledger', payload);
        showToast('New budget entry inserted inline!');
      } else {
        await updateDocument('mace_budget_ledger', inlineEditingId, payload);
        showToast('Budget entry updated inline.');
      }
      setInlineEditingId(null);
    } catch (err) {
      showToast('Error saving spreadsheet row.', 'error');
    }
  };

  // Cancel Inline Action
  const cancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  // Sort Table function
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Apply global plant filter to board items
  const filteredBoardItemsRaw = items.filter(item => {
    if (globalFilter !== 'All' && item.plant !== globalFilter) return false;
    return true;
  });

  // Apply global plant filter to ledger items
  const filteredLedgerItemsRaw = ledgerItems.filter(item => {
    if (globalFilter !== 'All' && item.plant !== globalFilter) return false;
    return true;
  });

  // Items filtered for board (Kanban) specifically
  const boardFilteredItems = filteredBoardItemsRaw.filter(item => {
    if (!boardSearch.trim()) return true;
    const s = boardSearch.toLowerCase();
    return item.name?.toLowerCase().includes(s) || item.remarks?.toLowerCase().includes(s);
  });

  // Items filtered for table (Spreadsheet) specifically
  const tableFilteredItems = filteredLedgerItemsRaw.filter(item => {
    if (!tableSearch.trim()) return true;
    const s = tableSearch.toLowerCase();
    return (
      item.name?.toLowerCase().includes(s) || 
      item.plant?.toLowerCase().includes(s) ||
      item.type?.toLowerCase().includes(s) ||
      item.plan?.toLowerCase().includes(s) ||
      item.budget?.toLowerCase().includes(s)
    );
  });

  // Sort table items
  const sortedTableItems = [...tableFilteredItems].sort((a, b) => {
    if (sortBy === 'issueDate') {
      const dateA = new Date(a.issueDate || 0).getTime() || 0;
      const dateB = new Date(b.issueDate || 0).getTime() || 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }

    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'week') {
      valA = calculateWeekNum(a.issueDate) || 0;
      valB = calculateWeekNum(b.issueDate) || 0;
    }

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    const isNumA = typeof valA === 'number' || (!isNaN(Number(valA)) && valA !== '');
    const isNumB = typeof valB === 'number' || (!isNaN(Number(valB)) && valB !== '');

    if (isNumA && isNumB) {
      const numA = Number(valA);
      const numB = Number(valB);
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
    if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate actual costs for MIR & RFG (excluding Declined/Cancelled) from ledgerItems
  const activeLedgerItems = ledgerItems.filter(item => item.status !== 'Declined');
  const mirActual = activeLedgerItems.filter(item => item.plant === 'MIR').reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const rfgActual = activeLedgerItems.filter(item => item.plant === 'RFG').reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  return (
    <div className="workspace-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Purchasing Log & Budget Planner</h1>
          <p className="page-subtitle">Granular part status tracking board paired with an interactive financial ledger sheet.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}>
            <Upload size={14} />
            <span>Import CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportBoardCSV} 
              style={{ display: 'none' }} 
            />
          </label>
          <button className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={handleExportBoardCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button 
            className="btn btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }} 
            onClick={() => setIsClearAllModalOpen(true)}
            id="clear-all-purchasing-btn"
            title="Clear all purchasing and budget data with confirmation"
          >
            <Trash2 size={14} />
            <span>Clear All Data</span>
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenAdd('New')}>
            <Plus size={16} />
            <span>Add Shopping Item</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="card controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text3)' }} />
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text2)', marginRight: '6px' }}>Plant:</span>
          {['All', 'MIR', 'RFG'].map((opt) => (
            <button 
              key={opt}
              onClick={() => setGlobalFilter(opt)}
              className="btn btn-sm"
              style={{
                backgroundColor: globalFilter === opt ? 'var(--accent)' : 'var(--surface2)',
                color: globalFilter === opt ? '#ffffff' : 'var(--text)',
                fontWeight: '600',
                border: '1px solid var(--border)',
                padding: '4px 12px',
                borderRadius: '6px'
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="font-mono text3" style={{ fontSize: '11px' }}>
          Total Database Records: {items.length} items
        </div>
      </div>

      {/* SECTION 1: SHOPPING BOARD (NOTION STYLE) */}
      <div className="card" style={{ padding: '20px', borderColor: 'var(--border2)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent)', fontWeight: '700' }}>Section 1</span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} style={{ color: 'var(--accent)' }} />
              Spares Shopping Board (Kanban Columns)
            </h2>
          </div>
          
          {/* Board Search */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search shopping board..." 
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%', minHeight: '32px', height: '32px', fontSize: '12px' }}
            />
          </div>
        </div>

        {loadingBoard ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
            <RefreshCw size={24} className="animate-spin mx-auto" />
            <p style={{ marginTop: '8px' }}>Syncing Kanban Board...</p>
          </div>
        ) : (
          /* Kanban Container - Horizontally scrollable */
          <div style={{ 
            display: 'flex', 
            gap: '14px', 
            overflowX: 'auto', 
            paddingBottom: '12px',
            minHeight: '400px'
          }}>
            {STATUS_KEYS.map((statusKey) => {
              const config = STATUS_CONFIG[statusKey];
              const columnItems = boardFilteredItems.filter(item => item.status === statusKey);
              
              return (
                <div 
                  key={statusKey}
                  style={{
                    flex: '0 0 280px',
                    backgroundColor: 'var(--surface2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    height: 'fit-content',
                    maxHeight: '620px'
                  }}
                >
                  {/* Column Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: `2px solid ${config.color}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: config.color 
                      }}></span>
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: '700', 
                        color: 'var(--text)' 
                      }}>
                        {config.label}
                      </span>
                    </div>
                    <span className="font-mono" style={{ 
                      fontSize: '11px', 
                      backgroundColor: 'var(--surface3)', 
                      padding: '1px 6px', 
                      borderRadius: '12px', 
                      fontWeight: '700',
                      color: 'var(--text2)'
                    }}>
                      {columnItems.length}
                    </span>
                  </div>

                  {/* Cards Area */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    overflowY: 'auto',
                    minHeight: '50px',
                    padding: '2px 0'
                  }}>
                    {columnItems.length === 0 ? (
                      <div style={{ 
                        padding: '20px 10px', 
                        textAlign: 'center', 
                        fontSize: '11.5px', 
                        color: 'var(--text3)', 
                        border: '1px dashed var(--border)',
                        borderRadius: '6px',
                        backgroundColor: 'var(--surface)'
                      }}>
                        Empty column
                      </div>
                    ) : (
                      columnItems.map(item => (
                        <div 
                          key={item.id}
                          className="card"
                          style={{
                            padding: '12px',
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'transform 0.15s, box-shadow 0.15s'
                          }}
                        >
                          {/* Title block */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ color: 'var(--text3)', marginTop: '2px' }}>
                              <ShoppingCart size={13} />
                            </div>
                            <div style={{ flex: '1', minWidth: 0 }}>
                              <div style={{ 
                                fontSize: '12.5px', 
                                fontWeight: '700', 
                                color: 'var(--text)', 
                                lineHeight: '1.3',
                                wordBreak: 'break-word'
                              }}>
                                {item.name}
                              </div>
                              <span className="font-mono" style={{ 
                                fontSize: '10.5px', 
                                color: 'var(--text3)',
                                display: 'block',
                                marginTop: '3px'
                              }}>
                                Issue Date: {formatSpreadsheetDate(item.issueDate)}
                              </span>
                            </div>
                          </div>

                          {/* Price & Meta info */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            backgroundColor: 'var(--surface2)', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: '700' }}>
                              {formatBaht(item.price)}
                            </span>
                            <span className="badge font-mono" style={{ 
                              backgroundColor: item.plant === 'MIR' ? 'var(--blue-soft)' : item.plant === 'RFG' ? '#fffbeb' : 'var(--surface3)',
                              color: item.plant === 'MIR' ? 'var(--accent)' : item.plant === 'RFG' ? 'var(--yellow)' : 'var(--text2)',
                              border: item.plant === 'MIR' ? '1px solid #bfdbfe' : item.plant === 'RFG' ? '1px solid #fde68a' : '1px solid var(--border)',
                              fontSize: '10px',
                              padding: '0 4px',
                              borderRadius: '3px'
                            }}>
                              {item.plant}
                            </span>
                          </div>

                          {/* Quick moves and actions */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            borderTop: '1px solid var(--border)', 
                            paddingTop: '8px', 
                            gap: '4px' 
                          }}>
                            {/* Fast status shifter dropdown */}
                            <select 
                              value={item.status}
                              onChange={(e) => handleMoveStatus(item, e.target.value)}
                              style={{
                                fontSize: '10.5px',
                                border: '1px solid var(--border)',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                outline: 'none',
                                color: 'var(--text2)',
                                cursor: 'pointer',
                                maxWidth: '140px',
                                backgroundColor: 'var(--surface)'
                              }}
                            >
                              {STATUS_KEYS.map(k => (
                                <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
                              ))}
                            </select>

                            {/* Edit / Trash */}
                            <div style={{ display: 'flex', gap: '3px' }}>
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="btn btn-sm" 
                                style={{ padding: '3px 6px', backgroundColor: 'transparent', border: 'none', color: 'var(--text3)' }}
                                title="Edit Item Details"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="btn btn-sm btn-danger" 
                                style={{ padding: '3px 6px', backgroundColor: 'transparent', border: 'none' }}
                                title="Delete Item"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add at bottom of column */}
                  <button 
                    onClick={() => handleOpenAdd(statusKey)}
                    className="btn btn-sm"
                    style={{
                      marginTop: 'auto',
                      backgroundColor: 'transparent',
                      color: 'var(--text3)',
                      border: '1px dashed var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      padding: '6px 0',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={12} />
                    <span>New request</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: BUDGET TRACKING */}
      <div className="card" style={{ padding: '20px', borderColor: 'var(--border2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--yellow)', fontWeight: '700' }}>Section 2</span>
            <h2 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--yellow)' }} />
              Budget Tracking Spreadsheet Ledger
            </h2>
          </div>
          <button 
            className="btn btn-sm"
            onClick={handleOpenBudgetModal}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', fontWeight: '600' }}
          >
            <Edit2 size={13} />
            <span>Adjust Plant Budgets</span>
          </button>
        </div>

        {/* 2A. Budget Scorecards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* MIR Scorecard */}
          <div className="card" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)' }}>MIR Plant Budget Status</h4>
              <span className="badge" style={{ backgroundColor: 'var(--blue-soft)', color: 'var(--accent)', fontWeight: '700', border: '1px solid #bfdbfe', fontSize: '10px' }}>MIR</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '14px' }}>
              <div>
                <div className="metric-label">Actual cost</div>
                <div className="font-mono text-accent" style={{ fontSize: '14px', fontWeight: '850', color: 'var(--accent)', marginTop: '2px' }}>{formatBaht(mirActual)}</div>
              </div>
              <div>
                <div className="metric-label">Budget/Year</div>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text2)', marginTop: '2px' }}>{formatBaht(mirYearlyBudget)}</div>
              </div>
              <div>
                <div className="metric-label">Budget/Month</div>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text2)', marginTop: '2px' }}>{formatBaht(Math.round(mirYearlyBudget / 12))}</div>
              </div>
            </div>
            
            {/* Annual Usage Bar */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>
                <span>Annual budget usage: <strong style={{ color: 'var(--text)' }}>{mirYearlyBudget > 0 ? ((mirActual / mirYearlyBudget) * 100).toFixed(1) : 0}%</strong></span>
                <span>Max: {mirYearlyBudget >= 1000000 ? (mirYearlyBudget / 1000000).toFixed(1) + 'M' : (mirYearlyBudget / 1000).toFixed(0) + 'K'} THB</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--surface3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, mirYearlyBudget > 0 ? (mirActual / mirYearlyBudget) * 100 : 0)}%`, 
                  backgroundColor: mirActual > mirYearlyBudget ? 'var(--red)' : 'var(--accent)',
                  borderRadius: '3px'
                }}></div>
              </div>
            </div>
          </div>

          {/* RFG Scorecard */}
          <div className="card" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)' }}>RFG Plant Budget Status</h4>
              <span className="badge" style={{ backgroundColor: '#fffbeb', color: 'var(--yellow)', fontWeight: '700', border: '1px solid #fde68a', fontSize: '10px' }}>RFG</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: '700', letterSpacing: '0.4px' }}>Actual cost</div>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '850', color: 'var(--yellow)', marginTop: '2px' }}>{formatBaht(rfgActual)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: '700', letterSpacing: '0.4px' }}>Budget/Year</div>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text2)', marginTop: '2px' }}>{formatBaht(rfgYearlyBudget)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: '700', letterSpacing: '0.4px' }}>Budget/Month</div>
                <div className="font-mono" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text2)', marginTop: '2px' }}>{formatBaht(Math.round(rfgYearlyBudget / 12))}</div>
              </div>
            </div>
            
            {/* Annual Usage Bar */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>
                <span>Annual budget usage: <strong style={{ color: 'var(--text)' }}>{rfgYearlyBudget > 0 ? ((rfgActual / rfgYearlyBudget) * 100).toFixed(1) : 0}%</strong></span>
                <span>Max: {rfgYearlyBudget >= 1000000 ? (rfgYearlyBudget / 1000000).toFixed(1) + 'M' : (rfgYearlyBudget / 1000).toFixed(0) + 'K'} THB</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--surface3)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, rfgYearlyBudget > 0 ? (rfgActual / rfgYearlyBudget) * 100 : 0)}%`, 
                  backgroundColor: rfgActual > rfgYearlyBudget ? 'var(--red)' : 'var(--yellow)',
                  borderRadius: '3px'
                }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2B. Table Control Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search spreadsheet items..." 
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: '12px', borderRadius: '6px', margin: 0 }}>
              <Upload size={14} />
              <span>Import CSV</span>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleImportLedgerCSV} 
                style={{ display: 'none' }} 
              />
            </label>

            <button 
              className="btn btn-sm" 
              onClick={handleExportLedgerCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button 
              className="btn btn-sm btn-primary" 
              onClick={startInlineAddRow}
              disabled={inlineEditingId === 'new-draft'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
            >
              <Plus size={14} />
              <span>Insert New Line</span>
            </button>
          </div>
        </div>

        {/* 2C. Spreadsheet Spreadsheet Data Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--surface)' }}>
          <table className="data-table" style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ width: '70px', textAlign: 'center', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('week')}>
                  Week {sortBy === 'week' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '100px', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('plant')}>
                  Plant {sortBy === 'plant' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '360px', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('name')}>
                  Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '120px', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('type')}>
                  Type {sortBy === 'type' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '130px', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('plan')}>
                  Plan {sortBy === 'plan' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '130px', textAlign: 'right', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('price')}>
                  Price {sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '130px', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('budget')}>
                  Budget {sortBy === 'budget' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '130px', cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('issueDate')}>
                  Issue Date {sortBy === 'issueDate' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                </th>
                <th style={{ width: '120px', textAlign: 'center', padding: '10px 12px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTableItems.map((item) => {
                const isEditing = inlineEditingId === item.id;
                
                return (
                  <tr key={item.id} style={{ 
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: isEditing ? '#f8fafc' : 'transparent' 
                  }}>
                    {isEditing ? (
                      /* Inline Editing Mode row cells */
                      <>
                        <td style={{ textAlign: 'center', padding: '8px 12px' }} className="font-mono">
                          <span className="text3">{calculateWeekNum(inlineState.issueDate)}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select 
                            className="form-select" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                            value={inlineState.plant}
                            onChange={(e) => setInlineState({ ...inlineState, plant: e.target.value })}
                          >
                            <option value="MIR">MIR</option>
                            <option value="RFG">RFG</option>
                            <option value="General">General</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 8px', fontSize: '12px' }}
                            value={inlineState.name}
                            placeholder="e.g., Replacement Board"
                            onChange={(e) => setInlineState({ ...inlineState, name: e.target.value })}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select 
                            className="form-select" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                            value={inlineState.type}
                            onChange={(e) => setInlineState({ ...inlineState, type: e.target.value })}
                          >
                            <option value="Project">Project</option>
                            <option value="Repair">Repair</option>
                            <option value="Spare part">Spare part</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select 
                            className="form-select" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                            value={inlineState.plan}
                            onChange={(e) => setInlineState({ ...inlineState, plan: e.target.value })}
                          >
                            <option value="In plan">In plan</option>
                            <option value="Out of plan">Out of plan</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="number" 
                            className="form-input font-mono text-right" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 8px', fontSize: '12px' }}
                            value={inlineState.price}
                            onChange={(e) => setInlineState({ ...inlineState, price: Number(e.target.value) })}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select 
                            className="form-select" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                            value={inlineState.budget}
                            onChange={(e) => setInlineState({ ...inlineState, budget: e.target.value })}
                          >
                            <option value="Investment">Investment</option>
                            <option value="Repairing">Repairing</option>
                          </select>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="date" 
                            className="form-input font-mono" 
                            style={{ width: '100%', minHeight: '28px', padding: '2px 4px', fontSize: '11px' }}
                            value={inlineState.issueDate}
                            onChange={(e) => setInlineState({ ...inlineState, issueDate: e.target.value })}
                          />
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button 
                              onClick={saveInlineEdit}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', backgroundColor: 'var(--green)', color: '#ffffff', border: 'none' }}
                              title="Save Changes"
                            >
                              <Check size={12} />
                            </button>
                            <button 
                              onClick={cancelInlineEdit}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', backgroundColor: 'var(--surface3)', color: 'var(--text)', border: 'none' }}
                              title="Cancel"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* Read Only Mode row cells */
                      <>
                        <td style={{ textAlign: 'center', padding: '10px 12px' }} className="font-mono text2">
                          {calculateWeekNum(item.issueDate)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className="font-mono" style={{ 
                            backgroundColor: item.plant === 'MIR' ? 'var(--blue-soft)' : item.plant === 'RFG' ? '#fffbeb' : 'var(--surface2)', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            color: item.plant === 'MIR' ? 'var(--accent)' : item.plant === 'RFG' ? 'var(--yellow)' : 'var(--text2)',
                            border: item.plant === 'MIR' ? '1px solid #bfdbfe' : item.plant === 'RFG' ? '1px solid #fde68a' : '1px solid var(--border)',
                          }}>
                            {item.plant}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text)' }}>
                            {item.name}
                          </div>
                          {item.remarks && (
                            <div className="text3" style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                              {item.remarks}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }} className="text2">
                          {item.type}
                        </td>
                        <td style={{ padding: '10px 12px' }} className="text2">
                          <span style={{ 
                            fontSize: '11.5px', 
                            color: item.plan === 'In plan' ? 'var(--green)' : 'var(--text3)' 
                          }}>
                            {item.plan}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }} className="font-mono font-semibold text2">
                          {formatBaht(item.price)}
                        </td>
                        <td style={{ padding: '10px 12px' }} className="text2">
                          <span className="badge" style={{ 
                            backgroundColor: item.budget === 'Investment' ? '#f0fdf4' : 'var(--surface2)',
                            color: item.budget === 'Investment' ? 'var(--green)' : 'var(--text2)',
                            border: item.budget === 'Investment' ? '1px solid #bbf7d0' : '1px solid var(--border)',
                            fontSize: '11px'
                          }}>
                            {item.budget}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }} className="font-mono text2">
                          {formatSpreadsheetDate(item.issueDate)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => startInlineEdit(item)}
                              disabled={inlineEditingId !== null}
                              className="btn btn-sm"
                              style={{ padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)' }}
                              title="Edit Row Inline"
                            >
                              <Edit2 size={11} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLedgerItem(item.id, item.name)}
                              className="btn btn-sm btn-danger"
                              style={{ padding: '4px 8px', backgroundColor: 'transparent', border: '1px solid #fee2e2' }}
                              title="Delete Row"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {/* 2D. INSERT NEW ROW INLINE AT BOTTOM */}
              {inlineEditingId === 'new-draft' && (
                <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid var(--green)' }}>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }} className="font-mono">
                    <span className="text3">{calculateWeekNum(inlineState.issueDate)}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select 
                      className="form-select" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                      value={inlineState.plant}
                      onChange={(e) => setInlineState({ ...inlineState, plant: e.target.value })}
                    >
                      <option value="MIR">MIR</option>
                      <option value="RFG">RFG</option>
                      <option value="General">General</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 8px', fontSize: '12px', borderColor: 'var(--green)' }}
                      value={inlineState.name}
                      placeholder="Enter new part name..."
                      onChange={(e) => setInlineState({ ...inlineState, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select 
                      className="form-select" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                      value={inlineState.type}
                      onChange={(e) => setInlineState({ ...inlineState, type: e.target.value })}
                    >
                      <option value="Project">Project</option>
                      <option value="Repair">Repair</option>
                      <option value="Spare part">Spare part</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select 
                      className="form-select" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                      value={inlineState.plan}
                      onChange={(e) => setInlineState({ ...inlineState, plan: e.target.value })}
                    >
                      <option value="In plan">In plan</option>
                      <option value="Out of plan">Out of plan</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input 
                      type="number" 
                      className="form-input font-mono text-right" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 8px', fontSize: '12px' }}
                      value={inlineState.price}
                      onChange={(e) => setInlineState({ ...inlineState, price: Number(e.target.value) })}
                    />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select 
                      className="form-select" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 6px', fontSize: '12px' }}
                      value={inlineState.budget}
                      onChange={(e) => setInlineState({ ...inlineState, budget: e.target.value })}
                    >
                      <option value="Investment">Investment</option>
                      <option value="Repairing">Repairing</option>
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input 
                      type="date" 
                      className="form-input font-mono" 
                      style={{ width: '100%', minHeight: '28px', padding: '2px 4px', fontSize: '11px' }}
                      value={inlineState.issueDate}
                      onChange={(e) => setInlineState({ ...inlineState, issueDate: e.target.value })}
                    />
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button 
                        onClick={saveInlineEdit}
                        className="btn btn-sm"
                        style={{ padding: '6px 12px', backgroundColor: 'var(--green)', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Insert New Row"
                      >
                        <Check size={12} />
                        <span>Save</span>
                      </button>
                      <button 
                        onClick={cancelInlineEdit}
                        className="btn btn-sm"
                        style={{ padding: '6px 12px', backgroundColor: 'var(--surface3)', color: 'var(--text)', border: 'none' }}
                        title="Discard"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {sortedTableItems.length === 0 && inlineEditingId !== 'new-draft' && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
              No budget items matched filters. Click "Insert New Line" or "Import CSV" to load records.
            </div>
          )}
        </div>
      </div>

      {/* Slide dialogue Modal for granular edits */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Edit Purchase Item' : 'New Purchase Item'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmitModal}>
              {editingItem ? 'Save Item' : 'Register Item'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitModal} className="form-grid">
          {formError && (
            <div className="form-full" style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red)' }}>
              <AlertCircle size={14} />
              <span style={{ fontSize: '12px' }}>{formError}</span>
            </div>
          )}

          <div className="form-group form-full">
            <label className="form-label">Material / Part Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. MIR Glass Cutting Diamond Wheel (150mm)" 
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Plant</label>
            <select className="form-select" value={formPlant} onChange={(e) => setFormPlant(e.target.value)}>
              <option value="MIR">MIR</option>
              <option value="RFG">RFG</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Price (THB)</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              placeholder="e.g. 4500" 
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={formType} onChange={(e) => setFormType(e.target.value)}>
              <option value="Project">Project</option>
              <option value="Repair">Repair</option>
              <option value="Spare part">Spare part</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Plan status</label>
            <select className="form-select" value={formPlan} onChange={(e) => setFormPlan(e.target.value)}>
              <option value="In plan">In plan</option>
              <option value="Out of plan">Out of plan</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Budget Category</label>
            <select className="form-select" value={formBudget} onChange={(e) => setFormBudget(e.target.value)}>
              <option value="Investment">Investment</option>
              <option value="Repairing">Repairing</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Issue Date</label>
            <input 
              type="date" 
              className="form-input font-mono" 
              value={formIssueDate}
              onChange={(e) => setFormIssueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Procure Status</label>
            <select 
              className="form-select" 
              value={formStatus} 
              onChange={(e) => setFormStatus(e.target.value)}
            >
              {STATUS_KEYS.map(k => (
                <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              min="1"
              value={formQty}
              onChange={(e) => setFormQty(e.target.value)}
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Procurement Remarks / Supplier</label>
            <textarea 
              className="form-textarea" 
              placeholder="e.g. Contacting supplier. Expected delivery time 14 days." 
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* MODAL: CLEAR ALL PURCHASING DATA CONFIRMATION */}
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title="Clear All Purchasing Data"
        footerActions={
          <>
            <button className="btn" onClick={() => setIsClearAllModalOpen(false)} disabled={isClearing}>Cancel</button>
            <button className="btn btn-danger" onClick={handleClearAllData} disabled={isClearing} id="confirm-clear-purchasing-btn">
              {isClearing ? 'Clearing Data...' : 'Yes, Clear All Data'}
            </button>
          </>
        }
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: '#dc2626' }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: '15px', fontWeight: '700' }}>Confirm Complete Reset</span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: '1.6' }}>
            Are you sure you want to clear all <strong>{items.length} shopping board items</strong> and <strong>{ledgerItems.length} budget ledger entries</strong>? 
            This action cannot be undone and will erase all purchasing records.
          </p>
        </div>
      </Modal>

      {/* MODAL: ADJUST PLANT BUDGET TARGETS */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Adjust Annual Plant Budget Targets"
        footerActions={
          <>
            <button className="btn" onClick={() => setIsBudgetModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveBudgets}>Save Budgets</button>
          </>
        }
      >
        <form onSubmit={handleSaveBudgets} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '700' }}>MIR Plant - Annual Budget (THB)</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              placeholder="e.g. 1300000"
              value={tempMirBudget}
              onChange={(e) => setTempMirBudget(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              Monthly target: {formatBaht(Math.round((Number(tempMirBudget) || 0) / 12))}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '700' }}>RFG Plant - Annual Budget (THB)</label>
            <input 
              type="number" 
              className="form-input font-mono" 
              placeholder="e.g. 2300000"
              value={tempRfgBudget}
              onChange={(e) => setTempRfgBudget(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
              Monthly target: {formatBaht(Math.round((Number(tempRfgBudget) || 0) / 12))}
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
