export type AvailableDriver = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'Available' | 'On Route' | 'Offline';
};
