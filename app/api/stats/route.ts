import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();

    const total = db.prepare("SELECT COUNT(*) as count FROM jobs").get() as any;
    const newCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'new'").get() as any;
    const applied = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'applied'").get() as any;
    const interviewed = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'interviewed'").get() as any;
    const rejected = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'rejected'").get() as any;
    const companies = db.prepare("SELECT COUNT(DISTINCT companyName) as count FROM jobs").get() as any;

    return NextResponse.json({
      total: total.count,
      new: newCount.count,
      applied: applied.count,
      interviewed: interviewed.count,
      rejected: rejected.count,
      companies: companies.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
