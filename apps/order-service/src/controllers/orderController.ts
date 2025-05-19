import { Request, Response, NextFunction } from 'express';

import { RabbitMQClient } from '@tradeblitz/rabbitmq';
import { catchAsync } from '@tradeblitz/common-utils';

import prisma from '../utils/prisma';
import { OrderStatus, OrderType } from '../types/prismaTypes';
import { checkConditions, verifySecurityExists } from '../utils/orderUtils';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const producer = rabbitClient.getProducer();

export const createOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId, type, side, quantity, price } = req.body;

    // await verifySecurityExists(securityId);
    await checkConditions(
      securityId,
      req.user!.id,
      type,
      side,
      quantity,
      price
    );

    // const newOrder = await prisma.order.create({
    //   data: {
    //     userId: req.user!.id,
    //     securityId,
    //     type,
    //     side,
    //     quantity,
    //     remainingQuantity: quantity,
    //     price: type === OrderType.LIMIT ? price : undefined,
    //     status: OrderStatus.OPEN,
    //   },
    // });

    // producer.sendToQueue('order-service.order-created.matching-engine.queue', {
    //   id: newOrder.id,
    //   securityId: newOrder.securityId,
    //   type: newOrder.type,
    //   side: newOrder.side,
    //   originalQuantity: newOrder.quantity,
    //   filledQuantity: 0,
    //   remainingQuantity: newOrder.quantity,
    //   price: newOrder.price,
    //   status: newOrder.status,
    //   createdAt: newOrder.createdAt,
    // });

    // res.status(201).json({
    //   status: 'success',
    //   data: {
    //     order: newOrder,
    //   },
    // });

    res.status(201).json({
      status: 'success',
    });
  }
);
