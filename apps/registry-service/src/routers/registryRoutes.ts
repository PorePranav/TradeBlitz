import { protect, restrictTo, validateRequest } from '@tradeblitz/common-utils';
import { AuthTypes } from '@tradeblitz/common-types';
import { Router } from 'express';
import {
  delistSecurity,
  getAllSecurities,
  getSecurity,
  listSecurity,
  updateSecurity,
} from '../controllers/registryController';
import {
  listSecuritySchema,
  updateSecuritySchema,
} from '../validators/securityValidations';

const router = Router();

router.use(protect);
router.get('/', getAllSecurities);
router.get('/all', getAllSecurities);
router.get('/:securityId', getSecurity);

router.use(restrictTo(AuthTypes.Role.ADMIN));
router.post('/', validateRequest(listSecuritySchema), listSecurity);
router.patch(
  '/:securityId',
  validateRequest(updateSecuritySchema),
  updateSecurity
);
router.delete('/:securityId', delistSecurity);

export default router;
