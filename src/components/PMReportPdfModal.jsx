import React, { useState } from 'react';
import { Printer, X, UserCheck, FileText } from 'lucide-react';
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

export default function PMReportPdfModal({
  isOpen,
  onClose,
  items = [],
  logs = [],
  selectedYear = 2026,
  filterPlant = 'all',
  isMonthRequired,
  getCellStatus
}) {
  const [engineerName, setEngineerName] = useState('');
  const [engineerTitle, setEngineerTitle] = useState('Maintenance Engineer');
  const [managerName, setManagerName] = useState('');
  const [managerTitle, setManagerTitle] = useState('Maintenance Manager');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentNo, setDocumentNo] = useState(`PM-RPT-${selectedYear}-${filterPlant.toUpperCase()}`);

  if (!isOpen) return null;

  // Filter items based on plant
  const filteredItems = items.filter(item => {
    if (filterPlant !== 'all' && (item.plant || 'RFG').toLowerCase() !== filterPlant.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Calculate KPIs
  const today = new Date();
  const currentYearVal = today.getFullYear();
  const currentMonthVal = today.getMonth() + 1;

  let maxMonth = 12;
  if (selectedYear === currentYearVal) {
    maxMonth = currentMonthVal;
  } else if (selectedYear > currentYearVal) {
    maxMonth = 0;
  }

  const totalAnnualTarget = filteredItems.reduce(
    (acc, item) => acc + MONTH_NAMES.filter((_, mIdx) => isMonthRequired(item, selectedYear, mIdx + 1)).length,
    0
  );

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
        return mNum <= maxMonth && isMonthRequired(item, selectedYear, mNum) && getCellStatus(item, selectedYear, mNum) === 'done';
      }).length,
    0
  );

  const achievementRate = totalPlanYTD > 0 ? Math.round((totalCompletedYTD / totalPlanYTD) * 100) : 100;

  const totalOverdue = filteredItems.reduce(
    (acc, item) =>
      acc +
      MONTH_NAMES.filter((_, mIdx) => isMonthRequired(item, selectedYear, mIdx + 1) && getCellStatus(item, selectedYear, mIdx + 1) === 'overdue').length,
    0
  );

  // Monthly Chart & Table Data
  const monthlyData = MONTH_NAMES.map((name, i) => {
    const monthNum = i + 1;
    const planCount = filteredItems.filter(item => isMonthRequired(item, selectedYear, monthNum)).length;
    const actualCount = filteredItems.filter(
      item => isMonthRequired(item, selectedYear, monthNum) && getCellStatus(item, selectedYear, monthNum) === 'done'
    ).length;
    const pct = planCount > 0 ? Math.round((actualCount / planCount) * 100) : 100;

    return {
      name,
      Plan: planCount,
      Actual: actualCount,
      AchievementPct: pct
    };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay pdf-modal-overlay" onClick={onClose}>
      <div className="modal-container pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Screen Header Controls */}
        <div className="modal-header pdf-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="modal-title" style={{ fontSize: '16px' }}>Export PM Report PDF (2 Pages)</h3>
              <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
                Page 1: PM Schedule Table | Page 2: Achievement Trend Graph | Dual Signature Blocks
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handlePrint} id="btn-do-print">
              <Printer size={16} />
              <span>Print / Save as PDF</span>
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
          {/* Page 1 Preview Banner */}
          <div className="pdf-page-indicator no-print">
            <span>📄 PAGE 1: PREVENTIVE MAINTENANCE SCHEDULE TABLE ({filteredItems.length} ITEMS)</span>
          </div>

          {/* ============================================================== */}
          {/* PAGE 1: PM SCHEDULE TABLE & DUAL SIGNATURE BLOCK */}
          {/* ============================================================== */}
          <div className="pdf-page pdf-page-1">
            {/* Header */}
            <div className="pdf-header">
              <div className="pdf-header-title-box">
                <div className="pdf-company-logo">MACE</div>
                <div>
                  <h1 className="pdf-title">PREVENTIVE MAINTENANCE ANNUAL PLAN ({selectedYear})</h1>
                  <p className="pdf-subtitle">MAINTENANCE & EQUIPMENT MANAGEMENT REPORT</p>
                </div>
              </div>
              <div className="pdf-meta-box">
                <div><strong>Doc No:</strong> {documentNo}</div>
                <div><strong>Plant:</strong> {filterPlant === 'all' ? 'ALL PLANTS' : filterPlant.toUpperCase()}</div>
                <div><strong>Date:</strong> {reportDate}</div>
                <div><strong>Total Machines:</strong> {filteredItems.length}</div>
                <div><strong>Page:</strong> 1 of 2</div>
              </div>
            </div>

            {/* PM Schedule Table */}
            <div className="pdf-table-wrapper">
              <table className="pdf-table">
                <thead>
                  <tr>
                    <th style={{ width: '28px' }}>#</th>
                    <th style={{ width: '45px' }}>Plant</th>
                    <th style={{ textAlign: 'left', minWidth: '140px' }}>Machine / Equipment</th>
                    <th style={{ width: '75px' }}>Cycle</th>
                    <th style={{ width: '85px' }}>Checksheet ID</th>
                    {MONTH_NAMES.map(m => (
                      <th key={m} style={{ width: '30px', textAlign: 'center' }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={17} style={{ textAlign: 'center', padding: '20px' }}>No PM items found for the selected filter.</td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      return (
                        <tr key={item.id || idx}>
                          <td style={{ textAlign: 'center', fontSize: '9.5px', fontWeight: '500' }}>{idx + 1}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.plant || 'RFG'}</td>
                          <td style={{ textAlign: 'left', fontWeight: '600' }}>
                            <div>{item.machineName}</div>
                            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 'normal' }}>
                              {item.responsible === 'Own Team' ? 'My Team' : (item.responsible || 'My Team')}
                            </div>
                          </td>
                          <td style={{ textTransform: 'capitalize', fontSize: '9.5px' }}>{item.cycle}</td>
                          <td className="font-mono" style={{ fontSize: '9.5px' }}>{item.checksheetId || '-'}</td>
                          {Array.from({ length: 12 }).map((_, mIdx) => {
                            const monthNum = mIdx + 1;
                            const cellState = getCellStatus(item, selectedYear, monthNum);

                            let cellText = '';
                            let cellBgClass = 'pdf-cell-faded';

                            if (cellState === 'done') {
                              cellBgClass = 'pdf-cell-done';
                              const matchingLog = logs.find(
                                (log) => log.planId === item.id && Number(log.year) === selectedYear && Number(log.month) === monthNum
                              );
                              if (matchingLog && matchingLog.doneDate) {
                                const parts = matchingLog.doneDate.split('-');
                                cellText = parts.length === 3 ? parseInt(parts[2], 10).toString() : '✓';
                              } else {
                                cellText = '✓';
                              }
                            } else if (cellState === 'pending') {
                              cellBgClass = 'pdf-cell-pending';
                              cellText = '';
                            } else if (cellState === 'overdue') {
                              cellBgClass = 'pdf-cell-overdue';
                              cellText = '!';
                            }

                            return (
                              <td key={monthNum} className={`pdf-month-cell ${cellBgClass}`}>
                                {cellText}
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
              <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-pending"></span> Scheduled / Pending</span>
              <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-done"></span> Completed (e.g. 17)</span>
              <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-overdue"></span> Overdue (!)</span>
              <span className="pdf-legend-item"><span className="pdf-legend-box pdf-cell-faded"></span> N/A</span>
            </div>

            {/* Dual Signature Block Page 1 */}
            <div className="pdf-signature-section">
              <div className="pdf-signature-box">
                <div className="pdf-sig-role">PREPARED / ACTION BY</div>
                <div className="pdf-sig-line-area">
                  <div className="pdf-sig-line"></div>
                </div>
                <div className="pdf-sig-name">( {engineerName || '....................................................................'} )</div>
                <div className="pdf-sig-title">{engineerTitle || 'Maintenance Engineer'}</div>
                <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
              </div>

              <div className="pdf-signature-box">
                <div className="pdf-sig-role">APPROVED / VERIFIED BY</div>
                <div className="pdf-sig-line-area">
                  <div className="pdf-sig-line"></div>
                </div>
                <div className="pdf-sig-name">( {managerName || '....................................................................'} )</div>
                <div className="pdf-sig-title">{managerTitle || 'Maintenance Manager'}</div>
                <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
              </div>
            </div>
          </div>

          {/* Page 2 Preview Banner */}
          <div className="pdf-page-indicator no-print" style={{ marginTop: '16px' }}>
            <span>📊 PAGE 2: PREVENTIVE MAINTENANCE ACHIEVEMENT TREND GRAPH & KPI DASHBOARD</span>
          </div>

          {/* PAGE BREAK FOR PRINT */}
          <div className="pdf-page-break"></div>

          {/* ============================================================== */}
          {/* PAGE 2: PM ACHIEVEMENT TREND GRAPH & DUAL SIGNATURE BLOCK */}
          {/* ============================================================== */}
          <div className="pdf-page pdf-page-2">
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
                <div><strong>Page:</strong> 2 of 2</div>
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

            {/* Dual Signature Block Page 2 */}
            <div className="pdf-signature-section">
              <div className="pdf-signature-box">
                <div className="pdf-sig-role">PREPARED / ACTION BY</div>
                <div className="pdf-sig-line-area">
                  <div className="pdf-sig-line"></div>
                </div>
                <div className="pdf-sig-name">( {engineerName || '....................................................................'} )</div>
                <div className="pdf-sig-title">{engineerTitle || 'Maintenance Engineer'}</div>
                <div className="pdf-sig-date">Date: ........ / ........ / ................</div>
              </div>

              <div className="pdf-signature-box">
                <div className="pdf-sig-role">APPROVED / VERIFIED BY</div>
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
