import { ZodTypeAny } from 'zod';
import catchAsync from './catchAsync';
import { NextFunction } from 'express';
import AppError from './AppError';

export const validateRequest = (schema: ZodTypeAny) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const zodResult = schema.safeParse(req.body);

    if (!zodResult.success) {
      const errors = zodResult.error.errors.map((error) => error.message);
      return next(new AppError(errors.join(', '), 400));
    }

    (req as { body: any }) = zodResult.data;
    next();
  });
};
