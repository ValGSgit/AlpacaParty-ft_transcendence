/**
 * Admin middleware — requires req.user.isAdmin === true
 * Must be used after authenticate()
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  next();
};
