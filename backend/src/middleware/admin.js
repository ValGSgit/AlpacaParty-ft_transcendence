/**
 * Admin middleware — requires req.user.is_admin === true
 * Must be used after authenticate()
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  next();
};
