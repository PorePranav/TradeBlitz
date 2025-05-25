import { BestOrder, ProcessableOrder } from '@tradeblitz/common-types';
import { Server, Socket } from 'socket.io';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('New client connected', socket.id);

    socket.on('subscribe', (securityId: string) => {
      socket.join(securityId);
      console.log(`Client subscribed to ${securityId}`);
    });

    socket.on('unsubscribe', (securityId: string) => {
      socket.leave(securityId);
      console.log(`Client unsubscribed from ${securityId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};

export function broadcastMarketDepth(
  io: Server,
  securityId: string,
  ltp: number,
  orderBook: {
    bestBuyOrders: BestOrder[];
    bestSellOrders: BestOrder[];
  }
) {
  io.to(securityId).emit('marketDepth', {
    type: 'marketDepth',
    securityId,
    ltp,
    orderBook,
  });
}
