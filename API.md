# FleetSphere API
Base URL `/api`.
Auth: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/register`.
CRUD resources: `/organizations`, `/branches`, `/users`, `/vehicles`, `/drivers`, `/assignments`, `/trips`, `/routes`, `/fuel`, `/maintenance`, `/incidents`, `/documents`, `/expenses`, `/notifications`, `/audit-logs`.
Analytics: `GET /analytics/dashboard`. Trip workflow: `PATCH /trips/:id/status` with `{status, reason}`.
All protected resources enforce JWT authentication and organization/branch scope.
