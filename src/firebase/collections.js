import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './config';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// Error wrapper according to standard rules
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection initially
export async function testFirestoreConnection() {
  try {
    const testDoc = doc(db, 'mace_pm_plans', 'test-connection-doc-id');
    await getDocFromServer(testDoc);
    console.log("Firebase connection active.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}

// Generic CRUD methods to make application scalable and prevent bundle bloat
export function subscribeCollection(collectionName, onNext, onError) {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      onNext(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, collectionName);
      } catch (e) {
        console.error("Collection subscription error for", collectionName, e);
      }
      if (onError) onError(error);
    }
  );
}

export async function createDocument(collectionName, data) {
  try {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionName);
  }
}

export async function updateDocument(collectionName, id, data) {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
  }
}

export async function setDocument(collectionName, id, data) {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
  }
}

export async function deleteDocument(collectionName, id) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
}

// Batch write operations for high performance bulk creates/updates/deletes (max 500 ops per batch)
export async function batchWriteOperations(operations) {
  // operations is an array of objects: { type: 'set'|'update'|'delete', collectionName, id, data }
  if (!operations || operations.length === 0) return;

  const CHUNK_SIZE = 400; // Safe below Firestore 500 limit
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const op of chunk) {
      if (op.type === 'delete') {
        const docRef = doc(db, op.collectionName, op.id);
        batch.delete(docRef);
      } else if (op.type === 'set') {
        const docRef = doc(db, op.collectionName, op.id);
        batch.set(docRef, {
          ...op.data,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else if (op.type === 'create') {
        const colRef = collection(db, op.collectionName);
        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
          ...op.data,
          createdAt: new Date().toISOString()
        });
        if (op.onDocCreated) {
          op.onDocCreated(newDocRef.id);
        }
      } else if (op.type === 'update') {
        const docRef = doc(db, op.collectionName, op.id);
        batch.update(docRef, {
          ...op.data,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await batch.commit();
  }
}

export async function batchDeleteDocuments(collectionName, ids) {
  if (!ids || ids.length === 0) return;
  const ops = ids.map(id => ({ type: 'delete', collectionName, id }));
  await batchWriteOperations(ops);
}

