import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        const transactions = await prisma.$queryRaw`
            SELECT 
                id, ticker, type, quantity, price, fee, 
                trade_date as "tradeDate", 
                name, 
                parent_transaction_id as "parentTransactionId", 
                realized_profit as "realizedProfit", 
                remaining_quantity as "remainingQuantity"
            FROM transactions 
            WHERE ticker = ${ticker} 
            ORDER BY trade_date DESC
        `;

        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ticker, name, type, quantity, price, fee, tradeDate, parentTransactionId } = body;

        const remainingQuantity = type === 'BUY' ? quantity : 0;

        // Use executeRaw to avoid Prisma model issues during creation
        await prisma.$executeRaw`
            INSERT INTO transactions (
                ticker, name, type, quantity, price, fee, 
                trade_date, parent_transaction_id, remaining_quantity
            ) VALUES (
                ${ticker}, ${name}, ${type}::"TransactionType", ${Number(quantity)}, ${Number(price)}, ${Number(fee || 0)}, 
                ${new Date(tradeDate)}, ${parentTransactionId || null}, ${Number(remainingQuantity)}
            )
        `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to create transaction:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
