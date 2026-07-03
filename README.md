# Team Leave Scheduler

This repository contains the solution for the Team Leave Scheduler job proposal. The application consists of a .NET Web API backend and a web frontend.

## Prerequisites

Before running the application, ensure you have the following installed on your system:
- [.NET 10.0 SDK](https://dotnet.microsoft.com/download) (or the relevant version installed on your system)
- [Node.js and npm](https://nodejs.org/) (for running the frontend)

---

## 1. Backend Setup (.NET API)

The backend is located in the `src/api` directory and uses Entity Framework Core for data access.

### Database Migrations
Before running the API, you need to create the database schema by adding a migration and then updating the database.

Open your terminal, navigate to the API directory, and run the following commands:
```bash
cd src/api
dotnet ef migrations add InitialCreate
dotnet ef database update
```
*(If you do not have the EF Core tools installed globally, you can install them via `dotnet tool install --global dotnet-ef` first).*

### Seeding Data for Review
The application seeds its initial data from `employees.csv` and `public_holidays.json` (located in `src/api/SeedData`). 
When you are ready to review the application with your own data, you can replace these files. **Please ensure that your replacement files maintain the exact same data schema** for the importing process to succeed.

### Running the API
Once the database is set up, start the backend server:
```bash
dotnet run
```
The API will be available at `http://localhost:5245` (check your console output for the exact URL).

---

## 2. Frontend Setup

The frontend is located in the `src/web` directory.

### Running the Web Client
Open a new terminal window, navigate to the web directory, install the dependencies, and start the development server:

```bash
cd src/web
npm install
npm run dev
```

*(Note: Depending on the framework used, you might need to use `npm start` instead of `npm run dev`. Refer to standard npm scripts for the framework).*

---

## 3. Reviewer Resources

- **`DECISIONS.md`**: Outlines my interpretations of the business rules, including how the 30% rule is calculated and how edge cases are handled.
- **`AI_USAGE.md`**: Details the AI tools used during the development of this project, helpful prompts, and where AI made mistakes.
- **Tests**: Core business logic tests (xUnit) are located in the `src/tests` directory and can be executed using `dotnet test src/tests`.
