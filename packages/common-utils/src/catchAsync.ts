import { Request, Response, NextFunction } from 'express';

type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

function catchAsync<T>(fn: AsyncFunction<T>): (...args: any[]) => Promise<T>;
function catchAsync(
  fn: ExpressMiddleware
): (req: Request, res: Response, next: NextFunction) => void;
function catchAsync(fn: (...args: any[]) => Promise<any>) {
  return function (...args: any[]) {
    const next = args[2];
    if (next && typeof next === 'function') {
      return Promise.resolve(
        fn(...(args as [Request, Response, NextFunction]))
      ).catch(next);
    } else {
      return Promise.resolve(fn(...args)).catch((err) => {
        console.error('Async operation failed:', err);
        throw err;
      });
    }
  };
}

export default catchAsync;