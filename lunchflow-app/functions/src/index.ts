import { initializeApp } from 'firebase-admin/app';
import { createPaymentOrder, verifyPaymentOrder } from './callables/payments';
import { requestLoginOtp, verifyLoginOtp } from './callables/otp';
import {
  listPendingDriversFn,
  registerPendingDriver,
  setDriverApprovalStatus,
} from './callables/drivers';
import { onOrderStatusChange } from './triggers/onOrderStatusChange';

initializeApp();

export {
  onOrderStatusChange,
  requestLoginOtp,
  verifyLoginOtp,
  createPaymentOrder,
  verifyPaymentOrder,
  registerPendingDriver,
  setDriverApprovalStatus,
  listPendingDriversFn,
};
