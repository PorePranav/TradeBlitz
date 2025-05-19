import { protect, restrictTo, validateRequest } from '@tradeblitz/common-utils';
import { Router } from 'express';
import { performTransactionSchema } from '../validators/walletValidations';
import {
  checkAndHold,
  depositMoney,
  getBalance,
  withdrawMoney,
} from '../controllers/walletControllers';
import { AuthTypes } from '@tradeblitz/common-types';

const router = Router();

router.use(protect);
router.get('/balance', getBalance);
router.post(
  '/deposit',
  validateRequest(performTransactionSchema),
  depositMoney
);
router.post(
  '/withdraw',
  validateRequest(performTransactionSchema),
  withdrawMoney
);

router.use(restrictTo(AuthTypes.Role.ADMIN));
router.post('/holdFunds', checkAndHold);

export default router;
