import { Trade } from '@tradeblitz/common-types';
import { RabbitMQClient } from '@tradeblitz/rabbitmq';

import prisma from './prisma';
import { Order, OrderStatus, OrderType, Side } from '../types/prismaTypes';

const rabbitClient = new RabbitMQClient({
  url: process.env.RABBITMQ_URL!,
});
const producer = rabbitClient.getProducer();

export const processTrades = async (trades: Trade[]) => {
  for (const trade of trades) {
    const [processedBuyOrder, processedSellOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: trade.buyOrderId },
        data: {
          filledQuantity: { increment: trade.quantity },
          remainingQuantity: { decrement: trade.quantity },
        },
      }),
      prisma.order.update({
        where: { id: trade.sellOrderId },
        data: {
          filledQuantity: { increment: trade.quantity },
          remainingQuantity: { decrement: trade.quantity },
        },
      }),
    ]);

    await updateOrderStatus(processedBuyOrder);
    await updateOrderStatus(processedSellOrder);

    const tradedAmount = trade.price * trade.quantity;
    await producer.sendToQueue(
      'order-service.order-executed.wallet-service.queue',
      {
        buyUserId: processedBuyOrder.userId,
        sellUserId: processedSellOrder.userId,
        tradedAmount,
      }
    );

    //TODO: Add consumer in portfolio service to handle this message
    await producer.sendToQueue(
      'order-service.order-executed.portfolio-service.queue',
      {
        buyUserId: processedBuyOrder.userId,
        sellUserId: processedSellOrder.userId,
        securityId: processedBuyOrder.securityId,
        quantity: trade.quantity,
      }
    );
  }
};

const updateOrderStatus = async (order: Order) => {
  if (order.remainingQuantity === 0) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FILLED },
    });
  } else if (
    order.remainingQuantity > 0 &&
    order.status !== OrderStatus.PARTIALLY_FILLED
  ) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PARTIALLY_FILLED },
    });
  }
};
