import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

function initDb(instance: Database.Database) {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      companyName TEXT,
      location TEXT,
      via TEXT,
      description TEXT,
      logo TEXT,
      postedAt TEXT,
      scheduleType TEXT,
      salary TEXT,
      status TEXT DEFAULT 'new',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS apply_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jobId INTEGER,
      title TEXT,
      link TEXT,
      FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(companyName);
  `);
}

export function getDb() {
  if (!db) {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, "jobs.db");
    db = new Database(dbPath);
    initDb(db);
  }
  return db;
}
