export type OrderRating = {
  id: string;
  orderId: string;
  customerPhone: string;
  driverId?: string;
  stars: number;
  review: string;
  createdAt: string;
};
