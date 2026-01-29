import { useState, useEffect } from 'react';

export interface WatchlistItem {
    ticker: string;
    name: string;
    price: number;
    changeRate: number;
    changeAmount: number;
}

export function useWatchlist() {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWatchlist = async () => {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
            const res = await fetch('/api/watchlist', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('Watchlist fetch timed out');
            } else {
                console.error('Failed to fetch watchlist:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const addToWatchlist = async (ticker: string, name: string) => {
        try {
            const res = await fetch('/api/watchlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, name }),
            });
            if (res.ok) {
                await fetchWatchlist();
            }
        } catch (error) {
            console.error('Failed to add to watchlist:', error);
        }
    };

    const removeFromWatchlist = async (ticker: string) => {
        try {
            const res = await fetch(`/api/watchlist/${ticker}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setItems(prev => prev.filter(item => item.ticker !== ticker));
            }
        } catch (error) {
            console.error('Failed to remove from watchlist:', error);
        }
    };

    const convertToHolding = async (ticker: string, values: any) => {
        try {
            // 1. Create transaction (BUY)
            const tradeRes = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    name: values.name || items.find(i => i.ticker === ticker)?.name,
                    type: 'BUY',
                    quantity: values.quantity,
                    price: values.price,
                    fee: 0,
                    tradeDate: values.tradeDate
                }),
            });

            if (tradeRes.ok) {
                // 2. Remove from watchlist
                await removeFromWatchlist(ticker);
                return { success: true };
            }
            throw new Error('Failed to create transaction');
        } catch (error) {
            console.error('Failed to convert to holding:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    return { items, loading, addToWatchlist, removeFromWatchlist, convertToHolding, refresh: fetchWatchlist };
}
