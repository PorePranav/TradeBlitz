export enum ExchangeType {
  DIRECT = 'direct',
  FANOUT = 'fanout',
}

export interface RabbitMQConfig {
  url: string;
}

export interface PublishOptions {
  exchangeName?: string;
  exchangeType?: ExchangeType;
  routingKey?: string;
}

export interface ConsumeOptions {
  exchangeName?: string;
  exchangeType?: ExchangeType;
  queueName: string;
  routingKey?: string;
  prefetch?: number;
  autoAck?: boolean;
}
