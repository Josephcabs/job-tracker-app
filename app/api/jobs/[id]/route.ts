import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = getDb();
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as any | undefined;

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    job.applyLink = db.prepare("SELECT * FROM apply_links WHERE jobId = ?").all(job.id);
    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json();
    const { status, notes } = body as { status?: string; notes?: string };

    const updates: string[] = [];
    const sqlParams: any[] = [];

    if (status) {
      updates.push("status = ?");
      sqlParams.push(status);
    }

    if (notes !== undefined) {
      updates.push("notes = ?");
      sqlParams.push(notes);
    }

    updates.push("updatedAt = CURRENT_TIMESTAMP");
    sqlParams.push(id);

    const query = `UPDATE jobs SET ${updates.join(", ")} WHERE id = ?`;
    const result = db.prepare(query).run(...sqlParams);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
