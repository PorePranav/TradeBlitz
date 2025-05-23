import { CustomJwtPayload } from '../prisma/customTypes';

declare global {
  namespace Express {
    interface Request {
      user?: CustomJwtPayload;
    }
  }
}
