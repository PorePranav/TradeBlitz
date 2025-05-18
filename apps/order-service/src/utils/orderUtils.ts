import { AppError } from '@tradeblitz/common-utils';
import axios from 'axios';
import { Order, OrderStatus, OrderType, Side } from '../types/prismaTypes';
import { Trade } from '@tradeblitz/common-types';
import prisma from './prisma';

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

export const checkUserBalance = async (
  securityId: string,
  userId: string,
  type: OrderType,
  side: Side,
  quantity: number
) => {
  //TODO: Check user money balance if buy order and security balance if sell order by calling the wallet/portfolio service
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

    //TODO: Call the wallet service to update the user balances
    //TODO: Call the portfolio service to update the user portfolios
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
