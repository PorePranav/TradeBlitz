import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';

import prisma from '../utils/prisma';
import { OrderStatus } from '../types/prismaTypes';
import { processTrades } from '../utils/orderUtils';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const consumer = rabbitClient.getConsumer();

export async function orderConsumer() {
  await consumer.consume(
    {
      queueName: 'matching-engine.order-executed.order-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { trades } = JSON.parse(msg.content.toString());
      processTrades(trades);

      consumer.ack(msg);
    }
  );

  await consumer.consume(
    {
      queueName: 'matching-engine.order-rejected.order-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const { orderId, rejectionReason } = JSON.parse(msg.content.toString());

      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REJECTED, rejectionReason },
      });

      consumer.ack(msg);
    }
  );
}
