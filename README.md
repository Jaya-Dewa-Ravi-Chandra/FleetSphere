# FleetSphere

FleetSphere is a full-stack **MERN fleet management platform** designed to help logistics organizations manage vehicles, drivers, trips, assignments, fuel usage, maintenance, incidents, expenses, documents, branches, users, notifications, audit logs, and operational analytics from a centralized dashboard.

## Overview

FleetSphere provides an organization-aware fleet operations system with role-based access control and branch-level data scoping.

The application is split into:

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Authentication:** JWT-based authentication with HTTP-only cookies
- **Maps:** Leaflet + OpenStreetMap
- **Charts:** Recharts
- **Validation:** Zod
- **HTTP Client:** Axios
- **File Uploads:** Multer

## Key Features

### Dashboard

The dashboard provides an operational overview of the fleet, including:

- Total vehicles
- Active vehicles
- Available vehicles
- Maintenance status
- Fuel costs
- Maintenance costs
- Fleet activity trends
- Live vehicle map
- Vehicle status visualization

### Vehicle Management

Manage the organization's fleet with information such as:

- Registration number
- Make and model
- Vehicle type
- Fuel type
- Capacity
- Mileage
- Vehicle status
- Branch
- Assigned driver
- Insurance and registration dates
- Service information
- Notes

### Driver Management

Maintain driver records including:

- Driver information
- Contact details
- License information
- Driver status
- Vehicle relationships
- Operational assignments

### Trip Management

Manage fleet trips with:

- Trip creation and tracking
- Vehicle and driver assignment
- Origin and destination
- Trip status
- Operational information
- Trip-related records

### Vehicle & Driver Assignments

FleetSphere supports assignment scheduling while preventing conflicting assignments for the same vehicle or driver during overlapping periods.

### Routes

Create and manage operational routes with:

- Route name
- Origin
- Destination
- Route-related fleet information

### Fuel Management

Track fuel activity including:

- Fuel station
- Fuel type
- Quantity
- Price per unit
- Calculated total cost
- Vehicle and driver relationships

### Maintenance

Manage vehicle maintenance workflows with statuses such as:

- Scheduled
- In Progress
- Overdue
- Completed
- Cancelled

Maintenance records can update the associated vehicle's operational status and service information.

### Incident Management

Record and manage fleet incidents with:

- Incident number
- Incident type
- Severity
- Vehicle
- Driver
- Trip
- Incident status
- Resolution information

### Expense Management

Track operational expenses and manage their workflow through states such as:

- Submitted
- Under Review
- Approved
- Rejected
- Paid

### Documents

FleetSphere supports document records and file uploads for operational documentation, including:

- Document name
- Document type
- Related entity
- Expiry date
- Uploaded-by information

### Branch & Organization Management

The platform supports multi-organization and branch-aware data access.

Users do not simply submit a branch identifier and gain access to it. Backend authorization derives organization and branch scope from the authenticated user and applies that scope to database queries.

### Role-Based Access Control

Supported roles include:

| Role | General Access |
|---|---|
| Super Admin | Organization-wide and platform administration |
| Fleet Manager | Fleet and operational management |
| Branch Manager | Branch-level fleet operations |
| Driver | Driver-focused operational functions |
| Finance Officer | Fuel, maintenance, expenses, analytics and related financial workflows |

Permissions are enforced at the API layer as well as reflected in the frontend navigation.

### Analytics

FleetSphere includes analytics views for:

- Fleet activity
- Vehicle utilization
- Operational metrics
- Cost information
- Fuel spending
- Maintenance spending

### Notifications

Authenticated users can access notifications associated with their account and mark notifications as read.

### Audit Logs

Administrative users can review operational audit records, including associated user information and timestamps.

### Fleet Map

The dashboard includes a Leaflet-based map using OpenStreetMap data to visualize fleet activity and vehicle locations.

The map supports vehicle markers and status-oriented visualization.

## Architecture

```text
┌──────────────────────────────┐
│          React Client        │
│                              │
│ Pages / Components / Routes  │
│ Context / Hooks / Services   │
└──────────────┬───────────────┘
               │ Axios
               │ HTTP + Cookies
               ▼
┌──────────────────────────────┐
│       Express API Server     │
│                              │
│ Routes                       │
│ Authentication              │
│ Authorization               │
│ Branch / Organization Scope  │
│ Validation                   │
│ File Uploads                 │
└──────────────┬───────────────┘
               │ Mongoose
               ▼
┌──────────────────────────────┐
│           MongoDB            │
│                              │
│ Users / Organizations        │
│ Branches / Vehicles          │
│ Drivers / Trips              │
│ Fuel / Maintenance           │
│ Incidents / Expenses         │
│ Documents / Assignments      │
│ Audit Logs / Notifications   │
└──────────────────────────────┘
```

## Authentication

FleetSphere uses JWT authentication with an HTTP-only `accessToken` cookie.

The authentication flow is:

```text
Login
  ↓
Credentials validated
  ↓
JWT generated
  ↓
HTTP-only cookie issued
  ↓
Browser automatically sends cookie
  ↓
Authentication middleware verifies JWT
  ↓
Authenticated user attached to request
  ↓
Organization / branch scope applied
  ↓
Protected API operation
```

HTTP-only cookies keep the authentication token inaccessible to normal client-side JavaScript.

## Authorization & Data Scoping

The backend applies role-based authorization and organization/branch scoping to protected operations.

A simplified request flow is:

```text
Request
  ↓
Authentication
  ↓
Identify user
  ↓
Check role permissions
  ↓
Determine organization / branch scope
  ↓
Query authorized records
  ↓
Return response
```

This prevents the frontend from being the sole enforcement layer for access control.

## Project Structure

```text
fleetsphere/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seeds/
│   ├── tests/
│   ├── utils/
│   ├── package.json
│   └── server.js
│
├── .gitignore
└── README.md
```

## API Modules

The Express API is organized around resource-specific modules.

```text
/api
├── /auth
├── /organizations
├── /branches
├── /users
├── /vehicles
├── /drivers
├── /trips
├── /assignments
├── /routes
├── /fuel
├── /maintenance
├── /incidents
├── /expenses
├── /documents
├── /notifications
├── /audit-logs
└── /analytics
```

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React | UI framework |
| Vite | Frontend build tooling |
| React Router | Client-side routing |
| Axios | API communication |
| React Hook Form | Form handling |
| Zod | Validation |
| Leaflet | Interactive maps |
| React Leaflet | React integration for Leaflet |
| Recharts | Analytics charts |
| Lucide React | Interface icons |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express | REST API |
| MongoDB | Database |
| Mongoose | ODM |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Zod | Validation |
| Multer | File uploads |
| Helmet | Security headers |
| CORS | Cross-origin API access |
| Express Rate Limit | Request rate limiting |
| Morgan | HTTP request logging |

## Getting Started

### Prerequisites

Install:

- Node.js 20+
- MongoDB

### Clone the Repository

```bash
git clone <your-repository-url>
cd fleetsphere
```

### Backend Setup

```bash
cd server
npm install
```

Create your environment file from the provided example:

```bash
cp .env.example .env
```

Configure the required environment variables locally.

Do not commit real credentials or secrets.

### Frontend Setup

```bash
cd ../client
npm install
```

Create the frontend environment file from the provided example:

```bash
cp .env.example .env
```

Configure the API base URL for your local backend.

### Seed the Database

From the `server` directory:

```bash
npm run seed
```

To reset and reseed the database:

```bash
npm run seed:reset
```

### Run the Backend

```bash
cd server
npm run dev
```

The API runs on the configured backend port.

### Run the Frontend

In another terminal:

```bash
cd client
npm run dev
```

Vite starts the frontend development server.

## Production Deployment

FleetSphere can be deployed with the frontend and backend as separate services.

### Backend

Configure production environment variables through the hosting provider rather than committing them to the repository.

Typical configuration includes:

```text
NODE_ENV=production
CLIENT_URL=<frontend-url>
MONGO_URI=<managed-mongodb-connection>
JWT_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
```

### Frontend

Configure the production API URL:

```text
VITE_API_URL=<backend-api-url>/api
```

Because Vite environment variables are embedded during the build, rebuild the frontend after changing them.

### Production Considerations

For production deployments:

- Use HTTPS.
- Use strong randomly generated secrets.
- Restrict CORS to the deployed frontend origin.
- Use a managed MongoDB deployment.
- Use durable object storage for uploaded documents.
- Avoid committing `.env` files.
- Keep development credentials out of production.
- Configure secure authentication cookies.
- Configure appropriate database backups and monitoring.

## Testing

The backend includes a test setup using Node's test runner and Supertest.

Run:

```bash
cd server
npm test
```

## Available Server Scripts

```bash
npm run dev
npm start
npm run seed
npm run seed:reset
npm test
```

## Security

FleetSphere includes several security-oriented mechanisms:

- JWT authentication
- HTTP-only authentication cookies
- Password hashing with bcrypt
- Role-based authorization
- Organization and branch data scoping
- Helmet security headers
- CORS configuration
- Rate limiting
- Request validation
- Protected API routes
- Authenticated document operations

### Environment Security

Never commit:

```text
.env
.env.local
production secrets
database credentials
JWT secrets
API keys
private tokens
```

Use environment variables supplied by the deployment platform for production configuration.

## Development Notes

FleetSphere is structured so that frontend screens communicate with real backend API routes rather than relying exclusively on static mock data.

A typical operation follows:

```text
UI interaction
    ↓
React page/component
    ↓
Axios API request
    ↓
Express route
    ↓
Authentication
    ↓
Authorization
    ↓
Organization / branch scope
    ↓
Controller / CRUD operation
    ↓
Mongoose
    ↓
MongoDB
    ↓
API response
    ↓
React UI update
```

## License

This project is currently provided as a project/application codebase. Add an appropriate license file before distributing it publicly.
