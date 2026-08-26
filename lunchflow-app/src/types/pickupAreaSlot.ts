export type PickupAreaSlot = {
  id: string;
  areaName: string;
  /** 24-hour HH:mm */
  bookingStartTime: string;
  /** 24-hour HH:mm */
  bookingEndTime: string;
  /** Lowercase keywords matched inside pickup address text. Area name is always included. */
  matchKeywords: string[];
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
