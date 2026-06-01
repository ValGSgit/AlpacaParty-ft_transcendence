/**
 * Upload Service — multer configuration for local disk uploads
 */
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import config from "../config/index.js";
import File from "../models/File.js";

// Magic byte signatures for image MIME types.
// Each entry is an array of candidate byte sequences (some formats have
// multiple valid headers, e.g. GIF87a vs GIF89a).
const IMAGE_MAGIC = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png":  [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif":  [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
                 [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  // WebP: bytes 0-3 == "RIFF" AND bytes 8-11 == "WEBP"
  "image/webp": null,
};

const MIN_IMAGE_BYTES = 100;

/**
 * Read the first bytes of an uploaded file and confirm they match the
 * declared MIME type.  Only validates image types — other allowed types
 * (PDF, text, CSV …) are protected by authentication so strict content
 * checking is less critical and would require larger look-ahead buffers.
 *
 * Returns true if the file is valid (or not an image type we check).
 * Returns false if the magic bytes do not match.
 */
export async function validateFileMagicBytes(file) {
  const mime = file.mimetype;
  if (!(mime in IMAGE_MAGIC)) return true;

  const filePath = file.path;
  if (!filePath) return true; // memory storage — skip

  let buf;
  try {
    const handle = await fs.promises.open(filePath, "r");
    const raw = Buffer.alloc(12);
    const { bytesRead } = await handle.read(raw, 0, 12, 0);
    await handle.close();
    buf = raw.subarray(0, bytesRead);
  } catch {
    return false;
  }

  if (buf.length < MIN_IMAGE_BYTES && file.size < MIN_IMAGE_BYTES) return false;

  if (mime === "image/webp") {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
      buf.subarray(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))
    );
  }

  const candidates = IMAGE_MAGIC[mime];
  return candidates.some((magic) =>
    buf.length >= magic.length &&
    buf.subarray(0, magic.length).equals(Buffer.from(magic)),
  );
}

// Ensure upload directory exists
fs.mkdirSync(config.uploads.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error(`File type ${file.mimetype} not allowed`), {
        status: 400,
      }),
      false,
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.uploads.maxSizeBytes },
});

/**
 * Given a multer file object, record it in the DB and return the File record.
 */
export async function saveFileRecord(uploaderId, file) {
  const url = `/uploads/${file.filename}`;
  return File.create({
    uploaderId,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    url,
  });
}

/**
 * Delete a file from disk.
 */
export async function deleteFileFromDisk(storedName) {
  const filePath = path.join(config.uploads.dir, storedName);
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // File may not exist — ignore
  }
}

export default { upload, saveFileRecord, deleteFileFromDisk, validateFileMagicBytes };
