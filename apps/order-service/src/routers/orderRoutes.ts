import { Router } from 'express';

import { createOrder } from '../controllers/orderController';
import { createOrderSchema } from '../validators/orderValidations';
import { protect, validateRequest } from '@tradeblitz/common-utils';

const router = Router();

router.use(protect);
router.post('/', validateRequest(createOrderSchema), createOrder);

export default router;
