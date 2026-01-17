import React, { useState } from "react";
import { X, Calendar, DollarSign, hash, FileText } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: NewTransactionData) => void;
}

export interface NewTransactionData {
    name: string;
    code: string;
    date: string;
    quantity: number;
    buyPrice: number;
}

export const AddTransactionModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState<NewTransactionData>({
        name: "",
        code: "",
        date: new Date().toISOString().split("T")[0],
        quantity: 0,
        buyPrice: 0,
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd(formData);
        // Reset form or just close (parent handles fetch/refresh)
        setFormData({
            name: "",
            code: "",
            date: new Date().toISOString().split("T")[0],
            quantity: 0,
            buyPrice: 0,
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "quantity" || name === "buyPrice" ? Number(value) : value,
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-gray-50/80 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">거래 내역 추가</h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 종목명 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            종목명
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                            placeholder="예: 삼성전자"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    {/* 종목코드 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            종목코드
                        </label>
                        <input
                            type="text"
                            name="code"
                            required
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-gray-800 placeholder:text-gray-400"
                            placeholder="예: 005930"
                            value={formData.code}
                            onChange={handleChange}
                        />
                    </div>

                    {/* 날짜 */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            매수일자
                        </label>
                        <input
                            type="date"
                            name="date"
                            required
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-gray-800"
                            value={formData.date}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* 수량 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                수량
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                required
                                min="1"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-right text-gray-800"
                                value={formData.quantity}
                                onChange={handleChange}
                            />
                        </div>
                        {/* 단가 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                매수단가
                            </label>
                            <input
                                type="number"
                                name="buyPrice"
                                required
                                min="0"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-right text-gray-800"
                                value={formData.buyPrice}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
                    >
                        추가하기
                    </button>
                </form>
            </div>
        </div>
    );
};
