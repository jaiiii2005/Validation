// ─────────────────────────────────────────────────────────────────────────
// FIREBASE SETUP — do this once, then paste your values below.
//
// 1. Go to https://console.firebase.google.com and click "Add project"
//    (any name, e.g. "football-auction"). You can disable Google Analytics.
// 2. In the project, left sidebar → "Build" → "Realtime Database" → "Create
//    Database". Pick a location, then start in **Test mode** (fine for a
//    private game with friends; locks down after 30 days — see note below).
// 3. Left sidebar → Project Overview (gear icon) → "Project settings" →
//    scroll to "Your apps" → click the Web icon (</>). Register an app
//    (any nickname). Firebase shows you a `firebaseConfig` object.
// 4. Copy these fields from it into the object below. `databaseURL` is the
//    one that ends in `.firebasedatabase.app` (or `.firebaseio.com`). If it
//    isn't shown, it's https://<projectId>-default-rtdb.firebaseio.com
//
// SECURITY NOTE: Test mode lets anyone with the URL read/write. That's fine
// for a quick private game. When test mode expires (or to lock it down), set
// these Realtime Database rules so only existing auction rooms are touchable:
//   { "rules": { "rooms": { "$room": { ".read": true, ".write": true } } } }
// (Still open, but scoped. For a portfolio piece you can tighten later.)
// ─────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: 'AIzaSyBRZiOWOAhj_pBB045eYZ2S6plxZfP8Lfc',
  authDomain: 'auction-house-330b0.firebaseapp.com',
  databaseURL: 'https://auction-house-330b0-default-rtdb.firebaseio.com',
  projectId: 'auction-house-330b0',
  storageBucket: 'auction-house-330b0.firebasestorage.app',
  messagingSenderId: '619241185137',
  appId: '1:619241185137:web:4e57062547ee6eb054e0d0',
  measurementId: 'G-KT6ZLKYXYE',
};

export const isFirebaseConfigured = () =>
  !Object.values(firebaseConfig).some((v) => typeof v === 'string' && v.startsWith('PASTE_'));
