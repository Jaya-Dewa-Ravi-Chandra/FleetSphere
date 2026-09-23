# Architecture
Server separates app bootstrap from server startup. Models use Mongoose references, timestamps, indexes and enums. Middleware handles authentication, authorization, branch scoping, security headers, rate limiting and error normalization. Client uses React Router, Context, Axios and reusable CRUD/table components. Dashboard values are aggregated from MongoDB rather than hardcoded.
