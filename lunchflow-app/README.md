# LunchFlow

Daily lunchbox delivery mobile app — Home to School & Office.

Built with **Expo** + **React Native** + **React Navigation**.

## Three portals (role-based auth)

| Role | Login | Demo credentials |
|------|-------|------------------|
| **Customer** | Mobile + OTP | Phone: `9876543210` · OTP: `4729` |
| **Driver** | Mobile + Password | Phone: `9123456789` · Password: `driver123` |
| **Admin** | Email + Password | Email: `admin@lunchflow.com` · Password: `admin123` |

### App flow

1. **Splash** → Get Started  
2. **Choose role** → Customer / Driver / Admin  
3. **Login** with demo credentials above  
4. Each role opens its own dashboard with bottom tabs  

### Customer screens
Splash, Login, Register, Home, Food Ready, Live Tracking, Delivery Status, QR, Plans, Notifications, History, Wallet, Profile, Referral, Support

### Driver screens
- **Home** — pickup requests, accept/decline, mark picked up  
- **Deliveries** — active route timeline, mark delivered  
- **Profile** — vehicle, earnings, logout  

### Admin screens
- **Dashboard** — stats, live orders  
- **Orders** — assign drivers, manage requests  
- **Drivers** — online/offline status  
- **Profile** — settings, logout  

## Run the app

```bash
cd lunchflow-app
npm start
```

Then press **w** for web, scan QR with **Expo Go**, or press **a** for Android.

## Notes

UI prototype with **mock authentication** — no real backend yet. Credentials are in `src/constants/auth.ts`.
