import { Router } from 'express';
import { HistoryController } from '../controllers/historyController';

const router = Router();

router.get('/', HistoryController.getHistory);
router.post('/', HistoryController.updateHistory);
router.delete('/:movieId', HistoryController.deleteHistory);

export default router;
