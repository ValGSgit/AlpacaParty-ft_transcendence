import AdminAuthService from "../services/adminAuthService.js";
import prisma from "#config/prisma.js";
import CustomError from "#utils/CustomError.js";

/**
 * Verify admin JWT and attach req.admin (user row with role).
 * Requires role to be 'admin' or 'superadmin'.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.admin_jwt_token;
    if (!token) throw new CustomError("Admin authentication required", 401);

    const decoded = AdminAuthService.verifyToken(token);
    if (!decoded) throw new CustomError("Invalid or expired admin token", 401);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true, isBanned: true },
    });

    if (!user) throw new CustomError("Admin user not found", 401);
    if (user.isBanned) throw new CustomError("Account is banned", 403);
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new CustomError("Insufficient privileges", 403);
    }

    req.admin = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require superadmin role.
 */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.admin) throw new CustomError("Admin authentication required", 401);
    if (req.admin.role !== "superadmin") {
      throw new CustomError("Superadmin privileges required", 403);
    }
    next();
  } catch (err) {
    next(err);
  }
};
