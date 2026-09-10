# HiveNotes iPad shell

Capacitor WebView that loads the **hosted** HiveNotes app (Render), so the Shipaton demo can be filmed on iPad with Apple Pencil. This is not an App Store build.

Windows cannot produce a signed iOS app. Do this on a Mac with Xcode.

## 1. Point at the hosted notebook

```bash
cd mobile
npm install
# After Render is live, set the web service URL:
#   CAP_SERVER_URL=https://hivenotes-web.onrender.com
# Edit capacitor.config.ts if the hostname differs.
npx cap add ios
npx cap sync
npx cap open ios
```

## 2. Xcode

- Signing: your personal team (free Apple ID is enough to run on your iPad).
- Target: iPad.
- Run on the device. Stylus / Apple Pencil hits the real ruled page inside the WebView.

## 3. Film

Follow the shot list in [`docs/shipaton/SHIPATON.md`](../docs/shipaton/SHIPATON.md). Pen convert must be in the first 45 seconds.
