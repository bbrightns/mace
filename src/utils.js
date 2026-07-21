/**
 * Format a ISO/standard date string to DD MMM YYYY format
 * @param {string} dateString 
 * @returns {string} Formatted date (e.g. 19 May 2026)
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    // maybe it is already in a simple text format
    return dateString;
  }
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format active date relative objects or string to standard YYYY-MM-DD input value
 */
export function toInputDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Formats a monetary number into Thai Baht string format
 * @param {number|string} amount 
 * @returns {string} E.g., ฿120,000
 */
export function formatBaht(amount) {
  if (amount === undefined || amount === null || amount === '') return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return num.toLocaleString('th-TH', { 
    style: 'currency', 
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Formats a budget code in MTHB (Million Thai Baht)
 * @param {number|string} value 
 * @returns {string} E.g., 1.5 MTHB
 */
export function formatMthb(value) {
  if (value === undefined || value === null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  return `${num.toLocaleString('th-TH', { maximumFractionDigits: 3 })} MTHB`;
}

export function parseCSV(text) {
  const result = [];
  let row = [];
  let currentField = '';
  let insideQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    
    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField.trim());
      if (row.length > 1 || row[0] !== '') result.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    if (row.length > 1 || row[0] !== '') result.push(row);
  }
  return result;
}

export function parseDateStrToISO(dateStr) {
  if (!dateStr) return new Date().toISOString().substring(0, 16);
  const cleanStr = dateStr.replace(/^[A-Za-z]{3},\s*/, '').trim();
  const parts = cleanStr.split('-');
  
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1];
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr.toLowerCase()] || '01';
    return `${year}-${month}-${day}T08:00`;
  }
  return new Date().toISOString().substring(0, 16);
}

/**
 * Format raw decimal or string time values (e.g. 7.29, 9.03, 13.47, 0.36, 1.2) into 24-hour HH:mm time format
 * @param {string|number} val 
 * @returns {string} E.g. "07:29", "09:03", "13:47", "00:36"
 */
export function formatTime24(val) {
  if (val === null || val === undefined || val === '') return '—';
  const str = String(val).trim();
  if (!str) return '—';

  if (str.includes(':')) {
    const parts = str.split(':');
    const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
    const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
    return `${h}:${m}`;
  }

  if (str.includes('.')) {
    const parts = str.split('.');
    const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
    let mStr = parts[1] || '0';
    if (mStr.length === 1) mStr = mStr + '0';
    else if (mStr.length > 2) mStr = mStr.substring(0, 2);
    const m = String(parseInt(mStr, 10) || 0).padStart(2, '0');
    return `${h}:${m}`;
  }

  const cleanNum = str.replace(/\D/g, '');
  if (cleanNum) {
    if (cleanNum.length === 3) {
      const h = cleanNum.substring(0, 1).padStart(2, '0');
      const m = cleanNum.substring(1, 3);
      return `${h}:${m}`;
    }
    if (cleanNum.length === 4) {
      const h = cleanNum.substring(0, 2);
      const m = cleanNum.substring(2, 4);
      return `${h}:${m}`;
    }
    const num = parseInt(cleanNum, 10);
    if (!isNaN(num)) {
      const h = String(num).padStart(2, '0');
      return `${h}:00`;
    }
  }

  return str;
}

/**
 * Auto-calculate Shift (M, E, N) from Time value according to formula:
 * IF(AND(time>=8.01, time<=16), "M", IF(AND(time>=16.01, time<=23.59), "E", "N"))
 * @param {string|number} timeVal 
 * @returns {string} "M", "E", or "N" (or "" if empty)
 */
export function calculateShiftFromTime(timeVal) {
  if (timeVal === null || timeVal === undefined || timeVal === '') return '';
  const str = String(timeVal).trim();
  if (!str) return '';

  let num = 0;
  if (str.includes(':')) {
    const parts = str.split(':');
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    num = h + (m / 100);
  } else {
    num = parseFloat(str);
  }

  if (isNaN(num)) return '';

  if (num >= 8.01 && num <= 16.00) {
    return 'M';
  } else if (num >= 16.01 && num <= 23.59) {
    return 'E';
  } else {
    return 'N';
  }
}



