import { Router } from 'express';
import {
  createKycProfile,
  createKycDocuments,
  getKycProfile,
  getKycStatus,
  updateKycProfile,
  updateKycDocuments,
  getInReviewKycs,
  updateKycDocumentStatus,
  updateKycStatus,
} from '../controllers/kycController';
import { protect, restrictTo } from '@tradeblitz/common-utils';

const router = Router();

router.use(protect);
router.post('/', createKycProfile);
router.get('/', getKycProfile);
router.get('/status', getKycStatus);
router.post('/documents', createKycDocuments);

router.patch('/', updateKycProfile);
router.patch('/documents', updateKycDocuments);

router.use(restrictTo('ADMIN'));
router.get('/inReview', getInReviewKycs);
router.patch('/updateDocuments/:userId/:type/:status', updateKycDocumentStatus);
router.patch('/update/:userId/:status', updateKycStatus);

export default router;
