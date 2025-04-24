import { RabbitMQClient } from '@tradeblitz/rabbitmq';
import { ConsumeMessage } from 'amqplib';
import prisma from '../utils/prisma';

const rabbitclient = new RabbitMQClient({ url: process.env.RABBITMQ_URL! });
