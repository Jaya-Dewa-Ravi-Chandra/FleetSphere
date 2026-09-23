# FleetSphere
Enterprise fleet, driver, trip, fuel, maintenance, incident, expense and analytics platform built with MongoDB, Express, React and Node.

## Quick start
1. Install Node.js 20+ and MongoDB.
2. `cp server/.env.example server/.env` and set secrets.
3. `cp client/.env.example client/.env`.
4. From root: `npm install && npm --prefix server install && npm --prefix client install`.
5. `npm run seed`.
6. `npm run dev`.

Frontend: http://localhost:5173  | API: http://localhost:5000

## Demo accounts
All seeded accounts use password `Fleet@123`:
- superadmin@fleetsphere.com
- fleetmanager@fleetsphere.com
- branchmanager@fleetsphere.com
- driver@fleetsphere.com
- finance@fleetsphere.com

## Architecture
React -> Axios -> Express -> auth/role/branch scope -> controllers/routes -> Mongoose -> MongoDB.
The backend derives organization/branch scope from the authenticated user rather than trusting a submitted branchId.

## Seed
`npm run seed` or `npm run seed:reset`.

## Production
Set strong secrets, secure cookies, HTTPS, a managed MongoDB URI, restrictive CORS, object storage for documents, and a production reverse proxy. Uploaded local files are suitable for development; use durable object storage in production.
