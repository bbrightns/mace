import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ShieldAlert, List, Calendar, User, Trash, 
  Settings, Upload, Download, TrendingUp, AlertTriangle, RefreshCw, BarChart2, Layers, Clock, CheckCircle2
} from 'lucide-react';
import { 
  subscribeCollection, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  batchDeleteDocuments,
  batchWriteOperations
} from '../../firebase/collections';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { formatDate, toInputDate, parseCSV, parseDateStrToISO, formatTime24, calculateShiftFromTime } from '../../utils';

export default function TroubleRecord() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'trends'

  // Search and Filters
  const [search, setSearch] = useState('');
  const [filterPlant, setFilterPlant] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterShift, setFilterShift] = useState('all');

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [plant, setPlant] = useState('MIR');
  const [dateRaw, setDateRaw] = useState('');
  const [timeDowntime, setTimeDowntime] = useState('0');
  const [shift, setShift] = useState('');
  const [shift2, setShift2] = useState('');
  const [location, setLocation] = useState('');
  const [equipment, setEquipment] = useState('');
  const [name, setName] = useState('');
  const [detail, setDetail] = useState('');
  const [detail2, setDetail2] = useState('');
  const [status, setStatus] = useState('Closed');

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeCollection('mace_trouble_records', (data) => {
      // Sort in descending order of date/time
      const sorted = [...data].sort((a, b) => {
        const da = new Date(a.dateTime || 0);
        const db = new Date(b.dateTime || 0);
        return db - da;
      });
      setItems(sorted);
      setLoading(false);
    }, (error) => {
      showToast('Failed to sync Trouble failure logs.', 'error');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setPlant('MIR');
    setDateRaw(new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' }));
    setTimeDowntime('0');
    setShift('N');
    setShift2('MIR สมนึก + ธีร์');
    setLocation('');
    setEquipment('');
    setName('');
    setDetail('');
    setDetail2('');
    setStatus('Finished');
    setIsOpen(true);
  };

  const handleOpenEdit = (target) => {
    setEditingItem(target);
    setPlant(target.plant || 'MIR');
    setDateRaw(target.dateRaw || target.dateTime?.substring(0, 10) || '');
    const timeVal = target.timeDowntime || '';
    setTimeDowntime(timeVal);
    setShift(target.shift || calculateShiftFromTime(timeVal));
    setShift2(target.shift2 || target.pic || '');
    setLocation(target.location || target.machineEquipment?.split(' - ')[0] || '');
    setEquipment(target.equipment || target.machineEquipment?.split(' - ')[1] || '');
    setName(target.name || target.machineEquipment?.split(' - ')[2] || '');
    setDetail(target.detail || target.problemDescription || '');
    setDetail2(target.detail2 || target.rootCause || target.actionTaken || '');
    
    let mappedStatus = target.status || 'Finished';
    if (mappedStatus === 'Closed') mappedStatus = 'Finished';
    if (mappedStatus === 'Open') mappedStatus = 'Pending';
    if (mappedStatus === 'In Process') mappedStatus = 'Need advice';
    setStatus(mappedStatus);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let targetNo = editingItem?.no;
    if (!targetNo) {
      targetNo = `TR-${String(items.length + 1).padStart(4, '0')}`;
    }

    const downtimeHrs = parseFloat(timeDowntime) || 0;
    const equipParts = [location, equipment, name].filter(Boolean);
    const machineEquipment = equipParts.length > 0 ? equipParts.join(' - ') : (location || equipment || 'General Equipment');

    const payload = {
      no: targetNo,
      plant,
      dateRaw,
      dateTime: new Date().toISOString().substring(0, 16),
      timeDowntime,
      shift,
      shift2,
      location,
      equipment,
      name,
      detail,
      detail2,

      // Compatibility fields
      machineEquipment,
      problemDescription: detail || 'Failure record',
      rootCause: detail2 || null,
      actionTaken: detail2 || null,
      pic: shift2 || 'EE Maintenance Team',
      downtimeHrs,
      status,
      closedDate: new Date().toISOString().substring(0, 10),
      sparePartsUsed: []
    };

    try {
      if (editingItem) {
        await updateDocument('mace_trouble_records', editingItem.id, payload);
        showToast(`Record ${targetNo} updated.`);
      } else {
        await createDocument('mace_trouble_records', payload);
        showToast(`New record ${targetNo} added.`);
      }
      setIsOpen(false);
    } catch (error) {
      showToast('Error saving trouble record.', 'error');
    }
  };

  const handleDelete = async (id, trNo) => {
    if (confirm(`Are you sure you want to delete Log ${trNo}?`)) {
      try {
        await deleteDocument('mace_trouble_records', id);
        showToast(`Log ${trNo} deleted.`);
      } catch (err) {
        showToast('Error deleting log.', 'error');
      }
    }
  };

  // Delete All Records with explicit user confirmation
  const handleDeleteAll = async () => {
    if (items.length === 0) {
      showToast('There are no records to delete.', 'error');
      return;
    }

    const userInput = prompt(`⚠️ WARNING: You are about to PERMANENTLY DELETE ALL ${items.length} trouble records!\n\nTo confirm deletion, please type "DELETE ALL" below:`);
    
    if (userInput === "DELETE ALL") {
      try {
        const itemIds = items.map(item => item.id);
        await batchDeleteDocuments('mace_trouble_records', itemIds);
        showToast(`All ${itemIds.length} records have been deleted.`);
      } catch (err) {
        showToast('Failed to delete records.', 'error');
      }
    } else if (userInput !== null) {
      showToast('Deletion canceled. Confirmation code did not match "DELETE ALL".', 'error');
    }
  };

  // Export trouble records to CSV file
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      showToast('No trouble records available to export.', 'error');
      return;
    }

    const headers = ['Plant', 'Date', 'Time', 'Shift', 'Shift2', 'Location', 'Equipment', 'Name', 'Detail', 'Detail 2'];
    
    const csvRows = [headers.join(',')];

    filteredItems.forEach(item => {
      const escape = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const row = [
        escape(item.plant || 'MIR'),
        escape(item.dateRaw || item.dateTime?.substring(0, 10) || ''),
        escape(item.timeDowntime || (item.downtimeHrs ? String(item.downtimeHrs) : '')),
        escape(item.shift || ''),
        escape(item.shift2 || item.pic || ''),
        escape(item.location || ''),
        escape(item.equipment || ''),
        escape(item.name || ''),
        escape(item.detail || item.problemDescription || ''),
        escape(item.detail2 || item.rootCause || item.actionTaken || '')
      ];

      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Trouble_Records_Export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredItems.length} records to CSV.`);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((x) => {
      const q = search.toLowerCase();
      const matchesSearch = !search || 
        x.no?.toLowerCase().includes(q) ||
        x.plant?.toLowerCase().includes(q) ||
        x.location?.toLowerCase().includes(q) ||
        x.equipment?.toLowerCase().includes(q) ||
        x.name?.toLowerCase().includes(q) ||
        x.detail?.toLowerCase().includes(q) ||
        x.detail2?.toLowerCase().includes(q) ||
        x.machineEquipment?.toLowerCase().includes(q) ||
        x.shift?.toLowerCase().includes(q) ||
        x.shift2?.toLowerCase().includes(q);

      const matchesPlant = filterPlant === 'all' || x.plant === filterPlant;
      const matchesStatus = filterStatus === 'all' || 
        x.status === filterStatus ||
        (filterStatus === 'Finished' && x.status === 'Closed') ||
        (filterStatus === 'Pending' && x.status === 'Open') ||
        (filterStatus === 'Need advice' && x.status === 'In Process');
      const matchesShift = filterShift === 'all' || (filterShift === 'specified' ? !!x.shift : x.shift === filterShift);

      return matchesSearch && matchesPlant && matchesStatus && matchesShift;
    });
  }, [items, search, filterPlant, filterStatus, filterShift]);

  // Aggregate Stats (only summing explicit downtime duration if available)
  const totalDowntime = useMemo(() => {
    return filteredItems.reduce((acc, curr) => acc + (parseFloat(curr.downtimeHrs) || 0), 0);
  }, [filteredItems]);

  // Analytical Calculations for Trend & Recurring Trouble Analysis
  const analytics = useMemo(() => {
    // Group by Equipment / Component KEY
    const equipmentMap = {};
    const shiftMap = {};
    const plantMap = {};
    const locationMap = {};

    filteredItems.forEach(item => {
      // Key for recurring component
      const equipKey = [item.location, item.equipment].filter(Boolean).join(' → ') || item.machineEquipment || 'Uncategorized';

      if (!equipmentMap[equipKey]) {
        equipmentMap[equipKey] = {
          key: equipKey,
          location: item.location || 'General',
          equipment: item.equipment || 'General',
          count: 0,
          totalDowntime: 0,
          shifts: {},
          samples: []
        };
      }
      equipmentMap[equipKey].count += 1;
      const dt = parseFloat(item.downtimeHrs) || 0;
      equipmentMap[equipKey].totalDowntime += dt;

      // Track shifts for this equipment
      const shiftCode = item.shift || 'Unassigned';
      equipmentMap[equipKey].shifts[shiftCode] = (equipmentMap[equipKey].shifts[shiftCode] || 0) + 1;

      if (equipmentMap[equipKey].samples.length < 3) {
        equipmentMap[equipKey].samples.push(item);
      }

      // Track Shift statistics
      if (item.shift) {
        const sKey = item.shift;
        if (!shiftMap[sKey]) shiftMap[sKey] = { shift: sKey, count: 0, totalDowntime: 0 };
        shiftMap[sKey].count += 1;
        shiftMap[sKey].totalDowntime += dt;
      }

      // Track Location statistics
      const locKey = item.location || 'Unspecified';
      if (!locationMap[locKey]) locationMap[locKey] = { location: locKey, count: 0, totalDowntime: 0 };
      locationMap[locKey].count += 1;
      locationMap[locKey].totalDowntime += dt;

      // Track Plant statistics
      const pKey = item.plant || 'MIR';
      if (!plantMap[pKey]) plantMap[pKey] = { plant: pKey, count: 0, totalDowntime: 0 };
      plantMap[pKey].count += 1;
      plantMap[pKey].totalDowntime += dt;
    });

    // Sort Recurring Breakdown List (Highest frequency first)
    const recurringList = Object.values(equipmentMap)
      .sort((a, b) => b.count - a.count);

    // High Impact List (Highest Downtime first)
    const highDowntimeList = Object.values(equipmentMap)
      .sort((a, b) => b.totalDowntime - a.totalDowntime);

    // Shift list
    const shiftList = Object.values(shiftMap).sort((a, b) => b.count - a.count);

    // Top locations
    const topLocations = Object.values(locationMap).sort((a, b) => b.count - a.count).slice(0, 6);

    return {
      recurringList,
      highDowntimeList,
      shiftList,
      topLocations,
      plantMap
    };
  }, [filteredItems]);

  return (
    <div className="workspace-container">
      {/* Header */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div className="page-title-block">
          <h1 className="page-title">Breakdown Trouble Records</h1>
          <p className="page-subtitle">File plant failures, analyze recurring troubles, track shift patterns & downtime analysis.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={16} />
            <span>Import CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const allRows = parseCSV(text);
                  if (allRows.length <= 1) {
                    showToast('CSV file is empty.', 'error');
                    e.target.value = '';
                    return;
                  }
                  const operations = [];
                  const dataRows = allRows.slice(1);
                  for (let i = 0; i < dataRows.length; i++) {
                    const row = dataRows[i];
                    const plant = row[0] || '';
                    const dateStr = row[1] || '';
                    const timeStr = row[2] || '';
                    const shift = row[3] || '';
                    const shift2 = row[4] || '';
                    const location = row[5] || '';
                    const equipment = row[6] || '';
                    const name = row[7] || '';
                    const detail = row[8] || '';
                    const detail2 = row[9] || '';

                    if (!plant && !location && !equipment && !detail) continue;
                    
                    const downtimeHrs = parseFloat(timeStr) || 0;
                    const formattedDateTime = parseDateStrToISO(dateStr);
                    const targetNo = `TR-${String(items.length + operations.length + 1).padStart(4, '0')}`;
                    const plantVal = plant.trim() || 'MIR';
                    const shiftVal = shift.trim() || calculateShiftFromTime(timeStr.trim());
                    const shift2Val = shift2.trim() || (plantVal === 'MIR' ? 'MIR สมนึก + ธีร์' : '');

                    operations.push({
                      type: 'create',
                      collectionName: 'mace_trouble_records',
                      data: {
                        no: targetNo,
                        plant: plantVal,
                        dateRaw: dateStr.trim(),
                        dateTime: formattedDateTime,
                        timeDowntime: timeStr.trim(),
                        shift: shiftVal,
                        shift2: shift2Val,
                        location: location.trim(),
                        equipment: equipment.trim(),
                        name: name.trim(),
                        detail: detail ? detail.trim() : '',
                        detail2: detail2 ? detail2.trim() : '',
                        machineEquipment: [location, equipment, name].filter(Boolean).join(' - ') || 'General Line',
                        problemDescription: detail ? detail.trim() : 'Breakdown fault log',
                        rootCause: detail2 ? detail2.trim() : null,
                        actionTaken: detail2 ? detail2.trim() : null,
                        pic: shift2.trim() || 'EE Maintenance Team',
                        downtimeHrs: downtimeHrs,
                        status: 'Finished'
                      }
                    });
                  }

                  if (operations.length > 0) {
                    await batchWriteOperations(operations);
                    showToast(`Imported ${operations.length} records from CSV.`);
                  } else {
                    showToast('No valid records found to import.', 'error');
                  }
                } catch (err) {
                  showToast('Error reading CSV file.', 'error');
                }
                e.target.value = '';
              }}
            />
          </label>
          <button className="btn btn-secondary" onClick={handleExportCSV} title="Export current trouble records to CSV">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn btn-danger" onClick={handleDeleteAll} title="Delete all trouble records">
            <Trash2 size={16} />
            <span>Delete All Data</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenAdd} id="add-tr-btn">
            <Plus size={16} />
            <span>New Failure Log</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px', marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('table')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'table' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'table' ? 'var(--primary)' : 'var(--text2)',
            fontWeight: activeTab === 'table' ? '600' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <List size={16} />
          <span>Trouble Record Table (Raw CSV View)</span>
        </button>
        <button 
          onClick={() => setActiveTab('trends')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'trends' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'trends' ? 'var(--primary)' : 'var(--text2)',
            fontWeight: activeTab === 'trends' ? '600' : '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={16} />
          <span>Trouble Trends & Recurring Analysis</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="form-label" style={{ color: 'var(--text3)' }}>Total Trouble Logs</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text)', marginTop: '4px' }}>
              {filteredItems.length} <span style={{ fontSize: '13px', fontWeight: '400', color: 'var(--text3)' }}>Records</span>
            </div>
          </div>
          <Layers size={28} style={{ color: 'rgba(59, 130, 246, 0.2)' }} />
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="form-label" style={{ color: 'var(--text3)' }}>Accumulated Downtime</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--red)', marginTop: '4px' }}>
              {totalDowntime.toFixed(2)} <span style={{ fontSize: '13px', fontWeight: '400' }}>Hrs</span>
            </div>
          </div>
          <ShieldAlert size={28} style={{ color: 'rgba(220, 38, 38, 0.2)' }} />
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="form-label" style={{ color: 'var(--text3)' }}>Recurring Trouble Areas</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: 'var(--yellow)', marginTop: '4px' }}>
              {analytics.recurringList.filter(x => x.count > 1).length} <span style={{ fontSize: '13px', fontWeight: '400' }}>Locations</span>
            </div>
          </div>
          <RefreshCw size={28} style={{ color: 'rgba(217, 119, 6, 0.2)' }} />
        </div>

        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="form-label" style={{ color: 'var(--text3)' }}>Top Shift Failure Rate</div>
            <div className="font-mono" style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', marginTop: '4px' }}>
              {analytics.shiftList.length > 0 ? `Shift ${analytics.shiftList[0].shift}` : '—'} 
              <span style={{ fontSize: '13px', fontWeight: '400', marginLeft: '6px' }}>
                ({analytics.shiftList.length > 0 ? analytics.shiftList[0].count : 0} logs)
              </span>
            </div>
          </div>
          <BarChart2 size={28} style={{ color: 'rgba(139, 92, 246, 0.2)' }} />
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="card controls-bar" style={{ marginBottom: '16px' }}>
        <div className="filters-group" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text3)' }} />
            <input 
              type="text" 
              placeholder="Search Plant, Location, Equipment, Detail..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', width: '100%' }}
            />
          </div>

          <select 
            value={filterPlant} 
            onChange={(e) => setFilterPlant(e.target.value)}
            className="form-select"
          >
            <option value="all">All Plants</option>
            <option value="RFG">RFG Plant</option>
            <option value="MIR">MIR Plant</option>
          </select>

          <select 
            value={filterShift} 
            onChange={(e) => setFilterShift(e.target.value)}
            className="form-select"
          >
            <option value="all">All Shifts</option>
            <option value="M">Morning Shift (M)</option>
            <option value="E">Evening Shift (E)</option>
            <option value="N">Night Shift (N)</option>
            <option value="specified">Has Shift Code Assigned</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
          >
            <option value="all">All Statuses</option>
            <option value="Finished">Finished</option>
            <option value="Pending">Pending</option>
            <option value="Need advice">Need advice</option>
          </select>
        </div>

        <div className="font-mono text3">
          Showing {filteredItems.length} records
        </div>
      </div>

      {/* VIEW 1: RAW CSV TABLE VIEW */}
      {activeTab === 'table' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Plant</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '60px' }}>Time</th>
                  <th style={{ width: '50px' }}>Shift</th>
                  <th style={{ width: '120px' }}>Shift2 (PIC)</th>
                  <th style={{ width: '110px' }}>Location</th>
                  <th style={{ width: '110px' }}>Equipment</th>
                  <th style={{ width: '90px' }}>Name</th>
                  <th>Detail (Problem)</th>
                  <th>Detail 2 (Action / Cause)</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '30px' }}>
                      Loading trouble records...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '30px' }} className="text3">
                      No trouble records match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="font-mono" style={{ fontSize: '11px', background: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                          {r.plant || 'MIR'}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                        {r.dateRaw || r.dateTime?.substring(0, 10) || '—'}
                      </td>
                      <td className="font-mono" style={{ fontSize: '11.5px', color: 'var(--text)' }}>
                        {formatTime24(r.timeDowntime || r.downtimeHrs)}
                      </td>
                      <td className="font-mono" style={{ fontWeight: '700', color: r.shift ? 'var(--primary)' : 'var(--text3)' }}>
                        {r.shift || '—'}
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text2)' }}>
                        {r.shift2 || r.pic || '—'}
                      </td>
                      <td style={{ fontWeight: '500', color: 'var(--text)' }}>
                        {r.location || '—'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.equipment || '—'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.name || '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text)' }}>
                        {r.detail || r.problemDescription || '—'}
                      </td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text2)' }}>
                        {r.detail2 || r.rootCause || r.actionTaken || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button className="btn btn-sm" onClick={() => handleOpenEdit(r)} title="Edit Record">
                            <Edit2 size={12} />
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id, r.no)} title="Delete Record">
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
      )}

      {/* VIEW 2: TREND & RECURRING ANALYSIS VIEW */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Executive Summary Analysis Banner */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)' }}>
              <AlertTriangle size={18} />
              <span>Recurring Trouble & Shift Correlation Insights</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5' }}>
              Analysis of <strong>{filteredItems.length} failure records</strong> reveals distinct operational patterns. 
              Breakdowns reoccur most frequently at <strong>{analytics.recurringList[0]?.key || 'N/A'}</strong> ({analytics.recurringList[0]?.count || 0} occurrences). 
              {analytics.shiftList.length > 0 && (
                <> Shifts with explicit shift codes show the highest concentration in <strong>Shift {analytics.shiftList[0]?.shift}</strong> ({analytics.shiftList[0]?.count} failures logged).</>
              )}
            </p>
          </div>

          {/* Section 1: Recurring Trouble Component Leaderboard */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Top Recurring Trouble Equipment / Systems</h3>
                <p style={{ fontSize: '12px', color: 'var(--text3)' }}>Grouped by Location → Equipment. Highest frequency failure points.</p>
              </div>
              <span className="font-mono text3" style={{ fontSize: '12px' }}>
                {analytics.recurringList.length} Unique Machine Components
              </span>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Location → Equipment</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Frequency</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Total Downtime</th>
                    <th>Shift Pattern Distribution</th>
                    <th>Recent Problem Symptoms</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recurringList.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td className="font-mono" style={{ color: 'var(--text3)' }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>{item.key}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Plant Location: {item.location}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="font-mono" style={{ 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          background: item.count > 5 ? '#fee2e2' : item.count > 2 ? '#fef3c7' : 'var(--surface2)',
                          color: item.count > 5 ? '#dc2626' : item.count > 2 ? '#d97706' : 'var(--text)',
                          fontWeight: '700',
                          fontSize: '12px'
                        }}>
                          {item.count}x
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        <span style={{ fontWeight: '600', color: item.totalDowntime > 5 ? 'var(--red)' : 'var(--text)' }}>
                          {item.totalDowntime.toFixed(2)} hrs
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {Object.entries(item.shifts).map(([sCode, sCount]) => (
                            <span key={sCode} className="font-mono" style={{ fontSize: '10.5px', background: 'var(--surface2)', padding: '2px 6px', borderRadius: '4px' }}>
                              Shift {sCode}: <strong>{sCount}</strong>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11.5px', color: 'var(--text2)' }}>
                          {item.samples.map((s, sIdx) => (
                            <li key={sIdx}>
                              {s.detail || s.problemDescription} {s.detail2 ? `(${s.detail2})` : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Shift Breakdown & Location Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Shift Correlation */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Shift Breakdown Correlation</h3>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>Distribution of breakdown events across working shifts.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analytics.shiftList.length === 0 ? (
                  <div className="text3" style={{ fontSize: '12px', fontStyle: 'italic' }}>No shift data tagged in filtered logs.</div>
                ) : (
                  analytics.shiftList.map((s) => {
                    const percentage = filteredItems.length ? ((s.count / filteredItems.length) * 100).toFixed(1) : 0;
                    return (
                      <div key={s.shift} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px' }}>Shift Code: {s.shift}</span>
                          <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text2)' }}>
                            {s.count} logs ({percentage}%) | {s.totalDowntime.toFixed(1)} Downtime Hrs
                          </span>
                        </div>
                        <div style={{ height: '8px', width: '100%', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--primary)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Location Hotspots */}
            <div className="card">
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Top Plant Location Hotspots</h3>
              <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '14px' }}>Areas in plant experiencing highest trouble rates.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.topLocations.map((loc) => {
                  const maxCount = analytics.topLocations[0]?.count || 1;
                  const barWidth = ((loc.count / maxCount) * 100).toFixed(0);
                  return (
                    <div key={loc.location} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ fontWeight: '500' }}>{loc.location}</span>
                        <span className="font-mono" style={{ fontWeight: '600', color: 'var(--text2)' }}>{loc.count} failures</span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barWidth}%`, background: 'var(--yellow)', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Edit / Add Modal Form */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={editingItem ? `Edit Trouble Record ${editingItem.no}` : 'Add New Trouble Record'}
        footerActions={
          <>
            <button className="btn" onClick={() => setIsOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingItem ? 'Save Updates' : 'Save Record'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label className="form-label">Plant *</label>
            <select 
              className="form-select" 
              value={plant} 
              onChange={(e) => {
                const p = e.target.value;
                setPlant(p);
                if (p === 'MIR') {
                  setShift2('MIR สมนึก + ธีร์');
                }
              }}
            >
              <option value="MIR">MIR</option>
              <option value="RFG">RFG</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date (e.g. Tue, 12-Dec-23)</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. Mon, 29-Jan-24"
              value={dateRaw} 
              onChange={(e) => setDateRaw(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Time (Occurrence Time - 24h)</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="e.g. 09:00, 13:47, or 900"
              value={timeDowntime} 
              onChange={(e) => {
                const val = e.target.value;
                setTimeDowntime(val);
                const autoShift = calculateShiftFromTime(val);
                if (autoShift) setShift(autoShift);
              }}
              onBlur={() => {
                if (timeDowntime) {
                  const formatted = formatTime24(timeDowntime);
                  if (formatted && formatted !== '—') {
                    setTimeDowntime(formatted);
                    const autoShift = calculateShiftFromTime(formatted);
                    if (autoShift) setShift(autoShift);
                  }
                }
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Shift (Auto-calculated M, E, N)</label>
            <input 
              type="text" 
              className="form-input font-mono" 
              placeholder="Auto-calculated (M, E, N)"
              value={shift} 
              onChange={(e) => setShift(e.target.value)} 
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Shift2 / PIC</label>
            <select 
              className="form-select" 
              value={shift2} 
              onChange={(e) => setShift2(e.target.value)} 
            >
              <option value="">-- Select Shift2 / PIC --</option>
              <option value="A น้าหนาน+ยุทธนา">A น้าหนาน+ยุทธนา</option>
              <option value="B พี่โย่ง+พี่โชค">B พี่โย่ง+พี่โชค</option>
              <option value="C พี่ออฟ+พี่แดน">C พี่ออฟ+พี่แดน</option>
              <option value="MIR สมนึก + ธีร์">MIR สมนึก + ธีร์</option>
              {shift2 && !['A น้าหนาน+ยุทธนา', 'B พี่โย่ง+พี่โชค', 'C พี่ออฟ+พี่แดน', 'MIR สมนึก + ธีร์'].includes(shift2) && (
                <option value={shift2}>{shift2}</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Coat zone"
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Equipment</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Power Supply"
              value={equipment} 
              onChange={(e) => setEquipment(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. AE #5"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Finished">Finished</option>
              <option value="Pending">Pending</option>
              <option value="Need advice">Need advice</option>
            </select>
          </div>

          <div className="form-group form-full">
            <label className="form-label">Detail (Problem Description)</label>
            <textarea 
              className="form-input" 
              rows="3"
              placeholder="e.g. PS AE Internal supply voltage low"
              value={detail} 
              onChange={(e) => setDetail(e.target.value)} 
            />
          </div>

          <div className="form-group form-full">
            <label className="form-label">Detail 2 (Action Taken / Notes)</label>
            <textarea 
              className="form-input" 
              rows="3"
              placeholder="e.g. CZ 1.1 ใช้ AE #8 แทน, 1.2 ใช้ MF #7 แทน"
              value={detail2} 
              onChange={(e) => setDetail2(e.target.value)} 
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
