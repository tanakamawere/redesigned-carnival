import TeamLeaveDashboard from "./dashboard";
import { getEmployees, getUpcomingRequests, getPublicHolidays } from "./actions";

// Disable server-side caching so the page always fetches fresh API data
export const revalidate = 0;

export default async function Home() {
  // Fetch initial data concurrently on the server
  const [employees, requests, holidays] = await Promise.all([
    getEmployees(),
    getUpcomingRequests(),
    getPublicHolidays(),
  ]);

  return (
    <TeamLeaveDashboard
      employees={employees}
      requests={requests}
      holidays={holidays}
    />
  );
}
