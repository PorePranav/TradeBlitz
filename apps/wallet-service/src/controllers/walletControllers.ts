import { Request, Response, NextFunction } from 'express';
import { AppError, catchAsync } from '@tradeblitz/common-utils';

import prisma from '../utils/prisma';

export const getBalance = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id },
    });

    if (!wallet) return next(new AppError('Wallet not found', 404));

    res.status(200).json({
      status: 'success',
      data: {
        balance: wallet.balance,
        onHold: wallet.onHold,
      },
    });
  }
);

export const depositMoney = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount } = req.body;

    const fetchedWallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id },
    });

    if (!fetchedWallet) return next(new AppError('Wallet not found', 404));

    const updatedWallet = await prisma.wallet.update({
      where: { userId: req.user!.id },
      data: { balance: { increment: amount } },
    });

    res.status(200).json({
      status: 'success',
      data: updatedWallet,
    });
  }
);

export const withdrawMoney = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount } = req.body;

    const fetchedWallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id },
    });

    if (!fetchedWallet) return next(new AppError('Wallet not found', 404));

    if (fetchedWallet.balance < amount)
      return next(new AppError('Insufficient funds', 400));

    const updatedWallet = await prisma.wallet.update({
      where: { userId: req.user!.id },
      data: { balance: { decrement: amount } },
    });

    res.status(200).json({
      status: 'success',
      data: updatedWallet,
    });
  }
);

export const checkAndHold = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { amount, userId } = req.body;

    const fetchedWallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!fetchedWallet) return next(new AppError('Wallet not found', 404));
    if (fetchedWallet.balance < amount)
      return next(new AppError('Insufficient funds', 400));

    await prisma.wallet.update({
      where: { userId },
      data: { onHold: { increment: amount }, balance: { decrement: amount } },
    });

    res.status(200).json({
      status: 'success',
      data: {
        onHold: true,
        amountOnHold: amount,
      },
    });
  }
);
