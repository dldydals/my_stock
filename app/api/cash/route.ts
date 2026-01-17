import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "cash-holdings.json");

async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE_PATH);
    } catch {
        const dir = path.dirname(DATA_FILE_PATH);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify({ deposit: 0, cma: 0 }, null, 2), 'utf-8');
    }
}

export async function GET() {
    try {
        await ensureDataFile();
        const data = await fs.readFile(DATA_FILE_PATH, "utf8");
        return NextResponse.json(JSON.parse(data));
    } catch (e) {
        // If file doesn't exist, return default
        return NextResponse.json({ deposit: 0, cma: 0 });
    }
}

export async function POST(req: Request) {
    try {
        await ensureDataFile();
        const body = await req.json();
        // Validate or sanitize if needed, but for now we trust the client sends correct shape
        // body should be { deposit: number, cma: number }

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(body, null, 2));

        return NextResponse.json(body);
    } catch (e) {
        return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
}
