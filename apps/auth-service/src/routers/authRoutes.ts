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
  createAdminUser,
  logout,
} from '../controllers/authController';

const router = Router();

router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/oauth', oAuth);
router.get('/logout', logout);
router.post('/signupAdmin', createAdminUser);

router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword', resetPassword);

router.patch('/verifyUser', verifyUser);

router.use(protect);
router.patch('/changePassword', updatePassword);

export default router;
