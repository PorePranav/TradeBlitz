import { ConsumeMessage } from 'amqplib';
import { RabbitMQConnection } from './connection';
import { ConsumeOptions, ExchangeType } from './types';

export class Consumer {
  constructor(private connection: RabbitMQConnection) {}

  async consume(
    options: ConsumeOptions,
    callback: (msg: ConsumeMessage | null) => Promise<void>
  ): Promise<void> {
    const {
      exchangeName = '',
      exchangeType = ExchangeType.DIRECT,
      queueName,
      routingKey = '',
      prefetch = 1,
      autoAck = false,
    } = options;

    try {
      const channel = await this.connection.getChannel();
      await channel.prefetch(prefetch);

      await channel.assertQueue(queueName, { durable: true });

      if (exchangeName) {
        await channel.assertExchange(exchangeName, exchangeType, { durable: true });
        await channel.bindQueue(queueName, exchangeName, routingKey);
      }

      await channel.consume(queueName, async (msg) => {
        try {
          await callback(msg);
          if (autoAck && msg) {
            channel.ack(msg);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          if (msg) {
            channel.reject(msg, false);
          }
        }
      });

      console.log(`Consumer started for queue: ${queueName}`);
    } catch (error) {
      console.error('Error setting up consumer:', error);
      throw error;
    }
  }

  async ack(message: ConsumeMessage): Promise<void> {
    const channel = await this.connection.getChannel();
    channel.ack(message);
  }

  async reject(message: ConsumeMessage, requeue = false): Promise<void> {
    const channel = await this.connection.getChannel();
    channel.reject(message, requeue);
  }
}
