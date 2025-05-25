import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';
import prisma from '../utils/prisma';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const consumer = rabbitClient.getConsumer();

export async function registryConsumer() {
  await consumer.consume(
    {
      exchangeName: 'matching-engine.ltp-updated.fanout',
      exchangeType: ExchangeType.FANOUT,
      queueName: 'matching-engine.ltp-updated.registry-service.queue',
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { securityId, ltp }: { securityId: string; ltp: number } =
        JSON.parse(msg.content.toString());

      try {
        if (ltp !== undefined && ltp !== null) {
          await prisma.security.update({
            where: { id: securityId },
            data: { ltp },
          });
        }
      } catch (err) {
        console.error('Error updating LTP:', err);
      }

      consumer.ack(msg);
    }
  );
}
