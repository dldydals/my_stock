import { Holding } from "./types";

export const FEES = {
  BUY_FEE_RATE: 0.00015,
  SELL_FEE_RATE: 0.00015,
  TAX_RATE: 0.0018,
};

export const COLORS = ["#818CF8", "#F472B6", "#34D399", "#FBBF24", "#A78BFA", "#60A5FA"];

export const INITIAL_HOLDINGS: Holding[] = [
  // ... 기존의 긴 데이터 배열을 여기에 넣으세요 ...
  // SK스퀘어
  { id: 1, name: "SK스퀘어", code: "402340", date: "2025-02-20", quantity: 100, buyPrice: 101100, currentPrice: 321000 },
  { id: 2, name: "SK스퀘어", code: "402340", date: "2025-03-27", quantity: 100, buyPrice: 96600, currentPrice: 321000 },
  { id: 3, name: "SK스퀘어", code: "402340", date: "2025-03-31", quantity: 107, buyPrice: 92000, currentPrice: 321000 },
  { id: 4, name: "SK스퀘어", code: "402340", date: "2025-04-22", quantity: 28, buyPrice: 82200, currentPrice: 321000 },
  { id: 5, name: "SK스퀘어", code: "402340", date: "2025-09-24", quantity: 119, buyPrice: 213000, currentPrice: 321000 },
  // 현대차우
  { id: 6, name: "현대차우", code: "005385", date: "2025-02-03", quantity: 54, buyPrice: 159000, currentPrice: 203500 },
  { id: 7, name: "현대차우", code: "005385", date: "2025-02-03", quantity: 47, buyPrice: 157200, currentPrice: 203500 },
  { id: 8, name: "현대차우", code: "005385", date: "2025-02-17", quantity: 100, buyPrice: 156000, currentPrice: 203500 },
  { id: 9, name: "현대차우", code: "005385", date: "2025-02-25", quantity: 98, buyPrice: 159000, currentPrice: 203500 },
  { id: 10, name: "현대차우", code: "005385", date: "2025-11-06", quantity: 50, buyPrice: 197500, currentPrice: 203500 },
  { id: 11, name: "현대차우", code: "005385", date: "2025-11-28", quantity: 100, buyPrice: 193500, currentPrice: 203500 },
  // KB금융
  { id: 12, name: "KB금융", code: "105560", date: "2025-11-14", quantity: 100, buyPrice: 129500, currentPrice: 126100 },
  // 현대모비스
  { id: 13, name: "현대모비스", code: "012330", date: "2021-07-22", quantity: 68, buyPrice: 280000, currentPrice: 365000 },
  { id: 14, name: "현대모비스", code: "012330", date: "2021-07-28", quantity: 32, buyPrice: 271500, currentPrice: 365000 },
  // LG디스플레이
  { id: 15, name: "LG디스플레이", code: "034220", date: "2021-06-11", quantity: 283, buyPrice: 23000, currentPrice: 11850 },
  { id: 16, name: "LG디스플레이", code: "034220", date: "2021-10-29", quantity: 180, buyPrice: 18400, currentPrice: 11850 },
  { id: 17, name: "LG디스플레이", code: "034220", date: "2021-11-15", quantity: 55, buyPrice: 20200, currentPrice: 11850 },
  { id: 18, name: "LG디스플레이", code: "034220", date: "2022-02-03", quantity: 209, buyPrice: 19400, currentPrice: 11850 },
  { id: 19, name: "LG디스플레이", code: "034220", date: "2022-02-07", quantity: 465, buyPrice: 19350, currentPrice: 11850 },
  // 대아티아이
  { id: 20, name: "대아티아이", code: "045390", date: "2025-06-30", quantity: 130, buyPrice: 5290, currentPrice: 4105 },
  { id: 21, name: "대아티아이", code: "045390", date: "2025-08-29", quantity: 200, buyPrice: 4805, currentPrice: 4105 },
  { id: 22, name: "대아티아이", code: "045390", date: "2025-09-01", quantity: 200, buyPrice: 4650, currentPrice: 4105 },
  { id: 23, name: "대아티아이", code: "045390", date: "2025-09-08", quantity: 200, buyPrice: 4540, currentPrice: 4105 },
  // 진원생명과학
  { id: 24, name: "진원생명과학", code: "011000", date: "2022-03-10", quantity: 301, buyPrice: 16600, currentPrice: 1959 },
];