import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { normalizePhone } from '../constants/auth';

export type Telecaller = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'Active' | 'Inactive';
  assignedLeads: number;
};

export type TelecallerLead = {
  id: string;
  customerPhone: string;
  customerName: string;
  telecallerId: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const TELECALLERS_KEY = '@lunchflow_telecallers';
const LEADS_KEY = '@lunchflow_telecaller_leads';

export async function listTelecallers(): Promise<Telecaller[]> {
  try {
    const snap = await getDocs(collection(db, 'telecallers'));
    if (!snap.empty) {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Telecaller, 'id'>) }));
      await AsyncStorage.setItem(TELECALLERS_KEY, JSON.stringify(rows));
      return rows;
    }
  } catch {
    // Ignore.
  }

  try {
    const raw = await AsyncStorage.getItem(TELECALLERS_KEY);
    if (raw) return JSON.parse(raw) as Telecaller[];
  } catch {
    // Ignore.
  }

  return [];
}

export async function saveTelecaller(record: Omit<Telecaller, 'id'> & { id?: string }): Promise<Telecaller> {
  const id = record.id ?? `TC-${Date.now()}`;
  const telecaller: Telecaller = {
    id,
    name: record.name.trim(),
    phone: normalizePhone(record.phone),
    status: record.status,
    assignedLeads: record.assignedLeads ?? 0,
  };
  const email = record.email?.trim();
  if (email) telecaller.email = email;

  await setDoc(doc(db, 'telecallers', id), telecaller, { merge: true });
  const all = await listTelecallers();
  const next = all.some((t) => t.id === id) ? all.map((t) => (t.id === id ? telecaller : t)) : [telecaller, ...all];
  await AsyncStorage.setItem(TELECALLERS_KEY, JSON.stringify(next));
  return telecaller;
}

export async function deleteTelecaller(id: string): Promise<void> {
  await deleteDoc(doc(db, 'telecallers', id));
  const all = await listTelecallers();
  await AsyncStorage.setItem(TELECALLERS_KEY, JSON.stringify(all.filter((t) => t.id !== id)));
}

export async function listTelecallerLeads(): Promise<TelecallerLead[]> {
  try {
    const snap = await getDocs(collection(db, 'telecallerLeads'));
    if (!snap.empty) {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TelecallerLead, 'id'>) }));
      await AsyncStorage.setItem(LEADS_KEY, JSON.stringify(rows));
      return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  } catch {
    // Ignore.
  }

  try {
    const raw = await AsyncStorage.getItem(LEADS_KEY);
    if (raw) return JSON.parse(raw) as TelecallerLead[];
  } catch {
    // Ignore.
  }

  return [];
}

export async function saveTelecallerLead(lead: Omit<TelecallerLead, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<TelecallerLead> {
  const id = lead.id ?? `LEAD-${Date.now()}`;
  const now = new Date().toISOString();
  const record: TelecallerLead = {
    id,
    customerPhone: normalizePhone(lead.customerPhone),
    customerName: lead.customerName.trim(),
    telecallerId: lead.telecallerId,
    status: lead.status,
    createdAt: now,
    updatedAt: now,
  };
  const notes = lead.notes?.trim();
  if (notes) record.notes = notes;

  await setDoc(doc(db, 'telecallerLeads', id), record, { merge: true });
  const all = await listTelecallerLeads();
  const next = all.some((l) => l.id === id) ? all.map((l) => (l.id === id ? { ...record, createdAt: l.createdAt } : l)) : [record, ...all];
  await AsyncStorage.setItem(LEADS_KEY, JSON.stringify(next));
  return record;
}
