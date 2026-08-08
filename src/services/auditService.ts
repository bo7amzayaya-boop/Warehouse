import { addDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, cleanUndefinedData } from '../firebase/config';
import { AuditLog, UserRole } from '../types';

export async function createAuditLog(
  userId: string,
  userName: string,
  userEmail: string,
  userRole: UserRole,
  action: string,
  details: string
): Promise<void> {
  const path = 'audit_logs';
  try {
    const now = new Date();
    const logData: Omit<AuditLog, 'id'> = {
      userId: userId || 'system',
      userName: userName || 'النظام',
      userEmail: userEmail || 'system@khayal.com',
      userRole: userRole || 'viewer',
      action,
      details,
      timestamp: now.toISOString(),
      dateStr: now.toLocaleDateString('ar-EG'),
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    };
    await addDoc(collection(db, path), cleanUndefinedData(logData));
  } catch (err) {
    console.warn('Failed to record audit log:', err);
  }
}

export async function getAuditLogs(maxCount = 100): Promise<AuditLog[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
  } catch (e) {
    console.error('Failed to get audit logs:', e);
    return [];
  }
}
