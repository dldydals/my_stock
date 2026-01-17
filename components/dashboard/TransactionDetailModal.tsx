import React, { useState, useEffect } from "react";
import { AnalyzedHolding } from "./types";
import { X, Trash2, Calculator } from "lucide-react";
import { FEES } from "./constants";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transaction: AnalyzedHolding | null;
    onDelete?: (id: number) => void;
}

export const TransactionDetailModal: React.FC<Props> = ({
    isOpen,
    onClose,
    transaction,
    onDelete,
}) => {
    const [simulationPrice, setSimulationPrice] = useState<number>(0);

    useEffect(() => {
        if (transaction) {
            setSimulationPrice(transaction.currentPrice);
        }
    }, [transaction?.currentPrice, isOpen]);

    if (!isOpen || !transaction) return null;

    const isProfit = transaction.netProfit >= 0;
    const isRise = (transaction.change_rate || 0) > 0;
    const isFall = (transaction.change_rate || 0) < 0;
    const changeRateColor = isRise ? "text-red-500" : isFall ? "text-blue-500" : "text-gray-500";
    const profitColor = isProfit ? "text-red-600" : "text-blue-600";
    const profitBgColor = isProfit ? "bg-red-50" : "bg-blue-50";

    // Simulation Calculations
    const simCurrentAmount = simulationPrice * transaction.quantity;
    const simSellFee = simCurrentAmount * FEES.SELL_FEE_RATE;
    const simTax = simCurrentAmount * FEES.TAX_RATE;
    // Note: Buy fee is already incurred, so we subtract it from the profit as well.
    // Total Cost = Buy Amount + Buy Fee
    // Net Proceeds = Sell Amount - Sell Fee - Tax
    // Net Profit = Net Proceeds - Total Cost

    // However, existing "netProfit" calculation in useStockData.ts is:
    // const buyFee = buyAmount * FEES.BUY_FEE_RATE;
    // const sellFee = currentAmount * FEES.SELL_FEE_RATE; // This assumes selling at current price
    // const tax = currentAmount * FEES.TAX_RATE;
    // const totalFees = Math.floor(buyFee + sellFee + tax);
    // const netProfit = grossProfit - totalFees;

    // So distinct terms:
    const buyFee = transaction.buyAmount * FEES.BUY_FEE_RATE;
    const simTotalFees = Math.floor(buyFee + simSellFee + simTax);
    const simGrossProfit = simCurrentAmount - transaction.buyAmount;
    const simNetProfit = simGrossProfit - simTotalFees;
    const simReturnRate = transaction.buyAmount > 0
        ? ((simNetProfit / transaction.buyAmount) * 100).toFixed(2)
        : "0.00";

    const isSimProfit = simNetProfit >= 0;
    const simProfitColor = isSimProfit ? "text-red-600" : "text-blue-600";


    const handleDelete = () => {
        if (confirm("정말로 이 거래 내역을 삭제하시겠습니까? (삭제 시 복구 불가)")) {
            onDelete?.(transaction.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gray-50/80 px-6 py-4 flex justify-between items-center border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{transaction.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{transaction.code}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Main Stats */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">매수일자</p>
                            <p className="font-semibold text-gray-800">{transaction.date}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">보유수량</p>
                            <p className="font-semibold text-gray-800">{transaction.quantity.toLocaleString()}주</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        {/* Buy Side */}
                        <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">매수단가</p>
                                <p className="font-semibold text-gray-700">{transaction.buyPrice.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">매수금액</p>
                                <p className="font-bold text-gray-800">{transaction.buyAmount.toLocaleString()}원</p>
                            </div>
                        </div>

                        {/* Current Side */}
                        <div className="bg-indigo-50/30 p-4 rounded-2xl space-y-3 border border-indigo-100/50">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">현재가</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`font-bold ${changeRateColor}`}>
                                        {transaction.currentPrice.toLocaleString()}원
                                    </span>
                                    <span className={`text-[10px] ${changeRateColor}`}>
                                        ({Math.abs(transaction.change_rate || 0).toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 mb-1">평가금액</p>
                                <p className="font-bold text-indigo-900">{transaction.currentAmount.toLocaleString()}원</p>
                            </div>
                        </div>
                    </div>

                    {/* Profit Summary */}
                    <div className={`p-5 rounded-2xl ${profitBgColor} flex justify-between items-center`}>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">평가손익</p>
                            <p className={`text-xl font-extrabold ${profitColor}`}>
                                {isProfit ? "+" : ""}{transaction.netProfit.toLocaleString()}원
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 mb-1">수익률</p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold bg-white/60 ${profitColor}`}>
                                {isProfit ? "+" : ""}{transaction.returnRate}%
                            </span>
                        </div>
                    </div>

                    {/* Simulation Section */}
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold">
                            <Calculator className="w-5 h-5" />
                            <span>매도 시뮬레이션 (What-If)</span>
                        </div>
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                            <div className="mb-4">
                                <label className="block text-xs text-gray-500 font-semibold mb-1.5 ml-1">
                                    예상 매도가 입력
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={simulationPrice}
                                        onChange={(e) => setSimulationPrice(Number(e.target.value))}
                                        className="w-full pl-4 pr-10 py-3 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 font-bold text-gray-800 shadow-sm"
                                        placeholder="매도 예상가"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">원</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                <div className="text-gray-500 text-sm font-medium">예상 손익</div>
                                <div className="text-right">
                                    <p className={`font-extrabold ${simProfitColor}`}>
                                        {isSimProfit ? "+" : ""}{simNetProfit.toLocaleString()}원
                                    </p>
                                    <p className={`text-xs ${simProfitColor} font-bold mt-0.5`}>
                                        ({isSimProfit ? "+" : ""}{simReturnRate}%)
                                    </p>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                * 매수 수수료, 매도 수수료, 제세금 포함 예상치
                            </p>
                        </div>
                    </div>

                    {/* Delete Button */}
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors font-semibold"
                        >
                            <Trash2 className="w-4 h-4" /> 거래 내역 삭제
                        </button>
                    )}

                </div>

            </div>
        </div>
    );
};
