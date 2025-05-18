import { protect, validateRequest } from '@tradeblitz/common-utils';
import { Router } from 'express';
import { performTransactionSchema } from '../validators/walletValidations';
import {
  depositMoney,
  getBalance,
  withdrawMoney,
} from '../controllers/walletControllers';

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

export default router;
