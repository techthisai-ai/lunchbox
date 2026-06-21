export type DeliveryBatchStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered';

export type DeliveryBatch = {
  id: string;
  school: string;
  dropAddress: string;
  deliveryType: string;
  orderIds: string[];
  driverId?: string;
  driverName?: string;
  status: DeliveryBatchStatus;
  createdAt: string;
  deliveredAt?: string;
  date: string;
};
