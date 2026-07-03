export type Team = "Engineering" | "Operations" | "Finance";
export type Status = "Pending" | "Approved" | "Rejected";

export interface Employee {
  id: string; // Guid
  name: string;
  team: number; // Enum: 0 = Engineering, 1 = Operations, 2 = Finance
}

export interface LeaveRequest {
  id: number;
  employeeId: string;
  startDate: string; // ISO DateTime string
  endDate: string; // ISO DateTime string
  status: number; // Enum: 0 = Pending, 1 = Approved, 2 = Rejected
}

export interface PublicHoliday {
  id: number;
  name: string;
  date: string; // ISO DateTime string
}

// Map from numeric Enum to UI String
export function getTeamName(teamNum: number): Team {
  switch (teamNum) {
    case 0:
      return "Engineering";
    case 1:
      return "Operations";
    case 2:
      return "Finance";
    default:
      return "Engineering";
  }
}

export function getStatusName(statusNum: number): Status {
  switch (statusNum) {
    case 0:
      return "Pending";
    case 1:
      return "Approved";
    case 2:
      return "Rejected";
    default:
      return "Pending";
  }
}

// Map from Team name to color class mapping
export function getTeamColor(team: Team | number): {
  bg: string;
  text: string;
  border: string;
} {
  const teamName = typeof team === "number" ? getTeamName(team) : team;
  switch (teamName) {
    case "Engineering":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-400/10",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/20 dark:border-blue-400/20",
      };
    case "Operations":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-500/20 dark:border-emerald-400/20",
      };
    case "Finance":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-400/10",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/20 dark:border-amber-400/20",
      };
  }
}

export function getStatusColor(status: Status | number): {
  bg: string;
  text: string;
  dot: string;
} {
  const statusName = typeof status === "number" ? getStatusName(status) : status;
  switch (statusName) {
    case "Pending":
      return {
        bg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        text: "text-yellow-700 dark:text-yellow-400",
        dot: "bg-yellow-500",
      };
    case "Approved":
      return {
        bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        text: "text-emerald-700 dark:text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "Rejected":
      return {
        bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        text: "text-rose-700 dark:text-rose-400",
        dot: "bg-rose-500",
      };
  }
}
