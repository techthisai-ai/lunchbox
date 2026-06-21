import { syncDocument } from './firestoreSync';

export type DeliveryConfirmationLog = {
  id: string;
  batchId?: string;
  orderIds: string[];
  driverId?: string;
  driverName?: string;
  school?: string;
  confirmedAt: string;
  method: 'single' | 'batch';
};

export async function logDeliveryConfirmation(log: Omit<DeliveryConfirmationLog, 'id' | 'confirmedAt'>): Promise<void> {
  const entry: DeliveryConfirmationLog = {
    ...log,
    id: `DLOG-${Date.now()}`,
    confirmedAt: new Date().toISOString(),
  };
  await syncDocument('delivery_logs', entry.id, entry);
}
