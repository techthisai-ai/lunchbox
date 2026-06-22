import { initializeApp } from 'firebase-admin/app';
import { createPaymentOrder, verifyPaymentOrder } from './callables/payments';
import { requestLoginOtp, verifyLoginOtp } from './callables/otp';
import { onOrderStatusChange } from './triggers/onOrderStatusChange';

initializeApp();

export { onOrderStatusChange, requestLoginOtp, verifyLoginOtp, createPaymentOrder, verifyPaymentOrder };
