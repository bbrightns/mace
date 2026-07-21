import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, writeBatch, doc } from 'firebase/firestore';

function parseCSV(text) {
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

function parseDateStrToISO(dateStr) {
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

function calculateShiftFromTime(timeVal) {
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

async function runFastImport() {
  const rawConfig = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
  const firebaseConfig = JSON.parse(rawConfig);
  
  console.log('Connecting to Firestore database:', firebaseConfig.firestoreDatabaseId || '(default)');
  const app = initializeApp(firebaseConfig);
  const db = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

  const troubleRef = collection(db, 'mace_trouble_records');

  // Fast deletion in batches of 400
  console.log('Clearing existing documents...');
  const existingDocs = await getDocs(troubleRef);
  let batch = writeBatch(db);
  let count = 0;
  for (const d of existingDocs.docs) {
    batch.delete(doc(db, 'mace_trouble_records', d.id));
    count++;
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (count % 400 !== 0) await batch.commit();
  console.log(`Deleted ${count} existing records.`);

  const csvPath = path.join(process.cwd(), 'Trouble_analysis_EE.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const allRows = parseCSV(csvContent);
  const rows = allRows.slice(1);
  console.log(`Inserting ${rows.length} rows using batch commits...`);

  batch = writeBatch(db);
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const plant = r[0] || '';
    const dateStr = r[1] || '';
    const timeStr = r[2] || '';
    const shift = r[3] || '';
    const shift2 = r[4] || '';
    const location = r[5] || '';
    const equipment = r[6] || '';
    const name = r[7] || '';
    const detail = r[8] || '';
    const detail2 = r[9] || '';

    if (!plant && !location && !equipment && !detail) continue;

    const downtimeHrs = parseFloat(timeStr) || 0;
    const formattedDateTime = parseDateStrToISO(dateStr);
    const targetNo = `TR-${String(inserted + 1).padStart(4, '0')}`;

    const plantVal = plant.trim() || 'MIR';
    const shiftVal = shift.trim() || calculateShiftFromTime(timeStr.trim());
    const shift2Val = shift2.trim() || (plantVal === 'MIR' ? 'MIR สมนึก + ธีร์' : '');

    const newDocRef = doc(troubleRef);
    batch.set(newDocRef, {
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

      // Legacy/Compat fields
      machineEquipment: [location, equipment, name].filter(Boolean).join(' - ') || 'General Line',
      problemDescription: detail ? detail.trim() : 'Unspecified breakdown issue',
      actionTaken: detail2 ? detail2.trim() : null,
      rootCause: detail2 ? detail2.trim() : null,
      pic: shift2Val,
      downtimeHrs: downtimeHrs,
      status: 'Finished',
      closedDate: formattedDateTime.substring(0, 10),
      sparePartsUsed: []
    });

    inserted++;
    if (inserted % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${inserted} records...`);
      batch = writeBatch(db);
    }
  }

  if (inserted % 400 !== 0) {
    await batch.commit();
  }

  console.log(`Batch import completed! Total records: ${inserted}`);
  process.exit(0);
}

runFastImport().catch(err => {
  console.error('Fast import failed:', err);
  process.exit(1);
});
