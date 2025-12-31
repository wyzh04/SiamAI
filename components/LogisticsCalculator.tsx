import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Truck, Plane, Ship, Package, DollarSign, RefreshCw, Info, MapPin } from 'lucide-react';

const EXCHANGE_RATE_CNY_THB = 5.0; // 1 CNY = 5 THB (Approx)

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

// Helper to generate the price table based on the image formula
// Zone A: 23 + w/10
// Zone B: 36 + w/10
// Zone C: 79 + w/10
const generatePriceTable = () => {
  const rows = [];
  // Generate from 10g to 2000g (Extended based on user input showing > 1050g)
  for (let g = 10; g <= 2000; g += 10) {
    const steps = g / 10;
    rows.push({
      weight: g,
      zoneA: 23 + steps,
      zoneB: 36 + steps,
      zoneC: 79 + steps,
    });
  }
  return rows;
};

const STANDARD_PRICE_TABLE = generatePriceTable();

export const LogisticsCalculator: React.FC = () => {
  // Inputs
  const [costCNY, setCostCNY] = useState<number>(20);
  const [weightKg, setWeightKg] = useState<number>(0.1); // Default to small packet
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
    shippingCostTHB: 0, // Store THB for reference
    shippingCostCNY: 0,
    totalCostCNY: 0,
    suggestedPriceTHB: 0,
    netProfitCNY: 0
  });

  useEffect(() => {
    calculate();
  }, [costCNY, weightKg, length, width, height, targetMargin, platformFeePercent, selectedLogisticId, zone]);

  const calculate = () => {
    // 1. Weight Calculation
    const volWeight = (length * width * height) / 6000;
    // Standard channel often uses actual weight unless vol is huge, but let's stick to standard logistic rules
    const chargeWeightKg = Math.max(weightKg, volWeight);
    const chargeWeightG = Math.ceil(chargeWeightKg * 1000 / 10) * 10; // Round up to nearest 10g steps

    let shippingTHB = 0;
    let shippingCNY = 0;

    if (selectedLogisticId === 'standard') {
       // Formula derived from image
       const steps = chargeWeightG / 10;
       let base = 0;
       if (zone === 'A') base = 23;
       if (zone === 'B') base = 36;
       if (zone === 'C') base = 79;
       
       shippingTHB = base + steps;
       shippingCNY = shippingTHB / EXCHANGE_RATE_CNY_THB;
    } else {
       // Bulk Rates (Legacy)
       let pricePerKg = 0;
       let minWeight = 0;
       
       if (selectedLogisticId === 'land') { pricePerKg = 6; minWeight = 0.1; } // CNY
       if (selectedLogisticId === 'air') { pricePerKg = 25; minWeight = 0.5; }
       if (selectedLogisticId === 'sea') { pricePerKg = 3; minWeight = 10; }

       let finalWeight = chargeWeightKg < minWeight ? minWeight : chargeWeightKg;
       shippingCNY = finalWeight * pricePerKg;
       shippingTHB = shippingCNY * EXCHANGE_RATE_CNY_THB;
    }

    // 3. Total Cost (Product + Shipping)
    const totalBaseCostCNY = costCNY + shippingCNY;

    // 4. Pricing Logic
    const marginDecimal = targetMargin / 100;
    const feeDecimal = platformFeePercent / 100;
    
    const divisor = 1 - feeDecimal - marginDecimal;
    let sellingPriceCNY = 0;
    
    if (divisor > 0.05) {
        sellingPriceCNY = totalBaseCostCNY / divisor;
    } else {
        sellingPriceCNY = totalBaseCostCNY * 2;
    }

    const sellingPriceTHB = sellingPriceCNY * EXCHANGE_RATE_CNY_THB;
    const profitCNY = sellingPriceCNY * marginDecimal;

    setResults({
      volumetricWeight: parseFloat(volWeight.toFixed(3)),
      chargeableWeight: parseFloat(chargeWeightKg.toFixed(3)),
      shippingCostTHB: parseFloat(shippingTHB.toFixed(0)),
      shippingCostCNY: parseFloat(shippingCNY.toFixed(2)),
      totalCostCNY: parseFloat(totalBaseCostCNY.toFixed(2)),
      suggestedPriceTHB: Math.ceil(sellingPriceTHB),
      netProfitCNY: parseFloat(profitCNY.toFixed(2))
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in h-[calc(100vh-140px)] min-h-[600px]">
      {/* --- Left Column: Calculator Inputs & Result --- */}
      <div className="lg:col-span-7 flex flex-col gap-6 h-full overflow-y-auto pr-2">
        
        {/* Calculator Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-shrink-0">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Calculator className="text-indigo-600" size={20}/>
              跨境定价计算器
            </h3>
            <span className="text-xs text-slate-400">汇率 1:{EXCHANGE_RATE_CNY_THB.toFixed(1)}</span>
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
                           {zone === 'A' ? '曼谷及周边地区 (Zone A)' : zone === 'B' ? '外府地区 (Zone B)' : '偏远/岛屿地区 (Zone C)'}
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
               <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">建议定价 (THB)</span>
               <div className="text-5xl font-bold text-green-400 flex items-baseline gap-2 mt-1">
                 ฿ {results.suggestedPriceTHB}
               </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm pt-4 border-t border-slate-700/50">
               <div>
                 <span className="text-slate-400 block mb-1">预估运费</span>
                 <span className="font-semibold text-white text-lg">฿ {results.shippingCostTHB}</span>
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

      {/* --- Right Column: Standard Price Table --- */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="bg-indigo-50 px-5 py-4 border-b border-indigo-100">
           <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
             <Package className="text-indigo-600" size={20}/>
             Standard 渠道价格表 (THB)
           </h3>
           <p className="text-xs text-indigo-600/70 mt-1">
             计费公式：Base + (Weight/10)。更新于 2024-05
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
               {STANDARD_PRICE_TABLE.map((row) => (
                 <tr 
                    key={row.weight} 
                    className={`hover:bg-slate-50 transition-colors ${
                      // Highlight current weight row logic approx
                      Math.abs(row.weight - (results.chargeableWeight * 1000)) < 5 ? 'bg-yellow-50 font-bold' : ''
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
         
         {/* Footer Legend */}
         <div className="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-2 text-[10px] text-slate-500 text-center">
            <div className="flex flex-col items-center">
               <span className="font-bold text-blue-600">Zone A</span>
               <span>曼谷/暖武里/巴吞他尼/北榄</span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-200">
               <span className="font-bold text-indigo-600">Zone B</span>
               <span>其他外府地区</span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-200">
               <span className="font-bold text-purple-600">Zone C</span>
               <span>偏远地区/岛屿/深山</span>
            </div>
         </div>
      </div>
    </div>
  );
};