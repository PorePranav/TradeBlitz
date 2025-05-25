import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';

import prisma from '../utils/prisma';
import { OrderStatus } from '../types/prismaTypes';
import { processTrades } from '../utils/orderUtils';
import { Trade } from '@tradeblitz/common-types';

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

      const trades = JSON.parse(msg.content.toString()) as Trade[];
      await processTrades(trades);

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
      } else {
        await producer.sendToQueue(
          'order-service.release-hold.portfolio-service.queue',
          {
            userId: rejectedOrder.userId,
            securityId: rejectedOrder.securityId,
            quantity,
          }
        );
      }

      consumer.ack(msg);
    }
  );
}
