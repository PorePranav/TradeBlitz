import { Router } from 'express';
import { checkAndHold } from '../controllers/portfolioControllers';
import { protect } from '@tradeblitz/common-utils';

const router = Router();

router.use(protect);
router.post('/holdSecurities', checkAndHold);

export default router;
