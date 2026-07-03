"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Employee,
  LeaveRequest,
  PublicHoliday,
  getTeamColor,
  getTeamName,
} from "./types";
import {
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "./actions";

interface DashboardProps {
  employees: Employee[];
  requests: LeaveRequest[];
  holidays: PublicHoliday[];
}

function useTheme() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefersDark);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark, mounted]);

  return { dark, toggle: () => setDark((d) => !d), mounted };
}

export default function TeamLeaveDashboard({
  employees,
  requests,
  holidays,
}: DashboardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { dark, toggle, mounted } = useTheme();

  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Approve/Reject per-request state
  const [actionLoadingMap, setActionLoadingMap] = useState<
    Record<number, boolean>
  >({});
  const [actionErrorMap, setActionErrorMap] = useState<
    Record<number, string>
  >({});

  // Next 30 days
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const toDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isoToDate = (iso: string) => iso.substring(0, 10);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) {
      setSubmitError("Please fill out all fields.");
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const res = await createLeaveRequest(employeeId, startDate, endDate);
    if (res.success) {
      setSubmitSuccess(true);
      setStartDate("");
      setEndDate("");
      setEmployeeId("");
      startTransition(() => router.refresh());
    } else {
      setSubmitError(res.error || "An unexpected error occurred.");
    }
    setSubmitLoading(false);
  };

  const handleApprove = async (id: number) => {
    setActionLoadingMap((p) => ({ ...p, [id]: true }));
    setActionErrorMap((p) => ({ ...p, [id]: "" }));
    const res = await approveLeaveRequest(id);
    if (res.success) {
      startTransition(() => router.refresh());
    } else {
      setActionErrorMap((p) => ({
        ...p,
        [id]: res.error || "Failed to approve.",
      }));
    }
    setActionLoadingMap((p) => ({ ...p, [id]: false }));
  };

  const handleReject = async (id: number) => {
    setActionLoadingMap((p) => ({ ...p, [id]: true }));
    setActionErrorMap((p) => ({ ...p, [id]: "" }));
    const res = await rejectLeaveRequest(id);
    if (res.success) {
      startTransition(() => router.refresh());
    } else {
      setActionErrorMap((p) => ({
        ...p,
        [id]: res.error || "Failed to reject.",
      }));
    }
    setActionLoadingMap((p) => ({ ...p, [id]: false }));
  };

  // Filter
  const approvedRequests = requests.filter((r) => r.status === 1);
  const pendingRequests = requests.filter((r) => r.status === 0);
  const rejectedRequests = requests.filter((r) => r.status === 2);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-gray-500 dark:text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h1 className="text-base font-semibold">Team Leave Scheduler</h1>
          </div>
          <button
            onClick={toggle}
            className="p-2 rounded-md border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-pointer"
            aria-label="Toggle theme"
          >
            {mounted && dark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Left: Calendar */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              Approved Leave &mdash; Next 30 Days
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Engineering
              </span>
              <span className="px-2 py-0.5 rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                Operations
              </span>
              <span className="px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                Finance
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {calendarDays.map((day, idx) => {
              const dayStr = toDateStr(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const holiday = holidays.find(
                (h) => isoToDate(h.date) === dayStr
              );
              const activeLeaves = approvedRequests.filter((r) => {
                const s = isoToDate(r.startDate);
                const e = isoToDate(r.endDate);
                return s <= dayStr && e >= dayStr;
              });
              const isNonWorking = isWeekend || !!holiday;

              return (
                <div
                  key={idx}
                  className={`rounded-md border p-2.5 min-h-[80px] flex flex-col ${
                    isNonWorking
                      ? "bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-600"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      {day.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>

                  {holiday && (
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-medium border bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 mb-1">
                      {holiday.name}
                    </div>
                  )}

                  {isWeekend && !holiday ? (
                    <div className="flex-1 flex items-center justify-center text-[10px] text-gray-300 dark:text-slate-700">
                      Weekend
                    </div>
                  ) : activeLeaves.length > 0 ? (
                    <div className="space-y-1 flex-1">
                      {activeLeaves.map((req) => {
                        const emp = employees.find(
                          (e) => e.id === req.employeeId
                        );
                        if (!emp) return null;
                        const c = getTeamColor(emp.team);
                        return (
                          <div
                            key={req.id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${c.bg} ${c.border} ${c.text}`}
                          >
                            {emp.name}
                          </div>
                        );
                      })}
                    </div>
                  ) : !holiday ? (
                    <div className="flex-1 flex items-center justify-center text-[10px] text-gray-300 dark:text-slate-700">
                      &mdash;
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Form + Pending */}
        <section className="space-y-6">
          {/* Submit Form */}
          <div className="rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <h2 className="text-sm font-semibold mb-1">Request Leave</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              Submit a new leave request for review.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Employee
                </label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="" disabled>
                    Select team member…
                  </option>
                  {employees
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({getTeamName(emp.team)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-2.5 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-xs text-red-700 dark:text-red-300">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="p-2.5 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 text-xs text-green-700 dark:text-green-300">
                  Leave request submitted successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium py-2 rounded-md text-sm hover:bg-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitLoading ? "Submitting…" : "Submit Request"}
              </button>
            </form>
          </div>

          {/* Pending Requests */}
          <div>
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
              Pending Approval
              {pendingRequests.length > 0 && (
                <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                  ({pendingRequests.length})
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
              Requests awaiting a decision.
            </p>

            {pendingRequests.length === 0 ? (
              <div className="rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-xs text-gray-400 dark:text-slate-500">
                No pending requests.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => {
                  const emp = employees.find(
                    (e) => e.id === req.employeeId
                  );
                  if (!emp) return null;
                  const loading = actionLoadingMap[req.id] || false;
                  const error = actionErrorMap[req.id];
                  const tc = getTeamColor(emp.team);

                  return (
                    <div
                      key={req.id}
                      className="rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.5 rounded border mt-0.5 font-medium ${tc.bg} ${tc.border} ${tc.text}`}
                          >
                            {getTeamName(emp.team)}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(req.startDate)} –{" "}
                          {formatDate(req.endDate)}
                        </span>
                      </div>

                      {error && (
                        <div className="p-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-[11px] text-red-700 dark:text-red-300">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          disabled={loading}
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 py-1.5 rounded-md text-xs font-medium border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {loading ? "…" : "Approve"}
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleReject(req.id)}
                          className="flex-1 py-1.5 rounded-md text-xs font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {loading ? "…" : "Reject"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rejected History */}
          {rejectedRequests.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                Rejected ({rejectedRequests.length})
              </h2>
              <div className="space-y-1">
                {rejectedRequests.map((req) => {
                  const emp = employees.find(
                    (e) => e.id === req.employeeId
                  );
                  if (!emp) return null;
                  return (
                    <div
                      key={req.id}
                      className="rounded-md border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-slate-500"
                    >
                      <span>
                        {emp.name}{" "}
                        <span className="text-gray-400 dark:text-slate-600">
                          · {getTeamName(emp.team)}
                        </span>
                      </span>
                      <span>
                        {formatDate(req.startDate)} –{" "}
                        {formatDate(req.endDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
