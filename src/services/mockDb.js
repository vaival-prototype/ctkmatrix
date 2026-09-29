import {
  users,
  companies,
  sharedClaimMatrixs,
  autoAppClaims,
  invitations,
  accessRequests,
  upgradeRequests,
  documents,
  unclassifiedUploads,
  auditEvents,
  emails,
  notifications,
  passwordTokens,
  claimManagementCases,
  notificationPreferences,
} from "@/data/mock";

/**
 * The demo's "database": a copy of the seed data in src/data/mock.js, saved
 * to localStorage so the demo survives page reloads and stays in sync across
 * tabs (two browser windows signed in as different people see each other's
 * changes). Bump the version whenever the seed shape changes.
 */
const STORAGE_KEY = "cm_mock_db_v2";

function seed() {
  return structuredClone({
    users,
    companies,
    claims: sharedClaimMatrixs,
    autoAppClaims,
    invitations,
    accessRequests,
    upgradeRequests,
    documents,
    unclassifiedUploads,
    auditEvents,
    emails,
    notifications,
    passwordTokens,
    claimManagementCases,
    notificationPreferences,
  });
}

// Last-written copy, used when localStorage is blocked (private window, quota).
let memoryDb = null;

/** Read the current database. Seeds it on first use. */
export function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    if (memoryDb) return memoryDb;
  }
  const db = memoryDb ?? seed();
  saveDb(db);
  return db;
}

export function saveDb(db) {
  memoryDb = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable (private window, quota) — changes last for this page only.
  }
}

/** Throw away every change made during the demo and start again from the seed. */
export function resetDb() {
  const db = seed();
  saveDb(db);
  return db;
}
