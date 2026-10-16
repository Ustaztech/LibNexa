# LIBNEXA Mobile Application Guide

**Application**: `apps/mobile`  
**Technology**: React Native, Expo SDK (SDK 52+), TypeScript, React Native Safe Area Context

---

## 1. Overview & Purpose

The LIBNEXA Mobile application is optimized for smartphone screens, delivering a portable student library experience:
- **Fast Catalogue Search**: Instant keyword search by title, author, or subject area.
- **My Active Loans**: Countdown timer to due dates, overdue alert badges, and one-tap loan extension requests.
- **My Waitlist Reservations**: Live queue position tracking (e.g. "Position #1 in Queue").
- **Digital Library Pass**: A high-contrast QR code encoding the student's verified membership number and identity, allowing circulation librarians to scan and verify identity in seconds without requiring plastic ID cards.
- **Offline / Local Network Configuration**: In-app setting to toggle API endpoint between local IP (`http://10.174.41.208:5000/api/v1`) and production server.

---

## 2. Directory Structure (`apps/mobile`)

```
apps/mobile/
├── App.tsx                     # Top-level navigation and tab controller
├── app.json                    # Expo project configuration and permissions
├── metro.config.js             # Metro bundler resolver configuration
├── src/
│   ├── context/
│   │   └── AuthContext.tsx     # AsyncStorage persistence for JWT and user session
│   ├── screens/
│   │   ├── AuthScreen.tsx      # Sign In & Student Registration with Department picker
│   │   ├── CatalogueScreen.tsx # Book search, category filter, and copy availability
│   │   ├── MyLoansScreen.tsx   # Active loans list and renewal submission modal
│   │   ├── MyRequestsScreen.tsx# Pending borrowing requests & librarian approvals
│   │   ├── MyReservationsScreen.tsx # Waitlist reservations and queue position
│   │   ├── DigitalIDScreen.tsx # QR-code student library membership card
│   │   └── NotificationsScreen.tsx # In-app notification center
│   ├── services/
│   │   └── api.ts              # HTTP client with dynamic base URL support
│   └── types/
│       └── index.ts            # Mobile-specific client types
└── scripts/
    └── generate-qr.js          # QR code generation utility for testing on physical devices
```

---

## 3. Running the Mobile App

### Run with Expo Go (Physical Device)
1. Ensure your smartphone is connected to the same Wi-Fi network as your computer.
2. Launch the Expo bundler:
   ```bash
   npm run dev:mobile
   ```
3. Open the Expo Go app on iOS or Android and scan the generated terminal QR code.

### Run on Android Emulator / iOS Simulator
```bash
# Android Emulator
npm --prefix apps/mobile run android

# iOS Simulator (macOS only)
npm --prefix apps/mobile run ios
```
