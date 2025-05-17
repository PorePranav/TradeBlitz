import { Heap } from 'heap-js';
import {
  BestOrder,
  MarketDepth,
  ProcessableOrder,
  Trade,
} from '@tradeblitz/common-types';
import { OrderTypes } from '@tradeblitz/common-types';

export class OrderBook {
  private buyOrders!: Heap<ProcessableOrder>;
  private sellOrders!: Heap<ProcessableOrder>;
  private orderMap: Map<string, ProcessableOrder> = new Map();
  private lastTradedPrice: number = 0;

  constructor(public securityId: string) {
    this.buyOrders = new Heap<ProcessableOrder>((a, b) => {
      const priceDiff = b.price! - a.price!;
      return priceDiff !== 0
        ? priceDiff
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    this.sellOrders = new Heap<ProcessableOrder>((a, b) => {
      const priceDiff = a.price! - b.price!;
      return priceDiff !== 0
        ? priceDiff
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  getLastTradedPrice(): number {
    return this.lastTradedPrice;
  }

  getBestBuyOrders(n: number = 5) {
    const heap = this.buyOrders.clone();
    const result: BestOrder[] = [];

    for (let i = 0; i < n && !heap.isEmpty(); i++) {
      const {
        id,
        type,
        originalQuantity,
        filledQuantity,
        remainingQuantity: quantity,
        createdAt,
        status,
        securityId,
        side,
        ...bestOrderData
      } = heap.pop()!;

      result.push({ ...bestOrderData, quantity });
    }

    return result;
  }

  getBestSellOrders(n: number = 5) {
    const heap = this.sellOrders.clone();
    const result: BestOrder[] = [];

    for (let i = 0; i < n && !heap.isEmpty(); i++) {
      const {
        id,
        type,
        originalQuantity,
        filledQuantity,
        remainingQuantity: quantity,
        createdAt,
        status,
        ...bestOrderData
      } = heap.pop()!;

      result.push({ ...bestOrderData, quantity });
    }

    return result;
  }

  getMarketDepth(n: number = 5): MarketDepth {
    return {
      securityId: this.securityId,
      buyOrders: this.getBestBuyOrders(n),
      sellOrders: this.getBestSellOrders(n),
    };
  }

  addOrder(order: ProcessableOrder): Trade[] {
    this.orderMap.set(order.id, order);
    return order.side === 'BUY'
      ? this.matchBuyOrder(order)
      : this.matchSellOrder(order);
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orderMap.get(orderId);
    if (!order || order.status === 'FILLED' || order.status === 'CANCELLED')
      return false;

    order.status = 'CANCELLED';

    if (order.side === 'BUY') return this.buyOrders.remove(order);
    else return this.sellOrders.remove(order);
  }

  private matchBuyOrder(order: ProcessableOrder): Trade[] {
    const trades: Trade[] = [];

    while (!this.sellOrders.isEmpty() && order.remainingQuantity > 0) {
      const sellOrder = this.sellOrders.peek()!;
      const canMatch =
        order.type === 'MARKET' ||
        (sellOrder && sellOrder.price! <= order.price!);

      if (!canMatch) break;

      this.sellOrders.pop();

      const availableSellQty = sellOrder.remainingQuantity;
      const tradedQty = Math.min(order.remainingQuantity, availableSellQty);
      const tradePrice = sellOrder.price!;

      this.lastTradedPrice = tradePrice;

      trades.push({
        buyOrderId: order.id,
        sellOrderId: sellOrder.id,
        securityId: this.securityId,
        quantity: tradedQty,
        price: tradePrice,
        executedAt: new Date(),
      });

      order.filledQuantity += tradedQty;
      sellOrder.filledQuantity += tradedQty;

      order.remainingQuantity = order.originalQuantity - order.filledQuantity;
      sellOrder.remainingQuantity =
        sellOrder.originalQuantity - sellOrder.filledQuantity;

      order.status = this.determineStatus(order);
      sellOrder.status = this.determineStatus(sellOrder);

      if (sellOrder.status !== 'FILLED') this.sellOrders.push(sellOrder);
    }

    if (order.remainingQuantity > 0 && order.type === 'LIMIT') {
      order.status = this.determineStatus(order);
      this.buyOrders.push(order);
    }

    return trades;
  }

  private matchSellOrder(order: ProcessableOrder): Trade[] {
    const trades: Trade[] = [];

    while (!this.buyOrders.isEmpty() && order.remainingQuantity > 0) {
      const buyOrder = this.buyOrders.peek()!;
      const canMatch =
        order.type === 'MARKET' || buyOrder.price! >= order.price!;

      if (!canMatch) break;

      this.buyOrders.pop();

      const availableBuyQty = buyOrder.remainingQuantity;
      const tradedQty = Math.min(order.remainingQuantity, availableBuyQty);
      const tradePrice = buyOrder.price!;

      this.lastTradedPrice = tradePrice;

      trades.push({
        buyOrderId: buyOrder.id,
        sellOrderId: order.id,
        securityId: this.securityId,
        quantity: tradedQty,
        price: tradePrice,
        executedAt: new Date(),
      });

      order.filledQuantity += tradedQty;
      buyOrder.filledQuantity += tradedQty;

      order.remainingQuantity = order.originalQuantity - order.filledQuantity;
      buyOrder.remainingQuantity =
        buyOrder.originalQuantity - buyOrder.filledQuantity;

      order.status = this.determineStatus(order);
      buyOrder.status = this.determineStatus(buyOrder);

      if (buyOrder.status !== 'FILLED') this.buyOrders.push(buyOrder);
    }

    if (order.remainingQuantity > 0 && order.type === 'LIMIT') {
      order.status = this.determineStatus(order);
      this.sellOrders.push(order);
    }

    return trades;
  }

  private determineStatus(order: ProcessableOrder): OrderTypes.OrderStatus {
    if (order.filledQuantity === 0) return 'OPEN';
    if (order.remainingQuantity === 0) return 'FILLED';
    return 'PARTIALLY_FILLED';
  }
}
