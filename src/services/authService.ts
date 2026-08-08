import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, cleanUndefinedData } from '../firebase/config';
import { UserProfile, UserRole, UserStatus } from '../types';
import { createAuditLog } from './auditService';

// Fetch current user document
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return { uid: snap.id, isDisabled: data.status === 'disabled', ...data } as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

// Get All Users
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(doc => ({
      uid: doc.id,
      isDisabled: doc.data().status === 'disabled',
      ...doc.data()
    } as UserProfile));
  } catch (e) {
    return [];
  }
}

// Subscribe to Users collection (Super Admin & Manager)
export function subscribeUsers(callback: (users: UserProfile[]) => void): () => void {
  const q = collection(db, 'users');
  return onSnapshot(q, (snapshot) => {
    const users: UserProfile[] = snapshot.docs.map(doc => ({
      uid: doc.id,
      isDisabled: doc.data().status === 'disabled',
      ...doc.data()
    } as UserProfile));
    callback(users);
  }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
}

// Log in user
export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const uid = cred.user.uid;
  let profile = await getUserProfile(uid);

  const now = new Date().toISOString();

  if (!profile) {
    // Check if this is the super admin email or bootstrapping initial user
    const role: UserRole = email.toLowerCase().includes('admin') || email.toLowerCase() === 'bo7amzayaya@gmail.com' ? 'super_admin' : 'employee';
    profile = {
      uid,
      fullName: cred.user.displayName || email.split('@')[0] || 'مستخدم النظام',
      email,
      role,
      department: 'الإدارة العامة',
      status: 'active',
      createdAt: now,
      lastLogin: now,
    };
    await setDoc(doc(db, 'users', uid), cleanUndefinedData(profile));
  } else {
    if (profile.status === 'disabled') {
      await signOut(auth);
      throw new Error('حسابك معطل حالياً. يرجى التواصل مع مدير النظام.');
    }
    await updateDoc(doc(db, 'users', uid), cleanUndefinedData({ lastLogin: now }));
  }

  await createAuditLog(
    profile.uid,
    profile.fullName,
    profile.email,
    profile.role,
    'تسجيل الدخول',
    'قام المستخدم بتسجيل الدخول إلى نظام المستودع'
  );

  return profile;
}

// Bootstrap Super Admin profile or Quick Admin Login Helper
export async function createInitialSuperAdminProfile(fbUser: FirebaseUser): Promise<UserProfile> {
  const uid = fbUser.uid;
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid,
    fullName: fbUser.displayName || 'مدير النظام (الخيال)',
    email: fbUser.email || 'admin@khayal.com',
    role: 'super_admin',
    department: 'إدارة المستودع',
    status: 'active',
    createdAt: now,
    lastLogin: now,
  };
  await setDoc(doc(db, 'users', uid), cleanUndefinedData(profile), { merge: true });
  return profile;
}

// Sign Out
export async function logoutUser(user?: UserProfile): Promise<void> {
  if (user) {
    await createAuditLog(
      user.uid,
      user.fullName,
      user.email,
      user.role,
      'تسجيل الخروج',
      'قام المستخدم بتسجيل الخروج'
    );
  }
  await signOut(auth);
}

// Reset Password
export async function resetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// User Management (Super Admin operations)
export async function createUserAccount(
  data: {
    fullName: string;
    email: string;
    password?: string;
    role: UserRole;
    department?: string;
    phone?: string;
    notes?: string;
  },
  adminUser?: UserProfile
): Promise<void> {
  try {
    // Check if email already registered in firestore
    const q = query(collection(db, 'users'), where('email', '==', data.email));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`البريد الإلكتروني (${data.email}) مسجل بالفعل بالمنظومة.`);
    }

    const now = new Date().toISOString();
    const tempUid = 'usr_' + Date.now();

    const userDoc: UserProfile = {
      uid: tempUid,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      department: data.department || 'المستودع',
      phone: data.phone || '',
      notes: data.notes || '',
      status: 'active',
      createdAt: now,
      createdBy: adminUser?.fullName || 'النظام',
    };

    await setDoc(doc(db, 'users', tempUid), cleanUndefinedData(userDoc));

    if (adminUser) {
      await createAuditLog(
        adminUser.uid,
        adminUser.fullName,
        adminUser.email,
        adminUser.role,
        'إنشاء مستخدم جديد',
        `تم إنشاء حساب للمستخدم: ${data.fullName} (${data.email}) بصلاحية ${data.role}`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('مسجل بالفعل')) throw err;
    handleFirestoreError(err, OperationType.CREATE, 'users');
  }
}

export async function createUserProfile(
  id: string,
  email: string,
  fullName: string,
  role: UserRole,
  phone?: string
) {
  return createUserAccount({ fullName, email, role, phone });
}

export async function updateUserAccount(
  uid: string,
  data: Partial<UserProfile>,
  adminUser?: UserProfile
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const payload: any = { ...data };
    if (data.isDisabled !== undefined) {
      payload.status = data.isDisabled ? 'disabled' : 'active';
    }
    await updateDoc(userRef, cleanUndefinedData(payload));

    if (adminUser) {
      await createAuditLog(
        adminUser.uid,
        adminUser.fullName,
        adminUser.email,
        adminUser.role,
        'تحديث بيانات مستخدم',
        `تم تحديث بيانات المستخدم ID: ${uid}`
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  return updateUserAccount(uid, data);
}

export async function toggleUserStatus(
  uid: string,
  currentStatus: UserStatus,
  adminUser: UserProfile
): Promise<void> {
  const newStatus: UserStatus = currentStatus === 'active' ? 'disabled' : 'active';
  await updateUserAccount(uid, { status: newStatus }, adminUser);
}

export async function deleteUserAccount(
  uid: string,
  adminUser?: UserProfile
): Promise<void> {
  try {
    // Check if user has movements
    const q = query(collection(db, 'movements'), where('userId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('لا يمكن حذف هذا المستخدم نظراً لوجود حركات مخزنية مسجلة باسمه في السجل. يمكنك تعطيل الحساب بدلاً من ذلك.');
    }

    await deleteDoc(doc(db, 'users', uid));

    if (adminUser) {
      await createAuditLog(
        adminUser.uid,
        adminUser.fullName,
        adminUser.email,
        adminUser.role,
        'حذف مستخدم',
        `تم حذف الحساب ID: ${uid}`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('لا يمكن حذف')) throw err;
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}

export async function deleteUserProfile(uid: string) {
  return deleteUserAccount(uid);
}
