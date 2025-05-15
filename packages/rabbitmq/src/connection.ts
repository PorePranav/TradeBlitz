import { Connection, connect, Channel } from 'amqplib';
import { RabbitMQConfig } from './types';

export class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  constructor(private config: RabbitMQConfig) {}

  async getConnection(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    try {
      this.connection = await connect(this.config.url);
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err.message);
        this.connection = null;
        this.channel = null;
      });
      return this.connection;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    const connection = await this.getConnection();
    this.channel = await connection.createChannel();
    this.channel.on('error', (err) => {
      console.error('RabbitMQ channel error:', err.message);
      this.channel = null;
    });

    return this.channel;
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
