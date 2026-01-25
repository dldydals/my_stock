import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const assets = await prisma.asset.findMany({
            orderBy: { ticker: 'asc' },
        });

        if (!assets || assets.length === 0) {
            return NextResponse.json([]);
        }

        // Real-time price sync from Python API
        const updatedAssets = await Promise.all(assets.map(async (asset) => {
            try {
                const res = await fetch(`http://localhost:8000/price/${asset.ticker}`);
                const data = await res.json();
                if (data.price) {
                    await prisma.asset.update({
                        where: { id: asset.id },
                        data: { currentPrice: data.price }
                    });
                    return { ...asset, currentPrice: data.price, changeRate: data.change_rate || 0 };
                }
            } catch (e) {
                console.error(`Failed to sync price for ${asset.ticker}`);
            }
            return asset;
        }));

        // UI에서 기대하는 형식으로 변환
        const formattedAssets = updatedAssets.map(asset => {
            const qty = asset.quantity;
            const curPrice = asset.currentPrice;
            const buyCost = asset.avgPrice * qty; // avgPrice already includes buy fees in trigger.sql
            const sellValue = curPrice * qty;

            // Estimated Sell Fees (Match calculateFees logic in frontend)
            const sellCommission = sellValue * 0.00015;
            const sellTax = sellValue * 0.0018;
            const estSellFees = Math.floor(sellCommission + sellTax);

            const netPnL = sellValue - buyCost - estSellFees;
            const yieldRate = buyCost > 0 ? (netPnL / buyCost) * 100 : 0;

            return {
                key: asset.id.toString(),
                ticker: asset.ticker,
                name: asset.name,
                quantity: qty,
                avgPrice: asset.avgPrice,
                currentPrice: curPrice,
                changeRate: (asset as any).changeRate || 0,
                yield: yieldRate,
                PnL: netPnL,
                allocation: 0,
            };
        });

        const totalCurrentValue = formattedAssets.reduce((sum, a) => sum + (a.currentPrice * a.quantity), 0);

        const finalData = formattedAssets.map(a => ({
            ...a,
            allocation: totalCurrentValue > 0 ? ((a.currentPrice * a.quantity) / totalCurrentValue) * 100 : 0
        })).sort((a, b) => b.allocation - a.allocation); // Sort by allocation descending

        return NextResponse.json(finalData);
    } catch (error) {
        console.error('Failed to fetch holdings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
