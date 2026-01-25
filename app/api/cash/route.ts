import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
    try {
        const accounts = await prisma.cashAccount.findMany();
        const deposit = accounts.find(a => a.type === 'DEPOSIT')?.balance || 0;
        const cma = accounts.find(a => a.type === 'CMA')?.balance || 0;

        return NextResponse.json({ deposit, cma });
    } catch (e) {
        console.error("Failed to fetch cash balance:", e);
        return NextResponse.json({ deposit: 0, cma: 0 });
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

        // Return the updated state
        const accounts = await prisma.cashAccount.findMany();
        return NextResponse.json({
            deposit: accounts.find(a => a.type === 'DEPOSIT')?.balance || 0,
            cma: accounts.find(a => a.type === 'CMA')?.balance || 0
        });
    } catch (e: any) {
        console.error("CRITICAL: Failed to update cash balance:", e.message, e.stack);
        return NextResponse.json({ error: e.message || "Failed to save data" }, { status: 500 });
    }
}
