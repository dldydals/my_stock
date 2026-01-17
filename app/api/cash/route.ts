import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "data", "cash-holdings.json");

export async function GET() {
    try {
        const data = await fs.readFile(DATA_FILE_PATH, "utf8");
        return NextResponse.json(JSON.parse(data));
    } catch (e) {
        // If file doesn't exist, return default
        return NextResponse.json({ deposit: 0, cma: 0 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // Validate or sanitize if needed, but for now we trust the client sends correct shape
        // body should be { deposit: number, cma: number }

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(body, null, 2));

        return NextResponse.json(body);
    } catch (e) {
        return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
}
