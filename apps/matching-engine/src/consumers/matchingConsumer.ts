import { ConsumeMessage } from 'amqplib';
import { ExchangeType, RabbitMQClient } from '@tradeblitz/rabbitmq';
import {
  getLastTradedPrice,
  getMarketDepth,
  processOrder,
} from '../core/matchingEngine';
import { ProcessableOrder } from '@tradeblitz/common-types';
import { OrderRejectedError } from '../errors/OrderRejectedError';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const producer = rabbitClient.getProducer();
const consumer = rabbitClient.getConsumer();

export async function matchingConsumer() {
  await consumer.consume(
    {
      queueName: 'order-service.order-created.matching-engine.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      const order = JSON.parse(msg.content.toString()) as ProcessableOrder;

      try {
        const trades = processOrder(order);
        const ltp = getLastTradedPrice(order.securityId);
        const orderBook = getMarketDepth(order.securityId, 5);

        await producer.publish(
          { securityId: order.securityId, ltp, orderBook },
          {
            exchangeName: 'matching-engine.ltp-updated.fanout',
            exchangeType: ExchangeType.FANOUT,
          }
        );

        if (trades.length > 0) {
          await producer.sendToQueue(
            'matching-engine.order-executed.order-service.queue',
            trades
          );
        }
      } catch (err) {
        if (err instanceof OrderRejectedError) {
          await producer.sendToQueue(
            'matching-engine.order-rejected.order-service.queue',
            {
              orderId: order.id,
              rejectionReason: err.message,
              side: order.side,
              quantity: order.originalQuantity,
            }
          );
        } else {
          console.error('Error processing order:', err);
        }

        throw err;
      }

      consumer.ack(msg);
    }
  );
}
