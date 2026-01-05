import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Truck, Plane, Ship, Package, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { AnalysisData, TargetMarket } from '../types';

// Exchange Rates (Approximate)
const RATES = {
  TH: 5.0,   // 1 CNY = 5 THB
  PH: 8.0,   // 1 CNY = 8 PHP
  VN: 3500,  // 1 CNY = 3500 VND
  MY: 0.65,  // 1 CNY = 0.65 MYR
  SG: 0.19,  // 1 CNY = 0.19 SGD
  ID: 2200   // 1 CNY = 2200 IDR
};

interface LogisticsOption {
  id: string;
  name: string;
  type: 'air' | 'land' | 'sea' | 'standard';
  icon: React.ReactNode;
}

const LOGISTICS_OPTIONS: LogisticsOption[] = [
  { id: 'standard', name: 'Standard / Economy', type: 'standard', icon: <Package size={20} /> },
  { id: 'land', name: '陆运专线', type: 'land', icon: <Truck size={20} /> },
  { id: 'air', name: '空运特快', type: 'air', icon: <Plane size={20} /> },
  { id: 'sea', name: '大件海运', type: 'sea', icon: <Ship size={20} /> },
];

interface LogisticsCalculatorProps {
  contextData?: AnalysisData | null;
  market: TargetMarket;
}

export const LogisticsCalculator: React.FC<LogisticsCalculatorProps> = ({ contextData, market }) => {
  // Inputs
  const [costCNY, setCostCNY] = useState<number>(20);
  const [weightKg, setWeightKg] = useState<number>(0.1); 
  const [length, setLength] = useState<number>(10);
  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(5);
  const [targetMargin, setTargetMargin] = useState<number>(30); // %
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(8);
  
  const [selectedLogisticId, setSelectedLogisticId] = useState<string>('standard');
  const [zone, setZone] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Results
  const [results, setResults] = useState({
    volumetricWeight: 0,
    chargeableWeight: 0,
    shippingCostLocal: 0, 
    shippingCostCNY: 0,
    totalCostCNY: 0,
    suggestedPriceLocal: 0,
    netProfitCNY: 0
  });

  const exchangeRate = RATES[market] || 5.0;
  
  const getCurrencySymbol = (m: TargetMarket) => {
    switch (m) {
        case 'TH': return '฿';
        case 'PH': return '₱';
        case 'VN': return '₫';
        case 'MY': return 'RM';
        case 'SG': return 'S$';
        case 'ID': return 'Rp';
        default: return '$';
    }
  };
  const currencySymbol = getCurrencySymbol(market);

  // --- Dynamic Pricing Table Generation ---
  const priceTable = useMemo(() => {
    const rows = [];
    const limit = market === 'ID' || market === 'VN' ? 500 : 1000; // Reduce rows for high-number currencies visually
    const step = 10; // 10g step for all based on new logic
    
    for (let g = 10; g <= limit; g += step) {
        const units = Math.ceil(g / 10);
        let rowData: any = { weight: g };

        if (market === 'TH') {
            // TH: 10g steps. Buyer Fee + (Units * 1)
            rowData.col1 = 23 + units; // Zone A
            rowData.col2 = 36 + units; // Zone B
            rowData.col3 = 79 + units; // Zone C
        } else if (market === 'PH') {
            // PH: 10g steps. Buyer Fee + (Units * 4.5)
            const cb = units * 4.5;
            rowData.col1 = 40 + cb; // Manila
            rowData.col2 = 60 + cb; // Other
        } else if (market === 'VN') {
            // VN: Economy. 10g steps.
            // Zone A: Buyer 15k, Cost: Start 15.9k, Next 900
            // Zone B/C: Buyer 17k, Cost: Start 17.9k, Next 900
            // Zone D: Buyer 30k, Cost: Start 30.9k, Next 900
            // Logic: Total = Base + ((Units-1) * 900)
            const addOn = (units - 1) * 900;
            rowData.col1 = 15900 + addOn; // Zone A
            rowData.col2 = 17900 + addOn; // Zone B/C
            rowData.col3 = 30900 + addOn; // Zone D
        } else if (market === 'MY') {
             // MY: Standard. 
             // West (Zone A): Buyer 4.50. Cost: Start 4.65, Next 0.15
             // East (Zone B): Buyer 8.00. Cost: Start 8.15, Next 0.15
             const addOn = (units - 1) * 0.15;
             rowData.col1 = 4.65 + addOn;
             rowData.col2 = 8.15 + addOn;
        } else if (market === 'SG') {
             // SG: Standard.
             // All: Buyer 0.80. Cost: Start 1.50, Next 0.15
             const addOn = (units - 1) * 0.15;
             rowData.col1 = 1.50 + addOn;
        } else if (market === 'ID') {
             // ID: Placeholder Logic (Standard Shopee ID style)
             // Base 10000, Next 1000 per 10g
             const addOn = (units - 1) * 1000;
             rowData.col1 = 10000 + addOn; // Jawa
             rowData.col2 = 20000 + addOn; // Luar Jawa
        }

        rows.push(rowData);
    }
    return rows;
  }, [market]);

  // Calculate market average if data exists
  const marketStats = useMemo(() => {
    if (!contextData?.priceData || contextData.priceData.length === 0) return null;
    const prices = contextData.priceData.map(d => d.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { avg, items: contextData.priceData };
  }, [contextData]);

  useEffect(() => {
    calculate();
  }, [costCNY, weightKg, length, width, height, targetMargin, platformFeePercent, selectedLogisticId, zone, market]);

  const calculate = () => {
    // 1. Weight Calculation
    const volWeight = (length * width * height) / 6000;
    const chargeWeightKg = Math.max(weightKg, volWeight);
    const chargeWeightG = Math.ceil(chargeWeightKg * 1000 / 10) * 10;
    const units = chargeWeightG / 10;
    
    let shippingLocal = 0;
    let shippingCNY = 0;

    if (selectedLogisticId === 'standard') {
       if (market === 'TH') {
           // TH Logic
           const buyerFee = zone === 'A' ? 23 : (zone === 'B' ? 36 : 79);
           shippingLocal = buyerFee + (units * 1);
       } else if (market === 'PH') {
           // PH Logic
           const buyerFee = zone === 'A' ? 40 : 60;
           shippingLocal = buyerFee + (units * 4.5);
       } else if (market === 'VN') {
           // VN Logic (Economy)
           const stepPrice = 900;
           const addOn = (units - 1) * stepPrice;
           let base = 15900; // Zone A
           if (zone === 'B' || zone === 'C') base = 17900;
           if (zone === 'D') base = 30900;
           shippingLocal = base + (addOn > 0 ? addOn : 0);
       } else if (market === 'MY') {
           // MY Logic
           const stepPrice = 0.15;
           const addOn = (units - 1) * stepPrice;
           let base = 4.65; // West
           if (zone === 'B') base = 8.15; // East
           shippingLocal = base + (addOn > 0 ? addOn : 0);
       } else if (market === 'SG') {
           // SG Logic
           const stepPrice = 0.15;
           const addOn = (units - 1) * stepPrice;
           shippingLocal = 1.50 + (addOn > 0 ? addOn : 0);
       } else {
           // ID Logic (Generic)
           const stepPrice = 1000;
           const addOn = (units - 1) * stepPrice;
           let base = 10000; // Jawa
           if (zone !== 'A') base = 20000;
           shippingLocal = base + (addOn > 0 ? addOn : 0);
       }
       
       shippingCNY = shippingLocal / exchangeRate;
    } else {
       // Bulk Rates (Estimates)
       const rates: Record<string, {land: number, air: number, sea: number}> = {
           TH: { land: 6, air: 25, sea: 3 },
           PH: { land: 8, air: 35, sea: 5 },
           VN: { land: 4, air: 18, sea: 2 },
           MY: { land: 7, air: 28, sea: 4 },
           SG: { land: 8, air: 30, sea: 5 },
           ID: { land: 10, air: 40, sea: 6 }
       };
       const mRates = rates[market] || rates.TH;
       let pricePerKg = 0;
       
       if (selectedLogisticId === 'land') pricePerKg = mRates.land;
       if (selectedLogisticId === 'air') pricePerKg = mRates.air;
       if (selectedLogisticId === 'sea') pricePerKg = mRates.sea;

       let minWeight = selectedLogisticId === 'sea' ? 10 : 0.1;
       let finalWeight = chargeWeightKg < minWeight ? minWeight : chargeWeightKg;
       shippingCNY = finalWeight * pricePerKg;
       shippingLocal = shippingCNY * exchangeRate;
    }

    const totalBaseCostCNY = costCNY + shippingCNY;
    const marginDecimal = targetMargin / 100;
    const feeDecimal = platformFeePercent / 100;
    
    const divisor = 1 - feeDecimal - marginDecimal;
    let sellingPriceCNY = 0;
    
    if (divisor > 0.05) {
        sellingPriceCNY = totalBaseCostCNY / divisor;
    } else {
        sellingPriceCNY = totalBaseCostCNY * 2;
    }

    const sellingPriceLocal = sellingPriceCNY * exchangeRate;
    const profitCNY = sellingPriceCNY * marginDecimal;

    setResults({
      volumetricWeight: parseFloat(volWeight.toFixed(3)),
      chargeableWeight: parseFloat(chargeWeightKg.toFixed(3)),
      shippingCostLocal: parseFloat(shippingLocal.toFixed(2)),
      shippingCostCNY: parseFloat(shippingCNY.toFixed(2)),
      totalCostCNY: parseFloat(totalBaseCostCNY.toFixed(2)),
      suggestedPriceLocal: market === 'VN' || market === 'ID' ? Math.ceil(sellingPriceLocal / 100) * 100 : parseFloat(sellingPriceLocal.toFixed(2)),
      netProfitCNY: parseFloat(profitCNY.toFixed(2))
    });
  };

  const calculateMarginAtPrice = (targetPriceLocal: number) => {
    const targetPriceCNY = targetPriceLocal / exchangeRate;
    const feeCNY = targetPriceCNY * (platformFeePercent / 100);
    const profitCNY = targetPriceCNY - results.totalCostCNY - feeCNY;
    const marginPercent = (profitCNY / targetPriceCNY) * 100;
    return { profitCNY, marginPercent };
  };

  // Helper for Table Headers
  const getZoneHeaders = () => {
     if (market === 'TH') return ['Zone A', 'Zone B', 'Zone C'];
     if (market === 'PH') return ['Manila', 'Other'];
     if (market === 'VN') return ['Zone A', 'Zone B/C', 'Zone D'];
     if (market === 'MY') return ['West (西马)', 'East (东马)'];
     if (market === 'SG') return ['All Regions'];
     if (market === 'ID') return ['Jawa', 'Luar Jawa'];
     return ['Zone A'];
  };

  const zoneHeaders = getZoneHeaders();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in h-[calc(100vh-140px)] min-h-[600px]">
      {/* --- Left Column --- */}
      <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide">
        
        {/* Market Stats */}
        {marketStats && (
          <div className="rounded-2xl shadow-md text-white p-6 relative overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp size={100} />
             </div>
             <div className="relative z-10">
                <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
                  <TrendingUp size={20} /> {market} 市场价格情报
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                   {marketStats.items.map((item, idx) => {
                     const { profitCNY, marginPercent } = calculateMarginAtPrice(item.price);
                     const isProfitable = profitCNY > 0;
                     return (
                       <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                          <div className="text-xs text-white/80 mb-1">{item.name}</div>
                          <div className="text-xl font-bold mb-2">{currencySymbol} {item.price.toLocaleString()}</div>
                          <div className={`text-xs px-2 py-1 rounded flex items-center justify-between ${isProfitable ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                             <span>利润: ¥{profitCNY.toFixed(1)}</span>
                             <span className="font-bold">{marginPercent.toFixed(0)}%</span>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
        )}

        {/* Calculator Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calculator className="text-indigo-600" size={20}/>
              {market} 定价计算器
            </h3>
            <span className="text-xs text-slate-400">汇率 1 CNY ≈ {exchangeRate} {market === 'VN' || market === 'ID' ? 'k ' : ''}{currencySymbol}</span>
          </div>

          <div className="p-6 space-y-6">
            {/* 1. Logistics Channel */}
            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">选择物流渠道</label>
                 <div className="grid grid-cols-4 gap-2">
                   {LOGISTICS_OPTIONS.map(opt => (
                     <button
                       key={opt.id}
                       onClick={() => setSelectedLogisticId(opt.id)}
                       className={`flex flex-col items-center justify-center p-2 rounded-xl border text-sm transition-all ${
                         selectedLogisticId === opt.id 
                           ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' 
                           : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                       }`}
                     >
                       <div className="mb-1">{opt.icon}</div>
                       <span className="font-medium text-xs scale-90">{opt.name}</span>
                     </button>
                   ))}
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 2. Product Specs */}
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">采购成本 (CNY)</label>
                     <div className="relative">
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</div>
                       <input type="number" value={costCNY} onChange={e => setCostCNY(Number(e.target.value))} className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">实重 (kg)</label>
                        <input type="number" step="0.01" value={weightKg} onChange={e => setWeightKg(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">尺寸 (cm)</label>
                        <div className="flex items-center gap-1">
                          <input type="number" placeholder="L" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full px-1 py-2 border border-slate-300 rounded-lg text-center text-xs outline-none" />
                          <input type="number" placeholder="W" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full px-1 py-2 border border-slate-300 rounded-lg text-center text-xs outline-none" />
                          <input type="number" placeholder="H" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full px-1 py-2 border border-slate-300 rounded-lg text-center text-xs outline-none" />
                        </div>
                      </div>
                   </div>
                   
                   {/* Zone Selector - Dynamic */}
                   {selectedLogisticId === 'standard' && market !== 'SG' && (
                     <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <label className="flex items-center gap-2 text-sm font-bold text-orange-800 mb-2">
                           <MapPin size={14} /> 配送区域 (Zone)
                        </label>
                        <div className="flex flex-wrap gap-1">
                           {zoneHeaders.map((header, idx) => {
                               const zoneCode = idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D'; 
                               // Map logic for VN/MY/PH
                               let mappedCode = zoneCode;
                               if (market === 'VN' && idx === 1) mappedCode = 'B'; // treat B/C as B
                               if (market === 'VN' && idx === 2) mappedCode = 'D';

                               return (
                                 <button
                                   key={idx}
                                   onClick={() => setZone(mappedCode as any)}
                                   className={`flex-1 min-w-[60px] py-1.5 text-[10px] font-medium border rounded-md ${
                                     (zone === mappedCode || (market === 'VN' && (zone === 'C' || zone === 'B') && idx === 1)) 
                                       ? 'bg-orange-500 text-white border-orange-500' 
                                       : 'bg-white text-slate-600 border-orange-200 hover:bg-orange-100'
                                   }`}
                                 >
                                   {header}
                                 </button>
                               )
                           })}
                        </div>
                     </div>
                   )}
                </div>

                {/* 3. Margins */}
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">目标利润率 (%)</label>
                      <input type="number" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">平台佣金 (%)</label>
                      <input type="number" value={platformFeePercent} onChange={e => setPlatformFeePercent(Number(e.target.value))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                   </div>
                </div>
            </div>
          </div>
        </div>
        
        {/* Result Panel */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between relative shadow-xl flex-grow min-h-[220px]">
           <div className="absolute top-0 right-0 p-6 opacity-10">
             <DollarSign size={120} />
           </div>
           
           <div className="space-y-6 relative z-10">
             <div>
               <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">建议定价 ({currencySymbol})</span>
               <div className="flex items-center gap-4 mt-1">
                 <div className="text-5xl font-bold text-green-400">
                   {currencySymbol} {results.suggestedPriceLocal.toLocaleString()}
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm pt-4 border-t border-slate-700/50">
               <div>
                 <span className="text-slate-400 block mb-1">预估运费</span>
                 <span className="font-semibold text-white text-lg">{currencySymbol} {results.shippingCostLocal.toLocaleString()}</span>
               </div>
               <div>
                 <span className="text-slate-400 block mb-1">计费重量</span>
                 <span className="font-semibold text-white text-lg">{(results.chargeableWeight * 1000).toFixed(0)} g</span>
               </div>
               <div>
                 <span className="text-slate-400 block mb-1">单件净利</span>
                 <span className="font-bold text-yellow-400 text-lg">¥ {results.netProfitCNY}</span>
               </div>
               <div>
                 <span className="text-slate-400 block mb-1">总成本</span>
                 <span className="font-semibold text-white text-lg">¥ {results.totalCostCNY}</span>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* --- Right Column: Price Table --- */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="bg-indigo-50 px-5 py-4 border-b border-indigo-100">
           <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
             <Package className="text-indigo-600" size={20}/>
             Standard 价格表 ({currencySymbol})
           </h3>
           <p className="text-xs text-indigo-600/70 mt-1">市场：{market}</p>
         </div>
         
         <div className="flex-1 overflow-auto bg-white scrollbar-hide">
           <table className="w-full text-sm text-center relative">
             <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
               <tr>
                 <th className="px-3 py-3 font-semibold border-b border-r">重量 (g)</th>
                 {zoneHeaders.map((h, i) => (
                    <th key={i} className="px-3 py-3 font-semibold text-indigo-600 border-b border-r bg-indigo-50/50">{h}</th>
                 ))}
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {priceTable.map((row) => (
                 <tr 
                    key={row.weight} 
                    className={`hover:bg-slate-50 transition-colors ${
                      Math.abs(row.weight - (results.chargeableWeight * 1000)) < 5 ? 'bg-yellow-50 font-bold' : ''
                    }`}
                 >
                   <td className="px-3 py-2 text-slate-900 font-medium border-r bg-slate-50/30">{row.weight}</td>
                   <td className={`px-3 py-2 border-r ${zone === 'A' ? 'font-bold text-indigo-700 bg-indigo-50/30' : ''}`}>{row.col1.toLocaleString()}</td>
                   {row.col2 !== undefined && <td className={`px-3 py-2 border-r ${zone === 'B' || (market === 'VN' && zone === 'C') ? 'font-bold text-indigo-700 bg-indigo-50/30' : ''}`}>{row.col2.toLocaleString()}</td>}
                   {row.col3 !== undefined && <td className={`px-3 py-2 border-r ${zone === 'C' || (market === 'VN' && zone === 'D') ? 'font-bold text-indigo-700 bg-indigo-50/30' : ''}`}>{row.col3.toLocaleString()}</td>}
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};