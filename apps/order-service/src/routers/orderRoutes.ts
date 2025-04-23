import { protect } from '@tradeblitz/common-utils';
import { Router } from 'express';

const router = Router();

router.use(protect);
router.get('/:orderId');
router.get('/');
router.post('/');

export default router;
