import { Request, Response, NextFunction } from 'express';
import { catchAsync, AppError } from '@tradeblitz/common-utils';

import prisma from '../utils/prisma';

export const getAllSecurities = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const fetchedSecurities = await prisma.security.findMany({});

    res.status(200).json({
      status: 'success',
      data: fetchedSecurities,
    });
  }
);

export const getListedSecurities = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const fetchedSecurities = await prisma.security.findMany({
      where: {
        active: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: fetchedSecurities,
    });
  }
);

export const getSecurity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId } = req.params;

    const fetchedSecurity = await prisma.security.findUnique({
      where: { id: securityId },
    });

    if (!fetchedSecurity) return next(new AppError('Security not found', 404));

    res.status(200).json({
      status: 'success',
      data: fetchedSecurity,
    });
  }
);

export const listSecurity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, description, symbol } = req.body;

    const existingSecurity = await prisma.security.findUnique({
      where: { symbol },
    });

    if (existingSecurity)
      return next(new AppError('Security already exists', 400));

    const newSecurity = await prisma.security.create({
      data: {
        name,
        description,
        symbol,
        active: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: newSecurity,
    });
  }
);

export const updateSecurity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId } = req.params;
    const { name, description, symbol } = req.body;

    const existingSecurity = await prisma.security.findUnique({
      where: { id: securityId },
    });

    if (!existingSecurity) return next(new AppError('Security not found', 404));

    const updatedSecurity = await prisma.security.update({
      where: { id: securityId },
      data: {
        name,
        description,
        symbol,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedSecurity,
    });
  }
);

export const delistSecurity = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { securityId } = req.params;

    const existingSecurity = await prisma.security.findUnique({
      where: { id: securityId },
    });

    if (!existingSecurity) return next(new AppError('Security not found', 404));

    const updatedSecurity = await prisma.security.update({
      where: { id: securityId },
      data: {
        active: false,
      },
    });

    res.status(200).json({
      status: 'success',
      data: updatedSecurity,
    });
  }
);
