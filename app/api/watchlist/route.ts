import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const items = await prisma.watchlist.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Sync prices from Python API
        const itemsWithPrices = await Promise.all(items.map(async (item) => {
            try {
                // Use AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

                const res = await fetch(`http://localhost:8000/price/${item.ticker}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const data = await res.json();
                return {
                    ticker: item.ticker,
                    name: item.name,
                    price: data.price || 0,
                    changeRate: data.change_rate || 0,
                    changeAmount: data.change_amount || 0
                };
            } catch (e) {
                return {
                    ticker: item.ticker,
                    name: item.name,
                    price: 0,
                    changeRate: 0,
                    changeAmount: 0
                };
            }
        }));

        return NextResponse.json(itemsWithPrices);
    } catch (error) {
        console.error('Failed to fetch watchlist:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ticker, name } = body;

        if (!ticker || !name) {
            return NextResponse.json({ error: 'Ticker and name are required' }, { status: 400 });
        }

        const item = await prisma.watchlist.upsert({
            where: { ticker },
            update: { name },
            create: { ticker, name },
        });

        return NextResponse.json(item);
    } catch (error) {
        console.error('Failed to add to watchlist:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
