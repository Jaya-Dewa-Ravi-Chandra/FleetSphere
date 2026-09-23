import { Router } from 'express';
import auth from './auth.js';
import trips from './trips.js';
import analytics from './analytics.js';
import { crud } from './crud.js';
import { authenticate, authorize, scope } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async.js';
import { ok, fail, created } from '../utils/response.js';
import { AuditLog, Branch, Document, Driver, Expense, FuelEntry, Incident, MaintenanceJob, Organization, Route, User, Vehicle, Assignment } from '../models/index.js';
import { upload } from '../middleware/upload.js';

const r = Router();
r.use('/auth', auth); r.use('/trips', trips); r.use('/analytics', analytics);

r.use('/organizations', crud(Organization, { name: 'Organization', roles: ['super_admin'], fields: ['name', 'code'] }));
r.use('/branches', crud(Branch, { name: 'Branch', roles: ['super_admin'], fields: ['name', 'code', 'city', 'state'] }));
r.use('/users', crud(User, { name: 'User', roles: ['super_admin'], fields: ['name', 'email', 'role'] }));
r.use('/vehicles', crud(Vehicle, { name: 'Vehicle', roles: ['super_admin', 'fleet_manager', 'branch_manager'], fields: ['registrationNumber', 'make', 'model', 'vehicleType', 'status'], populate: 'assignedDriver', beforeCreate: async (b,req) => { if(b.assignedDriver){ const d=await Driver.findOne({_id:b.assignedDriver,...scope({},req)}); if(!d) throw Object.assign(new Error('Assigned driver is not accessible.'),{status:403}); } return b; }, beforeUpdate: async (b,req) => { if(b.assignedDriver){ const d=await Driver.findOne({_id:b.assignedDriver,...scope({},req)}); if(!d) throw Object.assign(new Error('Assigned driver is not accessible.'),{status:403}); } return b; } }));
r.use('/drivers', crud(Driver, { name: 'Driver', roles: ['super_admin', 'fleet_manager', 'branch_manager'], fields: ['name', 'email', 'phone', 'licenseNumber', 'status'] }));

r.get('/assignments', authenticate, asyncHandler(async (req, res) => {
  const data = await Assignment.find(scope({}, req)).populate('vehicleId', 'registrationNumber').populate('driverId', 'name').sort('-start'); ok(res, data);
}));
r.post('/assignments', authenticate, authorize('super_admin', 'fleet_manager', 'branch_manager'), asyncHandler(async (req, res) => {
  const b = { ...req.body, organizationId: req.user.organizationId, branchId: req.user.role === 'super_admin' ? req.body.branchId : req.user.branchId };
  const start = new Date(b.start), end = new Date(b.end);
  if (!(start < end)) return fail(res, 'End must be after start');
  const conflict = await Assignment.findOne({ ...scope({}, req), $or: [{ vehicleId: b.vehicleId }, { driverId: b.driverId }], start: { $lt: end }, end: { $gt: start } });
  if (conflict) return fail(res, 'Vehicle or driver is already assigned during this period.', 409);
  const doc = await Assignment.create(b); created(res, doc, 'Assignment created successfully');
}));

r.use('/routes', crud(Route, { name: 'Route', roles: ['super_admin', 'fleet_manager', 'branch_manager'], fields: ['routeName', 'origin', 'destination'] }));
r.use('/fuel', crud(FuelEntry, { name: 'Fuel entry', roles: ['super_admin', 'fleet_manager', 'branch_manager', 'finance_officer', 'driver'], fields: ['station', 'fuelType'], beforeCreate: async (b,req) => ({ ...b, totalCost: Number(b.quantity || 0) * Number(b.pricePerUnit || 0), driverId: req.user.role==='driver' ? (await Driver.findOne({userId:req.user._id, ...scope({},req)}))?._id : b.driverId }) }));
r.use('/maintenance', crud(MaintenanceJob, { name: 'Maintenance', roles: ['super_admin', 'fleet_manager', 'branch_manager'], readRoles: ['super_admin','fleet_manager','branch_manager','finance_officer'], fields: ['serviceType', 'status'], populate: 'vehicleId' }));
r.use('/incidents', crud(Incident, { name: 'Incident', roles: ['super_admin', 'fleet_manager', 'branch_manager', 'driver'], fields: ['incidentNumber', 'type', 'severity', 'status'], populate: 'vehicleId driverId tripId' }));
r.use('/expenses', crud(Expense, { name: 'Expense', roles: ['super_admin', 'fleet_manager', 'branch_manager', 'driver', 'finance_officer'], fields: ['expenseNumber', 'category', 'status'], populate: 'vehicleId driverId tripId', beforeCreate: async (b,req) => ({ ...b, submittedBy: req.user._id }) }));

r.patch('/expenses/:id/status', authenticate, authorize('super_admin', 'finance_officer'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Submitted', 'Under Review', 'Approved', 'Rejected', 'Paid'].includes(status)) return fail(res, 'Invalid expense status');
  const e = await Expense.findOne(scope({ _id: req.params.id }, req)); if (!e) return fail(res, 'Expense not found', 404);
  const valid = { Submitted: ['Under Review'], 'Under Review': ['Approved', 'Rejected'], Approved: ['Paid'], Rejected: [], Paid: [] };
  if (!valid[e.status]?.includes(status)) return fail(res, `Invalid transition from ${e.status} to ${status}`);
  e.status = status; if (['Approved', 'Paid'].includes(status)) e.approvedBy = req.user._id; await e.save(); ok(res, e, 'Expense status updated');
}));

r.patch('/maintenance/:id/status', authenticate, authorize('super_admin', 'fleet_manager', 'branch_manager'), asyncHandler(async (req, res) => {
  const m = await MaintenanceJob.findOne(scope({ _id: req.params.id }, req)); if (!m) return fail(res, 'Maintenance job not found', 404);
  const valid = { Scheduled: ['In Progress', 'Overdue', 'Cancelled'], 'In Progress': ['Completed'], Overdue: ['In Progress'], Completed: [], Cancelled: [] };
  if (!valid[m.status]?.includes(req.body.status)) return fail(res, `Invalid transition from ${m.status} to ${req.body.status}`);
  m.status = req.body.status; if (m.status === 'Completed') { m.completedDate = new Date(); if (m.vehicleId) await Vehicle.findByIdAndUpdate(m.vehicleId, { status: 'Available', lastServiceDate: m.completedDate, nextServiceDate: m.nextServiceDate }); } else if (['In Progress', 'Overdue'].includes(m.status) && m.vehicleId) await Vehicle.findByIdAndUpdate(m.vehicleId, { status: 'Maintenance' }); await m.save(); ok(res, m, 'Maintenance status updated');
}));

r.patch('/incidents/:id/status', authenticate, authorize('super_admin', 'fleet_manager', 'branch_manager'), asyncHandler(async (req, res) => {
  const i = await Incident.findOne(scope({ _id: req.params.id }, req)); if (!i) return fail(res, 'Incident not found', 404);
  const valid = { Reported: ['Under Investigation'], 'Under Investigation': ['Resolved'], Resolved: ['Closed'], Closed: [] };
  if (!valid[i.status]?.includes(req.body.status)) return fail(res, `Invalid transition from ${i.status} to ${req.body.status}`);
  i.status = req.body.status; if (i.status === 'Resolved') { i.resolvedAt = new Date(); i.resolvedBy = req.user._id; } await i.save(); ok(res, i, 'Incident status updated');
}));

r.get('/notifications', authenticate, asyncHandler(async (req, res) => { const data = await Notification.find({ userId: req.user._id }).sort('-createdAt').limit(100); ok(res, data); }));
r.patch('/notifications/:id/read', authenticate, asyncHandler(async (req, res) => { const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true }, { new: true }); if (!n) return fail(res, 'Notification not found', 404); ok(res, n); }));

r.get('/audit-logs', authenticate, authorize('super_admin'), asyncHandler(async (req, res) => { const data = await AuditLog.find(scope({}, req)).populate('userId', 'name email').sort('-timestamp').limit(300); ok(res, data); }));
r.get('/documents', authenticate, asyncHandler(async (req, res) => { const data = await Document.find(scope({}, req)).sort('-createdAt').limit(200); ok(res, data); }));
r.post('/documents', authenticate, upload.single('file'), asyncHandler(async (req, res) => { if (!req.file) return fail(res, 'A valid document file is required'); const doc = await Document.create({ organizationId: req.user.organizationId, branchId: req.user.role === 'super_admin' ? req.body.branchId : req.user.branchId, name: req.body.name || req.file.originalname, type: req.body.type || 'Other', url: `/uploads/${req.file.filename}`, uploadedBy: req.user._id, expiryDate: req.body.expiryDate || undefined, entityType: req.body.entityType, entityId: req.body.entityId || undefined }); created(res, doc, 'Document uploaded successfully'); }));

export default r;
