/**
 * Upload Controller
 * @owner ValGSgit
 */
import File from '../models/File.js';
import { saveFileRecord, deleteFileFromDisk } from '../services/uploadService.js';

/** POST /api/uploads — upload one or more files */
export const uploadFiles = async (req, res, next) => {
  try {
    if (!req.files?.length && !req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }
    const multerFiles = req.files || [req.file];
    const records = await Promise.all(multerFiles.map((f) => saveFileRecord(req.user.id, f)));
    res.status(201).json({ files: records });
  } catch (err) { next(err); }
};

/** GET /api/uploads — list my uploads */
export const listMyFiles = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const files = await File.getByUploader(req.user.id, { limit: Number(limit), offset: Number(offset) });
    res.json({ files });
  } catch (err) { next(err); }
};

/** DELETE /api/uploads/:id */
export const deleteFile = async (req, res, next) => {
  try {
    const record = await File.delete(Number(req.params.id), req.user.id);
    if (!record) return res.status(404).json({ error: { message: 'File not found or not yours' } });
    await deleteFileFromDisk(record.storedName);
    res.json({ message: 'File deleted' });
  } catch (err) { next(err); }
};
