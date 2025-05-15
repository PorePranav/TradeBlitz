import Order from '../../../../apps/order-service/src/types/prisma-client';

export interface ProcessableOrder {
  id: string;
  securityId: string;
  type: Order.OrderType;
  side: Order.Side;
  originalQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  createdAt: Date;
  status: Order.OrderStatus;
}
