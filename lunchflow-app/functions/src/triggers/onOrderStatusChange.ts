import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { notifyOrderStatusChange } from '../services/notify';
import { OrderDoc } from '../config';

export const onOrderStatusChange = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    region: 'asia-south1',
  },
  async (event) => {
    const before = event.data?.before.data() as OrderDoc | undefined;
    const after = event.data?.after.data() as OrderDoc | undefined;
    if (!after) return;

    const orderId = event.params.orderId;
    const payload: OrderDoc = { ...after, id: after.id ?? orderId };

    try {
      await notifyOrderStatusChange(before, payload);
    } catch (error) {
      console.error('[onOrderStatusChange]', orderId, error);
    }
  },
);
