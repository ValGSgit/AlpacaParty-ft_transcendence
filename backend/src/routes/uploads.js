/**
 * Upload Routes — /api/uploads
 */
import express from 'express';
import { uploadFiles, listMyFiles, deleteFile } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../services/uploadService.js';

const router = express.Router();
router.use(authenticate);

router.post('/', upload.array('files', 10), uploadFiles);
router.get('/', listMyFiles);
router.delete('/:id', deleteFile);

export default router;
