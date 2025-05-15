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
  rejectionReason?: string;
  createdAt: Date;
  status: Order.OrderStatus;
}

export interface Trade {
  buyOrderId: string;
  sellOrderId: string;
  securityId: string;
  quantity: number;
  price: number;
  executedAt: Date;
}

export interface BestOrder {
  price?: number;
  quantity: number;
}

export interface MarketDepth {
  securityId: string;
  buyOrders: BestOrder[];
  sellOrders: BestOrder[];
}