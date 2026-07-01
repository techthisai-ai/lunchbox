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

export const UNASSIGNED_TELECALLER_ID = 'unassigned';

export function isLeadAssignedToTelecaller(telecallerId: string): boolean {
  return Boolean(telecallerId) && telecallerId !== UNASSIGNED_TELECALLER_ID;
}

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
  const all = await listTelecallerLeads();
  const existing = all.find((item) => item.id === id);
  const record: TelecallerLead = {
    id,
    customerPhone: normalizePhone(lead.customerPhone),
    customerName: lead.customerName.trim(),
    telecallerId: lead.telecallerId,
    status: lead.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const notes = lead.notes?.trim();
  if (notes) record.notes = notes;

  await setDoc(doc(db, 'telecallerLeads', id), record, { merge: true });
  const next = all.some((l) => l.id === id) ? all.map((l) => (l.id === id ? record : l)) : [record, ...all];
  await AsyncStorage.setItem(LEADS_KEY, JSON.stringify(next));
  return record;
}

function countAssignedLeads(leads: TelecallerLead[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    if (!isLeadAssignedToTelecaller(lead.telecallerId)) continue;
    counts.set(lead.telecallerId, (counts.get(lead.telecallerId) ?? 0) + 1);
  }
  return counts;
}

export async function syncTelecallerAssignedCounts(): Promise<Telecaller[]> {
  const [telecallers, leads] = await Promise.all([listTelecallers(), listTelecallerLeads()]);
  const counts = countAssignedLeads(leads);
  const next = await Promise.all(
    telecallers.map(async (telecaller) => {
      const assignedLeads = counts.get(telecaller.id) ?? 0;
      if (telecaller.assignedLeads === assignedLeads) return telecaller;
      return saveTelecaller({ ...telecaller, assignedLeads });
    }),
  );
  return next;
}

export async function assignLeadToTelecaller(leadId: string, telecallerId: string): Promise<void> {
  const leads = await listTelecallerLeads();
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) throw new Error('Lead not found');

  if (telecallerId !== UNASSIGNED_TELECALLER_ID) {
    const telecallers = await listTelecallers();
    const telecaller = telecallers.find((item) => item.id === telecallerId);
    if (!telecaller) throw new Error('Telecaller not found');
    if (telecaller.status !== 'Active') throw new Error('Only active telecallers can be assigned');
  }

  await saveTelecallerLead({ ...lead, telecallerId });
  await syncTelecallerAssignedCounts();
}

export async function updateTelecallerLeadStatus(
  leadId: string,
  status: TelecallerLead['status'],
): Promise<void> {
  const leads = await listTelecallerLeads();
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) throw new Error('Lead not found');
  await saveTelecallerLead({ ...lead, status });
}
