import { OrderBook } from '../src/core/OrderBook';
import { ProcessableOrder } from '@tradeblitz/common-types';
import {
  processOrder,
  cancelOrder,
  resetOrderBooks,
  getLastTradedPrice,
  getBestBuyOrders,
  getBestSellOrders,
  getMarketDepth,
} from '../src/core/matchingEngine';

// Mock the Date.now() function to return consistent timestamps for testing
const mockNow = 1620000000000;
global.Date.now = jest.fn(() => mockNow);

describe('OrderBook Class', () => {
  let orderBook: OrderBook;

  beforeEach(() => {
    orderBook = new OrderBook('AAPL');
  });

  test('should initialize with empty order books', () => {
    expect(orderBook.getBestBuyOrders()).toHaveLength(0);
    expect(orderBook.getBestSellOrders()).toHaveLength(0);
    expect(orderBook.getLastTradedPrice()).toBeNull();
  });

  test('should add a buy limit order to the book', () => {
    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = orderBook.addOrder(buyOrder);

    expect(trades).toHaveLength(0);
    expect(orderBook.getBestBuyOrders()).toHaveLength(1);
    expect(orderBook.getBestBuyOrders()[0].id).toBe('buy1');
  });

  test('should add a sell limit order to the book', () => {
    const sellOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 160,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = orderBook.addOrder(sellOrder);

    expect(trades).toHaveLength(0);
    expect(orderBook.getBestSellOrders()).toHaveLength(1);
    expect(orderBook.getBestSellOrders()[0].id).toBe('sell1');
  });

  test('should match orders when prices cross', () => {
    const sellOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };
    orderBook.addOrder(sellOrder);

    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 155,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = orderBook.addOrder(buyOrder);

    expect(trades).toHaveLength(1);
    expect(trades[0].buyOrderId).toBe('buy1');
    expect(trades[0].sellOrderId).toBe('sell1');
    expect(trades[0].quantity).toBe(100);
    expect(trades[0].price).toBe(150);
    expect(orderBook.getBestBuyOrders()).toHaveLength(0);
    expect(orderBook.getBestSellOrders()).toHaveLength(0);
    expect(orderBook.getLastTradedPrice()).toBe(150);
  });

  test('should partially fill orders and update status', () => {
    const sellOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };
    orderBook.addOrder(sellOrder);

    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 60,
      filledQuantity: 0,
      remainingQuantity: 60,
      price: 155,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = orderBook.addOrder(buyOrder);

    expect(trades).toHaveLength(1);
    expect(trades[0].quantity).toBe(60);

    const remainingSellOrders = orderBook.getBestSellOrders();
    expect(remainingSellOrders).toHaveLength(1);
    expect(remainingSellOrders[0].id).toBe('sell1');
    expect(remainingSellOrders[0].filledQuantity).toBe(60);
    expect(remainingSellOrders[0].remainingQuantity).toBe(40);
    expect(remainingSellOrders[0].status).toBe('PARTIALLY_FILLED');
  });

  test('should prioritize orders by price and then time', () => {
    const buyOrder1: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(Date.now() - 200),
      status: 'OPEN',
    };

    const buyOrder2: ProcessableOrder = {
      id: 'buy2',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 155,
      createdAt: new Date(Date.now() - 100),
      status: 'OPEN',
    };

    const buyOrder3: ProcessableOrder = {
      id: 'buy3',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 155,
      createdAt: new Date(),
      status: 'OPEN',
    };

    orderBook.addOrder(buyOrder1);
    orderBook.addOrder(buyOrder2);
    orderBook.addOrder(buyOrder3);

    const bestBuys = orderBook.getBestBuyOrders(3);

    expect(bestBuys).toHaveLength(3);

    expect(bestBuys[0].price).toBe(155);
    expect(bestBuys[1].price).toBe(155);
    expect(bestBuys[2].price).toBe(150);

    expect(bestBuys[0].id).toBe('buy2');
    expect(bestBuys[1].id).toBe('buy3');
    expect(bestBuys[2].id).toBe('buy1');
  });

  test('should handle market orders', () => {
    const sellLimitOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(Date.now() - 100),
      status: 'OPEN',
    };
    orderBook.addOrder(sellLimitOrder);

    const buyMarketOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'MARKET',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = orderBook.addOrder(buyMarketOrder);

    expect(trades).toHaveLength(1);
    expect(trades[0].price).toBe(150);
    expect(orderBook.getBestSellOrders()).toHaveLength(0);
  });

  test('should cancel orders correctly', () => {
    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };

    orderBook.addOrder(buyOrder);
    expect(orderBook.getBestBuyOrders()).toHaveLength(1);

    const cancelled = orderBook.cancelOrder('buy1');
    expect(cancelled).toBe(true);
    expect(orderBook.getBestBuyOrders()).toHaveLength(0);
  });

  test('should not cancel non-existent orders', () => {
    const cancelled = orderBook.cancelOrder('nonexistent');
    expect(cancelled).toBe(false);
  });

  test('should not cancel filled orders', () => {
    const sellOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(Date.now() - 100),
      status: 'OPEN',
    };
    orderBook.addOrder(sellOrder);

    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 155,
      createdAt: new Date(),
      status: 'OPEN',
    };
    orderBook.addOrder(buyOrder);

    const cancelled = orderBook.cancelOrder('buy1');
    expect(cancelled).toBe(false);
  });
});

describe('OrderBookService', () => {
  beforeEach(() => {
    resetOrderBooks();
  });

  test('should process orders across multiple securities', () => {
    const buyApple: ProcessableOrder = {
      id: 'buy_aapl',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const buyMicrosoft: ProcessableOrder = {
      id: 'buy_msft',
      securityId: 'MSFT',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 250,
      createdAt: new Date(),
      status: 'OPEN',
    };

    processOrder(buyApple);
    processOrder(buyMicrosoft);

    const appleBuyOrders = getBestBuyOrders('AAPL');
    const msftBuyOrders = getBestBuyOrders('MSFT');

    expect(appleBuyOrders).toHaveLength(1);
    expect(msftBuyOrders).toHaveLength(1);
    expect(appleBuyOrders[0].price).toBe(150);
    expect(msftBuyOrders[0].price).toBe(250);
  });

  test('should cancel orders correctly through service', () => {
    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };

    processOrder(buyOrder);
    expect(getBestBuyOrders('AAPL')).toHaveLength(1);

    const cancelled = cancelOrder('buy1', 'AAPL');
    expect(cancelled).toBe(true);
    expect(getBestBuyOrders('AAPL')).toHaveLength(0);
  });

  test('should return correct last traded price', () => {
    const sellOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(Date.now() - 100),
      status: 'OPEN',
    };
    processOrder(sellOrder);

    const buyOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 155,
      createdAt: new Date(),
      status: 'OPEN',
    };
    processOrder(buyOrder);

    expect(getLastTradedPrice('AAPL')).toBe(150);
    expect(getLastTradedPrice('MSFT')).toBeNull();
  });

  test('should return market depth correctly', () => {
    const buy1: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const buy2: ProcessableOrder = {
      id: 'buy2',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 148,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const sell1: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 152,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const sell2: ProcessableOrder = {
      id: 'sell2',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 154,
      createdAt: new Date(),
      status: 'OPEN',
    };

    processOrder(buy1);
    processOrder(buy2);
    processOrder(sell1);
    processOrder(sell2);

    const depth = getMarketDepth('AAPL', 2);

    expect(depth.bestBuyOrders).toHaveLength(2);
    expect(depth.bestSellOrders).toHaveLength(2);

    expect(depth.bestBuyOrders[0].price).toBe(150);
    expect(depth.bestBuyOrders[1].price).toBe(148);

    expect(depth.bestSellOrders[0].price).toBe(152);
    expect(depth.bestSellOrders[1].price).toBe(154);
  });

  test('should handle non-existent security', () => {
    expect(getLastTradedPrice('NONEXISTENT')).toBeNull();
    expect(getBestBuyOrders('NONEXISTENT')).toEqual([]);
    expect(getBestSellOrders('NONEXISTENT')).toEqual([]);
    expect(getMarketDepth('NONEXISTENT')).toEqual({
      bestBuyOrders: [],
      bestSellOrders: [],
    });
  });
});
