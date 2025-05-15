import { RabbitMQConnection } from './connection';
import { ExchangeType, PublishOptions } from './types';

export class Producer {
  constructor(private connection: RabbitMQConnection) {}

  async publish(message: any, options: PublishOptions = {}): Promise<boolean> {
    const { exchangeName = '', exchangeType = ExchangeType.DIRECT, routingKey = '' } = options;

    try {
      const channel = await this.connection.getChannel();

      if (exchangeName) {
        await channel.assertExchange(exchangeName, exchangeType, { durable: true });
      }

      const content = Buffer.isBuffer(message) ? message : Buffer.from(JSON.stringify(message));

      return channel.publish(exchangeName, routingKey, content, {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      });
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  async sendToQueue(queueName: string, message: any): Promise<boolean> {
    try {
      const channel = await this.connection.getChannel();
      await channel.assertQueue(queueName, { durable: true });

      const content = Buffer.isBuffer(message) ? message : Buffer.from(JSON.stringify(message));

      return channel.sendToQueue(queueName, content, {
        persistent: true,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      });
    } catch (error) {
      console.error('Error sending to queue:', error);
      throw error;
    }
  }
}
