import { AppError } from '@tradeblitz/common-utils';
import axios, { AxiosError } from 'axios';
import { Trade } from '@tradeblitz/common-types';
import { RabbitMQClient } from '@tradeblitz/rabbitmq';

import prisma from './prisma';
import { Order, OrderStatus, OrderType, Side } from '../types/prismaTypes';

const rabbitClient = new RabbitMQClient({
  url: process.env.RABBITMQ_URL!,
});
const producer = rabbitClient.getProducer();

//TODO: Currently hold funds is throwing Unhandled Promise Rejection, remove all normal functions and use middleware functions
export const verifySecurityExists = async (securityId: string) => {
  try {
    const response = await axios.get(
      `${process.env.REGISTRY_SERVICE_URL}/${securityId}`,
      {
        headers: { Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}` },
        timeout: 3000,
      }
    );

    if (response.data.status !== 'success') {
      throw new AppError('Security not found or invalid security ID', 404);
    }
  } catch (err) {
    if (
      axios.isAxiosError(err) &&
      err.response &&
      err.response.status === 404
    ) {
      throw new AppError('Security not found or invalid security ID', 404);
    }
    throw new AppError('Error verifying security ID', 500);
  }
};

const checkLiquidity = async (securityId: string, side: Side) => {
  const liquidity = await axios.post(
    `${process.env.MATCHING_ENGINE_URL}/checkLiquidity`,
    {
      securityId,
      side,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      },
      timeout: 3000,
    }
  );

  const { hasLiquidity } = liquidity.data.data;

  if (!hasLiquidity)
    throw new AppError(
      'No liquidity available currently, try LIMIT order',
      400
    );
};

const getEstimatedAmount = async (
  securityId: string,
  side: Side,
  quantity: number
): Promise<number> => {
  const bestEstimate = await axios.post(
    `${process.env.MATCHING_ENGINE_URL}/getBestPrice`,
    {
      securityId,
      side,
      quantity,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      },
      timeout: 3000,
    }
  );

  return bestEstimate.data.data.totalAmount;
};

const checkAndHoldFunds = async (userId: string, amount: number) => {
  try {
    const holdFundsResponse = await axios.post(
      `${process.env.WALLET_SERVICE_URL}/holdFunds`,
      {
        userId,
        amount,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
        },
        timeout: 3000,
      }
    );
    console.log('holdFundsResponse', holdFundsResponse.data);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const message =
        err.response?.data?.message || err.message || 'Wallet service error';
      const statusCode = err.response?.status || 500;

      console.error('Axios error in checkAndHoldFunds:', message);
      throw new AppError(message, statusCode);
    }

    console.error('Unknown error in checkAndHoldFunds:', err);
    throw new AppError('Internal error in checkAndHoldFunds', 500);
  }
};

export const checkConditions = async (
  securityId: string,
  userId: string,
  type: OrderType,
  side: Side,
  quantity: number,
  price: number
) => {
  if (type === OrderType.MARKET) {
    //Check if the order book has enough liquidity
    await checkLiquidity(securityId, side);

    if (side === Side.BUY) {
      //Calculate estimate cost of order
      const estimatedAmount = await getEstimatedAmount(
        securityId,
        side,
        quantity
      );
      //If cost is returned, check user balance and lock funds if available
      checkAndHoldFunds(userId, estimatedAmount);
      //If hold is successful, send message to matching engine
      //If hold fails, return error
      //Following steps are to be done in consumer from matching engine
      //Get executed trades from the matching engine
      //Finalize the holds and deduct the amount from user's wallet
      //Add the securities to user's portfolio
    } else if (side === Side.SELL) {
      //Check if the user has enough securities in their portfolio, if yes, lock the securities
      //If hold is successful, send order to matching engine
      //Following steps are to be done in consumer from matching engine
      //Get the executed trades from the matching engine
      //Finalize the holds and deduct the amount of securities from user's portfolio
      //Add the amount to the user's wallet
    }
  } else if (type === OrderType.LIMIT) {
    if (side === Side.BUY) {
      //Call the wallet service to check if the user has enough funds
      //If the user has enough funds, lock the funds holdFunds(userId, quantity * price)
      //If the hold is successful, send the order to the matching engine
      //If the hold fails, return an error
      //Following steps are to be done in consumer from matching engine
      //Get the executed trades from the matching engine
      //Finalize the holds and deduct the amount from user's wallet
      //Add the securities to user's portfolio
    } else if (side === Side.SELL) {
      //Call the portfolio service to check if the user has enough securities
      //If the user has enough securities, lock the securities
      //If the hold is successful, send the order to the matching engine
      //If the hold fails, return an error
      //Following steps are to be done in consumer from matching engine
      //Get the executed trades from the matching engine
      //Finalize the holds and deduct the amount of securities from user's portfolio
      //Add the amount to the user's wallet
    }
  }
  // if (side === Side.BUY) {
  //   try {
  //     const response = await axios.get(
  //       `${process.env.WALLET_SERVICE_URL}/balance`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
  //         },
  //         timeout: 3000,
  //       }
  //     );

  //     if (response.data.status !== 'success')
  //       throw new AppError('Error fetching user balance', 500);

  //     const { balance } = response.data.data;

  //     if (balance < quantity) throw new AppError('Insufficient funds', 400);

  //     //TODO: Implement consumer in wallet service to handle this message
  //     producer.sendToQueue('order-service.put-on-hold.wallet-service.queue', {
  //       userId,
  //       amount: quantity * price,
  //     });
  //   } catch (err) {
  //     if (
  //       axios.isAxiosError(err) &&
  //       err.response &&
  //       err.response.status === 404
  //     ) {
  //       throw new AppError('Wallet not found', 404);
  //     }
  //     throw new AppError('Error fetching user balance', 500);
  //   }
  // } else if (side === Side.SELL) {
  //   //TODO: Implement check for security ownership using portfolio service
  // }
};

export const processTrades = async (trades: Trade[]) => {
  for (const trade of trades) {
    const [processedBuyOrder, processedSellOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: trade.buyOrderId },
        data: {
          filledQuantity: { increment: trade.quantity },
          remainingQuantity: { decrement: trade.quantity },
        },
      }),
      prisma.order.update({
        where: { id: trade.sellOrderId },
        data: {
          filledQuantity: { increment: trade.quantity },
          remainingQuantity: { decrement: trade.quantity },
        },
      }),
    ]);

    await updateOrderStatus(processedBuyOrder);
    await updateOrderStatus(processedSellOrder);

    const tradedAmount = trade.price * trade.quantity;
    await producer.sendToQueue(
      'order-service.order-executed.wallet-service.queue',
      {
        buyUserId: processedBuyOrder.userId,
        sellUserId: processedSellOrder.userId,
        tradedAmount,
      }
    );

    //TODO: Add consumer in portfolio service to handle this message
    await producer.sendToQueue(
      'order-service.order-executed.portfolio-service.queue',
      {
        buyUserId: processedBuyOrder.userId,
        sellUserId: processedSellOrder.userId,
        securityId: processedBuyOrder.securityId,
        quantity: trade.quantity,
      }
    );
  }
};

const updateOrderStatus = async (order: Order) => {
  if (order.remainingQuantity === 0) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.FILLED },
    });
  } else if (
    order.remainingQuantity > 0 &&
    order.status !== OrderStatus.PARTIALLY_FILLED
  ) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.PARTIALLY_FILLED },
    });
  }
};
