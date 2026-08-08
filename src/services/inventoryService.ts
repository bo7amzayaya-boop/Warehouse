import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanUndefinedData } from '../firebase/config';
import {
  Material,
  Category,
  Unit,
  Supplier,
  Customer,
  Project,
  Movement,
  NotificationItem,
  SystemSettings,
  WarehouseLocation,
  UserProfile,
  UserRole,
  PurchaseRequisition
} from '../types';
import { createAuditLog } from './auditService';

// Initial Seeds
export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { nameAr: 'حبر', nameEn: 'Ink', description: 'أحبار أحادية وحبر سلفنت وUV' },
  { nameAr: 'بنر', nameEn: 'Banner', description: 'رولات بنر بمختلف الأوزان والمقاسات' },
  { nameAr: 'استيكر', nameEn: 'Sticker', description: 'استيكر أبيض، شفاف، ون واي فيجن، ومضيء' },
  { nameAr: 'فليكس', nameEn: 'Flex', description: 'رولات فليكس للوحات المضيئة' },
  { nameAr: 'كانفاس', nameEn: 'Canvas', description: 'كانفاس قطني وبوليستر للوحات الفنية' },
  { nameAr: 'PVC', nameEn: 'PVC Sheets', description: 'ألواح بولي فينيل كلورايد صلبة' },
  { nameAr: 'فوم', nameEn: 'Foam Board', description: 'ألواح فوم بورد خفيفة الوزن' },
  { nameAr: 'ACP', nameEn: 'Aluminum Composite', description: 'ألواح كلادينج ألومنيوم كومبوزيت' },
  { nameAr: 'أكريليك', nameEn: 'Acrylic', description: 'ألواح أكريليك شفاف وملون' },
  { nameAr: 'ورق', nameEn: 'Paper', description: 'ورق بوسترات وفوتو بايب' },
  { nameAr: 'أخرى', nameEn: 'Other', description: 'مواد ومستلزمات طباعة متنوعة' },
];

export const DEFAULT_UNITS: Omit<Unit, 'id'>[] = [
  { nameAr: 'متر', nameEn: 'Meter', symbol: 'م' },
  { nameAr: 'رول', nameEn: 'Roll', symbol: 'رول' },
  { nameAr: 'قطعة', nameEn: 'Piece', symbol: 'ق' },
  { nameAr: 'لتر', nameEn: 'Liter', symbol: 'ل' },
  { nameAr: 'عبوة', nameEn: 'Bottle', symbol: 'عبوة' },
  { nameAr: 'كجم', nameEn: 'Kilogram', symbol: 'كجم' },
  { nameAr: 'صندوق', nameEn: 'Box', symbol: 'صندوق' },
  { nameAr: 'لوح', nameEn: 'Sheet', symbol: 'لوح' },
  { nameAr: 'حزمة', nameEn: 'Pack', symbol: 'حزمة' },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'مؤسسة الخيال للطباعة والإعلان',
  logoUrl: '',
  address: 'الرياض - المنطقة الصناعية',
  phone: '+966 50 000 0000',
  email: 'info@khayal-print.com',
  defaultCurrency: 'ر.س',
  defaultUnit: 'رول',
};

// Auto Seed if Empty
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const setDocRef = doc(db, 'settings', 'global');
    const setSnap = await getDoc(setDocRef);
    const settingsData = setSnap.data() || {};

    if (!setSnap.exists()) {
      await setDoc(setDocRef, { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() });
    }

    // Do not seed if user explicitly requested clean/empty database
    if (settingsData.disableAutoSeed) {
      return;
    }

    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      console.log('Seeding initial unique categories...');
      const seenNames = new Set<string>();
      for (const cat of DEFAULT_CATEGORIES) {
        const norm = cat.nameAr.trim().toLowerCase();
        if (!seenNames.has(norm)) {
          seenNames.add(norm);
          await addDoc(collection(db, 'categories'), { ...cat, nameAr: cat.nameAr.trim(), createdAt: new Date().toISOString() });
        }
      }
    } else {
      // Cleanup any duplicate categories in background
      cleanDuplicateCategories().catch(() => {});
    }

    const unitSnap = await getDocs(collection(db, 'units'));
    if (unitSnap.empty) {
      console.log('Seeding initial units...');
      const seenUnits = new Set<string>();
      for (const u of DEFAULT_UNITS) {
        const norm = u.nameAr.trim().toLowerCase();
        if (!seenUnits.has(norm)) {
          seenUnits.add(norm);
          await addDoc(collection(db, 'units'), u);
        }
      }
    }
  } catch (e) {
    console.warn('Auto-seed skipped or completed:', e);
  }
}

// Clean duplicate categories from Firestore database
export async function cleanDuplicateCategories(): Promise<number> {
  try {
    const snap = await getDocs(collection(db, 'categories'));
    const seen = new Map<string, string>(); // nameAr -> doc.id
    let deletedCount = 0;

    for (const d of snap.docs) {
      const data = d.data();
      const norm = (data.nameAr || '').trim().toLowerCase();
      if (!norm) continue;

      if (seen.has(norm)) {
        await deleteDoc(doc(db, 'categories', d.id)).catch(() => {});
        deletedCount++;
      } else {
        seen.set(norm, d.id);
      }
    }
    return deletedCount;
  } catch (err) {
    console.warn('Failed to clean duplicate categories:', err);
    return 0;
  }
}

// Clear all database entries (materials, movements, requisitions, projects, suppliers, customers, etc.)
export async function clearAllDatabaseEntries(includeCategoriesAndUnits: boolean = true): Promise<void> {
  const collectionsToWipe = [
    'materials',
    'movements',
    'requisitions',
    'projects',
    'suppliers',
    'customers',
    'notifications',
    'audit_logs'
  ];

  if (includeCategoriesAndUnits) {
    collectionsToWipe.push('categories', 'units');
  }

  for (const colName of collectionsToWipe) {
    try {
      const snap = await getDocs(collection(db, colName));
      const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)).catch(() => {}));
      await Promise.all(deletePromises);
    } catch (e) {
      console.warn(`Error clearing collection ${colName}:`, e);
    }
  }

  // Set disableAutoSeed flag in settings so auto-seed won't inject sample materials again
  const setDocRef = doc(db, 'settings', 'global');
  await setDoc(setDocRef, { disableAutoSeed: true, databaseClearedAt: new Date().toISOString() }, { merge: true });
}

// Subscribe to Materials
export function subscribeMaterials(callback: (materials: Material[]) => void): () => void {
  const q = query(collection(db, 'materials'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Material[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Material));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'materials'));
}

// Subscribe to Categories (with real-time deduplication)
export function subscribeCategories(callback: (categories: Category[]) => void): () => void {
  const q = query(collection(db, 'categories'), orderBy('nameAr', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list: Category[] = [];
    const seenNames = new Set<string>();
    const duplicateDocIds: string[] = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Category;
      const normalizedName = (data.nameAr || '').trim().toLowerCase();

      if (normalizedName) {
        if (seenNames.has(normalizedName)) {
          duplicateDocIds.push(docSnap.id);
        } else {
          seenNames.add(normalizedName);
          list.push({ id: docSnap.id, ...data });
        }
      }
    });

    // Asynchronously delete duplicate category documents in background
    if (duplicateDocIds.length > 0) {
      duplicateDocIds.forEach((dupId) => {
        deleteDoc(doc(db, 'categories', dupId)).catch(() => {});
      });
    }

    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'categories'));
}

// Subscribe to Units
export function subscribeUnits(callback: (units: Unit[]) => void): () => void {
  const q = query(collection(db, 'units'));
  return onSnapshot(q, (snapshot) => {
    const list: Unit[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Unit));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'units'));
}

// Subscribe to Suppliers
export function subscribeSuppliers(callback: (suppliers: Supplier[]) => void): () => void {
  const q = query(collection(db, 'suppliers'));
  return onSnapshot(q, (snapshot) => {
    const list: Supplier[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Supplier));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'suppliers'));
}

// Subscribe to Customers
export function subscribeCustomers(callback: (customers: Customer[]) => void): () => void {
  const q = query(collection(db, 'customers'));
  return onSnapshot(q, (snapshot) => {
    const list: Customer[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Customer));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));
}

// Subscribe to Projects
export function subscribeProjects(callback: (projects: Project[]) => void): () => void {
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Project[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Project));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));
}

// Subscribe to Movements
export function subscribeMovements(callback: (movements: Movement[]) => void): () => void {
  const q = query(collection(db, 'movements'), orderBy('timestamp', 'desc'), limit(500));
  return onSnapshot(q, (snapshot) => {
    const list: Movement[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Movement));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'movements'));
}

// Subscribe to Notifications
export function subscribeNotifications(callback: (notifs: NotificationItem[]) => void): () => void {
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const list: NotificationItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as NotificationItem));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));
}

// Subscribe to Settings
export function subscribeSettings(callback: (settings: SystemSettings) => void): () => void {
  return onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as SystemSettings);
    } else {
      callback(DEFAULT_SETTINGS);
    }
  }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/global'));
}

// Material Operations
export async function addMaterial(
  data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<string> {
  const path = 'materials';
  try {
    // Check duplicate code
    const qCode = query(collection(db, path), where('code', '==', data.code));
    const snapCode = await getDocs(qCode);
    if (!snapCode.empty) {
      throw new Error(`كود المادة (${data.code}) مستخدم بالفعل!`);
    }

    const now = new Date().toISOString();
    let status: Material['status'] = 'in_stock';
    if (data.currentQuantity <= 0) status = 'out_of_stock';
    else if (data.currentQuantity <= data.minQuantity) status = 'low_stock';

    const docRef = await addDoc(collection(db, path), cleanUndefinedData({
      ...data,
      status,
      createdAt: now,
      updatedAt: now,
    }));

    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'إضافة مادة',
      `تمت إضافة المادة: ${data.nameAr} (${data.code}) بكمية ${data.currentQuantity}`
    );

    return docRef.id;
  } catch (err) {
    if (err instanceof Error && err.message.includes('كود المادة')) throw err;
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateMaterial(
  id: string,
  data: Partial<Material>,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<void> {
  const path = `materials/${id}`;
  try {
    const matRef = doc(db, 'materials', id);
    const snap = await getDoc(matRef);
    if (!snap.exists()) throw new Error('المادة غير موجودة');

    const currentData = snap.data() as Material;
    const newQty = data.currentQuantity !== undefined ? data.currentQuantity : currentData.currentQuantity;
    const minQty = data.minQuantity !== undefined ? data.minQuantity : currentData.minQuantity;

    let status: Material['status'] = 'in_stock';
    if (newQty <= 0) status = 'out_of_stock';
    else if (newQty <= minQty) status = 'low_stock';

    const now = new Date().toISOString();
    await updateDoc(matRef, cleanUndefinedData({
      ...data,
      status,
      updatedAt: now,
    }));

    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'تحديث مادة',
      `تم تعديل المادة: ${currentData.nameAr} (${currentData.code})`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteMaterial(
  id: string,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<void> {
  const path = `materials/${id}`;
  try {
    // Check movement history
    const qMov = query(collection(db, 'movements'), where('materialId', '==', id), limit(1));
    const movSnap = await getDocs(qMov);
    if (!movSnap.empty) {
      throw new Error('لا يمكن حذف المادة لأن لديها سجل حركات مخزنية مرتبطة بها. يمكنك تحويل كميتها إلى صفر فقط.');
    }

    const matRef = doc(db, 'materials', id);
    const snap = await getDoc(matRef);
    const matName = snap.exists() ? snap.data().nameAr : id;

    await deleteDoc(matRef);

    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'حذف مادة',
      `تم حذف المادة: ${matName}`
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes('لا يمكن حذف المادة')) throw err;
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// STOCK IN (إدخال مخزني / توريد)
export async function addStockIn(
  materialId: string,
  quantity: number,
  purchasePrice: number,
  invoiceNumber: string,
  supplierName: string,
  notes: string,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<void> {
  try {
    const matRef = doc(db, 'materials', materialId);
    const snap = await getDoc(matRef);
    if (!snap.exists()) throw new Error('المادة غير موجودة');

    const mat = snap.data() as Material;
    const beforeQty = mat.currentQuantity;
    const afterQty = beforeQty + quantity;
    const totalCost = quantity * purchasePrice;

    let status: Material['status'] = 'in_stock';
    if (afterQty <= 0) status = 'out_of_stock';
    else if (afterQty <= mat.minQuantity) status = 'low_stock';

    const now = new Date();
    const timestampStr = now.toISOString();
    const dateStr = now.toLocaleDateString('ar-EG');

    // Update material stock & average cost
    const newAvgCost = mat.avgCost > 0
      ? Math.round(((mat.avgCost * beforeQty) + totalCost) / afterQty)
      : purchasePrice;

    await updateDoc(matRef, cleanUndefinedData({
      currentQuantity: afterQty,
      avgCost: newAvgCost,
      purchasePrice,
      status,
      updatedAt: timestampStr,
    }));

    // Record movement
    const movement: Omit<Movement, 'id'> = cleanUndefinedData({
      type: 'incoming',
      materialId,
      materialName: mat.nameAr || '',
      materialCode: mat.code || '',
      quantity,
      beforeQuantity: beforeQty,
      afterQuantity: afterQty,
      unitPrice: purchasePrice || 0,
      totalCost,
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      supplierName: supplierName || '',
      invoiceNumber: invoiceNumber || '',
      notes: notes || '',
      timestamp: timestampStr,
      dateStr,
    });

    await addDoc(collection(db, 'movements'), movement);

    // Audit log
    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'توريد مخزني',
      `تم توريد كمية ${quantity} ${mat.unit} للمادة ${mat.nameAr} بالفاتورة رقم (${invoiceNumber || 'بدون'})`
    );

    // Create Notification if purchase
    await addDoc(collection(db, 'notifications'), cleanUndefinedData({
      type: 'new_purchase',
      title: 'توريد مخزني جديد',
      message: `تم توريد ${quantity} ${mat.unit} من ${mat.nameAr} بواسطة ${user.name}`,
      materialId,
      isRead: false,
      createdAt: timestampStr,
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `materials/${materialId}`);
  }
}

// STOCK OUT (صرف مخزني)
export async function withdrawStock(
  materialId: string,
  quantity: number,
  department: string,
  projectId: string,
  projectName: string,
  reason: string,
  notes: string,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<void> {
  try {
    const matRef = doc(db, 'materials', materialId);
    const snap = await getDoc(matRef);
    if (!snap.exists()) throw new Error('المادة غير موجودة');

    const mat = snap.data() as Material;
    const beforeQty = mat.currentQuantity;

    if (quantity <= 0) {
      throw new Error('الكمية المصروفة يجب أن تكون أكبر من صفر');
    }

    if (beforeQty < quantity) {
      throw new Error(`عفواً! الكمية المتاحة في الرصيد الحالي (${beforeQty} ${mat.unit}) أقل من الكمية المطلوبة للصرف (${quantity} ${mat.unit})`);
    }

    const afterQty = beforeQty - quantity;
    const unitPrice = mat.avgCost || mat.purchasePrice || 0;
    const totalCost = quantity * unitPrice;

    let status: Material['status'] = 'in_stock';
    if (afterQty <= 0) status = 'out_of_stock';
    else if (afterQty <= mat.minQuantity) status = 'low_stock';

    const now = new Date();
    const timestampStr = now.toISOString();
    const dateStr = now.toLocaleDateString('ar-EG');

    // Update material
    await updateDoc(matRef, cleanUndefinedData({
      currentQuantity: afterQty,
      status,
      updatedAt: timestampStr,
    }));

    // Record movement
    const movement: Omit<Movement, 'id'> = cleanUndefinedData({
      type: 'withdrawal',
      materialId,
      materialName: mat.nameAr || '',
      materialCode: mat.code || '',
      quantity,
      beforeQuantity: beforeQty,
      afterQuantity: afterQty,
      unitPrice,
      totalCost,
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      projectId: projectId || '',
      projectName: projectName || '',
      department: department || '',
      reason: reason || '',
      notes: notes || '',
      timestamp: timestampStr,
      dateStr,
    });

    await addDoc(collection(db, 'movements'), movement);

    // Update project cost if attached to project
    if (projectId) {
      const projRef = doc(db, 'projects', projectId);
      const projSnap = await getDoc(projRef);
      if (projSnap.exists()) {
        const currentCost = projSnap.data().totalCost || 0;
        await updateDoc(projRef, cleanUndefinedData({
          totalCost: currentCost + totalCost,
        }));
      }
    }

    // Audit Log
    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'صرف مخزني',
      `تم صرف كمية ${quantity} ${mat.unit} من المادة ${mat.nameAr} لـ ${projectName || department || 'بدون مشروع'}`
    );

    // Trigger Notification for Low Stock or Out of Stock
    if (afterQty <= 0) {
      await addDoc(collection(db, 'notifications'), cleanUndefinedData({
        type: 'out_of_stock',
        title: 'نفاد مخزون مادة!',
        message: `لقد نفذت المادة (${mat.nameAr}) بالكامل من المستودع!`,
        materialId,
        isRead: false,
        createdAt: timestampStr,
      }));
    } else if (afterQty <= mat.minQuantity) {
      await addDoc(collection(db, 'notifications'), cleanUndefinedData({
        type: 'low_stock',
        title: 'تنبيه حد الأدنى للمخزون',
        message: `المادة (${mat.nameAr}) وصلت للحد الأدنى للمخزون (${afterQty} ${mat.unit})`,
        materialId,
        isRead: false,
        createdAt: timestampStr,
      }));
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('عفواً') || err.message.includes('الكمية المصروفة'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `materials/${materialId}`);
  }
}

// STOCK ADJUSTMENT (تسوية مخزنية)
export async function adjustStock(
  materialId: string,
  newQuantity: number,
  reason: string,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<void> {
  try {
    const matRef = doc(db, 'materials', materialId);
    const snap = await getDoc(matRef);
    if (!snap.exists()) throw new Error('المادة غير موجودة');

    const mat = snap.data() as Material;
    const beforeQty = mat.currentQuantity;
    const diff = newQuantity - beforeQty;

    let status: Material['status'] = 'in_stock';
    if (newQuantity <= 0) status = 'out_of_stock';
    else if (newQuantity <= mat.minQuantity) status = 'low_stock';

    const now = new Date();
    const timestampStr = now.toISOString();

    await updateDoc(matRef, cleanUndefinedData({
      currentQuantity: newQuantity,
      status,
      updatedAt: timestampStr,
    }));

    const movement: Omit<Movement, 'id'> = cleanUndefinedData({
      type: 'adjustment',
      materialId,
      materialName: mat.nameAr || '',
      materialCode: mat.code || '',
      quantity: Math.abs(diff),
      beforeQuantity: beforeQty,
      afterQuantity: newQuantity,
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      reason: reason || 'تسوية مخزنية يدوية',
      timestamp: timestampStr,
      dateStr: now.toLocaleDateString('ar-EG'),
    });

    await addDoc(collection(db, 'movements'), movement);

    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'تسوية مخزنية',
      `تم تغيير رصيد المادة ${mat.nameAr} من ${beforeQty} إلى ${newQuantity}. السبب: ${reason}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `materials/${materialId}`);
  }
}

export const createAdjustment = adjustStock;

// TRANSFER BETWEEN LOCATIONS
export async function transferLocation(
  materialId: string,
  fromLocation: string,
  toLocation: string,
  notes: string,
  user: { uid: string; name: string; email: string; role: UserRole }
): Promise<void> {
  try {
    const matRef = doc(db, 'materials', materialId);
    const snap = await getDoc(matRef);
    if (!snap.exists()) throw new Error('المادة غير موجودة');

    const mat = snap.data() as Material;
    const now = new Date();
    const timestampStr = now.toISOString();

    await updateDoc(matRef, cleanUndefinedData({
      location: toLocation,
      updatedAt: timestampStr,
    }));

    const movement: Omit<Movement, 'id'> = cleanUndefinedData({
      type: 'transfer',
      materialId,
      materialName: mat.nameAr || '',
      materialCode: mat.code || '',
      quantity: mat.currentQuantity,
      beforeQuantity: mat.currentQuantity,
      afterQuantity: mat.currentQuantity,
      userId: user.uid,
      userName: user.name,
      userRole: user.role,
      reason: `نقل من [${fromLocation}] إلى [${toLocation}]`,
      notes: notes || '',
      timestamp: timestampStr,
      dateStr: now.toLocaleDateString('ar-EG'),
    });

    await addDoc(collection(db, 'movements'), movement);

    await createAuditLog(
      user.uid,
      user.name,
      user.email,
      user.role,
      'نقل موقع',
      `تم نقل المادة ${mat.nameAr} من ${fromLocation} إلى ${toLocation}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `materials/${materialId}`);
  }
}

// Category CRUD
export async function addCategory(category: Omit<Category, 'id'>): Promise<void> {
  const norm = (category.nameAr || '').trim().toLowerCase();
  if (!norm) return;

  const catSnap = await getDocs(collection(db, 'categories'));
  const exists = catSnap.docs.some((d) => (d.data().nameAr || '').trim().toLowerCase() === norm);
  if (exists) {
    throw new Error('هذا القسم أو التصنيف موجود بالفعل');
  }

  await addDoc(
    collection(db, 'categories'),
    cleanUndefinedData({ ...category, nameAr: category.nameAr.trim(), createdAt: new Date().toISOString() })
  );
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id));
}

// Unit CRUD
export async function addUnit(unit: Omit<Unit, 'id'>): Promise<void> {
  await addDoc(collection(db, 'units'), cleanUndefinedData(unit));
}

export async function deleteUnit(id: string): Promise<void> {
  await deleteDoc(doc(db, 'units', id));
}

// Supplier CRUD
export async function addSupplier(supplier: Omit<Supplier, 'id'>): Promise<void> {
  await addDoc(collection(db, 'suppliers'), cleanUndefinedData({ ...supplier, createdAt: new Date().toISOString() }));
}

export async function updateSupplier(id: string, supplier: Partial<Supplier>): Promise<void> {
  await updateDoc(doc(db, 'suppliers', id), cleanUndefinedData(supplier));
}

export async function deleteSupplier(id: string): Promise<void> {
  await deleteDoc(doc(db, 'suppliers', id));
}

// Customer CRUD
export async function addCustomer(customer: Omit<Customer, 'id'>): Promise<void> {
  await addDoc(collection(db, 'customers'), cleanUndefinedData({ ...customer, createdAt: new Date().toISOString() }));
}

export async function updateCustomer(id: string, customer: Partial<Customer>): Promise<void> {
  await updateDoc(doc(db, 'customers', id), cleanUndefinedData(customer));
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'customers', id));
}

// Project CRUD
export async function addProject(project: Omit<Project, 'id'>): Promise<void> {
  await addDoc(collection(db, 'projects'), cleanUndefinedData({ ...project, totalCost: project.totalCost || 0, createdAt: new Date().toISOString() }));
}

export async function updateProject(id: string, project: Partial<Project>): Promise<void> {
  await updateDoc(doc(db, 'projects', id), cleanUndefinedData(project));
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', id));
}

// Notifications mark read & operations
export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { isRead: true });
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  const promises = ids.map((id) => updateDoc(doc(db, 'notifications', id), { isRead: true }).catch(() => {}));
  await Promise.all(promises);
}

export async function deleteNotification(id: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', id));
}

export async function deleteAllNotifications(ids: string[]): Promise<void> {
  const promises = ids.map((id) => deleteDoc(doc(db, 'notifications', id)).catch(() => {}));
  await Promise.all(promises);
}

// Settings update
export async function updateSettings(settings: Partial<SystemSettings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'global'), cleanUndefinedData({ ...settings, updatedAt: new Date().toISOString() }), { merge: true });
}

export const updateSystemSettings = updateSettings;

// Requisition CRUD & Subscriptions
export function subscribeRequisitions(callback: (reqs: PurchaseRequisition[]) => void) {
  const q = query(collection(db, 'requisitions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PurchaseRequisition[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PurchaseRequisition, 'id'>)
      }));
      callback(list);
    },
    (error) => {
      console.warn('Requisitions snapshot listener error, fallback to empty:', error);
      callback([]);
    }
  );
}

export async function addRequisition(reqData: Omit<PurchaseRequisition, 'id'>): Promise<string> {
  const docRef = await addDoc(
    collection(db, 'requisitions'),
    cleanUndefinedData({ ...reqData, createdAt: new Date().toISOString() })
  );
  return docRef.id;
}

export async function deleteRequisition(id: string): Promise<void> {
  await deleteDoc(doc(db, 'requisitions', id));
}
