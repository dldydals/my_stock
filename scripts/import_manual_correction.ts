import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Manual Transaction Correction Import ---');

    // 0. Capture current cash balances to preserve them
    const currentCash = await prisma.cashAccount.findMany();
    const depositBalance = currentCash.find(c => c.type === 'DEPOSIT')?.balance ?? 0;
    const cmaBalance = currentCash.find(c => c.type === 'CMA')?.balance ?? 0;

    // 1. Clear existing data
    console.log('Cleaning up database...');
    await prisma.$executeRaw`TRUNCATE TABLE transactions RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE assets RESTART IDENTITY CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE cash_accounts RESTART IDENTITY CASCADE`;

    const csvPath = path.join(process.cwd(), 'data/manual-corrected-transactions.csv');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    console.log(`Read ${lines.length - 1} lines from CSV.`);

    // 2. Insert transactions exactly as provided
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts: string[] = [];
        let currentPart = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                parts.push(currentPart.trim());
                currentPart = '';
            } else {
                currentPart += char;
            }
        }
        parts.push(currentPart.trim());

        // id,ticker,type,quantity,price,fee,trade_date,name,parent_transaction_id,realized_profit,remaining_quantity
        const id = parts[0];
        const ticker = parts[1];
        const type = parts[2];
        const quantity = parts[3];
        const price = parts[4];
        const fee = parts[5];
        const tradeDate = parts[6];
        const name = parts[7];
        const parentId = parts[8];
        const profit = parts[9];
        const remQty = parts[10];

        await prisma.transaction.create({
            data: {
                id: parseInt(id),
                ticker: ticker.padStart(6, '0'), // Handle 12330 -> 012330
                type: type as any,
                quantity: parseInt(quantity),
                price: parseFloat(price),
                fee: fee ? parseFloat(fee.replace(/,/g, '')) : 0,
                tradeDate: new Date(tradeDate),
                name: name,
                parentTransactionId: parentId ? parseInt(parentId) : null,
                realizedProfit: profit ? parseFloat(profit) : null,
                remainingQuantity: parseInt(remQty || '0')
            }
        });
    }

    console.log('Transactions inserted.');

    // 3. Re-calculate Assets table
    // The user's remQty seems to be the total count for the ticker at that point.
    // However, my UI expects sum(remainingQuantity where type=BUY).
    // If I use the user's values, I might have double counting if multiple BUYs are still active.

    // BUT! Since the user manually corrected the remaining_quantity, I should probably
    // trust the LAST record for each ticker to represent the current inventory.
    const tickers = await prisma.transaction.findMany({
        distinct: ['ticker'],
        select: { ticker: true, name: true }
    });

    for (const { ticker, name } of tickers) {
        const txs = await prisma.transaction.findMany({
            where: { ticker }
        });

        const totalQty = txs.reduce((sum, tx) => {
            // Our new logic: remQty on BUYs is the lot's balance. 
            // remQty on SELLs is ignored or set to 0.
            if (tx.type === 'BUY') return sum + tx.remainingQuantity;
            return sum;
        }, 0);

        if (totalQty >= 0) {
            await prisma.asset.upsert({
                where: { ticker },
                update: {
                    quantity: totalQty,
                    name: name,
                    updatedAt: new Date()
                },
                create: {
                    ticker,
                    name,
                    quantity: totalQty,
                    avgPrice: 0,
                    currentPrice: 0,
                    updatedAt: new Date()
                }
            });
            console.log(`Updated asset ${name} (${ticker}) to ${totalQty}주.`);
        }
    }

    // 4. Restore Cash Balances (Prevent triggers from leaving balances in weird states)
    console.log(`Restoring wallet state: DEPOSIT=${depositBalance}, CMA=${cmaBalance}`);
    await prisma.cashAccount.upsert({
        where: { type: 'DEPOSIT' },
        update: { balance: depositBalance, updatedAt: new Date() },
        create: { type: 'DEPOSIT', balance: depositBalance, updatedAt: new Date() }
    });
    await prisma.cashAccount.upsert({
        where: { type: 'CMA' },
        update: { balance: cmaBalance, updatedAt: new Date() },
        create: { type: 'CMA', balance: cmaBalance, updatedAt: new Date() }
    });

    console.log('--- Import and State Sync Completed ---');
}

main().catch(console.error);
