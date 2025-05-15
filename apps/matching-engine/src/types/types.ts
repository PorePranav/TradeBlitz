export type OrderType = 'MARKET' | 'LIMIT';
export type Side = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';

export interface Order {
  id: string;
  securityId: string;
  type: OrderType;
  side: Side;
  originalQuantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  timestamp: number;
  status: OrderStatus;
}

export interface Trade {
  buyOrderId: string;
  sellOrderId: string;
  securityId: string;
  quantity: number;
  price: number;
  timestamp: number;
}
