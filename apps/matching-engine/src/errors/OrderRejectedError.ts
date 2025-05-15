export class OrderRejectedError extends Error {
  constructor(
    public orderId: string,
    public reason: string
  ) {
    super(`Order ${orderId} rejected: ${reason}`);
    this.name = 'OrderRejectedError';
  }
}
