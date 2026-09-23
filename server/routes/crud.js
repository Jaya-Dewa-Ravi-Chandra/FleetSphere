import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, scope } from '../middleware/auth.js';
import { asyncHandler } from '../utils/async.js';
import { created, ok, fail } from '../utils/response.js';
import { AuditLog, Notification, User } from '../models/index.js';

const cleanBody = (body) => {
  const next = { ...body };
  delete next.organizationId;
  delete next.branchId;
  delete next.createdAt;
  delete next.updatedAt;
  delete next._id;
  return next;
};

export function crud(Model, { name, roles = ['super_admin', 'fleet_manager', 'branch_manager'], readRoles = roles, populate = '', fields = [], beforeCreate, beforeUpdate } = {}) {
  const r = Router();
  r.use(authenticate);
  const read = authorize(...readRoles);
  const write = authorize(...roles);
  r.use((req,res,next)=>read(req,res,next));

  r.get('/', asyncHandler(async (req, res) => {
    const q = scope({}, req);
    const { search, status, branchId, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    if (req.user.role === 'super_admin' && branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (search && fields.length) q.$or = fields.map(f => ({ [f]: { $regex: String(search), $options: 'i' } }));
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    let query = Model.find(q);
    if (populate) query = query.populate(populate);
    const [data, total] = await Promise.all([
      query.sort(sort).skip((p - 1) * l).limit(l),
      Model.countDocuments(q)
    ]);
    ok(res, data, 'Success', { pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } });
  }));

  r.post('/', write, asyncHandler(async (req, res) => {
    let body = cleanBody(req.body);
    if (Model === User) {
      if (!body.password) return fail(res, 'Password is required');
      body.password = await bcrypt.hash(body.password, 12);
      body.email = String(body.email || '').toLowerCase();
      if (body.role === 'super_admin' && req.user.role !== 'super_admin') return fail(res, 'You cannot create a Super Admin', 403);
    }
    body.organizationId = req.user.organizationId;
    body.branchId = req.user.role === 'super_admin' ? body.branchId : req.user.branchId;
    if (Model === Notification) body.userId = req.user._id;
    if (beforeCreate) body = await beforeCreate(body, req);
    const doc = await Model.create(body);
    await AuditLog.create({ organizationId: req.user.organizationId, branchId: doc.branchId, userId: req.user._id, action: `${name} created`, entityType: name, entityId: doc._id, ipAddress: req.ip });
    created(res, doc, `${name} created successfully`);
  }));

  r.get('/:id', asyncHandler(async (req, res) => {
    const q = scope({ _id: req.params.id }, req);
    let query = Model.findOne(q);
    if (populate) query = query.populate(populate);
    const doc = await query;
    if (!doc) return fail(res, `${name} not found`, 404);
    ok(res, doc);
  }));

  r.put('/:id', write, asyncHandler(async (req, res) => {
    const q = scope({ _id: req.params.id }, req);
    let body = cleanBody(req.body);
    if (Model === User) {
      delete body.password;
      if (body.email) body.email = String(body.email).toLowerCase();
    }
    if (beforeUpdate) body = await beforeUpdate(body, req);
    const doc = await Model.findOneAndUpdate(q, body, { new: true, runValidators: true });
    if (!doc) return fail(res, `${name} not found`, 404);
    await AuditLog.create({ organizationId: req.user.organizationId, branchId: doc.branchId, userId: req.user._id, action: `${name} updated`, entityType: name, entityId: doc._id, metadata: body, ipAddress: req.ip });
    ok(res, doc, `${name} updated successfully`);
  }));

  r.delete('/:id', write, asyncHandler(async (req, res) => {
    const q = scope({ _id: req.params.id }, req);
    const doc = await Model.findOneAndDelete(q);
    if (!doc) return fail(res, `${name} not found`, 404);
    await AuditLog.create({ organizationId: req.user.organizationId, branchId: doc.branchId, userId: req.user._id, action: `${name} deleted`, entityType: name, entityId: doc._id, ipAddress: req.ip });
    ok(res, null, `${name} deleted successfully`);
  }));

  return r;
}
