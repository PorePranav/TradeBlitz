import prisma from './prisma';

export async function calculateNewAvgPrice(
  portfolioId: string,
  securityId: string,
  newQty: number,
  newPrice: number
): Promise<number> {
  const existing = await prisma.holding.findUnique({
    where: {
      portfolioId_securityId: { portfolioId, securityId },
    },
  });

  if (!existing) return newPrice;

  const totalQty = existing.quantity + newQty;
  const totalValue = existing.avgPrice * existing.quantity + newPrice * newQty;
  return totalValue / totalQty;
}
