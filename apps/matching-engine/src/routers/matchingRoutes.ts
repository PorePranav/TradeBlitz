import { protect, restrictTo } from '@tradeblitz/common-utils';
import { Router } from 'express';
import {
  checkLiquidity,
  getBestPrice,
} from '../controllers/matchingControllers';
import { AuthTypes } from '@tradeblitz/common-types';

const router = Router();

router.use(protect, restrictTo(AuthTypes.Role.ADMIN));
router.post('/checkLiquidity', checkLiquidity);
router.post('/getBestPrice', getBestPrice);

export default router;
