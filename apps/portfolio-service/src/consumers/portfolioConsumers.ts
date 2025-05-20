import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';
import prisma from '../utils/prisma';

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
}
