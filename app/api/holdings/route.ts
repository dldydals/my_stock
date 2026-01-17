import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'stock-holdings.json');

export async function GET() {
    try {
        const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        const holdings = JSON.parse(data);
        return NextResponse.json(holdings);
    } catch (error) {
        console.error('Error reading holdings data:', error);
        return NextResponse.json({ error: 'Failed to read holdings data' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const newHolding = await req.json();
        const data = await fs.readFile(DATA_FILE_PATH, "utf8");
        const holdings: any[] = JSON.parse(data);

        // Assign a new ID (simple max + 1 logic)
        const maxId = holdings.reduce((max, h) => Math.max(max, h.id || 0), 0);
        const holdingWithId = { ...newHolding, id: maxId + 1 };

        holdings.push(holdingWithId);

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(holdings, null, 2));

        return NextResponse.json(holdingWithId);
    } catch (e) {
        return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const data = await fs.readFile(DATA_FILE_PATH, "utf8");
        let holdings: any[] = JSON.parse(data);

        holdings = holdings.filter((h) => h.id !== Number(id));

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(holdings, null, 2));

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to delete data" }, { status: 500 });
    }
}
