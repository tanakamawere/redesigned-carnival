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
        bg: "bg-blue-50 dark:bg-blue-950",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800",
      };
    case "Operations":
      return {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-700 dark:text-green-300",
        border: "border-green-200 dark:border-green-800",
      };
    case "Finance":
      return {
        bg: "bg-amber-50 dark:bg-amber-950",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
      };
  }
}

export function getStatusColor(status: Status | number): {
  bg: string;
  text: string;
} {
  const statusName = typeof status === "number" ? getStatusName(status) : status;
  switch (statusName) {
    case "Pending":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-950",
        text: "text-yellow-700 dark:text-yellow-300",
      };
    case "Approved":
      return {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-700 dark:text-green-300",
      };
    case "Rejected":
      return {
        bg: "bg-red-50 dark:bg-red-950",
        text: "text-red-700 dark:text-red-300",
      };
  }
}
