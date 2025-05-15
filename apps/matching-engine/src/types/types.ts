export type OrderType = 'MARKET' | 'LIMIT';
export type Side = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';

export interface Trade {
  buyOrderId: string;
  sellOrderId: string;
  securityId: string;
  quantity: number;
  price: number;
  executedAt: number;
}
