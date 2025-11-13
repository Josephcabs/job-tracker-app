"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  interested: "Interested",
  applied: "Applied",
  interviewed: "Interviewed",
  rejected: "Rejected",
  "not-interested": "Not Interested",
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "new", label: STATUS_LABELS.new },
  { value: "interested", label: STATUS_LABELS.interested },
  { value: "applied", label: STATUS_LABELS.applied },
  { value: "interviewed", label: STATUS_LABELS.interviewed },
  { value: "rejected", label: STATUS_LABELS.rejected },
  { value: "not-interested", label: STATUS_LABELS["not-interested"] },
];

const STATUS_COLORS: Record<
  string,
  {
    badge: string;
    dot: string;
  }
> = {
  new: { badge: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  interested: { badge: "bg-purple-50 text-purple-700 border-purple-100", dot: "bg-purple-500" },
  applied: { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
  interviewed: { badge: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
  rejected: { badge: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500" },
  "not-interested": { badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

interface ApplyLink {
  id?: number;
  title: string;
  link: string;
}

interface Job {
  id: number;
  title: string;
  companyName?: string;
  location?: string;
  via?: string;
  description?: string;
  status: string;
  notes?: string;
  applyLink?: ApplyLink[];
}

interface Stats {
  total: number;
  new: number;
  applied: number;
  interviewed: number;
  rejected: number;
  companies: number;
}

function JobTrackerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length };
    Object.keys(STATUS_LABELS).forEach((key) => {
      counts[key] = 0;
    });
    jobs.forEach((job) => {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    });
    return counts;
  }, [jobs]);

  const filtersActive = filter !== "all" || Boolean(search);

  async function loadJobs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);

      const res = await fetch(`${API_BASE}/jobs?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = (await res.json()) as Job[];
      setJobs(data);

      if (selectedJob) {
        const updated = data.find((j) => j.id === selectedJob.id) ?? null;
        setSelectedJob(updated);
        setNotesDraft(updated?.notes ?? "");
        setIsDescriptionExpanded(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = (await res.json()) as Stats;
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    void loadJobs();
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  async function updateJobStatus(id: number, status: string) {
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update job");
      await loadJobs();
      await loadStats();
    } catch (err) {
      console.error(err);
    }
  }

  async function updateJobNotes(id: number, notes: string) {
    try {
      setNotesSaving(true);
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      await loadJobs();
    } catch (err) {
      console.error(err);
    } finally {
      setNotesSaving(false);
    }
  }

  async function deleteJob(id: number) {
    const confirmed = globalThis.confirm?.("Delete this job?");
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete job");
      await loadJobs();
      await loadStats();
      if (selectedJob?.id === id) setSelectedJob(null);
    } catch (err) {
      console.error(err);
    }
  }

  function handleSelectJob(job: Job) {
    setSelectedJob(job);
    setNotesDraft(job.notes ?? "");
    setIsDescriptionExpanded(false);
  }

  async function importJobs() {
    try {
      const jsonData = JSON.parse(importText);
      const jobsArray = Array.isArray(jsonData) ? jsonData : [jsonData];

      const res = await fetch(`${API_BASE}/jobs/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobsArray),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import jobs");
      }

      alert("Imported jobs successfully");
      setImportText("");
      setShowImport(false);
      await loadJobs();
      await loadStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert("Invalid JSON or import failed: " + message);
    }
  }

  const notesChanged = selectedJob ? (notesDraft ?? "") !== (selectedJob.notes ?? "") : false;
  const descriptionText = selectedJob?.description?.trim() ?? "";
  const shouldTruncateDescription = descriptionText.length > 700 && !isDescriptionExpanded;
  const visibleDescription = shouldTruncateDescription
    ? `${descriptionText.slice(0, 700).trimEnd()}…`
    : descriptionText;
  const jobListLoading = loading && jobs.length === 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Job Tracker</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Stay on top of every lead</h1>
              <p className="mt-1 text-sm text-slate-500">
                {stats
                  ? `Tracking ${stats.total} roles across ${stats.companies} companies.`
                  : "Use filters and notes to keep your job search organized."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  void loadJobs();
                  void loadStats();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                type="button"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => setShowImport((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                type="button"
              >
                {showImport ? "✕ Close Import" : "📥 Import Jobs"}
              </button>
            </div>
          </div>

          {stats && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Tracked Roles" value={stats.total} accent="text-slate-900" />
              <StatCard label="New Leads" value={stats.new} accent="text-blue-700" />
              <StatCard label="Applied" value={stats.applied} accent="text-emerald-700" />
              <StatCard label="Companies" value={stats.companies} accent="text-slate-900" />
            </div>
          )}
        </div>
      </header>

      {showImport && (
        <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/90 p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Quick import</h2>
                <p className="text-xs text-slate-500">Paste raw JSON from Apify (single job or array) and we handle the rest.</p>
              </div>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText("");
                }}
                className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            </div>
            <textarea
              className="mt-4 h-40 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[ { "title": "...", "companyName": "...", ... } ]'
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={importJobs}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Import jobs
              </button>
              <p className="text-xs text-slate-500">Tip: validate JSON with Cmd + Enter in your editor before pasting.</p>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by title, company, tech stack, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              {filtersActive && (
                <button
                  className="text-xs font-semibold text-slate-500 underline-offset-4 hover:underline"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Reset filters
                </button>
              )}
              <div className="text-xs text-slate-500">
                {loading ? "Updating results..." : `${jobs.length} job${jobs.length === 1 ? "" : "s"} visible`}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => {
              const isActive = filter === tab.value;
              const count = statusCounts[tab.value] ?? 0;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setFilter(tab.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.value === "all" ? (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{jobs.length}</span>
                  ) : (
                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] text-slate-500">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">Saved roles</h2>
              <span className="text-xs text-slate-500">
                {loading ? "Fetching…" : `${jobs.length} item${jobs.length === 1 ? "" : "s"}`}
              </span>
            </div>
            {jobListLoading ? (
              <JobListSkeleton />
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No roles yet</p>
                <p className="text-xs text-slate-500">
                  Import from Apify or adjust your filters to see results.
                </p>
              </div>
            ) : (
              <div className="max-h-[560px] overflow-auto px-3 py-4">
                <div className="flex flex-col gap-3">
                  {jobs.map((job) => {
                    const statusStyles = STATUS_COLORS[job.status] ?? {
                      badge: "bg-slate-100 text-slate-700 border-slate-200",
                      dot: "bg-slate-400",
                    };
                    return (
                      <button
                        key={job.id}
                        onClick={() => handleSelectJob(job)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                          selectedJob?.id === job.id
                            ? "border-slate-900 bg-slate-900/5 shadow-sm ring-2 ring-slate-900/20"
                            : "border-transparent bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {job.companyName ?? "Unknown company"}
                              {job.location ? ` • ${job.location}` : ""}
                            </p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusStyles.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
                            {STATUS_LABELS[job.status] ?? job.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          {job.via && <span className="rounded-full bg-white/70 px-2 py-0.5">🔗 via {job.via}</span>}
                          {job.applyLink?.length ? (
                            <span className="rounded-full bg-white/70 px-2 py-0.5">{job.applyLink.length} link{job.applyLink.length > 1 ? "s" : ""}</span>
                          ) : null}
                          {job.description && (
                            <span className="rounded-full bg-white/70 px-2 py-0.5">
                              {Math.min(job.description.length, 999)} chars
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
            {selectedJob ? (
              <div className="flex h-full flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Currently viewing</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedJob.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
                    {selectedJob.companyName && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        🏢 {selectedJob.companyName}
                      </span>
                    )}
                    {selectedJob.location && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        📍 {selectedJob.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => {
                    const isActive = selectedJob.status === value;
                    return (
                      <button
                        key={value}
                        onClick={() => updateJobStatus(selectedJob.id, value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {selectedJob.applyLink && selectedJob.applyLink.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Apply links</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedJob.applyLink.map((link) => (
                        <a
                          key={`${link.title}-${link.link}`}
                          href={link.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-500"
                        >
                          ↗ {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Job description</p>
                    {descriptionText && (
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline"
                        onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                      >
                        {isDescriptionExpanded ? "Show less" : "Expand"}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-slate-700">
                    {descriptionText ? (
                      <p className="whitespace-pre-line">{visibleDescription}</p>
                    ) : (
                      <span className="text-slate-400">No description available.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <label className="text-sm font-semibold text-slate-700">Notes</label>
                  <textarea
                    className="mt-2 h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Capture interview prep, recruiter feedback, follow-ups…"
                  />
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => updateJobNotes(selectedJob.id, notesDraft)}
                      disabled={!notesChanged || notesSaving}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold transition ${
                        !notesChanged || notesSaving
                          ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                          : "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {notesSaving ? "Saving…" : "Save notes"}
                    </button>
                    {notesChanged && (
                      <button
                        type="button"
                        onClick={() => setNotesDraft(selectedJob.notes ?? "")}
                        className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-slate-500 hover:text-slate-700"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2">
                  <button
                    onClick={() => deleteJob(selectedJob.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    🗑️ Delete role
                  </button>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Close panel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                <span className="text-3xl">🗂️</span>
                <p className="font-medium text-slate-700">Select a job to see full details</p>
                <p className="text-xs text-slate-500">
                  Choose a role from the left panel to update notes, status, and application links.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default JobTrackerPage;

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function JobListSkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
          <div className="mt-4 flex gap-2">
            <div className="h-3 w-12 rounded-full bg-slate-200" />
            <div className="h-3 w-16 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
