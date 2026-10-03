import { Router } from 'express';
import { SystemController } from '../controllers/systemController';

const router = Router();

router.get('/stats', SystemController.getSystemStats);
router.get('/network', SystemController.getNetworkInfo);

export default router;
