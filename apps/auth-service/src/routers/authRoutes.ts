import { Router } from 'express';
import {
  signupController,
  loginController,
  forgotPassword,
  oAuth,
  resetPassword,
  protect,
  updatePassword,
  verifyUser,
} from '../controllers/authController';

const router = Router();

router.post('/oauth', oAuth);
router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword', resetPassword);
router.patch('/verifyUser', verifyUser);

router.use(protect);
router.patch('/changePassword', updatePassword);

export default router;
