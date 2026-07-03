"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Employee,
  LeaveRequest,
  getTeamColor,
  getTeamName,
  getStatusColor,
  getStatusName,
} from "./types";
import {
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "./actions";

interface DashboardProps {
  employees: Employee[];
  requests: LeaveRequest[];
}

export default function TeamLeaveDashboard({
  employees,
  requests,
}: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Approve/Reject states per request
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<number, boolean>>({});
  const [actionErrorMap, setActionErrorMap] = useState<Record<number, string>>({});

  // Generate the next 30 days starting from today (July 3, 2026, or current date)
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Helper to get YYYY-MM-DD string representation of a Date object (ignores local offset issues)
  const getYearMonthDayString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Helper to extract date part from API ISO string
  const getRequestDateString = (isoString: string) => {
    return isoString.substring(0, 10);
  };

  // Handle new leave submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) {
      setSubmitError("Please fill out all fields.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const response = await createLeaveRequest(employeeId, startDate, endDate);

    if (response.success) {
      setSubmitSuccess(true);
      setStartDate("");
      setEndDate("");
      setEmployeeId("");
      startTransition(() => {
        router.refresh();
      });
    } else {
      setSubmitError(response.error || "An unexpected error occurred.");
    }
    setSubmitLoading(false);
  };

  // Handle approving a request
  const handleApprove = async (id: number) => {
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }));
    setActionErrorMap((prev) => ({ ...prev, [id]: "" }));

    const response = await approveLeaveRequest(id);

    if (response.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      setActionErrorMap((prev) => ({
        ...prev,
        [id]: response.error || "Failed to approve leave request.",
      }));
    }
    setActionLoadingMap((prev) => ({ ...prev, [id]: false }));
  };

  // Handle rejecting a request
  const handleReject = async (id: number) => {
    setActionLoadingMap((prev) => ({ ...prev, [id]: true }));
    setActionErrorMap((prev) => ({ ...prev, [id]: "" }));

    const response = await rejectLeaveRequest(id);

    if (response.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      setActionErrorMap((prev) => ({
        ...prev,
        [id]: response.error || "Failed to reject leave request.",
      }));
    }
    setActionLoadingMap((prev) => ({ ...prev, [id]: false }));
  };

  // Filter requests
  const approvedRequests = requests.filter((r) => r.status === 1); // 1 = Approved
  const pendingRequests = requests.filter((r) => r.status === 0); // 0 = Pending
  const rejectedRequests = requests.filter((r) => r.status === 2); // 2 = Rejected

  // Formatting date for display
  const formatFriendlyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Banner Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Team Leave Scheduler
              </h1>
              <p className="text-xs text-slate-500 font-medium">Internal HR Scheduling Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Connected to API
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Left 2 Columns: Calendar Visualizer */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Approved Leave Calendar
                <span className="text-xs font-normal text-slate-400">Next 30 Days</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Visual timeline showing team members on approved leave.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-2xs px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400 font-medium">
                Engineering
              </span>
              <span className="text-2xs px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-medium">
                Operations
              </span>
              <span className="text-2xs px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/5 text-amber-400 font-medium">
                Finance
              </span>
            </div>
          </div>

          {/* 30-Day Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {calendarDays.map((day, idx) => {
              const dayStr = getYearMonthDayString(day);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              // Find leaves overlapping this day
              const activeLeaves = approvedRequests.filter((r) => {
                const start = getRequestDateString(r.startDate);
                const end = getRequestDateString(r.endDate);
                return start <= dayStr && end >= dayStr;
              });

              return (
                <div
                  key={idx}
                  className={`relative flex flex-col p-4 rounded-xl border transition-all duration-300 ${
                    isWeekend
                      ? "bg-slate-950 border-slate-900 text-slate-600"
                      : "bg-slate-900/40 border-slate-800/80 text-slate-100 hover:border-slate-700/80 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-300">
                      {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-2xs uppercase tracking-wider font-semibold opacity-60">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>

                  {isWeekend ? (
                    <div className="flex-1 flex items-center justify-center text-3xs font-medium text-slate-700 uppercase tracking-widest min-h-[48px]">
                      Weekend
                    </div>
                  ) : activeLeaves.length > 0 ? (
                    <div className="space-y-1.5 flex-1 min-h-[48px]">
                      {activeLeaves.map((req) => {
                        const emp = employees.find((e) => e.id === req.employeeId);
                        if (!emp) return null;
                        const colors = getTeamColor(emp.team);

                        return (
                          <div
                            key={req.id}
                            className={`flex flex-col px-2.5 py-1.5 rounded-lg border ${colors.bg} ${colors.border} text-3xs font-medium`}
                          >
                            <span className={`font-semibold ${colors.text}`}>{emp.name}</span>
                            <span className="text-4xs opacity-75 mt-0.5 text-slate-400">
                              {getTeamName(emp.team)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-4xs font-medium text-slate-600 uppercase tracking-wider min-h-[48px]">
                      No Leave
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Forms & Action Panels */}
        <section className="space-y-8">
          {/* Submit Leave Request Form */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-850 backdrop-blur-md space-y-5">
            <div>
              <h2 className="text-md font-bold text-white tracking-tight">Request Leave</h2>
              <p className="text-xs text-slate-400 mt-0.5">Submit a new request for verification.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Employee</label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                >
                  <option value="" disabled>
                    Select team member...
                  </option>
                  {employees
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id} className="bg-slate-950 text-slate-200">
                        {emp.name} ({getTeamName(emp.team)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 font-medium leading-relaxed">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-400 font-medium">
                  Leave request submitted successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </button>
            </form>
          </div>

          {/* Pending Leave Requests */}
          <div className="space-y-4">
            <div>
              <h2 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
                Pending Approval
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-3xs font-semibold">
                  {pendingRequests.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Needs HR authorization.</p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-900/60 bg-slate-950/20 flex flex-col items-center justify-center text-center">
                <span className="text-slate-700 text-2xl">✓</span>
                <p className="text-xs text-slate-500 mt-2 font-medium">All clear! No pending requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const emp = employees.find((e) => e.id === req.employeeId);
                  if (!emp) return null;
                  const isActionLoading = actionLoadingMap[req.id] || false;
                  const actionError = actionErrorMap[req.id];
                  const teamColors = getTeamColor(emp.team);

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 space-y-3.5 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">{emp.name}</h3>
                          <span
                            className={`inline-block text-4xs px-2 py-0.5 rounded border mt-1 font-semibold ${teamColors.bg} ${teamColors.border} ${teamColors.text}`}
                          >
                            {getTeamName(emp.team)}
                          </span>
                        </div>
                        <span className="text-3xs font-medium text-slate-400 uppercase bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                          {formatFriendlyDate(req.startDate)} - {formatFriendlyDate(req.endDate)}
                        </span>
                      </div>

                      {actionError && (
                        <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-3xs text-red-400 font-medium leading-relaxed">
                          {actionError}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleApprove(req.id)}
                          className="flex-1 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 font-semibold py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isActionLoading ? "..." : "Approve"}
                        </button>
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleReject(req.id)}
                          className="flex-1 bg-rose-600/10 hover:bg-rose-600 hover:text-white border border-rose-500/20 hover:border-rose-500 text-rose-400 font-semibold py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isActionLoading ? "..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rejected Leave Requests History */}
          {rejectedRequests.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase flex items-center gap-2">
                Rejected History
                <span className="text-3xs font-semibold opacity-60">({rejectedRequests.length})</span>
              </h3>
              <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity duration-350">
                {rejectedRequests.map((req) => {
                  const emp = employees.find((e) => e.id === req.employeeId);
                  if (!emp) return null;

                  return (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg border border-slate-950 bg-slate-900/10 flex items-center justify-between text-3xs"
                    >
                      <div>
                        <span className="font-bold text-slate-300">{emp.name}</span>
                        <span className="text-slate-500 ml-2">({getTeamName(emp.team)})</span>
                      </div>
                      <div className="text-slate-400">
                        {formatFriendlyDate(req.startDate)} - {formatFriendlyDate(req.endDate)}
                      </div>
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
