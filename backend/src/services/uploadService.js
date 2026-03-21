/**
 * Upload Service — multer configuration for local disk uploads
 * @owner ValGSgit
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import config from '../config/index.js';
import File from '../models/File.js';

// Ensure upload directory exists
fs.mkdirSync(config.uploads.dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error(`File type ${file.mimetype} not allowed`), { status: 400 }), false);
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

export default { upload, saveFileRecord, deleteFileFromDisk };
