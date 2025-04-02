import { Request, Response, NextFunction } from 'express';

import prisma from '../utils/prisma';

import { catchAsync, AppError } from 'common-utils';

import { updateMeSchema } from '../validators/userValidations';

const filterObj = (obj: any, ...allowedFields: string[]) => {
  const newObj: any = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

export const updateMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (req.body.password)
    next(new AppError(`Can't update password using this route. Please use /updatePassword`, 400));

  const filteredBody = filterObj(req.body, 'name', 'avatar');

  const zodResult = updateMeSchema.safeParse(filteredBody);

  if (!zodResult.success) {
    const errors = zodResult.error.errors.map((err) => err.message);
    return next(new AppError(errors.join('. '), 400));
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: filteredBody,
  });

  const { password, ...user } = updatedUser;

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

export const deleteMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { active: false },
  });

  res.clearCookie('jwt').status(204).json({
    status: 'success',
    data: null,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return next(new AppError('You are not logged in', 401));
  const me = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!me) return next(new AppError('User not found', 404));

  const { password, ...user } = me;

  res.status(200).json({
    status: 'success',
    data: user,
  });
});
