import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';

import prisma from '../utils/prisma';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const consumer = rabbitClient.getConsumer();

export async function walletConsumer() {
  await consumer.consume(
    {
      exchangeName: 'auth-service.user-created.fanout',
      exchangeType: ExchangeType.FANOUT,
      queueName: 'auth-service.user-created.wallet-service.queue',
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { userId } = JSON.parse(msg.content.toString());

      await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });

      consumer.ack(msg);
    }
  );

  await consumer.consume(
    {
      queueName: 'order-service.order-executed.wallet-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const {
        buyUserId,
        sellUserId,
        tradedAmount,
      }: { buyUserId: string; sellUserId: string; tradedAmount: number } =
        JSON.parse(msg.content.toString());

      try {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId: buyUserId },
            data: { onHold: { decrement: tradedAmount } },
          }),
          prisma.wallet.update({
            where: { userId: sellUserId },
            data: { balance: { increment: tradedAmount } },
          }),
        ]);

        consumer.ack(msg);
      } catch (err) {
        console.error('Error processing wallet transaction:', err);
      }
    }
  );

  await consumer.consume(
    {
      queueName: 'order-service.release-hold.portfolio-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { userId, amount }: { userId: string; amount: number } = JSON.parse(
        msg.content.toString()
      );

      try {
        await prisma.wallet.update({
          where: { userId },
          data: {
            onHold: { decrement: amount },
            balance: { increment: amount },
          },
        });

        consumer.ack(msg);
      } catch (err) {
        console.error('Error releasing hold on wallet:', err);
      }
    }
  );
}
