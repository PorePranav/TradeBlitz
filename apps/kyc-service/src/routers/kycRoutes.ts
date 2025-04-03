import { Router } from 'express';
import { createKycProfile, getKycProfile } from '../controllers/kycController';
import { protect } from '@tradeblitz/common-utils';

const router = Router();

router.use(protect);
router.post('/', createKycProfile);
router.get('/', getKycProfile);

export default router;
