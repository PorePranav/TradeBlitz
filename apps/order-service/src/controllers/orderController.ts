import { Request, Response, NextFunction } from 'express';
import { AppError, catchAsync } from '@tradeblitz/common-utils';
import '@tradeblitz/shared-types';

import { createOrderSchema } from '../validators/orderValidations';
import { OrderType, Side } from '../types/prisma-client';
import prisma from '../utils/prisma';

const validateOrderData = (
  stockId: string,
  orderType: OrderType,
  side: Side,
  quantity: number,
  price: number
) => {
  if (side === 'BUY') {
    //TODO: Check if the stockId is valid
    //TODO: Check if the user has enough balance
  } else {
    //TODO: Implement sell order validation
  }
};

export const createOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const zodResult = createOrderSchema.safeParse(req.body);

  if (!zodResult.success) {
    const errors = zodResult.error.errors.map((error) => error.message);
    return next(new AppError(errors.join(', '), 400));
  }

  const { stockId, orderType, side, quantity, price } = zodResult.data;

  validateOrderData(stockId, orderType, side, quantity, price);

  const newOrder = await prisma.order.create({
    data: {
      userId: Number(req.user!.id),
      stockId: Number(stockId),
      orderType,
      side,
      quantity,
      price,
      status: 'PENDING',
    },
  });

  //TODO: Send order to trading-engine via RabbitMQ for processing

  res.status(201).json({
    status: 'success',
    data: newOrder,
  });
});
