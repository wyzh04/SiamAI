import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Truck, Plane, Ship, Package, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { AnalysisData, TargetMarket } from '../types';

const EXCHANGE_RATE_CNY_THB = 5.0; // 1 CNY = 5 THB
const EXCHANGE_RATE_CNY_PHP = 8.0; // 1 CNY = 8 PHP

interface LogisticsOption {
  id: string;
  name: string;
  type: 'air' | 'land' | 'sea' | 'standard';
  icon: React.ReactNode;
}

const LOGISTICS_OPTIONS: LogisticsOption[] = [
  { id: 'standard', name: 'Standard 渠道', type: 'standard', icon: <Package size={20} /> },
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
  const [zone, setZone] = useState<'A' | 'B' | 'C'>('A');

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

  const exchangeRate = market === 'TH' ? EXCHANGE_RATE_CNY_THB : EXCHANGE_RATE_CNY_PHP;
  const currencySymbol = market === 'TH' ? '฿' : '₱';

  // Generate Price Table based on market
  const priceTable = useMemo(() => {
    const rows = [];
    if (market === 'TH') {
      // TH Logic: 10g steps
      for (let g = 10; g <= 2000; g += 10) {
        const steps = g / 10;
        rows.push({
          weight: g,
          zoneA: 23 + steps,
          zoneB: 36 + steps,
          zoneC: 79 + steps,
        });
      }
    } else {
      // PH Logic: 100g steps (simulated for simplicity)
      for (let g = 100; g <= 2000; g += 100) {
        const weightFactor = g / 100;
        rows.push({
          weight: g,
          zoneA: Math.round(45 + (weightFactor * 5)), // NCR
          zoneB: Math.round(65 + (weightFactor * 8)), // Luzon
          zoneC: Math.round(85 + (weightFactor * 10)), // VisMin
        });
      }
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
    
    let shippingLocal = 0;
    let shippingCNY = 0;

    if (selectedLogisticId === 'standard') {
       if (market === 'TH') {
           const chargeWeightG = Math.ceil(chargeWeightKg * 1000 / 10) * 10;
           const steps = chargeWeightG / 10;
           let base = 23;
           if (zone === 'B') base = 36;
           if (zone === 'C') base = 79;
           shippingLocal = base + steps;
       } else {
           // PH Standard
           const chargeWeightG = Math.ceil(chargeWeightKg * 1000 / 100) * 100;
           const weightFactor = chargeWeightG / 100;
           let base = 45; let rate = 5;
           if (zone === 'B') { base = 65; rate = 8; }
           if (zone === 'C') { base = 85; rate = 10; }
           shippingLocal = base + (weightFactor * rate);
       }
       shippingCNY = shippingLocal / exchangeRate;
    } else {
       // Bulk Rates
       let pricePerKg = 0;
       let minWeight = 0;
       
       if (market === 'TH') {
           if (selectedLogisticId === 'land') { pricePerKg = 6; minWeight = 0.1; }
           if (selectedLogisticId === 'air') { pricePerKg = 25; minWeight = 0.5; }
           if (selectedLogisticId === 'sea') { pricePerKg = 3; minWeight = 10; }
       } else {
           if (selectedLogisticId === 'land') { pricePerKg = 8; minWeight = 0.1; }
           if (selectedLogisticId === 'air') { pricePerKg = 35; minWeight = 0.5; }
           if (selectedLogisticId === 'sea') { pricePerKg = 5; minWeight = 10; }
       }

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
      shippingCostLocal: parseFloat(shippingLocal.toFixed(0)),
      shippingCostCNY: parseFloat(shippingCNY.toFixed(2)),
      totalCostCNY: parseFloat(totalBaseCostCNY.toFixed(2)),
      suggestedPriceLocal: Math.ceil(sellingPriceLocal),
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in h-[calc(100vh-140px)] min-h-[600px]">
      {/* --- Left Column --- */}
      <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-2 scrollbar-hide">
        
        {/* Market Stats */}
        {marketStats && (
          <div className={`rounded-2xl shadow-md text-white p-6 relative overflow-hidden ${market === 'TH' ? 'bg-gradient-to-r from-teal-600 to-emerald-600' : 'bg-gradient-to-r from-indigo-600 to-purple-700'}`}>
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp size={100} />
             </div>
             
             <div className="relative z-10">
                <h3 className="flex items-center gap-2 font-bold text-lg mb-4">
                  <TrendingUp size={20} /> {market === 'TH' ? '泰国' : '菲律宾'}市场价格情报
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                   {marketStats.items.map((item, idx) => {
                     const { profitCNY, marginPercent } = calculateMarginAtPrice(item.price);
                     const isProfitable = profitCNY > 0;

                     return (
                       <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                          <div className="text-xs text-white/80 mb-1">{item.name}</div>
                          <div className="text-xl font-bold mb-2">{currencySymbol} {item.price}</div>
                          
                          <div className={`text-xs px-2 py-1 rounded flex items-center justify-between ${isProfitable ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                             <span>利润: ¥{profitCNY.toFixed(1)}</span>
                             <span className="font-bold">{marginPercent.toFixed(0)}%</span>
                          </div>
                       </div>
                     );
                   })}
                </div>
                
                <div className="flex justify-between items-center text-xs text-white/80 bg-black/20 p-2 rounded-lg">
                   <span>市场均价: {currencySymbol} {marketStats.avg.toFixed(0)}</span>
                   <span>建议: {results.suggestedPriceLocal < marketStats.avg ? "✅ 有价格优势" : "⚠️ 高于市场均价"}</span>
                </div>
             </div>
          </div>
        )}

        {/* Calculator Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calculator className="text-indigo-600" size={20}/>
              {market === 'TH' ? '泰国' : '菲律宾'}定价计算器
            </h3>
            <span className="text-xs text-slate-400">汇率 1:{exchangeRate.toFixed(1)}</span>
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
                   
                   {/* Zone Selector - Only for Standard */}
                   {selectedLogisticId === 'standard' && (
                     <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <label className="flex items-center gap-2 text-sm font-bold text-orange-800 mb-2">
                           <MapPin size={14} /> 配送区域 (Zone)
                        </label>
                        <div className="flex rounded-md shadow-sm">
                           {['A', 'B', 'C'].map((z) => (
                             <button
                               key={z}
                               onClick={() => setZone(z as any)}
                               className={`flex-1 py-1.5 text-xs font-medium border first:rounded-l-md last:rounded-r-md ${
                                 zone === z 
                                   ? 'bg-orange-500 text-white border-orange-500' 
                                   : 'bg-white text-slate-600 border-orange-200 hover:bg-orange-100'
                               }`}
                             >
                               Zone {z}
                             </button>
                           ))}
                        </div>
                        <div className="text-[10px] text-orange-600/70 mt-1.5">
                           {market === 'TH' 
                              ? (zone === 'A' ? '曼谷及周边地区' : zone === 'B' ? '外府地区' : '偏远/岛屿地区')
                              : (zone === 'A' ? 'NCR (Metro Manila)' : zone === 'B' ? 'Luzon (Provincial)' : 'Visayas & Mindanao')
                           }
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
                   {currencySymbol} {results.suggestedPriceLocal}
                 </div>
                 {marketStats && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                       results.suggestedPriceLocal < marketStats.avg 
                       ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                       : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}>
                       {results.suggestedPriceLocal < marketStats.avg 
                         ? `低于均价 ${(marketStats.avg - results.suggestedPriceLocal).toFixed(0)}` 
                         : `高于均价 ${(results.suggestedPriceLocal - marketStats.avg).toFixed(0)}`
                       }
                    </div>
                 )}
               </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm pt-4 border-t border-slate-700/50">
               <div>
                 <span className="text-slate-400 block mb-1">预估运费</span>
                 <span className="font-semibold text-white text-lg">{currencySymbol} {results.shippingCostLocal}</span>
                 <span className="text-xs text-slate-500 block">(¥ {results.shippingCostCNY})</span>
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
           <p className="text-xs text-indigo-600/70 mt-1">
             市场：{market === 'TH' ? '泰国 (Thailand)' : '菲律宾 (Philippines)'}
           </p>
         </div>
         
         <div className="flex-1 overflow-auto bg-white scrollbar-hide">
           <table className="w-full text-sm text-center relative">
             <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
               <tr>
                 <th className="px-3 py-3 font-semibold border-b border-r">重量 (g)</th>
                 <th className="px-3 py-3 font-semibold text-blue-600 border-b border-r bg-blue-50/50">Zone A</th>
                 <th className="px-3 py-3 font-semibold text-indigo-600 border-b border-r bg-indigo-50/50">Zone B</th>
                 <th className="px-3 py-3 font-semibold text-purple-600 border-b bg-purple-50/50">Zone C</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {priceTable.map((row) => (
                 <tr 
                    key={row.weight} 
                    className={`hover:bg-slate-50 transition-colors ${
                      Math.abs(row.weight - (results.chargeableWeight * 1000)) < (market === 'TH' ? 5 : 50) ? 'bg-yellow-50 font-bold' : ''
                    }`}
                 >
                   <td className="px-3 py-2 text-slate-900 font-medium border-r bg-slate-50/30">{row.weight}</td>
                   <td className={`px-3 py-2 border-r ${zone === 'A' ? 'text-blue-700 bg-blue-50/30 font-bold' : 'text-slate-500'}`}>{row.zoneA}</td>
                   <td className={`px-3 py-2 border-r ${zone === 'B' ? 'text-indigo-700 bg-indigo-50/30 font-bold' : 'text-slate-500'}`}>{row.zoneB}</td>
                   <td className={`px-3 py-2 ${zone === 'C' ? 'text-purple-700 bg-purple-50/30 font-bold' : 'text-slate-500'}`}>{row.zoneC}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};