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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './config';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// Helper to convert File to Base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Format file size nicely
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// IndexedDB setup for attachments
const IDB_NAME = 'MACE_ATTACHMENTS_DB';
const IDB_STORE = 'files';

function openAttachmentsDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    const request = window.indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
}

export async function saveAttachmentToLocalDB(id, dataUrl) {
  try {
    const db = await openAttachmentsDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ id, dataUrl, savedAt: Date.now() });
  } catch (err) {
    console.warn('Could not cache file to IndexedDB:', err);
  }
}

export async function getAttachmentFromLocalDB(id) {
  try {
    const db = await openAttachmentsDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

/**
 * Upload file with real-time percentage progress and instant fallback
 */
export async function uploadAttachment(file, folder = 'pm_attachments', onProgress = null) {
  if (!file) return null;

  const timestamp = Date.now();
  const fileId = `att_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${folder}/${timestamp}_${sanitizedName}`;

  if (onProgress) onProgress(10);

  let cloudUrl = '';
  
  // Try uploading via Firebase Storage with upload task & progress tracking
  try {
    if (storage) {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      cloudUrl = await new Promise((resolve, reject) => {
        // 8-second timeout so it never blocks or fails user workflow
        const timer = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('Storage upload timeout - using local storage'));
        }, 8000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              if (onProgress) onProgress(Math.min(progress, 95));
            }
          },
          (error) => {
            clearTimeout(timer);
            reject(error);
          },
          async () => {
            clearTimeout(timer);
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (e) {
              reject(e);
            }
          }
        );
      });
    }
  } catch (error) {
    console.warn('Firebase Storage upload bypassed/timed out, saving to local database:', error);
  }

  // Base64 encoding for local IndexedDB cache & small files
  if (onProgress) onProgress(98);
  const base64Data = await fileToBase64(file);
  
  // Cache to IndexedDB so it's always viewable/downloadable even offline without 1MB document limit
  await saveAttachmentToLocalDB(fileId, base64Data);

  if (onProgress) onProgress(100);

  return {
    id: fileId,
    name: file.name,
    size: file.size,
    formattedSize: formatBytes(file.size),
    type: file.type || 'application/pdf',
    uploadedAt: new Date().toISOString(),
    cloudUrl: cloudUrl || '',
    // Only store dataUrl in Firestore if file is <= 250KB to guarantee Firestore 1MB document limit is never exceeded
    dataUrl: (file.size <= 250 * 1024) ? base64Data : ''
  };
}


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

  const CHUNK_SIZE = 50; // Smaller chunk size to ensure fast, reliable batch commits without payload timeout
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const op of chunk) {
      const targetId = op.id || op.docId;
      if (op.type === 'delete') {
        const docRef = doc(db, op.collectionName, targetId);
        batch.delete(docRef);
      } else if (op.type === 'set') {
        const docRef = doc(db, op.collectionName, targetId);
        batch.set(docRef, {
          ...op.data,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else if (op.type === 'create') {
        const colRef = collection(db, op.collectionName);
        const newDocRef = targetId ? doc(db, op.collectionName, targetId) : doc(colRef);
        batch.set(newDocRef, {
          ...op.data,
          createdAt: new Date().toISOString()
        });
        if (op.onDocCreated) {
          op.onDocCreated(newDocRef.id);
        }
      } else if (op.type === 'update') {
        const docRef = doc(db, op.collectionName, targetId);
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

