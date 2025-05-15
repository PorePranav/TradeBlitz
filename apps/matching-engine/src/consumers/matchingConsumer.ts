import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';
import { processOrder } from '../core/matchingEngine';
import { Order } from '../types/types';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });

export async function matchingConsumer() {
  const consumer = rabbitClient.getConsumer();

  await consumer.consume(
    { queueName: 'orders.execute-order', prefetch: 5, autoAck: false },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const order = JSON.parse(msg.content.toString()) as Order;

      console.log('Received order:', order);

      try {
        const trades = processOrder(order);
        console.log('Processed trades:', trades);
      } catch (err) {
        console.error('Error processing order:', err);
        throw err;
      }

      consumer.ack(msg);
    }
  );
}
