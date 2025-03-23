import { Router } from 'express';

import { protect } from '../controllers/authController';
import { deleteMe, getMe, updateMe } from '../controllers/userController';

const router = Router();

router.use(protect);
router.patch('/updateMe', updateMe);
router.delete('/deleteMe', deleteMe);
router.get('/me', getMe);

export default router;
