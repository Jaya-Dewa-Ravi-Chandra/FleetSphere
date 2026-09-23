export const ok = (res, data, message = 'Success', extra = {}) => res.json({
    success: true,
    message,
    data,
    ...extra
});
export const created = (res, data, message = 'Created') => res.status(201).json({
    success: true,
    message,
    data
});
export const fail = (res, message = 'Request failed', status = 400, errors = []) => res.status(status).json({
    success: false,
    message,
    errors
});