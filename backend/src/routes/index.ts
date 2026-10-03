import { Router } from 'express';
import movieRoutes from './movieRoutes';
import uploadRoutes from './uploadRoutes';
import historyRoutes from './historyRoutes';
import systemRoutes from './systemRoutes';

const router = Router();

router.use('/movies', movieRoutes);
router.use('/upload', uploadRoutes);
router.use('/history', historyRoutes);
router.use('/system', systemRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
