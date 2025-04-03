import { RabbitMQClient } from '@tradeblitz/rabbitmq';
import { ConsumeMessage } from 'amqplib';
import prisma from '../utils/prisma';

const rabbitclient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });

export async function kycConsumer() {
  const consumer = rabbitclient.getConsumer();

  await consumer.consume(
    {
      queueName: 'kyc.approved',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { userId } = JSON.parse(msg.content.toString());

      await prisma.user.update({ where: { id: userId }, data: { kycStatus: 'APPROVED' } });

      consumer.ack(msg);
    }
  );
}
