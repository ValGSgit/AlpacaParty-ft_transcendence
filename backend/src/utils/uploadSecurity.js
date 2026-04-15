import path from "path";
import fs from "fs";
import File from "#models/File.js";
import config from "#config/index.js";
import { authenticate } from "#middleware/auth.js";

export const uploadSecurityCheck = async (req, res, next) => {
  // Strip leading slash to get the stored filename
  const storedName = req.path.replace(/^\//, "");
  if (!storedName) return next();

  try {
    const imgMimeTypes = new Set(config.uploads.imageMimeTypes);
    const record = await File.findByStoredName(storedName);

    // AI-generated files are saved to disk but not tracked in the File table —
    // allow serving them if the file exists on disk (images only).
    if (!record) {
      const diskPath = path.join(config.uploads.dir, storedName);
      const mime = storedName.endsWith(".png")
        ? "image/png"
        : storedName.endsWith(".jpg") || storedName.endsWith(".jpeg")
          ? "image/jpeg"
          : storedName.endsWith(".webp")
            ? "image/webp"
            : null;

      if (mime && imgMimeTypes.has(mime) && fs.existsSync(diskPath)) {
        res.setHeader("Content-Type", mime);
        return next();
      }
      return res.status(404).json({ error: { message: "File not found" } });
    }

    // Non-image files require authentication
    if (!imgMimeTypes.has(record.mimeType)) {
      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => (err ? reject(err) : resolve()));
      });

      // authenticate() replies with 401 if the token is missing/invalid — if we reach
      // here, req.user is set and the requester is authenticated.
      if (record.uploaderId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ error: { message: "Access denied" } });
      }
    }

    // Use 'inline' for images so they render in <img> tags; 'attachment' for others
    if (imgMimeTypes.has(record?.mimeType)) {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader("Content-Disposition", "attachment");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");

    next();
  } catch {
    return res
      .status(500)
      .json({ error: { message: "File access check failed" } });
  }
};
