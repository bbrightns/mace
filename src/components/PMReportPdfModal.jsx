import React, { useState } from 'react';
import { Download, X, UserCheck, FileText, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList
} from 'recharts';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ITEMS_PER_PAGE = 12;

export default function PMReportPdfModal({
  isOpen,
  onClose,
  items = [],
  logs = [],
  selectedYear = 2026,
  filterPlant = 'all',
  filterType = 'all',
  filterRank = 'all',
  isMonthRequired,
  getCellStatus,
  getCellDetails
}) {
  const [engineerName, setEngineerName] = useState('');
  const [engineerTitle, setEngineerTitle] = useState('Maintenance Engineer');
  const [managerName, setManagerName] = useState('');
  const [managerTitle, setManagerTitle] = useState('Maintenance Manager');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentNo, setDocumentNo] = useState(`PM-RPT-${selectedYear}-${filterPlant.toUpperCase()}`);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  // Filter items based on plant, type, and rank
  const filteredItems = items.filter(item => {
    if (filterPlant !== 'all' && (item.plant || 'RFG').toLowerCase() !== filterPlant.toLowerCase()) {
      return false;
    }
    const t = (item.itemType || item.type || 'pm').toLowerCase();
    if (filterType !== 'all') {
      if (filterType === 'calibrate') {
        if (t !== 'calibrate' && !t.includes('cal')) return false;
      } else if (filterType === 'service_contract') {
        if (t !== 'service_contract' && !t.includes('contract') && !t.includes('service')) return false;
      } else if (filterType === 'pm') {
        if (t.includes('cal') || t.includes('contract') || t.includes('service')) return false;
      } else if (t !== filterType) {
        return false;
      }
    }
    const r = item.rank || 'B';
    if (filterRank !== 'all' && r !== filterRank) {
      return false;
    }
    return true;
  });

  // Chunk items into pages of 12 items each
  const itemChunks = [];
  if (filteredItems.length === 0) {
    itemChunks.push([]);
  } else {
    for (let i = 0; i < filteredItems.length; i += ITEMS_PER_PAGE) {
      itemChunks.push(filteredItems.slice(i, i + ITEMS_PER_PAGE));
    }
  }

  const totalTablePages = itemChunks.length;
  const totalPages = totalTablePages + 1; // + 1 for Trend Graph page

  // Calculate dynamic report title
  const reportMainTitle = filterType === 'calibrate' 
    ? `CALIBRATION ANNUAL PLAN (${selectedYear})`
    : filterType === 'service_contract'
    ? `SERVICE CONTRACT ANNUAL PLAN (${selectedYear})`
    : filterType === 'pm'
    ? `PREVENTIVE MAINTENANCE ANNUAL PLAN (${selectedYear})`
    : `MAINTENANCE & CALIBRATION ANNUAL PLAN (${selectedYear})`;

  // Calculate high-level summary KPIs
  const totalAnnualTarget = filteredItems.reduce(
    (acc, item) =>
      acc + MONTH_NAMES.filter((_, mIdx) => isMonthRequired(item, selectedYear, mIdx + 1)).length,
    0
  );

  const maxMonth = selectedYear === 2026 ? 5 : 12;

  const totalPlanYTD = filteredItems.reduce(
    (acc, item) =>
      acc +
      MONTH_NAMES.filter((_, mIdx) => {
        const mNum = mIdx + 1;
        return mNum <= maxMonth && isMonthRequired(item, selectedYear, mNum);
      }).length,
    0
  );

  const totalCompletedYTD = filteredItems.reduce(
    (acc, item) =>
      acc +
      MONTH_NAMES.filter((_, mIdx) => {
        const mNum = mIdx + 1;
        const st = getCellStatus ? getCellStatus(item, selectedYear, mNum) : 'faded';
        return mNum <= maxMonth && isMonthRequired(item, selectedYear, mNum) && (st === 'done' || st === 'shifted-plan');
      }).length,
    0
  );

  const achievementRate = totalPlanYTD > 0 ? Math.round((totalCompletedYTD / totalPlanYTD) * 100) : 100;

  const totalOverdue = filteredItems.reduce(
    (acc, item) =>
      acc +
      MONTH_NAMES.filter((_, mIdx) => isMonthRequired(item, selectedYear, mIdx + 1) && (getCellStatus ? getCellStatus(item, selectedYear, mIdx + 1) : 'faded') === 'overdue').length,
    0
  );

  // Monthly Chart & Table Data
  const monthlyData = MONTH_NAMES.map((name, i) => {
    const monthNum = i + 1;
    const planCount = filteredItems.filter(item => isMonthRequired(item, selectedYear, monthNum)).length;
    const actualCount = filteredItems.filter(item => {
      const st = getCellStatus ? getCellStatus(item, selectedYear, monthNum) : 'faded';
      return isMonthRequired(item, selectedYear, monthNum) && (st === 'done' || st === 'shifted-plan');
    }).length;
    const pct = planCount > 0 ? Math.round((actualCount / planCount) * 100) : 100;

    return {
      name,
      Plan: planCount,
      Actual: actualCount,
      AchievementPct: pct
    };
  });

  // Direct PDF File Generation & Download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    let container = null;
    try {
      const reportElement = document.getElementById('printable-pm-report');
      if (!reportElement) throw new Error('Report element not found');

      // Load html2pdf dynamically if not attached to window
      let html2pdfLib = window.html2pdf;
      if (!html2pdfLib) {
        try {
          const module = await import('html2pdf.js');
          html2pdfLib = module.default || module;
        } catch (err) {
          html2pdfLib = await new Promise((resolve, reject) => {
            if (window.html2pdf) return resolve(window.html2pdf);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => resolve(window.html2pdf);
            script.onerror = () => reject(new Error('Failed to load html2pdf script'));
            document.body.appendChild(script);
          });
        }
      }

      // Clone reportElement to bypass modal scroll container offset
      const clone = reportElement.cloneNode(true);

      // Remove screen-only preview banners from PDF clone
      const noPrintEls = clone.querySelectorAll('.no-print');
      noPrintEls.forEach(el => el.remove());

      // Create a temporary off-screen container attached directly to document.body
      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1120px'; // A4 Landscape width
      container.style.backgroundColor = '#ffffff';
      container.appendChild(clone);
      document.body.appendChild(container);

      const opt = {
        margin: [4, 4, 4, 4],
        filename: `${documentNo || 'PM-Report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1200
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'], after: '.pdf-page-break' }
      };

      await html2pdfLib().set(opt).from(clone).save();
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="modal-overlay pdf-modal-overlay" onClick={onClose}>
      <div className="modal-container pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Screen Header Controls */}
        <div className="modal-header pdf-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px' }}>
                Export Maintenance Report PDF ({totalPages} Pages)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                {totalTablePages} Schedule Table Page{totalTablePages > 1 ? 's' : ''} + 1 Achievement Trend Dashboard | Dual Signatures
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleDownloadPdf} 
              disabled={isGeneratingPdf} 
              id="btn-download-pdf"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isGeneratingPdf ? <Loader2 size={16} className="spin-icon" /> : <Download size={16} />}
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF File'}</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Screen Options Panel (Hidden in Print) */}
        <div className="no-print" style={{ padding: '12px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={15} />
            <span>Configure Signatories & Header Metadata:</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Engineer Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Praween P."
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Engineer Title</label>
              <input 
                type="text"
                className="form-input"
                value={engineerTitle}
                onChange={(e) => setEngineerTitle(e.target.value)}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Manager Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Somchai S."
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Manager Title</label>
              <input 
                type="text"
                className="form-input"
                value={managerTitle}
                onChange={(e) => setManagerTitle(e.target.value)}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Report Date</label>
              <input 
                type="date"
                className="form-input"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text2)', display: 'block', marginBottom: '4px' }}>Doc Reference No.</label>
              <input 
                type="text"
                className="form-input"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="pdf-modal-body" id="printable-pm-report">
          {/* ============================================================== */}
          {/* PAGES 1 to N-1: PM SCHEDULE TABLE CHUNKS (12 ITEMS PER PAGE) */}
          {/* ============================================================== */}
          {itemChunks.map((chunk, pageIdx) => {
            const pageNum = pageIdx + 1;
            const startItemIdx = pageIdx * ITEMS_PER_PAGE + 1;
            const endItemIdx = Math.min((pageIdx + 1) * ITEMS_PER_PAGE, filteredItems.length);

            return (
              <React.Fragment key={pageIdx}>
                {/* Page Indicator Banner for Screen Preview */}
                <div className="pdf-page-indicator no-print" style={{ marginTop: pageIdx > 0 ? '20px' : '0' }}>
                  <span>
                    📄 PAGE {pageNum} OF {totalPages}: PM SCHEDULE TABLE (Items {filteredItems.length === 0 ? '0' : `${startItemIdx} - ${endItemIdx}`})
                  </span>
                </div>

                <div className="pdf-page pdf-page-table">
                  {/* Header */}
                  <div className="pdf-header">
                    <div className="pdf-header-title-box">
                      <div className="pdf-company-logo">MACE</div>
                      <div>
                        <h1 className="pdf-title">{reportMainTitle}</h1>
                        <p className="pdf-subtitle">MAINTENANCE & EQUIPMENT MANAGEMENT REPORT</p>
                      </div>
                    </div>
                    <div className="pdf-meta-box">
                      <div><strong>Doc No:</strong> {documentNo}</div>
                      <div><strong>Plant:</strong> {filterPlant === 'all' ? 'ALL PLANTS' : filterPlant.toUpperCase()}</div>
                      <div><strong>Date:</strong> {reportDate}</div>
                      <div><strong>Total Items:</strong> {filteredItems.length}</div>
                      <div><strong>Page:</strong> {pageNum} of {totalPages}</div>
                    </div>
                  </div>

                  {/* PM Schedule Table */}
                  <div className="pdf-table-wrapper">
                    <table className="pdf-table">
                      <thead>
                        <tr>
                          <th style={{ width: '26px' }}>#</th>
                          <th style={{ width: '40px' }}>Plant</th>
                          <th style={{ width: '38px', textAlign: 'center' }}>Tag</th>
                          <th style={{ width: '32px', textAlign: 'center' }}>Rank</th>
                          <th style={{ textAlign: 'left', minWidth: '130px' }}>Machine / Equipment</th>
                          <th style={{ width: '70px' }}>Cycle</th>
                          <th style={{ width: '75px' }}>Checksheet</th>
                          {MONTH_NAMES.map(m => (
                            <th key={m} style={{ width: '28px', textAlign: 'center' }}>{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.length === 0 ? (
                          <tr>
                            <td colSpan={19} style={{ textAlign: 'center', padding: '20px' }}>
                              No items found for the selected filter.
                            </td>
                          </tr>
                        ) : (
                          chunk.map((item, idx) => {
                            const globalIdx = pageIdx * ITEMS_PER_PAGE + idx + 1;
                            const itemTypeVal = item.itemType || item.type || 'pm';
                            const itemRankVal = item.rank || 'B';
                            return (
                              <tr key={item.id || globalIdx}>
                                <td style={{ textAlign: 'center', fontSize: '9px', fontWeight: '500' }}>{globalIdx}</td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.plant || 'RFG'}</td>
                                <td style={{ 
                                  textAlign: 'center', 
                                  fontSize: '8.5px', 
                                  fontWeight: 'bold', 
                                  color: (itemTypeVal === 'calibrate' || String(itemTypeVal).toLowerCase().includes('cal')) 
                                    ? '#7e22ce' 
                                    : (itemTypeVal === 'service_contract' || String(itemTypeVal).toLowerCase().includes('contract') || String(itemTypeVal).toLowerCase().includes('service')) 
                                    ? '#047857' 
                                    : '#0369a1' 
                                }}>
                                  {(itemTypeVal === 'calibrate' || String(itemTypeVal).toLowerCase().includes('cal')) 
                                    ? 'Cal' 
                                    : (itemTypeVal === 'service_contract' || String(itemTypeVal).toLowerCase().includes('contract') || String(itemTypeVal).toLowerCase().includes('service')) 
                                    ? 'Contract' 
                                    : 'PM'}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                                  {itemRankVal}
                                </td>
                                <td style={{ textAlign: 'left', fontWeight: '600' }}>
                                  <div>{item.machineName}</div>
                                  {(item.note || item.itemNote) && (
                                    <div style={{ fontSize: '8px', color: '#475569', fontStyle: 'italic', fontWeight: 'normal' }}>
                                      {item.note || item.itemNote}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 'normal' }}>
                                    {item.responsible === 'Own Team' ? 'My Team' : (item.responsible || 'My Team')}
                                  </div>
                                </td>
                                <td style={{ textTransform: 'capitalize', fontSize: '9px' }}>{item.cycle}</td>
                                <td className="font-mono" style={{ fontSize: '9px' }}>{item.checksheetId || '-'}</td>
                                {Array.from({ length: 12 }).map((_, mIdx) => {
                                  const monthNum = mIdx + 1;
                                  const details = getCellDetails ? getCellDetails(item, selectedYear, monthNum) : null;
                                  const cellState = details ? details.status : (getCellStatus ? getCellStatus(item, selectedYear, monthNum) : 'faded');

                                  let cellText = details ? details.text : '';
                                  let cellBgClass = 'pdf-cell-faded';

                                  if (cellState === 'done') {
                                    cellBgClass = 'pdf-cell-done';
                                    if (!details) {
                                      const matchingLog = logs.find(
                                        (log) => log.planId === item.id && Number(log.year) === selectedYear && Number(log.month) === monthNum
                                      );
                                      if (matchingLog && matchingLog.doneDate) {
                                        const parts = matchingLog.doneDate.split('-');
                                        cellText = parts.length === 3 ? parseInt(parts[2], 10).toString() : '✓';
                                      } else {
                                        cellText = '✓';
                                      }
                                    }
                                  } else if (cellState === 'shifted-plan') {
                                    cellBgClass = 'pdf-cell-shifted-plan';
                                  } else if (cellState === 'shifted-actual') {
                                    cellBgClass = 'pdf-cell-shifted-actual';
                                  } else if (cellState === 'pending') {
                                    cellBgClass = 'pdf-cell-pending';
                                    cellText = '';
                                  } else if (cellState === 'overdue') {
                                    cellBgClass = 'pdf-cell-overdue';
                                    cellText = '!';
                                  }

                                  return (
                                    <td key={monthNum} className={`pdf-month-cell ${cellBgClass}`}>
                                      {details?.line1 || details?.line2 ? (
                                        <div style={{ lineHeight: '1.15', textAlign: 'center' }}>
                                          {details.line1 && <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{details.line1}</div>}
                                          {details.line2 && <div style={{ fontSize: '8.5px', fontWeight: 'bold' }}>{details.line2}</div>}
                                        </div>
                                      ) : (
                                        cellText
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="pdf-legend">
                    <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-pending"></span> Scheduled</span>
                    <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-done"></span> On-Time (e.g. 1st (17))</span>
                    <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-shifted-plan"></span> Shifted Plan (➔ Apr)</span>
                    <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-shifted-actual"></span> Shifted Done (1st (17*))</span>
                    <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-overdue"></span> Overdue (!)</span>
                    <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-faded"></span> N/A</span>
                  </div>

                  {/* Dual Signature Block on every page */}
                  <div className="pdf-signature-section">
                    <div className="pdf-signature-box">
                      <div className="pdf-sig-role">PREPARED / ACTION BY</div>
                      <div className="pdf-sig-space" style={{ height: '32px' }}></div>
                      <div className="pdf-sig-line-area">
                        <div className="pdf-sig-line"></div>
                      </div>
                      <div className="pdf-sig-name">( {engineerName || '....................................................................'} )</div>
                      <div className="pdf-sig-title">{engineerTitle || 'Maintenance Engineer'}</div>
                      <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
                    </div>

                    <div className="pdf-signature-box">
                      <div className="pdf-sig-role">APPROVED / VERIFIED BY</div>
                      <div className="pdf-sig-space" style={{ height: '32px' }}></div>
                      <div className="pdf-sig-line-area">
                        <div className="pdf-sig-line"></div>
                      </div>
                      <div className="pdf-sig-name">( {managerName || '....................................................................'} )</div>
                      <div className="pdf-sig-title">{managerTitle || 'Maintenance Manager'}</div>
                      <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* ============================================================== */}
          {/* FINAL PAGE (Page N): PM ACHIEVEMENT TREND GRAPH & DUAL SIGNATURE BLOCK */}
          {/* ============================================================== */}
          <div className="pdf-page-indicator no-print" style={{ marginTop: '20px' }}>
            <span>📊 PAGE {totalPages} OF {totalPages}: PM ACHIEVEMENT TREND GRAPH & KPI DASHBOARD</span>
          </div>

          <div className="pdf-page pdf-page-trend">
            {/* Header */}
            <div className="pdf-header">
              <div className="pdf-header-title-box">
                <div className="pdf-company-logo">MACE</div>
                <div>
                  <h1 className="pdf-title">PREVENTIVE MAINTENANCE ACHIEVEMENT & TREND ({selectedYear})</h1>
                  <p className="pdf-subtitle">KPI STATS, TREND ANALYSIS & PERFORMANCE BREAKDOWN</p>
                </div>
              </div>
              <div className="pdf-meta-box">
                <div><strong>Doc No:</strong> {documentNo}</div>
                <div><strong>Plant:</strong> {filterPlant === 'all' ? 'ALL PLANTS' : filterPlant.toUpperCase()}</div>
                <div><strong>Date:</strong> {reportDate}</div>
                <div><strong>Page:</strong> {totalPages} of {totalPages}</div>
              </div>
            </div>

            {/* KPI Cards Row */}
            <div className="pdf-kpi-grid">
              <div className="pdf-kpi-card">
                <div className="pdf-kpi-label">Annual Target</div>
                <div className="pdf-kpi-val">{totalAnnualTarget} <span className="pdf-kpi-unit">PMs</span></div>
              </div>
              <div className="pdf-kpi-card">
                <div className="pdf-kpi-label">Completed YTD</div>
                <div className="pdf-kpi-val" style={{ color: '#059669' }}>{totalCompletedYTD} <span className="pdf-kpi-unit">PMs</span></div>
              </div>
              <div className="pdf-kpi-card">
                <div className="pdf-kpi-label">Achievement Rate</div>
                <div className="pdf-kpi-val" style={{ color: '#2563eb' }}>{achievementRate}%</div>
              </div>
              <div className="pdf-kpi-card">
                <div className="pdf-kpi-label">Overdue</div>
                <div className="pdf-kpi-val" style={{ color: '#dc2626' }}>{totalOverdue} <span className="pdf-kpi-unit">PMs</span></div>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="pdf-chart-container">
              <h3 className="pdf-section-title">PM Plan vs Actual Execution Trend ({selectedYear})</h3>
              <div style={{ width: '100%', height: '165px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#334155' }} />
                    <YAxis tick={{ fontSize: 9.5, fill: '#334155' }} allowDecimals={false} />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      height={24}
                      iconType="circle"
                      formatter={(val) => <span style={{ fontSize: 10, color: '#1e293b', fontWeight: 'bold' }}>{val}</span>}
                    />
                    <Bar dataKey="Plan" name="Planned (Plan)" fill="#93c5fd" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="Plan" position="top" style={{ fill: '#1e293b', fontSize: '8.5px', fontWeight: 'bold' }} />
                    </Bar>
                    <Bar dataKey="Actual" name="Actual (Logged)" fill="#86efac" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="Actual" position="top" style={{ fill: '#065f46', fontSize: '8.5px', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Summary Table */}
            <div className="pdf-table-wrapper" style={{ marginTop: '8px' }}>
              <table className="pdf-table font-mono" style={{ fontSize: '9.5px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Job Metric</th>
                    {MONTH_NAMES.map(m => (
                      <th key={m} style={{ textAlign: 'center', padding: '4px 2px' }}>{m}</th>
                    ))}
                    <th style={{ textAlign: 'center', background: '#e2e8f0' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', textAlign: 'left', padding: '4px 8px' }}>Planned (Plan)</td>
                    {monthlyData.map((d, i) => (
                      <td key={i} style={{ textAlign: 'center' }}>{d.Plan}</td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc' }}>
                      {monthlyData.reduce((acc, curr) => acc + curr.Plan, 0)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', textAlign: 'left', padding: '4px 8px' }}>Actual (Logged)</td>
                    {monthlyData.map((d, i) => (
                      <td key={i} style={{ textAlign: 'center', color: d.Actual > 0 ? '#059669' : 'inherit', fontWeight: d.Actual > 0 ? 'bold' : 'normal' }}>
                        {d.Actual}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc', color: '#059669' }}>
                      {monthlyData.reduce((acc, curr) => acc + curr.Actual, 0)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', textAlign: 'left', padding: '4px 8px' }}>Achievement %</td>
                    {monthlyData.map((d, i) => {
                      let pctColor = '#64748b';
                      if (d.Plan > 0) {
                        if (d.AchievementPct >= 100) pctColor = '#059669';
                        else if (d.AchievementPct > 0) pctColor = '#d97706';
                        else pctColor = '#dc2626';
                      }
                      return (
                        <td key={i} style={{ textAlign: 'center', fontWeight: 'bold', color: pctColor }}>
                          {d.Plan > 0 ? `${d.AchievementPct}%` : '-'}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 'bold', background: '#f8fafc', color: '#2563eb' }}>
                      {achievementRate}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Dual Signature Block Page N */}
            <div className="pdf-signature-section">
              <div className="pdf-signature-box">
                <div className="pdf-sig-role">PREPARED / ACTION BY</div>
                <div className="pdf-sig-space" style={{ height: '32px' }}></div>
                <div className="pdf-sig-line-area">
                  <div className="pdf-sig-line"></div>
                </div>
                <div className="pdf-sig-name">( {engineerName || '....................................................................'} )</div>
                <div className="pdf-sig-title">{engineerTitle || 'Maintenance Engineer'}</div>
                <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
              </div>

              <div className="pdf-signature-box">
                <div className="pdf-sig-role">APPROVED / VERIFIED BY</div>
                <div className="pdf-sig-space" style={{ height: '32px' }}></div>
                <div className="pdf-sig-line-area">
                  <div className="pdf-sig-line"></div>
                </div>
                <div className="pdf-sig-name">( {managerName || '....................................................................'} )</div>
                <div className="pdf-sig-title">{managerTitle || 'Maintenance Manager'}</div>
                <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
