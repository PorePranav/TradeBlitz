import { Router } from 'express';
import { validateRequest, protect } from '@tradeblitz/common-utils';

import {
  signupController,
  loginController,
  logout,
  isLoggedIn,
  createAdminUser,
  updatePassword,
} from '../controllers/authController';
import {
  changePasswordSchema,
  loginSchema,
  signupSchema,
} from '../validators/authValidations';

const router = Router();

router.get('/isLoggedIn', protect, isLoggedIn);
router.post('/signup', validateRequest(signupSchema), signupController);
router.post('/login', validateRequest(loginSchema), loginController);
router.get('/logout', logout);
router.post('/signupAdmin', validateRequest(signupSchema), createAdminUser);

router.use(protect);
router.patch(
  '/changePassword',
  validateRequest(changePasswordSchema),
  updatePassword
);

export default router;
