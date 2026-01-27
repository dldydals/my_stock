import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
    try {
        const accounts = await prisma.cashAccount.findMany();
        const deposit = accounts.find(a => a.type === 'DEPOSIT')?.balance || 0;
        const cma = accounts.find(a => a.type === 'CMA')?.balance || 0;
        const totalDeposit = accounts.find(a => a.type === 'TOTAL_DEPOSIT')?.balance || 0;
        const totalWithdrawal = accounts.find(a => a.type === 'TOTAL_WITHDRAWAL')?.balance || 0;

        return NextResponse.json({ deposit, cma, totalDeposit, totalWithdrawal });
    } catch (e) {
        console.error("Failed to fetch cash balance:", e);
        return NextResponse.json({ deposit: 0, cma: 0, totalDeposit: 0, totalWithdrawal: 0 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("Updating cash balance with body:", body);

        if (!(prisma as any).cashAccount) {
            throw new Error("Prisma model 'cashAccount' not found. Please try restarting the dev server if you just updated the schema.");
        }
        // body: { deposit?: number, cma?: number }

        if (body.deposit !== undefined) {
            await prisma.cashAccount.upsert({
                where: { type: 'DEPOSIT' },
                update: { balance: body.deposit },
                create: { type: 'DEPOSIT', balance: body.deposit },
            });
        }

        if (body.cma !== undefined) {
            await prisma.cashAccount.upsert({
                where: { type: 'CMA' },
                update: { balance: body.cma },
                create: { type: 'CMA', balance: body.cma },
            });
        }

        if (body.totalDeposit !== undefined) {
            await prisma.cashAccount.upsert({
                where: { type: 'TOTAL_DEPOSIT' },
                update: { balance: body.totalDeposit },
                create: { type: 'TOTAL_DEPOSIT', balance: body.totalDeposit },
            });
        }

        if (body.totalWithdrawal !== undefined) {
            await prisma.cashAccount.upsert({
                where: { type: 'TOTAL_WITHDRAWAL' },
                update: { balance: body.totalWithdrawal },
                create: { type: 'TOTAL_WITHDRAWAL', balance: body.totalWithdrawal },
            });
        }

        // Return the updated state
        const accounts = await prisma.cashAccount.findMany();
        return NextResponse.json({
            deposit: accounts.find(a => a.type === 'DEPOSIT')?.balance || 0,
            cma: accounts.find(a => a.type === 'CMA')?.balance || 0,
            totalDeposit: accounts.find(a => a.type === 'TOTAL_DEPOSIT')?.balance || 0,
            totalWithdrawal: accounts.find(a => a.type === 'TOTAL_WITHDRAWAL')?.balance || 0
        });
    } catch (e: any) {
        console.error("CRITICAL: Failed to update cash balance:", e.message, e.stack);
        return NextResponse.json({ error: e.message || "Failed to save data" }, { status: 500 });
    }
}
