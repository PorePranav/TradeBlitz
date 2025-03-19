import { Router } from 'express';
import { signupController } from '../controllers/authController';

const router = Router();

router.post('/signup', signupController);

export default router;
