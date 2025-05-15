import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers, broadcastMarketDepth } from './socket';

import { Request, Response, NextFunction } from 'express';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

setupSocketHandlers(io);

app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('Hello World!');
});

//Temp
setInterval(() => {
  broadcastMarketDepth(io, 'RELIANCE', 2785.65, [
    { price: 2785.65, quantity: 15, timestamp: Date.now() },
  ]);
}, 5000);

export { server };
