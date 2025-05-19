import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';

import prisma from '../utils/prisma';
import { OrderStatus } from '../types/prismaTypes';
import { processTrades } from '../utils/orderUtils';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const consumer = rabbitClient.getConsumer();
const producer = rabbitClient.getProducer();

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

      const { orderId, rejectionReason, side, quantity } = JSON.parse(
        msg.content.toString()
      );

      const [rejectedOrder] = await prisma.$transaction([
        prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.REJECTED, rejectionReason },
        }),
      ]);

      if (side === 'BUY') {
        await producer.sendToQueue(
          'order-service.release-hold.wallet-service.queue',
          {
            userId: rejectedOrder.userId,
            amount: quantity,
          }
        );
      }
      //TODO: If sell order then add logic here and consumer in portfolio service to release the hold on security

      consumer.ack(msg);
    }
  );
}
