import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
import { auth, db, firebaseConfig, handleFirestoreError, OperationType, cleanUndefinedData } from '../firebase/config';
import { UserProfile, UserRole, UserStatus } from '../types';
import { createAuditLog } from './auditService';

function getSecondaryAuth() {
  const existingApps = getApps();
  const secondaryApp = existingApps.find(a => a.name === 'SecondaryAuthApp') || initializeApp(firebaseConfig, 'SecondaryAuthApp');
  return getAuth(secondaryApp);
}

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

// Log in user (supports both Firebase Auth and Firestore user records)
export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const normEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  // 1. Try Firebase Auth
  try {
    const cred = await signInWithEmailAndPassword(auth, normEmail, pass);
    const uid = cred.user.uid;
    let profile = await getUserProfile(uid);

    if (!profile) {
      const role: UserRole = normEmail.includes('admin') || normEmail === 'bo7amzayaya@gmail.com' ? 'super_admin' : 'employee';
      profile = {
        uid,
        fullName: cred.user.displayName || normEmail.split('@')[0] || 'مستخدم النظام',
        email: normEmail,
        password: pass,
        role,
        department: 'الإدارة العامة',
        status: 'active',
        isDisabled: false,
        createdAt: now,
        lastLogin: now,
      };
      await setDoc(doc(db, 'users', uid), cleanUndefinedData(profile));
    } else {
      if (profile.status === 'disabled' || profile.isDisabled) {
        await signOut(auth);
        throw new Error('حسابك معطل حالياً. يرجى التواصل مع مدير النظام.');
      }
      await updateDoc(doc(db, 'users', uid), cleanUndefinedData({ lastLogin: now, password: pass }));
    }

    localStorage.removeItem('khayal_custom_user');

    await createAuditLog(
      profile.uid,
      profile.fullName,
      profile.email,
      profile.role,
      'تسجيل الدخول',
      'قام المستخدم بتسجيل الدخول إلى نظام المستودع'
    );

    return profile;
  } catch (firebaseErr: any) {
    console.warn('Firebase Auth login fallback check:', firebaseErr?.code || firebaseErr?.message);

    if (firebaseErr?.message?.includes('حسابك معطل')) {
      throw firebaseErr;
    }

    // 2. Check Firestore users collection for admin-created users
    const q = query(collection(db, 'users'), where('email', '==', normEmail));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('فشل تسجيل الدخول. البريد الإلكتروني غير مسجل بالمنظومة.');
    }

    const userDoc = snap.docs[0].data() as UserProfile;
    const docId = snap.docs[0].id;

    if (userDoc.status === 'disabled' || userDoc.isDisabled) {
      throw new Error('حسابك معطل حالياً. يرجى التواصل مع مدير النظام.');
    }

    if (userDoc.password && userDoc.password !== pass) {
      throw new Error('كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.');
    }

    const fullProfile: UserProfile = {
      ...userDoc,
      uid: docId,
      lastLogin: now,
      isDisabled: false
    };

    await updateDoc(doc(db, 'users', docId), cleanUndefinedData({ lastLogin: now, password: pass })).catch(() => {});

    localStorage.setItem('khayal_custom_user', JSON.stringify(fullProfile));
    window.dispatchEvent(new Event('khayal_auth_change'));

    await createAuditLog(
      fullProfile.uid,
      fullProfile.fullName,
      fullProfile.email,
      fullProfile.role,
      'تسجيل الدخول',
      'قام المستخدم بتسجيل الدخول إلى نظام المستودع'
    ).catch(() => {});

    return fullProfile;
  }
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
    ).catch(() => {});
  }
  localStorage.removeItem('khayal_custom_user');
  window.dispatchEvent(new Event('khayal_auth_change'));
  try {
    await signOut(auth);
  } catch (e) {}
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
    const normEmail = data.email.trim().toLowerCase();

    // Check if email already registered in firestore
    const q = query(collection(db, 'users'), where('email', '==', normEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`البريد الإلكتروني (${data.email}) مسجل بالفعل بالمنظومة.`);
    }

    const now = new Date().toISOString();
    let tempUid = 'usr_' + Date.now();

    // Secondary Firebase Auth instance creation
    if (data.password && data.password.length >= 6) {
      try {
        const secAuth = getSecondaryAuth();
        const cred = await createUserWithEmailAndPassword(secAuth, normEmail, data.password);
        tempUid = cred.user.uid;
        await signOut(secAuth);
      } catch (authErr: any) {
        console.warn('Firebase Auth secondary creation note:', authErr?.message || authErr);
      }
    }

    const userDoc: UserProfile = {
      uid: tempUid,
      fullName: data.fullName.trim(),
      email: normEmail,
      password: data.password || '',
      role: data.role,
      department: data.department || 'المستودع',
      phone: data.phone || '',
      notes: data.notes || '',
      status: 'active',
      isDisabled: false,
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
        `تم إنشاء حساب للمستخدم: ${data.fullName} (${normEmail}) بصلاحية ${data.role}`
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
  phone?: string,
  password?: string
) {
  return createUserAccount({ fullName, email, role, phone, password });
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

