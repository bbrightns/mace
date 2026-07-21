import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

const csvData = `Budget,Type,Items, Priority ," Estimate\nBudget ",Unit,2026,2027,2028,Note
General,Yearly,PM Transformer,S,"45,000.00",THB,1,1,1,Single point of failure (SPOF) for the entire plant.
General,Yearly,PM Air conditioner,A,"70,000.00",THB,1,1,1,Specifically critical for electrical/server rooms to prevent thermal tripping
RFG,Yearly,PM Service Chiller,S,"120,000.00",THB,1,1,1,Glass manufacturing requires strict thermal control.
RFG,Yearly,Repair works and Deteriorated Parts,S,"2,000,000.00",THB,1,1,1,Baseline continuous OPEX required to maintain basic equipment health
RFG,Yearly,Other Spare part,S,"300,000.00",THB,1,1,1,Baseline continuous OPEX required to maintain basic equipment health
RFG,Sparepart,Cable for MF #9 (100m),S,"400,000.00",THB,1,,,Urgent for repair 2026
RFG,Sparepart,HV Plug for PSU,S,"450,000.00",THB,1,,,Urgent for repair 2026
RFG,Sparepart,Spare parts for MF G1,S,"550,000.00",THB,1,,,Urgent for repair 2026
RFG,Yearly,Calibrate pH/EC,S,"30,000.00",THB,1,1,1,Directly impacts environmental compliance for wastewater treatment.
RFG,Project,Power Supply Replacement – Phase 3 (AE5 to MF10),A,"4,000,000.00",THB,1,,,Continuity of an ongoing critical upgrade phase.
RFG,Project,Replacement of Entry and Exit Sensors (Obsolete Models),A,"300,000.00",THB,1,,,Obsolete parts mean zero vendor support
RFG,Project,Loading - Replace/Upgrade Servo Inverter,A,"500,000.00",THB,,1,,High-wear kinetic systems.
RFG,Sparepart,PNOZ X8P,A,"50,000.00",THB,,1,,Essential on-site stock.
RFG,Sparepart,Sparepart for Power supply,A,"1,000,000.00",THB,,1,,Essential on-site stock.
RFG,Project,T/C Temperature Sensors for Spare Parts,A,"100,000.00",THB,1,,,Essential on-site stock.
RFG,Project,Replacement of Switch Hubs (Long-term Aging Countermeasure),B,"300,000.00",THB,,1,,General infrastructure aging countermeasure.
RFG,Project,Power Supply Replacement – Phase 4 (AE9 to MF11),B,"4,000,000.00",THB,,1,,Next phase and lower priority from AE#5
RFG,Project,Operator PC Upgrade (WS01 and WS02),B,"1,500,000.00",THB,,1,,"Mitigates sluggish HMI response, support DX"
RFG,Project,DX --> Database --> Grafana,B,"2,600,000.00",THB,1,1,,Modernizes data visibility for predictive maintenance.
RFG,Project,Overhaul motor Utility room,B,"150,000.00",THB,,1,,Long term standard
RFG,Project,PLC Network Integration – Phase 2 (Connection to Water Plant),C,"400,000.00",THB,,1,,Essential for centralized SCADA rollout
RFG,Project,Inline Communication Upgrade (Ethernet Cable Replacement),C,"100,000.00",THB,,,1,Essential for centralized SCADA rollout
RFG,Project,"Utility Room Improvement (Pump Cabling, Digital Meters, Status Panel Upgrade)\n(need to wait Chiller replacement)",C,"3,000,000.00",THB,,1,,Double systems but cannot be redundancy.
RFG,Project,Removal of Unused CPS Power Supplies and Air Conditioners in Power Supply Room,C,"200,000.00",THB,,1,,Housekeeping/demolition task.
RFG,Project,Ground Box and new plug outlet,C,"300,000.00",THB,1,,,Minor convenience infrastructure.
MIR,Yearly,PM Service AHU (De-sulphur),S,"200,000.00",THB,1,1,1,Baseline continuous OPEX required to maintain basic equipment health
MIR,Yearly,Calibrate pH/EC,S,"40,000.00",THB,1,1,1,Directly impacts environmental compliance for wastewater treatment.
MIR,Yearly,Calibrate Xylene gas detector,S,"10,000.00",THB,1,1,1,Safety / Regulatory Compliance.
MIR,Yearly,Repair works and Deteriorated Parts,S,"1,000,000.00",THB,1,1,1,Baseline continuous OPEX required to maintain basic equipment health
MIR,Yearly,Other Spare part,S,"300,000.00",THB,1,1,1,Baseline continuous OPEX required to maintain basic equipment health
MIR,Project,Switchboard Panel Renewal (SB-04) with Dedicated Room and Air Conditioning,A,"3,000,000.00",THB,,1,,"Aging, Big upgrade, support SCADA"
MIR,Project,Inverter + Cabinet (New Xylene blower Top paint),A,"500,000.00",THB,1,,,"Aging, need to replace or keep spare part"
MIR,Project,Bottero - Replace/Upgrade Servo Inverter,A,"500,000.00",THB,,1,,High-wear kinetic systems.
MIR,Sparepart,Sensor KEYENCE Base/Top paint,A,"30,000.00",THB,,1,,Essential on-site stock.
MIR,Sparepart,S8JX-G010024CD,A,"10,000.00",THB,,1,,Essential on-site stock.
MIR,Project,Switchboard Panel Renewal (SB-03) with Dedicated Room and Air Conditioning,B,"5,500,000.00",THB,1,,,"Aging, Big upgrade, support SCADA"
MIR,Project,SCADA System Installation with Ethernet Communication Along the Line,B,"1,500,000.00",THB,,,1,Essential for centralized SCADA rollout
MIR,Project,CCTV Network Upgrade to IP System with Centralized NVR,C,"400,000.00",THB,,1,,Security and audit trailing improvement
MIR,Project,Switchboard Panel Renewal (SB-02),C,"2,500,000.00",THB,,,1,"Aging, Big upgrade, support SCADA"
MIR,Project,PLC Network Integration – Phase 3 (MIR Area),C,"300,000.00",THB,,,1,Essential for centralized SCADA rollout`;

// Function to parse CSV accurately including multi-line values in quotes
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
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentField.trim());
      if (row.some(x => x !== '')) {
        result.push(row);
      }
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    result.push(row);
  }
  
  // Skip header row
  return result.slice(1);
}

async function run() {
  const rawConfig = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8');
  const firebaseConfig = JSON.parse(rawConfig);
  
  console.log('Connecting to Firestore database:', firebaseConfig.firestoreDatabaseId);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  
  const parsed = parseCSV(csvData);
  console.log(`Parsed ${parsed.length} rows from CSV (including multiline fields)`);
  
  const colRef = collection(db, 'mace_project_planning');
  
  // Clear existing collection to avoid duplication and partial datasets
  const snapshot = await getDocs(colRef);
  console.log(`Clearing ${snapshot.size} existing items...`);
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'mace_project_planning', docSnap.id));
  }
  
  let inserted = 0;
  for (const row of parsed) {
    if (row.length < 10) {
      console.warn('Skipping invalid or incomplete row:', row);
      continue;
    }
    
    const [budgetGroup, type, items, priority, estimateBudgetStr, unit, y2026, y2027, y2028, note] = row;
    
    // Convert estimate budget str (e.g. "4,000,000.00") to numeric MTHB (Million THB)
    const cleanBudgetStr = estimateBudgetStr.replace(/[",]/g, '');
    const budgetValueTHB = parseFloat(cleanBudgetStr);
    const budgetValueMTHB = isNaN(budgetValueTHB) ? 0 : (budgetValueTHB / 1000000);
    
    const timelineYears = {
      Y2026: y2026 === '1',
      Y2027: y2027 === '1',
      Y2028: y2028 === '1',
      Y2029: false,
      Y2030: false
    };
    
    const payload = {
      plant: budgetGroup.toUpperCase() === 'GENERAL' ? 'General' : budgetGroup.toUpperCase(), // Store 'General', 'RFG', or 'MIR'
      type: type.trim(), // 'Yearly', 'Sparepart', or 'Project'
      item: items.trim(),
      priority: priority.trim().toUpperCase(),
      estimatedBudgetMthb: parseFloat(budgetValueMTHB.toFixed(6)), // store precisely
      timelineYears,
      note: note ? note.trim() : '',
      budgetApproved: false,
      scopeReady: false,
      prDone: false,
      poDone: false,
      workCompleted: false,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(colRef, payload);
    inserted++;
  }
  
  console.log(`Successfully uploaded ${inserted} records into mace_project_planning!`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
