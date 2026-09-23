import { Router } from 'express';
import { Trip, Vehicle, Driver, Assignment, AuditLog } from '../models/index.js';
import { authenticate, scope, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async.js';
import { ok, fail, created } from '../utils/response.js';

const r = Router();
r.use(authenticate);
const transitions = { Planned: ['Assigned', 'Cancelled'], Assigned: ['Started', 'Cancelled'], Started: ['Delayed', 'Completed'], Delayed: ['Started', 'Completed'] };
const writeRoles = authorize('super_admin', 'fleet_manager', 'branch_manager');

function overlap(aStart, aEnd, bStart, bEnd) { return aStart < bEnd && bStart < aEnd; }

r.get('/', asyncHandler(async (req, res) => {
  const q = scope({}, req);
  const { search, status, page = 1, limit = 20 } = req.query;
  if (status) q.status = status;
  if (search) q.$or = [{ tripNumber: { $regex: search, $options: 'i' } }, { origin: { $regex: search, $options: 'i' } }, { destination: { $regex: search, $options: 'i' } }];
  const p = Math.max(1, Number(page) || 1), l = Math.min(100, Math.max(1, Number(limit) || 20));
  const [data, total] = await Promise.all([
    Trip.find(q).populate('vehicleId', 'registrationNumber make model').populate('driverId', 'name phone').populate('routeId', 'routeName').sort('-createdAt').skip((p - 1) * l).limit(l),
    Trip.countDocuments(q)
  ]);
  ok(res, data, 'Success', { pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
}));

r.post('/', writeRoles, asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body.organizationId; delete body.branchId;
  body.organizationId = req.user.organizationId;
  body.branchId = req.user.role === 'super_admin' ? body.branchId : req.user.branchId;
  if (!body.tripNumber || !body.origin || !body.destination) return fail(res, 'Trip number, origin and destination are required');
  if (body.scheduledStart && body.scheduledEnd) {
    const start = new Date(body.scheduledStart), end = new Date(body.scheduledEnd);
    if (!(start < end)) return fail(res, 'Scheduled end must be after scheduled start');
    if (body.vehicleId) {
      const existing = await Trip.findOne({ ...scope({ vehicleId: body.vehicleId }, req), status: { $nin: ['Completed', 'Cancelled'] }, scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } });
      if (existing) return fail(res, 'Vehicle is already assigned during this period.', 409);
    }
    if (body.driverId) {
      const existing = await Trip.findOne({ ...scope({ driverId: body.driverId }, req), status: { $nin: ['Completed', 'Cancelled'] }, scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } });
      if (existing) return fail(res, 'Driver is already assigned during this period.', 409);
    }
  }
  if (body.vehicleId) {
    const vehicle = await Vehicle.findOne(scope({ _id: body.vehicleId }, req));
    if (!vehicle) return fail(res, 'Vehicle is not accessible', 403);
    if (vehicle.status === 'Maintenance' || vehicle.status === 'Inactive') return fail(res, 'Vehicle is unavailable for trips', 409);
  }
  if (body.driverId) {
    const driver = await Driver.findOne(scope({ _id: body.driverId }, req));
    if (!driver) return fail(res, 'Driver is not accessible', 403);
    if (['Suspended', 'Inactive'].includes(driver.status)) return fail(res, 'Driver is unavailable for trips', 409);
  }
  const trip = await Trip.create(body);
  if (trip.vehicleId && trip.driverId) {
    await Assignment.create({ organizationId: trip.organizationId, branchId: trip.branchId, vehicleId: trip.vehicleId, driverId: trip.driverId, start: trip.scheduledStart || new Date(), end: trip.scheduledEnd || new Date(Date.now() + 3600000), status: 'Active' });
  }
  await AuditLog.create({ organizationId: trip.organizationId, branchId: trip.branchId, userId: req.user._id, action: 'Trip created', entityType: 'Trip', entityId: trip._id, ipAddress: req.ip });
  created(res, trip, 'Trip created successfully');
}));

r.put('/:id', writeRoles, asyncHandler(async (req, res) => {
  const q = scope({ _id: req.params.id }, req);
  const trip = await Trip.findOne(q);
  if (!trip) return fail(res, 'Trip not found', 404);
  const body = { ...req.body };
  delete body.organizationId; delete body.branchId; delete body.statusHistory;
  if (body.scheduledStart && body.scheduledEnd && new Date(body.scheduledStart) >= new Date(body.scheduledEnd)) return fail(res, 'Scheduled end must be after scheduled start');
  Object.assign(trip, body);
  await trip.save();
  await AuditLog.create({ organizationId: trip.organizationId, branchId: trip.branchId, userId: req.user._id, action: 'Trip updated', entityType: 'Trip', entityId: trip._id, ipAddress: req.ip });
  ok(res, trip, 'Trip updated successfully');
}));

r.delete('/:id', writeRoles, asyncHandler(async (req, res) => {
  const trip = await Trip.findOneAndDelete(scope({ _id: req.params.id }, req));
  if (!trip) return fail(res, 'Trip not found', 404);
  await AuditLog.create({ organizationId: trip.organizationId, branchId: trip.branchId, userId: req.user._id, action: 'Trip deleted', entityType: 'Trip', entityId: trip._id, ipAddress: req.ip });
  ok(res, null, 'Trip deleted successfully');
}));

r.patch('/:id/status', asyncHandler(async (req, res) => {
  const t = await Trip.findOne(scope({ _id: req.params.id }, req));
  if (!t) return fail(res, 'Trip not found', 404);
  if (req.user.role === 'driver') { const own = await Driver.findOne({ _id: t.driverId, userId: req.user._id }); if (!own) return fail(res, 'You can only update your assigned trips.', 403); }
  const { status, reason } = req.body;
  if (!transitions[t.status]?.includes(status)) return fail(res, `Invalid transition from ${t.status} to ${status}`, 400);
  if (status === 'Started') {
    if (t.vehicleId) await Vehicle.findByIdAndUpdate(t.vehicleId, { status: 'On Trip' });
    if (t.driverId) await Driver.findByIdAndUpdate(t.driverId, { status: 'On Trip' });
    t.actualStart = new Date();
  }
  if (status === 'Completed' || status === 'Cancelled') {
    if (t.vehicleId) await Vehicle.findByIdAndUpdate(t.vehicleId, { status: 'Available' });
    if (t.driverId) await Driver.findByIdAndUpdate(t.driverId, { status: 'Available' });
    t.actualEnd = new Date();
  }
  t.statusHistory.push({ previousStatus: t.status, newStatus: status, changedBy: req.user._id, timestamp: new Date(), reason });
  t.status = status;
  await t.save();
  await AuditLog.create({ organizationId: t.organizationId, branchId: t.branchId, userId: req.user._id, action: 'Trip status changed', entityType: 'Trip', entityId: t._id, metadata: { status, reason }, ipAddress: req.ip });
  ok(res, t, 'Trip status updated');
}));

export default r;
