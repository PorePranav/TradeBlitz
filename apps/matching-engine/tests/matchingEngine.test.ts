import { OrderBook } from '../src/core/OrderBook';
import { ProcessableOrder } from '@tradeblitz/common-types';
import { OrderRejectedError } from '../src/errors/OrderRejectedError';
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
    expect(orderBook.getLastTradedPrice()).toBe(0);
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
    const bestBuyOrders = orderBook.getBestBuyOrders();
    expect(bestBuyOrders).toHaveLength(1);
    expect(bestBuyOrders[0].price).toBe(150);
    expect(bestBuyOrders[0].quantity).toBe(100);
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
    const bestSellOrders = orderBook.getBestSellOrders();
    expect(bestSellOrders).toHaveLength(1);
    expect(bestSellOrders[0].price).toBe(160);
    expect(bestSellOrders[0].quantity).toBe(100);
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
    expect(remainingSellOrders[0].price).toBe(150);
    expect(remainingSellOrders[0].quantity).toBe(40);
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

describe('Matching Engine', () => {
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

    expect(depth.buyOrders).toHaveLength(2);
    expect(depth.sellOrders).toHaveLength(2);

    expect(depth.buyOrders[0].price).toBe(150);
    expect(depth.buyOrders[1].price).toBe(148);

    expect(depth.sellOrders[0].price).toBe(152);
    expect(depth.sellOrders[1].price).toBe(154);
  });

  test('should handle non-existent security', () => {
    expect(getLastTradedPrice('NONEXISTENT')).toBeNull();
    expect(getBestBuyOrders('NONEXISTENT')).toEqual([]);
    expect(getBestSellOrders('NONEXISTENT')).toEqual([]);
    expect(getMarketDepth('NONEXISTENT')).toEqual({
      buyOrders: [],
      sellOrders: [],
    });
  });

  test('should reject buy market order when no sell orders available', () => {
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

    expect(() => processOrder(buyMarketOrder)).toThrow(OrderRejectedError);
    expect(() => processOrder(buyMarketOrder)).toThrow(
      'No sell orders available'
    );

    // Verify the order was marked as rejected
    try {
      processOrder(buyMarketOrder);
    } catch (e) {
      expect(buyMarketOrder.status).toBe('REJECTED');
      expect(buyMarketOrder.rejectionReason).toBe('No liquidity available');
    }
  });

  test('should reject sell market order when no buy orders available', () => {
    const sellMarketOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'MARKET',
      side: 'SELL',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      createdAt: new Date(),
      status: 'OPEN',
    };

    expect(() => processOrder(sellMarketOrder)).toThrow(OrderRejectedError);
    expect(() => processOrder(sellMarketOrder)).toThrow(
      'No buy orders available'
    );

    // Verify the order was marked as rejected
    try {
      processOrder(sellMarketOrder);
    } catch (e) {
      expect(sellMarketOrder.status).toBe('REJECTED');
      expect(sellMarketOrder.rejectionReason).toBe('No liquidity available');
    }
  });

  test('should successfully process market buy order when sell orders are available', () => {
    // First add a sell limit order
    const sellLimitOrder: ProcessableOrder = {
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
    processOrder(sellLimitOrder);

    // Then submit a market buy order
    const buyMarketOrder: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'MARKET',
      side: 'BUY',
      originalQuantity: 50,
      filledQuantity: 0,
      remainingQuantity: 50,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = processOrder(buyMarketOrder);

    expect(trades).toHaveLength(1);
    expect(trades[0].price).toBe(150);
    expect(trades[0].quantity).toBe(50);
    expect(buyMarketOrder.status).toBe('FILLED');

    // The sell order should be partially filled
    const sellOrders = getBestSellOrders('AAPL');
    expect(sellOrders).toHaveLength(1);
    expect(sellOrders[0].quantity).toBe(50);
  });

  test('should successfully process market sell order when buy orders are available', () => {
    // First add a buy limit order
    const buyLimitOrder: ProcessableOrder = {
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
    processOrder(buyLimitOrder);

    // Then submit a market sell order
    const sellMarketOrder: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'MARKET',
      side: 'SELL',
      originalQuantity: 50,
      filledQuantity: 0,
      remainingQuantity: 50,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = processOrder(sellMarketOrder);

    expect(trades).toHaveLength(1);
    expect(trades[0].price).toBe(150);
    expect(trades[0].quantity).toBe(50);
    expect(sellMarketOrder.status).toBe('FILLED');

    // The buy order should be partially filled
    const buyOrders = getBestBuyOrders('AAPL');
    expect(buyOrders).toHaveLength(1);
    expect(buyOrders[0].quantity).toBe(50);
  });

  test('should correctly handle market depth response format', () => {
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

    processOrder(buy1);
    processOrder(sell1);

    const depth = getMarketDepth('AAPL');

    // Verify the structure matches the MarketDepth interface
    expect(depth).toHaveProperty('securityId', 'AAPL');
    expect(depth).toHaveProperty('buyOrders');
    expect(depth).toHaveProperty('sellOrders');
    expect(Array.isArray(depth.buyOrders)).toBe(true);
    expect(Array.isArray(depth.sellOrders)).toBe(true);

    // Each order in the arrays should have price and quantity properties
    expect(depth.buyOrders[0]).toHaveProperty('price', 150);
    expect(depth.buyOrders[0]).toHaveProperty('quantity', 100);
    expect(depth.sellOrders[0]).toHaveProperty('price', 152);
    expect(depth.sellOrders[0]).toHaveProperty('quantity', 100);
  });

  test('should gracefully handle rejection of multiple market orders', () => {
    // Submit two market orders in sequence, both should be rejected
    const buyMarketOrder1: ProcessableOrder = {
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

    const buyMarketOrder2: ProcessableOrder = {
      id: 'buy2',
      securityId: 'AAPL',
      type: 'MARKET',
      side: 'BUY',
      originalQuantity: 200,
      filledQuantity: 0,
      remainingQuantity: 200,
      createdAt: new Date(),
      status: 'OPEN',
    };

    expect(() => processOrder(buyMarketOrder1)).toThrow(OrderRejectedError);
    expect(() => processOrder(buyMarketOrder2)).toThrow(OrderRejectedError);

    // Both orders should have been rejected
    expect(buyMarketOrder1.status).toBe('REJECTED');
    expect(buyMarketOrder2.status).toBe('REJECTED');
  });

  test('should handle complex matching scenario with multiple orders', () => {
    // Add some initial limit orders
    const buyLimit1: ProcessableOrder = {
      id: 'buy1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 100,
      filledQuantity: 0,
      remainingQuantity: 100,
      price: 150,
      createdAt: new Date(Date.now() - 300),
      status: 'OPEN',
    };

    const buyLimit2: ProcessableOrder = {
      id: 'buy2',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'BUY',
      originalQuantity: 50,
      filledQuantity: 0,
      remainingQuantity: 50,
      price: 149,
      createdAt: new Date(Date.now() - 200),
      status: 'OPEN',
    };

    const sellLimit1: ProcessableOrder = {
      id: 'sell1',
      securityId: 'AAPL',
      type: 'LIMIT',
      side: 'SELL',
      originalQuantity: 75,
      filledQuantity: 0,
      remainingQuantity: 75,
      price: 152,
      createdAt: new Date(Date.now() - 100),
      status: 'OPEN',
    };

    // Process initial orders
    processOrder(buyLimit1);
    processOrder(buyLimit2);
    processOrder(sellLimit1);

    // Check initial state using only BestOrder properties (price and quantity)
    const initialBuys = getBestBuyOrders('AAPL');
    expect(initialBuys).toHaveLength(2);
    expect(initialBuys[0].price).toBe(150);
    expect(initialBuys[0].quantity).toBe(100);
    expect(initialBuys[1].price).toBe(149);
    expect(initialBuys[1].quantity).toBe(50);

    const initialSells = getBestSellOrders('AAPL');
    expect(initialSells).toHaveLength(1);
    expect(initialSells[0].price).toBe(152);
    expect(initialSells[0].quantity).toBe(75);

    // Add a market sell order
    const sellMarket: ProcessableOrder = {
      id: 'sellMarket',
      securityId: 'AAPL',
      type: 'MARKET',
      side: 'SELL',
      originalQuantity: 80,
      filledQuantity: 0,
      remainingQuantity: 80,
      createdAt: new Date(),
      status: 'OPEN',
    };

    const trades = processOrder(sellMarket);

    // Verify trades
    expect(trades).toHaveLength(1);
    expect(trades[0].buyOrderId).toBe('buy1');
    expect(trades[0].sellOrderId).toBe('sellMarket');
    expect(trades[0].quantity).toBe(80);
    expect(trades[0].price).toBe(150);

    // Check updated order book state
    const updatedBuys = getBestBuyOrders('AAPL');
    expect(updatedBuys).toHaveLength(2);
    expect(updatedBuys[0].price).toBe(150);
    expect(updatedBuys[0].quantity).toBe(20); // 100 - 80 = 20 remaining
    expect(updatedBuys[1].price).toBe(149);
    expect(updatedBuys[1].quantity).toBe(50); // buy2 unchanged

    const updatedSells = getBestSellOrders('AAPL');
    expect(updatedSells).toHaveLength(1);
    expect(updatedSells[0].price).toBe(152);
    expect(updatedSells[0].quantity).toBe(75); // sell1 unchanged

    // Verify market depth
    const depth = getMarketDepth('AAPL');
    expect(depth.buyOrders).toHaveLength(2);
    expect(depth.sellOrders).toHaveLength(1);
    expect(depth.buyOrders[0].price).toBe(150);
    expect(depth.buyOrders[0].quantity).toBe(20);
    expect(depth.buyOrders[1].price).toBe(149);
    expect(depth.buyOrders[1].quantity).toBe(50);
    expect(depth.sellOrders[0].price).toBe(152);
    expect(depth.sellOrders[0].quantity).toBe(75);

    // Verify order status through original objects (since we can't get status from BestOrder)
    expect(buyLimit1.filledQuantity).toBe(80);
    expect(buyLimit1.remainingQuantity).toBe(20);
    expect(buyLimit1.status).toBe('PARTIALLY_FILLED');

    expect(buyLimit2.filledQuantity).toBe(0);
    expect(buyLimit2.remainingQuantity).toBe(50);
    expect(buyLimit2.status).toBe('OPEN');

    expect(sellMarket.filledQuantity).toBe(80);
    expect(sellMarket.remainingQuantity).toBe(0);
    expect(sellMarket.status).toBe('FILLED');
  });
});