import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/uploadController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB chunk limit
  },
});

router.post('/init', UploadController.initUpload);
router.post('/chunk', upload.single('chunk'), UploadController.uploadChunk);
router.get('/:uploadId/status', UploadController.getUploadStatus);
router.delete('/:uploadId', UploadController.cancelUpload);

export default router;
