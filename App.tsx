import React, { useState, useRef } from 'react';
import { AppMode, AnalysisData } from './types';
import { analyzeProductForThaiMarket, generateProductVideo, editProductImage, enhanceVideoPrompt } from './services/gemini';
import { LiveAgent } from './components/LiveAgent';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  LayoutDashboard, 
  Video, 
  Wand2, 
  Upload, 
  Search, 
  Loader2, 
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Globe,
  Database,
  MessageSquareText,
  Smartphone,
  MonitorPlay,
  Copy,
  Sparkles,
  Palette,
  Bot
} from 'lucide-react';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.ANALYSIS);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [prompt, setPrompt] = useState('');
  
  // State for different features
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setAnalysisResult(null);
        setGeneratedVideoUrl(null);
        setEditedImageUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getBase64Data = (dataUri: string) => {
    return dataUri.split(',')[1];
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    try {
      const data = await analyzeProductForThaiMarket(
        getBase64Data(selectedImage),
        mimeType,
        prompt
      );
      setAnalysisResult(data);
    } catch (error) {
      alert("分析失败，请检查控制台。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt) return;
    setIsEnhancingPrompt(true);
    try {
      const enhanced = await enhanceVideoPrompt(prompt);
      setPrompt(enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancingPrompt(false);
    }
  }

  const handleGenerateVideo = async () => {
    if (!selectedImage) return;
    
    // Check for API Key Selection for Veo
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        if (window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
        } else {
            alert("无法选择 AI Studio API Key。");
            return;
        }
      }
    }

    setIsGeneratingVideo(true);
    try {
      const videoUrl = await generateProductVideo(
        getBase64Data(selectedImage),
        mimeType,
        prompt || "Cinematic product showcase",
        videoAspectRatio
      );
      setGeneratedVideoUrl(videoUrl);
    } catch (error) {
      alert("视频生成失败。请确保您选择了付费项目的 API Key。");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleEditImage = async () => {
    if (!selectedImage || !prompt) {
      alert("请输入图片编辑提示词");
      return;
    }
    setIsEditingImage(true);
    try {
      const newImageUrl = await editProductImage(
        getBase64Data(selectedImage),
        mimeType,
        prompt
      );
      setEditedImageUrl(newImageUrl);
    } catch (error) {
      alert("图片编辑失败。");
    } finally {
      setIsEditingImage(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`已复制: ${text}`);
  };

  // --- Render Helpers ---

  const renderSidebarItem = (mode: AppMode, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveMode(mode)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeMode === mode
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 z-10">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Globe className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600">
            ThaiCrossBorder
          </span>
        </div>

        <nav className="flex-1 space-y-2">
          {renderSidebarItem(AppMode.ANALYSIS, <LayoutDashboard size={20} />, "市场分析")}
          {renderSidebarItem(AppMode.VEO_VIDEO, <Video size={20} />, "Veo 视频工作室")}
          {renderSidebarItem(AppMode.IMAGE_EDIT, <Wand2 size={20} />, "创意工作室")}
          {renderSidebarItem(AppMode.LIVE_AGENT, <MessageSquareText size={20} />, "AI 顾问咨询")}
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs text-slate-500 mb-2">Powered by</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">Gemini 3.0</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">Veo</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">Live API</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 z-20 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">
            {activeMode === AppMode.ANALYSIS && "市场情报"}
            {activeMode === AppMode.VEO_VIDEO && "视频制作 (Veo)"}
            {activeMode === AppMode.IMAGE_EDIT && "创意工作室"}
            {activeMode === AppMode.LIVE_AGENT && "AI 专家问答"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">目标市场: 🇹🇭 泰国</span>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
          
          {/* Universal Image Upload (except for Live Agent) */}
          {activeMode !== AppMode.LIVE_AGENT && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex gap-8 items-start">
                <div className="w-1/3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer group relative aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500 transition-colors"
                  >
                    {selectedImage ? (
                      <img src={selectedImage} alt="Product" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        <p className="text-sm font-medium text-slate-600">上传产品图片</p>
                        <p className="text-xs text-slate-400 mt-1">支持 PNG, JPG</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="w-2/3 space-y-4">
                  {/* Mode Specific Controls */}
                  
                  {activeMode === AppMode.IMAGE_EDIT && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                       {["宋干节水枪大战背景", "曼谷街头夜市背景", "极简白色摄影棚", "热带海滩阳光背景"].map((preset, i) => (
                         <button key={i} onClick={() => setPrompt(preset)} className="text-xs px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors whitespace-nowrap">
                           {preset}
                         </button>
                       ))}
                    </div>
                  )}

                  {activeMode === AppMode.VEO_VIDEO && (
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                          onClick={() => setVideoAspectRatio('16:9')}
                          className={`p-2 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${videoAspectRatio === '16:9' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                          <MonitorPlay size={14} /> 16:9 (横屏)
                        </button>
                        <button 
                          onClick={() => setVideoAspectRatio('9:16')}
                          className={`p-2 rounded-md flex items-center gap-2 text-xs font-medium transition-all ${videoAspectRatio === '9:16' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                          <Smartphone size={14} /> 9:16 (TikTok)
                        </button>
                      </div>
                      <button 
                         onClick={handleEnhancePrompt} 
                         disabled={!prompt || isEnhancingPrompt}
                         className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
                      >
                        <Sparkles size={12} /> {isEnhancingPrompt ? '润色中...' : 'AI 润色提示词'}
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {activeMode === AppMode.IMAGE_EDIT ? "编辑指令 / 场景" : 
                       activeMode === AppMode.VEO_VIDEO ? "视频描述" : "额外说明 (可选)"}
                    </label>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        activeMode === AppMode.IMAGE_EDIT ? "例如：去除背景并放在木桌上..." :
                        activeMode === AppMode.VEO_VIDEO ? "例如：电影感慢动作旋转，专业灯光..." :
                        "例如：这个在曼谷流行吗？"
                      }
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px]"
                    />
                  </div>

                  <div className="flex justify-end">
                    {activeMode === AppMode.ANALYSIS && (
                      <button 
                        onClick={handleAnalyze} 
                        disabled={!selectedImage || isAnalyzing}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                        分析市场
                      </button>
                    )}
                    
                    {activeMode === AppMode.VEO_VIDEO && (
                      <button 
                        onClick={handleGenerateVideo} 
                        disabled={!selectedImage || isGeneratingVideo}
                        className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all font-medium"
                      >
                        {isGeneratingVideo ? <Loader2 className="animate-spin" size={18}/> : <Video size={18}/>}
                        生成视频
                      </button>
                    )}

                    {activeMode === AppMode.IMAGE_EDIT && (
                      <button 
                        onClick={handleEditImage} 
                        disabled={!selectedImage || isEditingImage}
                        className="flex items-center gap-2 bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-all font-medium"
                      >
                        {isEditingImage ? <Loader2 className="animate-spin" size={18}/> : <Wand2 size={18}/>}
                        编辑图片
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* === ANALYSIS MODULE === */}
          {activeMode === AppMode.ANALYSIS && analysisResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 prose prose-slate max-w-none">
                  <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-4">
                    <TrendingUp className="text-indigo-600" />
                    市场分析报告
                  </h3>
                  <div className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                    {analysisResult.text}
                  </div>
                </div>
                
                {/* Keywords Extraction Section */}
                {analysisResult.keywords && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                      <Search size={16} /> 泰语 SEO 关键词
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.keywords.map((kw, i) => (
                        <div key={i} className="group flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-indigo-100 hover:border-indigo-300 transition-all">
                          {kw}
                          <button onClick={() => copyToClipboard(kw)} className="text-indigo-400 group-hover:text-indigo-700">
                            <Copy size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                
                {/* AI Consult Button - NEW */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                  <h3 className="flex items-center gap-2 font-bold text-indigo-900 mb-2">
                    <Bot size={20} className="text-indigo-600" />
                    需要 SKU 建议?
                  </h3>
                  <p className="text-sm text-indigo-700 mb-4">
                    基于此分析报告，AI 顾问可以为您规划 SKU 组合或编写视频拍摄脚本。
                  </p>
                  <button 
                    onClick={() => setActiveMode(AppMode.LIVE_AGENT)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-medium text-sm shadow-md shadow-indigo-200"
                  >
                    咨询 AI 顾问 <ChevronRight size={14} />
                  </button>
                </div>

                {/* Real-time Data Links */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4">
                     <Database className="text-indigo-600" size={18} />
                     数据验证
                   </h3>
                   <div className="space-y-3">
                     <a 
                       href="https://www.fastmoss.com/zh/dashboard" 
                       target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                     >
                       <span className="text-sm font-semibold text-slate-700">FastMoss (TikTok)</span>
                       <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-600" />
                     </a>
                     <a 
                       href="https://www.miaoshou.com/" 
                       target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                     >
                       <span className="text-sm font-semibold text-slate-700">妙手 (Miaoshou)</span>
                       <ExternalLink size={14} className="text-slate-400 group-hover:text-orange-600" />
                     </a>
                   </div>
                </div>

                {/* Price Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                   <h3 className="font-bold text-slate-800 mb-4">市场价格分布 (THB)</h3>
                   <div className="h-64">
                     {analysisResult.priceData && analysisResult.priceData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analysisResult.priceData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                           <YAxis axisLine={false} tickLine={false} fontSize={12} />
                           <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                           <Bar dataKey="price" fill="#6366f1" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="flex items-center justify-center h-full text-slate-400 text-sm border border-dashed rounded-lg">暂无数据</div>
                     )}
                   </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl text-white shadow-lg">
                  <h3 className="font-bold text-lg mb-2">一键转视频</h3>
                  <p className="text-indigo-100 text-sm">觉得产品有潜力？立即生成 TikTok 短视频。</p>
                  <button 
                    onClick={() => setActiveMode(AppMode.VEO_VIDEO)}
                    className="mt-4 flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
                  >
                    前往 Veo <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === VIDEO MODULE === */}
          {activeMode === AppMode.VEO_VIDEO && generatedVideoUrl && (
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center animate-fade-in">
               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <CheckCircle2 className="text-green-500" /> 视频生成成功 ({videoAspectRatio})
               </h3>
               <div className={`relative w-full ${videoAspectRatio === '16:9' ? 'aspect-video max-w-2xl' : 'aspect-[9/16] max-w-sm'} bg-black rounded-xl overflow-hidden shadow-2xl`}>
                 <video controls className="w-full h-full" src={generatedVideoUrl} />
               </div>
               <a 
                 href={generatedVideoUrl} 
                 download="product_video.mp4"
                 className="mt-6 flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-slate-800 transition-all font-medium"
               >
                 <Video size={16} /> 下载 MP4
               </a>
             </div>
          )}

          {/* === IMAGE EDIT MODULE === */}
          {activeMode === AppMode.IMAGE_EDIT && editedImageUrl && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 justify-center">
                <Palette className="text-pink-500" /> 编辑结果对比
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-500">原始图片</span>
                   </div>
                   <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                     <img src={selectedImage!} alt="Original" className="w-full h-full object-contain" />
                   </div>
                 </div>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-pink-600">Gemini 生成</span>
                      <a href={editedImageUrl} download="edited_image.png" className="text-xs text-indigo-600 hover:underline">下载</a>
                   </div>
                   <div className="relative aspect-square rounded-xl overflow-hidden border border-pink-200 shadow-md bg-white">
                     <img src={editedImageUrl} alt="Edited" className="w-full h-full object-contain" />
                   </div>
                 </div>
              </div>
            </div>
          )}

          {/* === LIVE AGENT MODULE (Always Mounted, Hidden when inactive) === */}
          <div className={activeMode === AppMode.LIVE_AGENT ? "max-w-3xl mx-auto" : "hidden"}>
            <LiveAgent contextData={analysisResult} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;