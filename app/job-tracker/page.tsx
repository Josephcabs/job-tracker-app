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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showImport, setShowImport] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>("");
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);

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
      setSelectedIds((prev) => prev.filter((id) => data.some((job) => job.id === id)));

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
      setSelectedIds((prev) => prev.filter((jobId) => jobId !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function handleSelectJob(job: Job) {
    setSelectedJob(job);
    setNotesDraft(job.notes ?? "");
    setIsDescriptionExpanded(false);
  }

  function toggleSelectedJob(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((jobId) => jobId !== id) : [...prev, id]));
  }

  function clearSelectedJobs() {
    setSelectedIds([]);
  }

  function selectAllJobs() {
    if (jobs.length === 0) return;
    setSelectedIds(jobs.map((job) => job.id));
  }

  async function deleteSelectedJobs() {
    if (selectedIds.length === 0) return;
    const confirmed = globalThis.confirm?.(`Delete ${selectedIds.length} selected job${selectedIds.length > 1 ? "s" : ""}?`);
    if (!confirmed) return;
    try {
      setBulkDeleting(true);
      const res = await fetch(`${API_BASE}/jobs/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete jobs");
      }
      setSelectedIds([]);
      if (selectedJob && selectedIds.includes(selectedJob.id)) {
        setSelectedJob(null);
      }
      await loadJobs();
      await loadStats();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete selected jobs");
    } finally {
      setBulkDeleting(false);
    }
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
  const selectedCount = selectedIds.length;
  const hasBulkSelection = selectedCount > 0;
  const allVisibleSelected = jobs.length > 0 && selectedCount === jobs.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#080512] via-[#0b071a] to-[#05030b] text-slate-100">
      <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#150a33] via-[#0d071f] to-[#05030b] text-white shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-1/2 bg-gradient-to-t from-cyan-500/10 to-transparent blur-3xl lg:block" />
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Job Tracker
              </div>
              <div>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Modern pipeline for chaotic job hunts</h1>
                <p className="mt-3 text-base text-white/70 sm:text-lg">
                  {stats
                    ? `You're watching ${stats.total} openings across ${stats.companies} companies. Keep the pipeline honest with filters, notes, and live stats.`
                    : "Bring in leads, tag statuses, jot notes, and keep momentum without spreadsheets slowing you down."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    void loadJobs();
                    void loadStats();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  type="button"
                >
                  ↻ Refresh data
                </button>
                <button
                  onClick={() => setShowImport((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
                  type="button"
                >
                  {showImport ? "✕ Close Import" : "📥 Import Jobs"}
                </button>
              </div>
            </div>
            {stats && (
              <div className="grid w-full max-w-lg grid-cols-2 gap-3 text-left sm:grid-cols-4 lg:max-w-none">
                <StatCard label="Tracked" value={stats.total} accent="text-white" />
                <StatCard label="New" value={stats.new} accent="text-cyan-200" />
                <StatCard label="Applied" value={stats.applied} accent="text-emerald-200" />
                <StatCard label="Companies" value={stats.companies} accent="text-white" />
              </div>
            )}
          </div>
        </div>
      </header>

      {showImport && (
        <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#130b26]/90 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-t from-[#ff7a18]/20 via-transparent to-transparent blur-3xl md:block" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Import</p>
                <h2 className="text-2xl font-semibold text-white">Drop JSON, get leads instantly</h2>
                <p className="text-sm text-white/70">
                  Works with single Apify payloads or full arrays. We validate everything before inserting.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText("");
                }}
                className="text-sm font-semibold text-white/60 underline-offset-4 transition hover:text-white hover:underline"
              >
                Cancel
              </button>
            </div>
            <textarea
              className="mt-5 h-44 w-full rounded-2xl border border-white/10 bg-[#1b1433] px-4 py-3 text-sm font-mono text-white shadow-inner focus:border-[#c084fc] focus:bg-[#1f173c] focus:outline-none focus:ring-4 focus:ring-[#c084fc]/20"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[ { "title": "...", "companyName": "...", ... } ]'
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={importJobs}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a18] to-[#a855f7] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#a855f7]/30 transition hover:opacity-95"
              >
                Import jobs
              </button>
              <p className="text-xs text-white/60">Pro tip: Cmd/Ctrl + Enter formats JSON in most editors before paste.</p>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-[#120c24]/80 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-2.5 text-lg text-white/30">⌕</span>
              <input
                type="text"
                placeholder="Search job title, company, tech stack, or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#1c1534] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:border-[#a855f7]/60 focus:bg-[#20183d] focus:outline-none focus:ring-4 focus:ring-[#a855f7]/20"
              />
              <div className="pointer-events-none absolute right-4 top-2.5 text-xs uppercase tracking-[0.4em] text-white/30">
                {loading ? "SYNCING" : "READY"}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-white/50">
              {filtersActive && (
                <button
                  className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-wide text-white transition hover:border-white/40"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  type="button"
                >
                  Reset Filters
                </button>
              )}
              <span className="text-white/30">{loading ? "Updating results…" : `${jobs.length} visible`}</span>
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
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-gradient-to-r from-[#ff7a18] to-[#a855f7] text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)]"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isActive ? "bg-white/30 text-white" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {tab.value === "all" ? jobs.length : count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.8fr,2.2fr]">
          <section className="rounded-[28px] border border-white/10 bg-[#120c24]/90 shadow-[0_25px_60px_rgba(0,0,0,0.55)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/40">Pipeline</p>
                <h2 className="text-lg font-semibold text-white">Saved opportunities</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-white/50">
                <span>{loading ? "Syncing…" : `${jobs.length} total`}</span>
                {hasBulkSelection && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em]">{selectedCount} selected</span>
                )}
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={allVisibleSelected ? clearSelectedJobs : selectAllJobs}
                    disabled={jobs.length === 0}
                    className={`rounded-full border px-3 py-1 transition ${
                      jobs.length === 0
                        ? "cursor-not-allowed border-white/10 text-white/30"
                        : "border-white/15 text-white/70 hover:border-white/30"
                    }`}
                  >
                    {allVisibleSelected ? "Deselect all" : "Select all"}
                  </button>
                  {hasBulkSelection && (
                    <button
                      type="button"
                      onClick={clearSelectedJobs}
                      className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:border-white/30"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={deleteSelectedJobs}
                    disabled={!hasBulkSelection || bulkDeleting}
                    className={`rounded-full px-4 py-1.5 text-white transition ${
                      !hasBulkSelection || bulkDeleting
                        ? "cursor-not-allowed bg-white/10 text-white/40"
                        : "bg-gradient-to-r from-[#ff7a18] to-[#a855f7] shadow-[0_10px_30px_rgba(168,85,247,0.35)] hover:opacity-90"
                    }`}
                  >
                    {bulkDeleting ? "Deleting…" : "Bulk delete"}
                  </button>
                </div>
              </div>
            </div>
            {jobListLoading ? (
              <JobListSkeleton />
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/70">No roles yet</span>
                <p className="text-sm text-white/50">Import from Apify or adjust filters to get started.</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto px-4 py-4">
                <div className="flex flex-col gap-3">
                  {jobs.map((job) => {
                    const statusStyles = STATUS_COLORS[job.status] ?? {
                      badge: "bg-slate-100 text-slate-700 border-slate-200",
                      dot: "bg-slate-400",
                    };
                    const isActive = selectedJob?.id === job.id;
                    const isSelectedCard = selectedIds.includes(job.id);
                    const highlightCard = isActive || isSelectedCard;
                    return (
                      <button
                        key={job.id}
                        onClick={() => handleSelectJob(job)}
                        className={`group relative w-full rounded-2xl border px-5 py-4 pl-7 pt-6 text-left transition-all ${
                          highlightCard
                            ? "border-white/40 bg-white/10 shadow-lg shadow-black/40 ring-2 ring-[#a855f7]/30"
                            : "border-white/5 bg-white/5 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSelectedJob(job.id);
                          }}
                          className={`absolute left-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition ${
                            isSelectedCard
                              ? "border-transparent bg-gradient-to-r from-[#ff7a18] to-[#a855f7] text-white"
                              : "border-white/30 bg-white/5 text-white/40 hover:border-white/60"
                          }`}
                          aria-pressed={isSelectedCard}
                        >
                          {isSelectedCard ? "✓" : "+"}
                        </button>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-white">{job.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
                              {job.companyName ?? "Unknown"}
                              {job.location ? ` · ${job.location}` : ""}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusStyles.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
                            {STATUS_LABELS[job.status] ?? job.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
                          {job.via && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                              🔗 via {job.via}
                            </span>
                          )}
                          {job.applyLink?.length ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                              {job.applyLink.length} link{job.applyLink.length > 1 ? "s" : ""}
                            </span>
                          ) : null}
                          {job.description && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                              {Math.min(job.description.length, 999)} chars
                            </span>
                          )}
                        </div>
                        <span className="pointer-events-none absolute inset-y-0 right-3 hidden items-center text-white/20 transition group-hover:text-white/50 sm:flex">
                          ↗
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#120c24]/90 p-5 shadow-[0_25px_60px_rgba(0,0,0,0.55)] lg:p-7">
            {selectedJob ? (
              <div className="flex h-full flex-col gap-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">Active role</p>
                      <h2 className="mt-1 text-2xl font-semibold text-white">{selectedJob.title}</h2>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                      #{selectedJob.id}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-white/70">
                    {selectedJob.companyName && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                        🏢 {selectedJob.companyName}
                      </span>
                    )}
                    {selectedJob.location && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                        📍 {selectedJob.location}
                      </span>
                    )}
                    {selectedJob.via && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                        🔗 via {selectedJob.via}
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
                        className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition ${
                          isActive
                            ? "border-transparent bg-gradient-to-r from-[#ff7a18] to-[#a855f7] text-white"
                            : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {selectedJob.applyLink && selectedJob.applyLink.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">Apply links</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedJob.applyLink.map((link) => (
                        <a
                          key={`${link.title}-${link.link}`}
                          href={link.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a18] to-[#a855f7] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          ↗ {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Job description</p>
                    {descriptionText && (
                      <button
                        type="button"
                        className="text-xs font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
                        onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                      >
                        {isDescriptionExpanded ? "Show less" : "Expand"}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-white/80">
                    {descriptionText ? (
                      <p className="whitespace-pre-line">{visibleDescription}</p>
                    ) : (
                      <span className="text-white/40">No description available.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#150c2d] p-4">
                  <label className="text-sm font-semibold text-white">Notes</label>
                  <textarea
                    className="mt-2 h-28 w-full rounded-xl border border-white/10 bg-[#1d1336] px-3 py-2 text-sm text-white focus:border-[#a855f7] focus:bg-[#221642] focus:outline-none focus:ring-2 focus:ring-[#a855f7]/30"
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
                          ? "cursor-not-allowed border border-white/10 bg-white/5 text-white/40"
                          : "border-transparent bg-gradient-to-r from-[#ff7a18] to-[#a855f7] text-white hover:opacity-90"
                      }`}
                    >
                      {notesSaving ? "Saving…" : "Save notes"}
                    </button>
                    {notesChanged && (
                      <button
                        type="button"
                        onClick={() => setNotesDraft(selectedJob.notes ?? "")}
                        className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-white/60 hover:text-white"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2">
                  <button
                    onClick={() => deleteJob(selectedJob.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/50 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                  >
                    🗑️ Delete role
                  </button>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
                  >
                    Close panel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-white/60">
                <span className="text-4xl">🗂️</span>
                <p className="text-base font-semibold text-white">Select a job to view the playbook</p>
                <p className="text-xs text-white/60">Choose a role from the pipeline to update notes, status, and links.</p>
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
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function JobListSkeleton() {
  return (
    <div className="space-y-3 px-5 py-5">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="h-4 w-2/3 rounded bg-white/20" />
          <div className="mt-2 h-3 w-1/3 rounded bg-white/15" />
          <div className="mt-4 flex gap-2">
            <div className="h-3 w-12 rounded-full bg-white/10" />
            <div className="h-3 w-16 rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
