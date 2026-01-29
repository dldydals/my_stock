import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: { ticker: string } }
) {
    try {
        const { ticker } = params;

        const deleteResult = await prisma.watchlist.deleteMany({
            where: { ticker },
        });

        if (deleteResult.count === 0) {
            return NextResponse.json({ error: '삭제할 종목을 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Failed to delete from watchlist:', error);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}
