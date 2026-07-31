/**
 * File upload route — multipart upload via multer.
 *
 * If Firebase Storage is configured, the file is uploaded there and a
 * public URL is returned. Otherwise a data URL (base64) is returned so
 * the app works in demo mode without external storage.
 */
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/error';
import { uploadToStorage, firebaseReady } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Only images (jpg/png/webp/gif) and PDF are allowed'));
  },
});

/** POST /api/uploads — single file upload. Returns { url }. */
uploadRouter.post('/', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (field name must be "file")');
  const ext = req.file.originalname.split('.').pop() || 'jpg';
  const path = `zender237/${req.userId}/${uuidv4()}.${ext}`;
  const url = await uploadToStorage(req.file.buffer, path, req.file.mimetype);
  res.json({
    url,
    file_name: req.file.originalname,
    size: req.file.size,
    storage: firebaseReady() ? 'firebase' : 'memory',
  });
}));
