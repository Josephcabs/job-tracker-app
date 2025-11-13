import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of jobs" }, { status: 400 });
    }

    const db = getDb();

    const insertJob = db.prepare(`
      INSERT INTO jobs (title, companyName, location, via, description, postedAt, scheduleType, salary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `);

    const insertLink = db.prepare(`
      INSERT INTO apply_links (jobId, title, link)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((jobsData: JobPayload[]) => {
      const results: { id: number | bigint; title: string }[] = [];
      for (const job of jobsData) {
        const postedAt = job.postedAt || null;
        const scheduleType = job.scheduleType || null;
        const salary = job.salary || null;

        const result = insertJob.run(
          job.title,
          job.companyName,
          job.location,
          job.via,
          job.description,
          postedAt,
          scheduleType,
          salary,
        );

        const jobId = result.lastInsertRowid as number | bigint;

        if (job.applyLink && Array.isArray(job.applyLink)) {
          for (const link of job.applyLink) {
            insertLink.run(jobId, link.title, link.link);
          }
        }

        results.push({ id: jobId, title: job.title });
      }
      return results;
    });

    const inserted = insertMany(body as JobPayload[]);

    return NextResponse.json({
      success: true,
      message: `Added ${inserted.length} jobs`,
      jobs: inserted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error adding jobs:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const rawIds = Array.isArray(body) ? body : body?.ids;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: "Expected a non-empty array of ids" }, { status: 400 });
    }

    const ids = rawIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid ids provided" }, { status: 400 });
    }

    const uniqueIds = Array.from(new Set(ids));
    const placeholders = uniqueIds.map(() => "?").join(", ");

    const db = getDb();
    const result = db.prepare(`DELETE FROM jobs WHERE id IN (${placeholders})`).run(...uniqueIds);

    return NextResponse.json({
      success: true,
      requested: uniqueIds.length,
      deleted: result.changes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error deleting jobs:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface JobPayload {
  title: string;
  companyName?: string;
  location?: string;
  via?: string;
  description?: string;
  postedAt?: string;
  scheduleType?: string;
  salary?: string;
  applyLink?: { title: string; link: string }[];
}
