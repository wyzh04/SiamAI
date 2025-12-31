import React, { useState, useRef, useEffect } from 'react';
import { AppMode, AnalysisData, User, HistoryItem } from './types';
import { analyzeProductForThaiMarket, generateProductVideo, editProductImage, enhanceVideoPrompt, generateSkuUiLayout } from './services/gemini';
import { LiveAgent } from './components/LiveAgent';
import { LoginModal } from './components/LoginModal';
import { LogisticsCalculator } from './components/LogisticsCalculator';
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
  Bot,
  Film,
  LogIn,
  History,
  Clock,
  LogOut,
  LayoutTemplate,
  Code,
  X,
  ZoomIn,
  Plus,
  ImagePlus,
  ArrowRightCircle,
  Calculator,
} from 'lucide-react';

const LOADING_MESSAGES = [
  "正在启动 Veo 视频引擎...",
  "AI 正在构思分镜与光影...",
  "正在生成高保真视频帧...",
  "进行最终渲染与合成...",
  "视频即将生成，请耐心等待..."
];

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.ANALYSIS);
  
  // User & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

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
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  
  // Creative Studio State
  const [creativeTab, setCreativeTab] = useState<'image' | 'sku'>('image');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [skuHtml, setSkuHtml] = useState<string | null>(null);
  const [skuStyle, setSkuStyle] = useState<string>('High Impact');
  
  // Assets & SKU Image Replacement
  const [assets, setAssets] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  
  // Lightbox State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewHtmlContent, setPreviewHtmlContent] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate loading messages
  useEffect(() => {
    let interval: any;
    if (isGeneratingVideo) {
      interval = setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    } else {
      setLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGeneratingVideo]);

  // Helper to add history
  const addToHistory = (mode: AppMode, title: string, data: any, thumb?: string) => {
    if (!currentUser) return;
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      mode,
      title,
      data,
      thumbnail: thumb || selectedImage || undefined
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    setActiveMode(item.mode);
    if (item.thumbnail) {
      setSelectedImage(item.thumbnail);
    }
    
    if (item.mode === AppMode.ANALYSIS) {
      setAnalysisResult(item.data);
    } else if (item.mode === AppMode.VEO_VIDEO) {
      setGeneratedVideoUrl(item.data);
    } else if (item.mode === AppMode.IMAGE_EDIT) {
      // Check if it's SKU data (string starting with <div) or Image URL
      const dataStr = item.data as string;
      if (dataStr.trim().startsWith('<div')) {
         setCreativeTab('sku');
         setSkuHtml(dataStr);
      } else {
         setCreativeTab('image');
         setEditedImageUrl(dataStr);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        setAssets([base64]); // Init assets with original
        setSelectedAsset(base64);
        
        // Reset states
        setAnalysisResult(null);
        setGeneratedVideoUrl(null);
        setEditedImageUrl(null);
        setSkuHtml(null);
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
      // Auto save to history
      const title = data.keywords && data.keywords.length > 0 ? data.keywords[0] : "未命名产品分析";
      addToHistory(AppMode.ANALYSIS, title, data);

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
    
    // Initial check for API Key Selection for Veo
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
    setGeneratedVideoUrl(null);

    const performGeneration = async (retry = false): Promise<string> => {
      return await generateProductVideo(
        getBase64Data(selectedImage),
        mimeType,
        prompt || "Cinematic product showcase, high quality, 4k, photorealistic",
        videoAspectRatio
      );
    };

    try {
      const videoUrl = await performGeneration();
      setGeneratedVideoUrl(videoUrl);
      addToHistory(AppMode.VEO_VIDEO, `Veo 视频 (${videoAspectRatio})`, videoUrl);
    } catch (error: any) {
      console.error("Video Generation Error:", error);
      
      // Robust Error Handling for API Key
      if (error.message && error.message.includes("Requested entity was not found")) {
        // Retry logic: Prompt for key again and retry ONCE
        if (window.aistudio && window.aistudio.openSelectKey) {
          try {
             await window.aistudio.openSelectKey();
             // Retry generation
             const retryVideoUrl = await performGeneration(true);
             setGeneratedVideoUrl(retryVideoUrl);
             addToHistory(AppMode.VEO_VIDEO, `Veo 视频 (${videoAspectRatio})`, retryVideoUrl);
             return; // Success on retry
          } catch (retryError) {
             console.error("Retry failed:", retryError);
             alert("API Key 验证失败或视频生成出错。请确保选择了有效的付费项目。");
          }
        }
      } else {
        alert("视频生成失败。请稍后再试或检查网络连接。");
      }
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
      setAssets(prev => [...prev, newImageUrl]); // Add to asset library
      setSelectedAsset(newImageUrl); // Auto select new asset
      addToHistory(AppMode.IMAGE_EDIT, "创意图片编辑", newImageUrl);
    } catch (error) {
      alert("图片编辑失败。");
    } finally {
      setIsEditingImage(false);
    }
  };

  // Inject generated image into the first available placeholder in SKU HTML
  const handleInsertToDetail = () => {
    if (!editedImageUrl || !skuHtml) {
      if (!skuHtml) {
        alert("请先生成 SKU 详情页框架，再插入图片。");
        setCreativeTab('sku');
      }
      return;
    }

    // Switch to SKU tab
    setCreativeTab('sku');
    
    // Find the first placeholder image string and replace it
    const placeholderRegex = /https:\/\/via\.placeholder\.com\/[^\s"']+/;
    const match = skuHtml.match(placeholderRegex);
    
    if (match) {
       // Only replace the FIRST occurrence (default string.replace behavior)
       const newHtml = skuHtml.replace(match[0], editedImageUrl);
       setSkuHtml(newHtml);
       alert("已成功插入到详情页！");
    } else {
       // If no placeholder, try to append? Or just alert.
       alert("未找到空闲的图片占位符，请手动替换或生成新的布局。");
    }
  };

  const handleGenerateSku = async () => {
    if (!selectedImage) return;
    setIsGeneratingSku(true);
    try {
      const analysisContext = analysisResult ? analysisResult.text : "";
      const html = await generateSkuUiLayout(
        getBase64Data(selectedImage),
        mimeType,
        analysisContext,
        skuStyle
      );
      setSkuHtml(html);
      addToHistory(AppMode.IMAGE_EDIT, `SKU 详情页 (${skuStyle})`, html);
    } catch (error) {
      alert("详情页生成失败。");
    } finally {
      setIsGeneratingSku(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`已复制: ${text}`);
  };

  // Handle clicking on the rendered SKU HTML
  const handleSkuPreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
     // Check if target is an image
     const target = e.target as HTMLElement;
     if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        // If we have a selected asset, replace the source
        if (selectedAsset) {
           if (skuHtml) {
              // 1. Find the index of the clicked image in the container
              // "currentTarget" refers to the div with the onClick handler (the container)
              const container = e.currentTarget;
              const allImages = Array.from(container.getElementsByTagName('img'));
              const clickedIndex = allImages.indexOf(target as HTMLImageElement);

              if (clickedIndex !== -1) {
                  // 2. Parse the current HTML string to a DOM to safely replace ONE instance
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(skuHtml, 'text/html');
                  const docImages = doc.getElementsByTagName('img');

                  // 3. Update only the specific image at that index
                  if (docImages[clickedIndex]) {
                      docImages[clickedIndex].setAttribute('src', selectedAsset);
                      // 4. Serialize back to string
                      setSkuHtml(doc.body.innerHTML);
                  }
              }
           }
        } else {
           alert("请先在左侧素材库选择一张图片！");
        }
     }
  };

  // --- Formatting Helper (Replaces Symbols with HTML) ---
  const formatAnalysisText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Inline formatting helper
      const renderInline = (content: string) => {
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      const trimmed = line.trim();
      if (!trimmed) return <div key={lineIdx} className="h-4" />;

      // Header Logic (Removes #)
      if (trimmed.startsWith('### ')) {
        return <h4 key={lineIdx} className="text-xl font-bold text-slate-800 mt-6 mb-3">{renderInline(trimmed.replace(/^###\s+/, ''))}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={lineIdx} className="text-2xl font-bold text-indigo-700 mt-8 mb-4 pb-2 border-b border-indigo-100">{renderInline(trimmed.replace(/^##\s+/, ''))}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={lineIdx} className="text-3xl font-bold text-indigo-800 mt-8 mb-6">{renderInline(trimmed.replace(/^#\s+/, ''))}</h2>;
      }

      // List Logic (Removes - or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={lineIdx} className="flex gap-3 ml-2 mb-3 items-start">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" />
             <div className="text-slate-700 leading-relaxed text-lg">{renderInline(trimmed.replace(/^[-*]\s+/, ''))}</div>
          </div>
        );
      }
      
      // Numbered List
      const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberMatch) {
         return (
          <div key={lineIdx} className="flex gap-3 ml-2 mb-3 items-start">
             <span className="font-bold text-indigo-600 min-w-[1.5rem] mt-0.5">{numberMatch[1]}.</span>
             <div className="text-slate-700 leading-relaxed text-lg">{renderInline(numberMatch[2])}</div>
          </div>
         );
      }

      // Regular Paragraph
      return <p key={lineIdx} className="mb-3 text-slate-700 leading-relaxed text-lg">{renderInline(line)}</p>;
    });
  };

  const renderSidebarItem = (mode: AppMode, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveMode(mode)}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all ${
        activeMode === mode
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span className="font-medium text-base">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoginModalOpen(false);
        }}
      />

      {/* Image Lightbox / Fullscreen Preview */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
            onClick={() => setPreviewImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={previewImage} 
            alt="Full Preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-zoom-in select-none"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* HTML Fullscreen Preview Modal */}
      {previewHtmlContent && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewHtmlContent(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full z-10"
            onClick={() => setPreviewHtmlContent(null)}
          >
            <X size={24} />
          </button>
          
          <div 
            className="bg-white w-[414px] h-[85vh] rounded-3xl overflow-hidden shadow-2xl animate-zoom-in flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
             {/* Fake Status Bar */}
             <div className="h-10 bg-slate-900 flex items-center justify-between px-6 text-white text-xs font-medium z-10 shrink-0">
                <span>9:41</span>
                <div className="flex gap-1.5">
                   <div className="w-4 h-4 rounded-full border border-white/30"></div>
                   <div className="w-4 h-4 rounded-full border border-white/30"></div>
                </div>
             </div>
             
             {/* Content */}
             <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
                <div dangerouslySetInnerHTML={{ __html: previewHtmlContent }} />
             </div>
             
             {/* Bottom Home Indicator area */}
             <div className="h-6 bg-white shrink-0 flex items-center justify-center">
                <div className="w-32 h-1 bg-slate-900/20 rounded-full"></div>
             </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-6 z-10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Globe className="text-white" size={24} />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600">
            ThaiCrossBorder
          </span>
        </div>

        <nav className="space-y-2 mb-6">
          {renderSidebarItem(AppMode.ANALYSIS, <LayoutDashboard size={22} />, "市场分析")}
          {renderSidebarItem(AppMode.VEO_VIDEO, <Video size={22} />, "Veo 视频工作室")}
          {renderSidebarItem(AppMode.IMAGE_EDIT, <Wand2 size={22} />, "创意工作室")}
          {renderSidebarItem(AppMode.CALCULATOR, <Calculator size={22} />, "物流定价计算")}
          {renderSidebarItem(AppMode.LIVE_AGENT, <MessageSquareText size={22} />, "AI 顾问咨询")}
        </nav>

        {/* User History Section */}
        <div className="flex-1 overflow-y-auto min-h-0 border-t border-slate-100 pt-6">
           <div className="px-2 mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">最近使用</span>
              {!currentUser && <span className="text-xs text-indigo-500 cursor-pointer" onClick={() => setIsLoginModalOpen(true)}>登录保存</span>}
           </div>
           
           {currentUser ? (
             <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <History size={24} className="mx-auto mb-2 opacity-50"/>
                    暂无历史记录
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => restoreHistoryItem(item)}
                      className="group flex gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                       <div className="w-10 h-10 rounded-md bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-100">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} className="w-full h-full object-cover" alt="thumb" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Search size={14}/>
                            </div>
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-700">{item.title}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            {item.mode === AppMode.ANALYSIS ? "分析报告" : item.mode === AppMode.VEO_VIDEO ? "视频" : (item.data.toString().startsWith('<div') ? "SKU详情页" : "图片编辑")} 
                            • <Clock size={10} /> 刚刚
                          </p>
                       </div>
                    </div>
                  ))
                )}
             </div>
           ) : (
             <div 
               onClick={() => setIsLoginModalOpen(true)}
               className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
             >
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                   <LogIn size={18} className="text-slate-400 group-hover:text-indigo-600"/>
                </div>
                <p className="text-sm text-slate-500 group-hover:text-indigo-700">登录查看历史记录</p>
             </div>
           )}
        </div>

        {/* User Profile Footer */}
        <div className="mt-auto pt-5 border-t border-slate-100">
          {currentUser ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
               <img src={currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full bg-white shadow-sm" />
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500">专业版用户</p>
               </div>
               <button 
                 onClick={() => {setCurrentUser(null); setHistory([]);}} 
                 className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
               >
                 <LogOut size={16} />
               </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md"
            >
              <LogIn size={18} />
              登录 / 注册
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 py-5 z-20 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-800">
            {activeMode === AppMode.ANALYSIS && "市场情报"}
            {activeMode === AppMode.VEO_VIDEO && "视频制作 (Veo)"}
            {activeMode === AppMode.IMAGE_EDIT && "创意工作室"}
            {activeMode === AppMode.CALCULATOR && "物流与定价"}
            {activeMode === AppMode.LIVE_AGENT && "AI 专家问答"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100 flex items-center gap-1">
              🇹🇭 泰国市场
            </span>
            {currentUser && (
               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                  <span className="text-xs font-bold">{currentUser.name[0]}</span>
               </div>
            )}
          </div>
        </header>

        <div className="p-10 max-w-[1400px] mx-auto space-y-8 pb-24">
          
          {/* Universal Image Upload (except for Live Agent AND Calculator) */}
          {activeMode !== AppMode.LIVE_AGENT && activeMode !== AppMode.CALCULATOR && (
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex gap-10 items-start">
                <div className="w-1/3">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer group relative aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500 transition-colors"
                  >
                    {selectedImage ? (
                      <img src={selectedImage} alt="Product" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload size={32} />
                        </div>
                        <p className="text-base font-medium text-slate-600">上传产品图片</p>
                        <p className="text-sm text-slate-400 mt-2">支持 PNG, JPG</p>
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

                <div className="w-2/3 space-y-6">
                  {/* Mode Specific Controls */}
                  
                  {activeMode === AppMode.IMAGE_EDIT && (
                    <div className="space-y-4">
                       {/* Creative Mode Tabs */}
                       <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                          <button
                            onClick={() => { setCreativeTab('image'); }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              creativeTab === 'image' 
                                ? 'bg-white shadow-sm text-indigo-600' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <Palette size={16} /> 图片魔法编辑
                          </button>
                          <button
                            onClick={() => { setCreativeTab('sku'); }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                              creativeTab === 'sku' 
                                ? 'bg-white shadow-sm text-indigo-600' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            <LayoutTemplate size={16} /> SKU 详情页生成
                          </button>
                       </div>

                       {creativeTab === 'image' ? (
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {["宋干节水枪大战背景", "曼谷街头夜市背景", "极简白色摄影棚", "热带海滩阳光背景"].map((preset, i) => (
                              <button key={i} onClick={() => setPrompt(preset)} className="text-sm px-4 py-2 bg-pink-50 text-pink-700 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors whitespace-nowrap">
                                {preset}
                              </button>
                            ))}
                          </div>
                       ) : (
                          <div className="flex gap-3">
                             {["Minimalist", "High Impact", "Feature Comparison"].map((style) => (
                               <button 
                                 key={style} 
                                 onClick={() => setSkuStyle(style)}
                                 className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                    skuStyle === style 
                                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                 }`}
                               >
                                 {style} 风格
                               </button>
                             ))}
                          </div>
                       )}
                    </div>
                  )}

                  {activeMode === AppMode.VEO_VIDEO && (
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex bg-slate-100 p-1.5 rounded-lg">
                        <button 
                          onClick={() => setVideoAspectRatio('16:9')}
                          className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${videoAspectRatio === '16:9' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                          <MonitorPlay size={16} /> 16:9 (横屏)
                        </button>
                        <button 
                          onClick={() => setVideoAspectRatio('9:16')}
                          className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${videoAspectRatio === '9:16' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                          <Smartphone size={16} /> 9:16 (TikTok)
                        </button>
                      </div>
                      <button 
                         onClick={handleEnhancePrompt} 
                         disabled={!prompt || isEnhancingPrompt}
                         className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
                      >
                        <Sparkles size={14} /> {isEnhancingPrompt ? '润色中...' : 'AI 润色提示词'}
                      </button>
                    </div>
                  )}

                  {/* Context Aware Text Input */}
                  {(creativeTab === 'image' || activeMode !== AppMode.IMAGE_EDIT) && (
                    <div>
                      <label className="block text-base font-medium text-slate-700 mb-2">
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
                        className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-base min-h-[120px]"
                      />
                    </div>
                  )}
                  
                  {/* SKU UI Disclaimer */}
                  {activeMode === AppMode.IMAGE_EDIT && creativeTab === 'sku' && (
                     <div className="bg-indigo-50 p-4 rounded-xl text-indigo-700 text-sm leading-relaxed">
                        <p className="font-bold flex items-center gap-2 mb-1"><Sparkles size={14}/> 智能 UI 引擎</p>
                        Gemini 将根据产品分析自动预埋图片占位符。您可以点击左侧素材库，再点击预览图中的空白位进行填充。
                     </div>
                  )}

                  <div className="flex justify-end">
                    {activeMode === AppMode.ANALYSIS && (
                      <button 
                        onClick={handleAnalyze} 
                        disabled={!selectedImage || isAnalyzing}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium text-lg"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={24}/> : <Search size={24}/>}
                        分析市场
                      </button>
                    )}
                    
                    {activeMode === AppMode.VEO_VIDEO && (
                      <button 
                        onClick={handleGenerateVideo} 
                        disabled={!selectedImage || isGeneratingVideo}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl transition-all font-medium text-lg shadow-md ${
                          isGeneratingVideo ? 'bg-slate-800 text-slate-300 cursor-wait' : 'bg-purple-600 text-white hover:bg-purple-700'
                        } disabled:opacity-50 disabled:shadow-none`}
                      >
                        {isGeneratingVideo ? <Loader2 className="animate-spin" size={24}/> : <Video size={24}/>}
                        {isGeneratingVideo ? '正在生成...' : '生成视频'}
                      </button>
                    )}

                    {activeMode === AppMode.IMAGE_EDIT && creativeTab === 'image' && (
                      <button 
                        onClick={handleEditImage} 
                        disabled={!selectedImage || isEditingImage}
                        className="flex items-center gap-2 bg-pink-600 text-white px-8 py-3 rounded-xl hover:bg-pink-700 disabled:opacity-50 transition-all font-medium text-lg"
                      >
                        {isEditingImage ? <Loader2 className="animate-spin" size={24}/> : <Wand2 size={24}/>}
                        编辑图片
                      </button>
                    )}

                    {activeMode === AppMode.IMAGE_EDIT && creativeTab === 'sku' && (
                       <button 
                        onClick={handleGenerateSku} 
                        disabled={!selectedImage || isGeneratingSku}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium text-lg"
                      >
                        {isGeneratingSku ? <Loader2 className="animate-spin" size={24}/> : <LayoutTemplate size={24}/>}
                        生成 SKU 详情页
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* === ANALYSIS MODULE === */}
          {activeMode === AppMode.ANALYSIS && analysisResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 prose prose-slate max-w-none">
                  {/* Using custom formatter instead of raw text */}
                  <div className="text-slate-600 leading-relaxed text-lg">
                    {formatAnalysisText(analysisResult.text)}
                  </div>
                </div>
                
                {/* Keywords Extraction Section */}
                {analysisResult.keywords && (
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <h4 className="flex items-center gap-2 text-base font-bold text-slate-700 uppercase tracking-wider mb-5">
                      <Search size={20} /> 泰语 SEO 关键词
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {analysisResult.keywords.map((kw, i) => (
                        <div key={i} className="group flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-base font-medium border border-indigo-100 hover:border-indigo-300 transition-all">
                          {kw}
                          <button onClick={() => copyToClipboard(kw)} className="text-indigo-400 group-hover:text-indigo-700">
                            <Copy size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                
                {/* AI Consult Button - NEW */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-2xl border border-indigo-100">
                  <h3 className="flex items-center gap-2 text-xl font-bold text-indigo-900 mb-3">
                    <Bot size={24} className="text-indigo-600" />
                    需要 SKU 建议?
                  </h3>
                  <p className="text-base text-indigo-700 mb-5 leading-relaxed">
                    基于此分析报告，AI 顾问可以为您规划 SKU 组合或编写视频拍摄脚本。
                  </p>
                  <button 
                    onClick={() => setActiveMode(AppMode.LIVE_AGENT)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition-all font-medium text-base shadow-md shadow-indigo-200"
                  >
                    咨询 AI 顾问 <ChevronRight size={16} />
                  </button>
                </div>

                {/* Real-time Data Links */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-5">
                     <Database className="text-indigo-600" size={22} />
                     数据验证
                   </h3>
                   <div className="space-y-4">
                     <a 
                       href="https://www.fastmoss.com/zh/dashboard" 
                       target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                     >
                       <span className="text-base font-semibold text-slate-700">FastMoss (TikTok)</span>
                       <ExternalLink size={16} className="text-slate-400 group-hover:text-indigo-600" />
                     </a>
                     <a 
                       href="https://www.miaoshou.com/" 
                       target="_blank" rel="noopener noreferrer"
                       className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                     >
                       <span className="text-base font-semibold text-slate-700">妙手 (Miaoshou)</span>
                       <ExternalLink size={16} className="text-slate-400 group-hover:text-orange-600" />
                     </a>
                   </div>
                </div>

                {/* Price Chart */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 relative">
                   <h3 className="text-lg font-bold text-slate-800 mb-5">市场价格分布 (THB)</h3>
                   <div className="h-64">
                     {analysisResult.priceData && analysisResult.priceData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={analysisResult.priceData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={14} />
                           <YAxis axisLine={false} tickLine={false} fontSize={14} />
                           <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                           <Bar dataKey="price" fill="#6366f1" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="flex items-center justify-center h-full text-slate-400 text-base border border-dashed rounded-lg">暂无数据</div>
                     )}
                   </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-2xl text-white shadow-lg">
                  <h3 className="font-bold text-xl mb-3">一键转视频</h3>
                  <p className="text-indigo-100 text-base mb-4">觉得产品有潜力？立即生成 TikTok 短视频。</p>
                  <button 
                    onClick={() => setActiveMode(AppMode.VEO_VIDEO)}
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 px-4 py-2.5 rounded-lg transition-colors"
                  >
                    前往 Veo <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === VIDEO MODULE === */}
          {activeMode === AppMode.VEO_VIDEO && (
             <div className="space-y-8 animate-fade-in">
                {/* Loading State */}
                {isGeneratingVideo && (
                   <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                     <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 relative">
                        <Loader2 size={40} className="animate-spin" />
                        <div className="absolute inset-0 border-4 border-purple-100 rounded-full animate-pulse"></div>
                     </div>
                     <h3 className="text-2xl font-bold text-slate-800 mb-2">正在制作您的视频</h3>
                     <p className="text-lg text-slate-500 max-w-md mx-auto h-8 transition-opacity duration-300">
                        {LOADING_MESSAGES[loadingMsgIndex]}
                     </p>
                     <div className="mt-8 flex gap-2 justify-center">
                        {LOADING_MESSAGES.map((_, i) => (
                           <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === loadingMsgIndex ? 'w-8 bg-purple-500' : 'w-2 bg-slate-200'}`} />
                        ))}
                     </div>
                   </div>
                )}

                {/* Result State */}
                {!isGeneratingVideo && generatedVideoUrl && (
                  <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center animate-fade-in">
                    <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                      <CheckCircle2 className="text-green-500" size={28} /> 视频生成成功 ({videoAspectRatio})
                    </h3>
                    <div className={`relative w-full ${videoAspectRatio === '16:9' ? 'aspect-video max-w-3xl' : 'aspect-[9/16] max-w-md'} bg-black rounded-xl overflow-hidden shadow-2xl`}>
                      <video controls className="w-full h-full" src={generatedVideoUrl} />
                    </div>
                    <div className="flex gap-4 mt-8">
                       <a 
                        href={generatedVideoUrl} 
                        download="product_video.mp4"
                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full hover:bg-slate-800 transition-all font-medium text-lg"
                      >
                        <Film size={20} /> 下载 MP4
                      </a>
                    </div>
                  </div>
                )}
                
                {/* Empty State / Intro */}
                {!isGeneratingVideo && !generatedVideoUrl && selectedImage && (
                   <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-white text-purple-400 rounded-full flex items-center justify-center mb-4 shadow-sm">
                         <Film size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-700">准备生成</h3>
                      <p className="text-slate-500 max-w-sm mt-2">点击上方“生成视频”按钮，Veo 将为您制作一段 720p 视频。这可能需要 1-2 分钟。</p>
                   </div>
                )}
             </div>
          )}

          {/* === IMAGE EDIT MODULE (Includes SKU Generator) === */}
          {activeMode === AppMode.IMAGE_EDIT && (
             <div className="animate-fade-in">
                {/* Image Edit Result */}
                {creativeTab === 'image' && editedImageUrl && (
                  <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3 justify-center">
                      <Palette className="text-pink-500" size={28} /> 编辑结果对比
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-slate-500">原始图片</span>
                         </div>
                         <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group cursor-zoom-in"
                              onClick={() => setPreviewImage(selectedImage)}>
                           <img src={selectedImage!} alt="Original" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                           <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="text-white/80" size={32}/>
                           </div>
                         </div>
                       </div>
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-pink-600">Gemini 生成</span>
                            <div className="flex gap-4">
                              <button 
                                onClick={handleInsertToDetail}
                                className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <ArrowRightCircle size={14} /> 插入详情页
                              </button>
                              <a href={editedImageUrl} download="edited_image.png" className="text-sm text-slate-500 hover:underline">下载</a>
                            </div>
                         </div>
                         <div className="relative aspect-square rounded-xl overflow-hidden border border-pink-200 shadow-md bg-white group cursor-zoom-in"
                              onClick={() => setPreviewImage(editedImageUrl)}>
                           <img src={editedImageUrl} alt="Edited" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                           <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="text-white/80" size={32}/>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* SKU Generator Result with Asset Library */}
                {creativeTab === 'sku' && skuHtml && (
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex gap-8">
                     
                     {/* LEFT: Asset Library */}
                     <div className="w-48 flex-shrink-0 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                           <ImagePlus size={20} /> 素材库
                        </div>
                        <p className="text-xs text-slate-400">点击素材，再点击右侧空白位替换</p>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[600px] scrollbar-hide">
                           {assets.map((assetUrl, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setSelectedAsset(assetUrl)}
                                className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:scale-105 ${selectedAsset === assetUrl ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
                              >
                                 <img src={assetUrl} alt={`Asset ${idx}`} className="w-full h-full object-cover" />
                                 {idx === 0 && <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded">原图</div>}
                              </div>
                           ))}
                           <div 
                             onClick={() => fileInputRef.current?.click()}
                             className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors"
                           >
                              <Plus size={24} />
                              <span className="text-xs mt-1">添加</span>
                           </div>
                        </div>
                     </div>

                     {/* RIGHT: Preview */}
                     <div className="flex-1 flex flex-col items-center">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <LayoutTemplate className="text-indigo-600" size={24} /> 
                          SKU 详情页预览 ({skuStyle})
                        </h3>
                        
                        {/* Mobile Simulator Frame */}
                        <div className="relative border-8 border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl bg-white w-[375px] h-[700px]">
                            {/* Status Bar Mock */}
                            <div className="h-6 bg-black w-full absolute top-0 z-20 flex justify-between px-6 items-center">
                              <div className="text-[10px] text-white font-medium">9:41</div>
                              <div className="flex gap-1">
                                  <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                                  <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                              </div>
                            </div>
                            
                            {/* Dynamic HTML Content */}
                            <div 
                              className="h-full w-full overflow-y-auto pt-6 scrollbar-hide"
                              onClick={handleSkuPreviewClick}
                            >
                              <div dangerouslySetInnerHTML={{ __html: skuHtml }} />
                            </div>
                            
                            {/* Home Indicator */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-black rounded-full z-20 opacity-20"></div>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <button 
                              onClick={() => setPreviewHtmlContent(skuHtml)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-md"
                            >
                              <ZoomIn size={18} /> 放大预览
                            </button>
                            <button 
                              onClick={() => copyToClipboard(skuHtml)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                            >
                              <Code size={18} /> 复制代码
                            </button>
                        </div>
                     </div>
                  </div>
                )}
             </div>
          )}

          {/* === LOGISTICS CALCULATOR MODULE === */}
          {activeMode === AppMode.CALCULATOR && (
            <LogisticsCalculator />
          )}

          {/* === LIVE AGENT MODULE (Always Mounted, Hidden when inactive) === */}
          <div className={activeMode === AppMode.LIVE_AGENT ? "w-full mx-auto" : "hidden"}>
            <LiveAgent contextData={analysisResult} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;