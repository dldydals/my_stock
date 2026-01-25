import prisma from '../lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
    console.log('Starting migration...');

    try {
        const filePath = path.join(process.cwd(), 'data/stock-holdings.json');
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const holdings = JSON.parse(rawData);

        console.log(`Found ${holdings.length} records in JSON.`);

        for (const item of holdings) {
            // Duplicate check: Same ticker, quantity, date, and price
            const existing = await prisma.transaction.findFirst({
                where: {
                    ticker: item.code,
                    quantity: item.quantity,
                    price: item.buyPrice,
                    tradeDate: new Date(item.date),
                }
            });

            if (existing) {
                console.log(`Skipping duplicate: ${item.name} (${item.code}) on ${item.date}`);
                continue;
            }

            // Create transaction
            // Note: Trigger will automatically update the assets table
            await prisma.transaction.create({
                data: {
                    ticker: item.code,
                    name: item.name, // Added stock name
                    type: 'BUY',
                    quantity: item.quantity,
                    price: item.buyPrice,
                    tradeDate: new Date(item.date),
                    fee: 0, // Fee data is not in JSON, but table allows it
                }
            });

            console.log(`Migrated: ${item.name} (${item.code}) - ${item.quantity} shares`);
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
