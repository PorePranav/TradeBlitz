import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '@tradeblitz/common-utils';
import {
  getBestBuyOrders,
  getBestSellOrders,
  getLastTradedPrice,
  hasLiquidity,
} from '../core/matchingEngine';
import { OrderTypes, ProcessableOrder } from '@tradeblitz/common-types';

export const checkLiquidity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId, side, quantity } = req.body;

    const checkedLiquidity = hasLiquidity(securityId, side);

    res.status(200).json({
      status: 'success',
      data: {
        hasLiquidity: checkedLiquidity,
      },
    });
  }
);

export const getBestPrice = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId, side, quantity } = req.body;
    const bestOrder =
      side === OrderTypes.Side.BUY
        ? getBestSellOrders(securityId, 1)
        : getBestBuyOrders(securityId, 1);

    const bestPrice = bestOrder.length > 0 ? bestOrder[0].price : 0;
    const baseAmount = bestPrice! * Math.min(quantity, bestOrder[0].quantity);
    const totalAmount = baseAmount * 1.1;

    res.status(200).json({
      status: 'success',
      data: { totalAmount },
    });
  }
);
