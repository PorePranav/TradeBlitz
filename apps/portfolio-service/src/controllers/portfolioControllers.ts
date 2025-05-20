import { Request, Response, NextFunction } from 'express';
import { catchAsync, AppError } from '@tradeblitz/common-utils';
import prisma from '../utils/prisma';

export const checkAndHold = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { quantity, securityId, userId } = req.body;

    const fetchedPortfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: { holdings: { where: { securityId } } },
    });

    const holding = fetchedPortfolio?.holdings[0];

    if (!holding || holding.quantity - holding.onHold < quantity) {
      return next(new AppError('Insufficient quantity', 400));
    }

    await prisma.holding.update({
      where: { id: holding.id },
      data: { onHold: { increment: quantity } },
    });

    res.status(200).json({
      status: 'success',
      data: {
        onHold: true,
        quantityOnHold: quantity,
        securityId,
      },
    });
  }
);
