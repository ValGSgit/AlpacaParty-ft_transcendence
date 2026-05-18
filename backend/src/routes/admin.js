import express from "express";
import { requireAdmin, requireSuperAdmin } from "../middleware/admin.js";
import {
  adminLogin,
  adminLogout,
  getMe,
  getDashboard,
  getUsers,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
  getAdminPermissions,
  setAdminPermissions,
} from "../controllers/adminController.js";

const router = express.Router();

// Public admin auth
router.post("/login", adminLogin);
router.post("/logout", adminLogout);

// Protected — all routes below require valid admin JWT
router.use(requireAdmin);

router.get("/me", getMe);
router.get("/dashboard", getDashboard);

// User management
router.get("/users", getUsers);
router.patch("/users/:id/role", requireSuperAdmin, updateUserRole);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/unban", unbanUser);
router.delete("/users/:id", deleteUser);

// Per-admin Vault permissions (superadmin only for writes)
router.get("/admins/:id/permissions", getAdminPermissions);
router.put("/admins/:id/permissions", setAdminPermissions);

export default router;
