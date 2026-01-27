import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const TICKER_MAP: Record<string, string> = {
    '현대모비스': '012330',
    'SK스퀘어': '402340',
    '현대차(우)': '005385',
    '현대차우': '005385',
    '진원생명과학': '011000',
    'LG디스플레이': '034220',
    '셀트리온제약': '068760',
    'SK바이오팜': '326030',
    '대아티아이': '045390',
    'KB금융': '105560',
};

const TARGET_PRICES: Record<string, number> = {
    '012330': 457500, // 현대모비스
    '402340': 445500, // SK스퀘어
    '005385': 281000, // 현대차(우)
    '011000': 1793,   // 진원생명과학
    '034220': 12530,  // LG디스플레이
    '068760': 67700,  // 셀트리온제약
    '326030': 105500, // SK바이오팜
    '045390': 4330,   // 대아티아이
    '105560': 135600, // KB금융
};

const FINAL_DEPOSIT = 869761;

async function main() {
    console.log('--- Starting FINAL Corrected Transaction Import ---');

    // 1. Clear existing data
    console.log('Cleaning up database...');
    await prisma.$executeRaw`TRUNCATE TABLE transactions RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE assets RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE cash_accounts RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE dividends RESTART IDENTITY CASCADE`;

    const csvPath = path.join(process.cwd(), 'data/transaction-history-raw.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');

    // 2. Implied starting balances removed per user request (identified as garbage)
    console.log('Skipping implied starting lots...');
    /*
    await prisma.transaction.create({
        data: {
            ticker: '402340',
            name: 'SK스퀘어',
            type: 'BUY',
            quantity: 100,
            price: 70000, 
            tradeDate: new Date('2021-01-01'),
            remainingQuantity: 100
        }
    });
    */

    const transactionsToProcess: any[] = [];

    // Parse all lines
    lines.forEach((line, index) => {
        if (!line.trim()) return;

        const parts: string[] = [];
        let currentPart = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                parts.push(currentPart.trim());
                currentPart = '';
            } else {
                currentPart += char;
            }
        }
        parts.push(currentPart.trim());

        const [dateRaw, typeRaw, name, qtyRaw, priceRaw, feeRaw] = parts;
        if (!dateRaw || !typeRaw || !name) return;

        const date = new Date(dateRaw.replace(/\s/g, '').replace(/\./g, '-').replace(/-$/, ''));
        const ticker = TICKER_MAP[name] || name;
        const quantity = Math.abs(parseInt(qtyRaw.replace(/,/g, '').replace(/"/g, '')));
        const price = parseFloat(priceRaw.replace(/,/g, '').replace(/"/g, ''));
        const fee = feeRaw ? parseFloat(feeRaw.replace(/,/g, '').replace(/"/g, '')) : 0;

        transactionsToProcess.push({
            originalOrder: index,
            date,
            ticker,
            name,
            type: (typeRaw === '매수' || typeRaw === '이월') ? 'BUY' : 'SELL',
            quantity,
            price,
            fee
        });
    });

    // Sort chronologically (BUY before SELL on same day)
    transactionsToProcess.sort((a, b) => {
        if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
        if (a.type !== b.type) return a.type === 'BUY' ? -1 : 1;
        return a.originalOrder - b.originalOrder;
    });

    console.log(`Processing ${transactionsToProcess.length} transactions...`);

    for (const tx of transactionsToProcess) {
        if (tx.type === 'BUY') {
            await prisma.transaction.create({
                data: {
                    ticker: tx.ticker,
                    name: tx.name,
                    type: 'BUY',
                    quantity: tx.quantity,
                    price: tx.price,
                    fee: tx.fee,
                    tradeDate: tx.date,
                    remainingQuantity: tx.quantity
                }
            });
        } else {
            // SELL
            let remainingToSell = tx.quantity;
            let lotIndex = 0;

            while (remainingToSell > 0) {
                const bestLot = await prisma.transaction.findFirst({
                    where: {
                        ticker: tx.ticker,
                        type: 'BUY',
                        remainingQuantity: { gt: 0 }
                    },
                    orderBy: { tradeDate: 'asc' }
                });

                if (!bestLot) {
                    console.warn(`[Warning] No matching lot for ${tx.name} (${tx.ticker}) on ${tx.date.toISOString()}. Qty: ${remainingToSell}`);
                    await prisma.transaction.create({
                        data: {
                            ticker: tx.ticker,
                            name: tx.name,
                            type: 'SELL',
                            quantity: remainingToSell,
                            price: tx.price,
                            fee: lotIndex === 0 ? tx.fee : 0,
                            tradeDate: tx.date,
                            remainingQuantity: 0
                        }
                    });
                    break;
                }

                const sellQtyFromThisLot = Math.min(remainingToSell, bestLot.remainingQuantity);

                await prisma.transaction.create({
                    data: {
                        ticker: tx.ticker,
                        name: tx.name,
                        type: 'SELL',
                        quantity: sellQtyFromThisLot,
                        price: tx.price,
                        fee: lotIndex === 0 ? tx.fee : 0,
                        tradeDate: tx.date,
                        parentTransactionId: bestLot.id,
                        remainingQuantity: 0
                    }
                });

                remainingToSell -= sellQtyFromThisLot;
                lotIndex++;
            }
        }
    }

    console.log('Finalizing Assets and Cash...');

    // Update current prices
    for (const [ticker, price] of Object.entries(TARGET_PRICES)) {
        await prisma.asset.updateMany({
            where: { ticker },
            data: { currentPrice: price }
        });
    }

    // Set final cash balance
    await prisma.cashAccount.upsert({
        where: { type: 'DEPOSIT' },
        update: { balance: FINAL_DEPOSIT, updatedAt: new Date() },
        create: { type: 'DEPOSIT', balance: FINAL_DEPOSIT, updatedAt: new Date() }
    });

    console.log('--- Final Portfolio State ---');
    const finalAssets = await prisma.asset.findMany({ where: { quantity: { gt: 0 } } });
    finalAssets.forEach(a => {
        console.log(`${a.name}: ${a.quantity}주 (Val: ${Math.round(a.quantity * a.currentPrice).toLocaleString()}원)`);
    });
    console.log(`DEPOSIT: ${FINAL_DEPOSIT.toLocaleString()}원`);
    console.log('Import completed successfully.');
}

main().catch(console.error);
