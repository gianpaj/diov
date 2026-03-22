/**
 * backend/src/persistence/db.ts
 *
 * Database connection is now handled by @libsql/client in src/db.ts.
 * Better Auth manages its own tables via the libSQL/Turso connection.
 *
 * This file is kept as a stub for any future app-specific persistence
 * (e.g. payment records, user preferences) that lives alongside the
 * auth tables in the same Turso database.
 */

export { db } from '../db'
