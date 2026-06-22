# LunchFlow Notifications Setup

Order status updates are delivered by **Firebase Cloud Functions** when an order document's `status` field changes in Firestore (`orders/{orderId}`). Channels:

- **SMS** — login OTP and order updates
- **WhatsApp** — Meta WhatsApp Business API templates
- **Push** — Expo Push Notifications (device tokens stored on `users/{phone}`)

## Architecture

```
Client updates order.status in Firestore
        ↓
onOrderStatusChange (asia-south1)
        ↓
notifyOrderStatusChange → SMS / WhatsApp / Expo push
        ↓
users/{phone}/notifications + message_logs (inbox + audit)
```

Login OTP uses callable functions:

- `requestLoginOtp` — stores OTP in `otpSessions/{phone}`, sends SMS
- `verifyLoginOtp` — validates OTP, returns Firebase custom token

## Deploy functions

```bash
cd lunchflow-app
npm install
cd functions && npm install && npm run build && cd ..
firebase deploy --only functions
```

Or: `npm run deploy:functions`

## Environment / secrets

Set these on Firebase (Functions secrets or `.env` for emulators):

| Variable | Purpose |
|----------|---------|
| `SMS_PROVIDER` | `msg91`, `twilio`, or `console` (dev logs OTP to function logs) |
| `MSG91_AUTH_KEY` | MSG91 API key |
| `MSG91_SENDER_ID` | MSG91 sender ID |
| `MSG91_OTP_TEMPLATE_ID` | Optional OTP template |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |
| `WHATSAPP_TOKEN` | Meta Graph API permanent token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `WHATSAPP_ORDER_TEMPLATE` | Optional approved template name for order updates |
| `WHATSAPP_TEMPLATE_LANG` | Template language code (default `en`) |

Example (Firebase CLI):

```bash
firebase functions:secrets:set WHATSAPP_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
firebase functions:secrets:set MSG91_AUTH_KEY
```

Wire secrets in function definitions if you move from `process.env` to `defineSecret`.

## WhatsApp Business API

1. Create a Meta Business app with WhatsApp product.
2. Add a phone number and note the **Phone Number ID**.
3. Create an approved **utility** template for order updates (or rely on session text fallback when within 24h window).
4. Set `WHATSAPP_ORDER_TEMPLATE` to the template name if using template messages.

## Client requirements

- Customers/drivers register Expo push tokens on login (`registerForPushNotifications`).
- Notification preferences sync to `users/{phone}.notificationPrefs` (`push`, `sms`, `whatsapp`).
- Order updates must persist to Firestore; the Cloud Function trigger handles outbound delivery.

## Idempotency

Duplicate sends are prevented via `notificationDeliveries/{orderId}_{status}_{channel:phone}`.

## Local development

With `SMS_PROVIDER=console`, OTP is returned as `devOtp` in callable responses when running in dev, and logged in function output.

Use the Firebase emulator:

```bash
cd functions && npm run serve
```
