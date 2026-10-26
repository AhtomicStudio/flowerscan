# 0001. Ship as a PWA, not a native app

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
Users scan in the moment (at a dispensary counter, at a friend's), so friction to first use matters more
than anything. App stores add review risk for cannabis content and slow down iteration. Camera, barcode
decoding (native or WASM), OCR (WASM), offline storage, and install-to-home-screen all work in modern
mobile browsers over HTTPS.

## Decision
Build a mobile-first Progressive Web App (React + Vite). No native app in the MVP.

## Consequences
- ✅ Open a link and you're scanning. One codebase. Instant deploys.
- ✅ Shareable deep links (`/s/<strain-id>`) work everywhere.
- ⚠️ iOS Safari gaps: no native `BarcodeDetector` (we polyfill with WASM), no Vibration API, and limited
  torch control. Test on real iPhones every release.
- ⚠️ Background or long-running work is limited. That's fine for our use case.
- Revisit if the camera experience on iOS turns out to be clearly worse than native, or for distribution
  reasons. A Capacitor wrapper can reuse almost all the code.

## Alternatives considered
- **React Native / Expo:** better camera APIs, but app-store friction and a slower first-use path.
- **Native Swift/Kotlin:** best performance, two codebases. Not justified yet.
