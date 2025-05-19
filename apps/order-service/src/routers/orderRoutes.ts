import { Router } from 'express';

import { protect, validateRequest } from '@tradeblitz/common-utils';
import { orderHandler } from '../controllers/orderController';
import { createOrderSchema } from '../validators/orderValidations';

const router = Router();

router.use(protect);
router.post('/', validateRequest(createOrderSchema), orderHandler);

export default router;
