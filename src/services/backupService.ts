import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface DatabaseBackup {
  exportDate: string;
  version: string;
  appName: string;
  collections: {
    materials: any[];
    categories: any[];
    units: any[];
    suppliers: any[];
    customers: any[];
    projects: any[];
    movements: any[];
    notifications: any[];
    settings: any[];
    users: any[];
  };
}

export async function exportFirestoreDatabase(): Promise<string> {
  const collectionsToExport = [
    'materials',
    'categories',
    'units',
    'suppliers',
    'customers',
    'projects',
    'movements',
    'notifications',
    'settings',
    'users'
  ];

  const backupData: DatabaseBackup = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    appName: 'KHAYAL Warehouse Management System',
    collections: {
      materials: [],
      categories: [],
      units: [],
      suppliers: [],
      customers: [],
      projects: [],
      movements: [],
      notifications: [],
      settings: [],
      users: []
    }
  };

  for (const colName of collectionsToExport) {
    const snap = await getDocs(collection(db, colName));
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    (backupData.collections as any)[colName] = items;
  }

  return JSON.stringify(backupData, null, 2);
}

export async function exportFullDatabaseBackup(): Promise<void> {
  const jsonStr = await exportFirestoreDatabase();
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KHAYAL_WMS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreFirestoreDatabase(jsonData: string): Promise<void> {
  let parsed: DatabaseBackup;
  try {
    parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
  } catch (e) {
    throw new Error('ملف النسخة الاحتياطية غير صالحة بصيغة JSON');
  }

  if (!parsed.collections) {
    throw new Error('ملف غير معتمد للنسخ الاحتياطي');
  }

  for (const [colName, docs] of Object.entries(parsed.collections)) {
    if (Array.isArray(docs)) {
      for (const item of docs) {
        if (item.id) {
          const { id, ...data } = item;
          await setDoc(doc(db, colName, id), data, { merge: true });
        }
      }
    }
  }
}

export async function importFullDatabaseBackup(backupObjectOrString: any): Promise<void> {
  await restoreFirestoreDatabase(backupObjectOrString);
}
