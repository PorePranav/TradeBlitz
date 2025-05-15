import { Trade } from '../types/types';
import { ProcessableOrder } from '@tradeblitz/common-types';
import { OrderBook } from './OrderBook';

const orderBooks: Map<string, OrderBook> = new Map();

export function processOrder(order: ProcessableOrder): Trade[] {
  if (!orderBooks.has(order.securityId))
    orderBooks.set(order.securityId, new OrderBook(order.securityId));

  const orderBook = orderBooks.get(order.securityId)!;
  return orderBook.addOrder(order);
}

export function cancelOrder(orderId: string, securityId: string): boolean {
  const orderBook = orderBooks.get(securityId);
  return orderBook ? orderBook.cancelOrder(orderId) : false;
}

export function resetOrderBooks(): void {
  orderBooks.clear();
}

export function getLastTradedPrice(securityId: string): number | null {
  const orderBook = orderBooks.get(securityId);
  return orderBook ? orderBook.getLastTradedPrice() : null;
}

export function getBestBuyOrders(securityId: string, n: number = 5) {
  const orderBook = orderBooks.get(securityId);
  return orderBook ? orderBook.getBestBuyOrders(n) : [];
}

export function getBestSellOrders(securityId: string, n: number = 5) {
  const orderBook = orderBooks.get(securityId);
  return orderBook ? orderBook.getBestSellOrders(n) : [];
}

export function getMarketDepth(securityId: string, n: number = 5) {
  const orderBook = orderBooks.get(securityId);
  return orderBook
    ? orderBook.getMarketDepth(n)
    : { bestBuyOrders: [], bestSellOrders: [] };
}
