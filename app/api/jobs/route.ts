import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const company = searchParams.get("company");
    const search = searchParams.get("search");

    let query = "SELECT * FROM jobs WHERE 1=1";
    const params: any[] = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (company) {
      query += " AND companyName LIKE ?";
      params.push(`%${company}%`);
    }

    if (search) {
      query += " AND (title LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY createdAt DESC";

    const jobs = db.prepare(query).all(...params) as any[];

    const getLinks = db.prepare("SELECT * FROM apply_links WHERE jobId = ?");
    jobs.forEach((job) => {
      job.applyLink = getLinks.all(job.id);
    });

    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: error.message ?? "Internal server error" }, { status: 500 });
  }
}
