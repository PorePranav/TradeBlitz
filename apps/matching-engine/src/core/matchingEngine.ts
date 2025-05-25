import { OrderTypes, ProcessableOrder, Trade } from '@tradeblitz/common-types';
import { OrderBook } from './OrderBook';
import { OrderRejectedError } from '../errors/OrderRejectedError';

const orderBooks: Map<string, OrderBook> = new Map();

export function processOrder(order: ProcessableOrder): Trade[] {
  if (!orderBooks.has(order.securityId))
    orderBooks.set(order.securityId, new OrderBook(order.securityId));

  const orderBook = orderBooks.get(order.securityId)!;

  if (order.type === 'MARKET') {
    const hasLiquidity =
      order.side === 'BUY'
        ? !(orderBook.getBestSellOrders(1).length === 0)
        : !(orderBook.getBestBuyOrders(1).length === 0);

    if (!hasLiquidity) {
      order.status = 'REJECTED';
      order.rejectionReason = 'No liquidity available';
      throw new OrderRejectedError(
        order.id,
        `No ${order.side === 'BUY' ? 'sell' : 'buy'} orders available`
      );
    }
  }

  return orderBook.addOrder(order);
}

export function hasLiquidity(
  securityId: string,
  side: OrderTypes.Side
): boolean {
  const orderBook = orderBooks.get(securityId);

  if (!orderBook) return false;

  return side === OrderTypes.Side.BUY
    ? !(orderBook?.getBestSellOrders(1).length === 0)
    : !(orderBook?.getBestBuyOrders(1).length === 0);
}

export function cancelOrder(orderId: string, securityId: string): boolean {
  const orderBook = orderBooks.get(securityId);
  return orderBook ? orderBook.cancelOrder(orderId) : false;
}

export function resetOrderBooks(): void {
  orderBooks.clear();
}

export function getLastTradedPrice(securityId: string): number {
  const orderBook = orderBooks.get(securityId);
  return orderBook ? orderBook.getLastTradedPrice() : 0;
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
    : { buyOrders: [], sellOrders: [] };
}
