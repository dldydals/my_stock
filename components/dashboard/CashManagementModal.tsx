import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { CashData } from "./types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    cashData: CashData;
    onUpdate: (data: CashData) => void;
}

export const CashManagementModal: React.FC<Props> = ({
    isOpen,
    onClose,
    cashData,
    onUpdate,
}) => {
    const [deposit, setDeposit] = useState<number>(0);
    const [cma, setCma] = useState<number>(0);

    useEffect(() => {
        if (isOpen) {
            setDeposit(cashData.deposit);
            setCma(cashData.cma);
        }
    }, [isOpen, cashData]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({ deposit, cma });
        onClose();
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

                {/* Header */}
                <div className="bg-gray-50/80 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">현금 자산 관리</h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                예수금 (D+2)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={deposit}
                                    onChange={(e) => setDeposit(Number(e.target.value))}
                                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-bold text-gray-800 transition-all outline-none"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">원</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                CMA / 기타 현금
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={cma}
                                    onChange={(e) => setCma(Number(e.target.value))}
                                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-bold text-gray-800 transition-all outline-none"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">원</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="bg-indigo-50 rounded-xl p-4 flex justify-between items-center mb-6">
                                <span className="text-sm text-gray-600 font-medium">합계</span>
                                <span className="text-lg font-extrabold text-indigo-700">{(deposit + cma).toLocaleString()}원</span>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                <Save className="w-5 h-5" /> 저장하기
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};
