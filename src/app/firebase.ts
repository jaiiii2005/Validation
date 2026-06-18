import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { firebaseConfig } from './firebase-config';

let app: FirebaseApp | undefined;
let db: Database | undefined;

/** Lazily initialise Firebase and return the Realtime Database handle. */
export function getDb(): Database {
  if (!db) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
}
