import { RabbitMQConnection } from './connection';
import { Consumer } from './consumer';
import { Producer } from './producer';
import { RabbitMQConfig, ExchangeType, PublishOptions } from './types';

export { RabbitMQConnection, Producer, ExchangeType, type RabbitMQConfig, type PublishOptions };

export class RabbitMQClient {
  private connection: RabbitMQConnection;
  private producer: Producer;
  private consumer: Consumer;

  constructor(config: RabbitMQConfig) {
    this.connection = new RabbitMQConnection(config);
    this.producer = new Producer(this.connection);
    this.consumer = new Consumer(this.connection);
  }

  getProducer(): Producer {
    return this.producer;
  }

  getConsumer(): Consumer {
    return this.consumer;
  }

  async close(): Promise<void> {
    await this.connection.close();
  }
}

export default RabbitMQClient;
