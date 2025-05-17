import { AppError } from '@tradeblitz/common-utils';
import axios from 'axios';
import { OrderType, Side } from '../types/prismaTypes';

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
