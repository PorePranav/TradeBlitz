import { ConsumeMessage } from 'amqplib';
import { RabbitMQClient } from '@tradeblitz/rabbitmq';
import { BestOrder, ProcessableOrder } from '@tradeblitz/common-types';

import { io } from '../app';
import { broadcastMarketDepth } from '../core/socket';

const rabbitClient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
const consumer = rabbitClient.getConsumer();

export async function dataFeedConsumer() {
  await consumer.consume(
    {
      queueName: 'matching-engine.ltp-updated.data-feed-service.queue',
      prefetch: 5,
      autoAck: false,
    },
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const {
        securityId,
        ltp,
        orderBook,
      }: {
        securityId: string;
        ltp: number;
        orderBook: {
          bestBuyOrders: BestOrder[];
          bestSellOrders: BestOrder[];
        };
      } = JSON.parse(msg.content.toString());

      broadcastMarketDepth(io, securityId, ltp, orderBook);

      consumer.ack(msg);
    }
  );
}
