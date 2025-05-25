import { Request, Response, NextFunction, RequestHandler } from 'express';
import axios from 'axios';

import { RabbitMQClient } from '@tradeblitz/rabbitmq';
import { AppError, catchAsync } from '@tradeblitz/common-utils';

import prisma from '../utils/prisma';
import { OrderStatus, OrderType } from '../types/prismaTypes';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const producer = rabbitClient.getProducer();

export const validateSecurityId = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId } = req.body;

    const isValidSecurity = await axios.get(
      `${process.env.REGISTRY_SERVICE_URL}/${securityId}`,
      {
        headers: { Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
        timeout: 3000,
      }
    );

    if (isValidSecurity.data.status !== 'success') {
      return next(new AppError('Invalid security ID', 404));
    }

    next();
  }
);

export const checkLiquidity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId, side } = req.body;

    const liquidity = await axios.post(
      `${process.env.MATCHING_ENGINE_URL}/checkLiquidity`,
      { securityId, side },
      {
        headers: {
          Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
        },
        timeout: 3000,
      }
    );

    const { hasLiquidity } = liquidity.data.data;

    if (!hasLiquidity)
      return next(
        new AppError('No liquidity available currently, try LIMIT order', 400)
      );

    next();
  }
);

export const orderHandler = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { type, side } = req.body;

    const orderKey =
      `${type}_${side}`.toUpperCase() as keyof typeof orderRegistry;
    const orderFlow = orderRegistry[orderKey];

    if (!orderFlow)
      return next(new AppError('Invalid order type or side', 400));

    const allHandlers = [...orderFlow.middlewares, orderFlow.handler];
    let idx = 0;

    const runNext = (err?: any) => {
      if (err) return next(err);
      const current = allHandlers[idx++];
      if (!current) return next();
      try {
        current(req, res, runNext);
      } catch (error) {
        runNext(error);
      }
    };

    runNext();
  }
);

export const estimateAndHoldFunds = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId, side, quantity, type, price } = req.body;

    let totalAmount: number = side === OrderType.LIMIT ? quantity * price : 0;

    try {
      if (type === OrderType.MARKET) {
        const bestEstimate = await axios.post(
          `${process.env.MATCHING_ENGINE_URL}/getBestPrice`,
          { securityId, side, quantity },
          {
            headers: {
              Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
            },
            timeout: 3000,
          }
        );

        totalAmount = bestEstimate.data.data.totalAmount;
      } else {
        totalAmount = quantity * price;
      }
    } catch (err) {
      if (axios.isAxiosError(err))
        return next(new AppError(err.response?.data.message, 400));
    }

    try {
      const holdFunds = await axios.post(
        `${process.env.WALLET_SERVICE_URL}/holdFunds`,
        { userId: req.user!.id, amount: totalAmount },
        {
          headers: {
            Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 3000,
        }
      );

      if (holdFunds.data.status !== 'success') {
        return next(
          new AppError(
            'Insufficient funds, please add funds to your wallet',
            400
          )
        );
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return next(new AppError(err.response?.data.message, 400));
      }
    }

    next();
  }
);

export const holdSecurities = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { quantity, securityId } = req.body;

    try {
      const holdSecurities = await axios.post(
        `${process.env.PORTFOLIO_SERVICE_URL}/holdSecurities`,
        {
          userId: req.user!.id,
          securityId,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
          },
          timeout: 3000,
        }
      );

      if (holdSecurities.data.status !== 'success')
        return next(new AppError('You do not have enough quantity', 400));
    } catch (err) {
      if (axios.isAxiosError(err))
        return next(new AppError(err.response?.data.message, 400));
    }

    next();
  }
);

export const createOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId, type, side, quantity, price } = req.body;

    const newOrder = await prisma.order.create({
      data: {
        userId: req.user!.id,
        securityId,
        type,
        side,
        quantity,
        remainingQuantity: quantity,
        price: type === OrderType.LIMIT ? price : undefined,
        status: OrderStatus.OPEN,
      },
    });

    producer.sendToQueue('order-service.order-created.matching-engine.queue', {
      id: newOrder.id,
      securityId: newOrder.securityId,
      type: newOrder.type,
      side: newOrder.side,
      originalQuantity: newOrder.quantity,
      filledQuantity: 0,
      remainingQuantity: newOrder.quantity,
      price: newOrder.price,
      status: newOrder.status,
      createdAt: newOrder.createdAt,
    });

    res.status(201).json({
      status: 'success',
      data: {
        order: newOrder,
      },
    });
  }
);

type OrderKey = `${'MARKET' | 'LIMIT'}_${'BUY' | 'SELL'}`;

type OrderFlow = {
  middlewares: RequestHandler[];
  handler: RequestHandler;
};

export const orderRegistry: Record<OrderKey, OrderFlow> = {
  MARKET_BUY: {
    middlewares: [validateSecurityId, checkLiquidity, estimateAndHoldFunds],
    handler: createOrder,
  },
  MARKET_SELL: {
    middlewares: [validateSecurityId, checkLiquidity, holdSecurities],
    handler: createOrder,
  },
  LIMIT_BUY: {
    middlewares: [validateSecurityId, estimateAndHoldFunds],
    handler: createOrder,
  },
  LIMIT_SELL: {
    middlewares: [validateSecurityId, holdSecurities],
    handler: createOrder,
  },
};
