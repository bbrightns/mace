import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'exalted-outlet-04jp1',
  appId: '1:414755035856:web:df32fb055c720a65325cd5',
  apiKey: 'AIzaSyC2fFbA70dvarBCZjr4xiuTWEU1rzJO50E',
  authDomain: 'exalted-outlet-04jp1.firebaseapp.com',
  storageBucket: 'exalted-outlet-04jp1.firebasestorage.app',
  messagingSenderId: '414755035856',
};

const databaseId = 'ai-studio-a64fd741-04e7-42d0-99ca-e51867f555a6';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, databaseId);

async function check() {
  const colRef = collection(db, 'mace_tasks');
  const snapshot = await getDocs(colRef);
  console.log(`Total tasks in DB: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.taskDate === '2026-07-23') {
      console.log(`ID: ${doc.id}, Date: ${data.taskDate}, PlantSection: ${data.plantSection}, TaskName: "${data.taskName}", Section: "${data.section}", Equipment: "${data.equipment}", Mech: "${data.mechTechnicians}", Elec: "${data.elecTechnicians}"`);
    }
  });
  process.exit(0);
}

check().catch(console.error);
