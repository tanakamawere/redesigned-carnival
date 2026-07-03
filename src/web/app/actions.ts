"use server";

import { revalidatePath } from "next/cache";
import { Employee, LeaveRequest, PublicHoliday } from "./types";

const API_BASE_URL = process.env.API_URL || "http://localhost:5245";

export interface ServerActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Fetch all employees from the API
 */
export async function getEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/employees`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch employees: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}

/**
 * Fetch all upcoming leave requests (next 30 days, overlapping today..+30)
 */
export async function getUpcomingRequests(): Promise<LeaveRequest[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaverequests/upcoming`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch upcoming leave requests: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching upcoming leave requests:", error);
    return [];
  }
}

/**
 * Fetch all public holidays
 */
export async function getPublicHolidays(): Promise<PublicHoliday[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/publicholidays`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch public holidays: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching public holidays:", error);
    return [];
  }
}

/**
 * Submit a new leave request.
 * Returns { success: true, data: LeaveRequest } or { success: false, error: string }
 */
export async function createLeaveRequest(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<ServerActionResponse<LeaveRequest>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaverequests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeId,
        startDate,
        endDate,
      }),
      cache: "no-store",
    });

    if (res.status === 201) {
      const data = await res.json();
      revalidatePath("/");
      return { success: true, data };
    }

    if (res.status === 400) {
      const errorText = await res.text();
      return { success: false, error: errorText || "Validation failed.", status: 400 };
    }

    const errorText = await res.text();
    return { success: false, error: errorText || `API error (${res.status})`, status: res.status };
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    return { success: false, error: error.message || "Failed to submit request to server." };
  }
}

/**
 * Approve a leave request by ID.
 */
export async function approveLeaveRequest(id: number): Promise<ServerActionResponse<LeaveRequest>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaverequests/${id}/approve`, {
      method: "PATCH",
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      revalidatePath("/");
      return { success: true, data };
    }

    const errorText = await res.text();
    return {
      success: false,
      error: errorText || `Failed to approve request (Status: ${res.status})`,
      status: res.status,
    };
  } catch (error: any) {
    console.error("Error approving leave request:", error);
    return { success: false, error: error.message || "Network error when calling approve API." };
  }
}

/**
 * Reject a leave request by ID.
 */
export async function rejectLeaveRequest(id: number): Promise<ServerActionResponse<LeaveRequest>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/leaverequests/${id}/reject`, {
      method: "PATCH",
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      revalidatePath("/");
      return { success: true, data };
    }

    const errorText = await res.text();
    return {
      success: false,
      error: errorText || `Failed to reject request (Status: ${res.status})`,
      status: res.status,
    };
  } catch (error: any) {
    console.error("Error rejecting leave request:", error);
    return { success: false, error: error.message || "Network error when calling reject API." };
  }
}
