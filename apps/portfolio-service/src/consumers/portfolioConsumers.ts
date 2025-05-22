import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';
import prisma from '../utils/prisma';
import { calculateNewAvgPrice } from '../utils/portfolioUtils';
import { OrderTypes } from '@tradeblitz/common-types';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const consumer = rabbitClient.getConsumer();

export async function portfolioConsumer() {
  await consumer.consume(
    {
      exchangeName: 'auth-service.user-created.fanout',
      exchangeType: ExchangeType.FANOUT,
      queueName: 'auth-service.user-created.portfolio-service.queue',
      autoAck: false,
      prefetch: 5,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { userId } = JSON.parse(msg.content.toString());

      await prisma.portfolio.create({
        data: {
          userId,
        },
      });

      consumer.ack(msg);
    }
  );

  await consumer.consume(
    {
      queueName: 'order-service.order-executed.portfolio-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const {
          buyUserId,
          sellUserId,
          securityId,
          quantity,
          price,
          buyOrderId,
          sellOrderId,
          executedAt,
        } = JSON.parse(msg.content.toString());

        const buyerPortfolio = await prisma.portfolio.findUnique({
          where: { userId: buyUserId },
        });

        const sellerPortfolio = await prisma.portfolio.findUnique({
          where: { userId: sellUserId },
        });

        if (!buyerPortfolio || !sellerPortfolio) {
          console.error('Buyer or Seller portfolio not found.');
          return;
        }

        await prisma.holding.upsert({
          where: {
            portfolioId_securityId: {
              portfolioId: buyerPortfolio.id,
              securityId,
            },
          },
          update: {
            quantity: { increment: quantity },
            avgPrice: {
              set: await calculateNewAvgPrice(
                buyerPortfolio.id,
                securityId,
                quantity,
                price
              ),
            },
          },
          create: {
            portfolioId: buyerPortfolio.id,
            securityId,
            quantity,
            avgPrice: price,
          },
        });

        await prisma.holding.update({
          where: {
            portfolioId_securityId: {
              portfolioId: sellerPortfolio.id,
              securityId,
            },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        await prisma.trade.create({
          data: {
            portfolioId: buyerPortfolio.id,
            side: OrderTypes.Side.BUY,
            quantity,
            price,
            executedAt,
            orderId: buyOrderId,
          },
        });

        await prisma.trade.create({
          data: {
            portfolioId: sellerPortfolio.id,
            side: OrderTypes.Side.SELL,
            quantity,
            price,
            executedAt,
            orderId: sellOrderId,
          },
        });

        consumer.ack(msg);
      } catch (err) {
        console.error('Error processing order execution:', err);
      }
    }
  );

  await consumer.consume(
    {
      queueName: 'order-service.release-hold.portfolio-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg) => {
      if (!msg) return;

      const { userId, securityId, quantity } = JSON.parse(
        msg.content.toString()
      );

      const fetchedPortfolio = await prisma.portfolio.findUnique({
        where: { userId },
      });

      await prisma.holding.update({
        where: {
          portfolioId_securityId: {
            portfolioId: fetchedPortfolio!.id,
            securityId,
          },
        },
        data: { onHold: { decrement: quantity } },
      });

      consumer.ack(msg);
    }
  );
}
