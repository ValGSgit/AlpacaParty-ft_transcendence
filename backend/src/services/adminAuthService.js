import jwt from "jsonwebtoken";
import config from "../config/index.js";

const AdminAuthService = {
  generateToken(admin) {
    return jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      config.admin.jwtSecret,
      { expiresIn: config.admin.jwtExpiresIn },
    );
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, config.admin.jwtSecret);
    } catch {
      return null;
    }
  },
};

export default AdminAuthService;
