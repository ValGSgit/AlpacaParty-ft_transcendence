/**
 * Admin middleware — requires req.user.isAdmin === true
 * Must be used after authenticate()
 */
export const requireAdmin = (req, res, next) => {
  const isAdmin = req.user?.isAdmin || req.user?.userSettings?.isAdmin;
  if (!req.user || !isAdmin) {
    return res.status(403).json({ error: { message: 'Admin access required' } });
  }
  next();
};
