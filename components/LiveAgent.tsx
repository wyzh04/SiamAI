import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Send, Bot, User, Loader2, Sparkles, MessageSquarePlus, Box, Clapperboard, Image as ImageIcon, X, Copy, Check, Wand2, Palette, Layers } from 'lucide-react';
import { AnalysisData, TargetMarket } from '../types';

interface LiveAgentProps {
  contextData?: AnalysisData | null;
  market: TargetMarket;
  onUsePrompt: (prompt: string) => void;
  onBatchGenerate: (prompts: Array<{label: string, prompt: string}>) => void;
}

const getSystemInstruction = (market: TargetMarket) => `
你是一位针对东南亚市场（特指：${market}）的跨境电商高级顾问。
你的任务是帮助用户解决选品、定价、营销和物流方面的具体问题。
请使用中文与用户进行专业、热情且切中要害的对话。

【市场专家角色设定】：
${market === 'TH' ? '- 泰国: 佛教文化、颜色喜好（鲜艳）、TikTok/Shopee。关键词: 泰语。' : ''}
${market === 'PH' ? '- 菲律宾: 天主教、英语/Tagalog、喜欢促销/赠品。关键词: 英语/Taglish。' : ''}
${market === 'VN' ? '- 越南: 价格敏感、年轻人口、Zalo/Facebook 营销。关键词: 越南语。' : ''}
${market === 'MY' ? '- 马来西亚: 多元种族、清真(Halal)意识、西马/东马物流差异。关键词: 英语/马来语。' : ''}
${market === 'SG' ? '- 新加坡: 高消费力、追求品质效率、全英文环境。关键词: 英语。' : ''}
${market === 'ID' ? '- 印尼: 穆斯林文化、千岛物流痛点、Tokopedia/Shopee。关键词: 印尼语。' : ''}

【特殊能力 - 当已知产品信息时】：
1. SKU 规划：建议适合当地市场的 SKU 组合（如：颜色、尺寸、打包策略）。
2. 视频脚本：生成本土化 TikTok 短视频脚本。
3. 详情页优化：撰写符合当地语言习惯的卖点。

【智能配图生成 (SKU 详情页专用)】：
当用户询问“场景图建议”、“生成图片提示词”、“配图建议”或“SKU 配图”时，请基于当前分析的产品，**严格按照以下 8 个核心板块顺序**，生成极具**${market}本土电商风格**的英文 AI 绘画提示词。

**请依次生成 8 个板块的 Prompt:**
1. **Hero Poster (首屏海报)**
2. **Product Overview (产品全貌)**
3. **Pain Points (核心功能/痛点)**
4. **Lifestyle Scenario (场景化)**
5. **Competitor Comparison (竞品对比)**
6. **Quality Details (细节品质)**
7. **Social Proof (用户口碑)**
8. **Certificates (资质认证)**

**务必严格按照以下格式输出每一个 Prompt，以便系统识别为可点击按钮**：
**[板块名称]**
🎨 Prompt: [英文提示词内容]
`;

// Helper function to render formatted text with action buttons
const formatMessageText = (text: string, onUsePrompt: (prompt: string) => void) => {
  const lines = text.split('\n');
  
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={lineIdx} className="h-3" />; // Spacer

    // === Special Detection for Prompts ===
    if (trimmed.startsWith('🎨 Prompt:') || trimmed.startsWith('🎨 Prompt：')) {
        const promptContent = trimmed.replace(/^🎨 Prompt[:：]\s*/, '').trim();
        return (
            <div key={lineIdx} className="my-3 p-4 bg-purple-50 rounded-xl border border-purple-100 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                    <Palette size={16} className="text-purple-600 mt-1 shrink-0" />
                    <span className="text-slate-700 font-medium italic text-sm">{promptContent}</span>
                </div>
                <button 
                  onClick={() => onUsePrompt(promptContent)}
                  className="self-end flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                    <Wand2 size={12} /> 一键魔法编辑
                </button>
            </div>
        );
    }

    // Helper for inline formatting (Bold)
    const renderInline = (content: string) => {
      const parts = content.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    // Headers
    if (trimmed.startsWith('### ')) {
      return <h4 key={lineIdx} className="text-lg font-bold text-slate-800 mt-5 mb-3">{renderInline(trimmed.replace(/^###\s+/, ''))}</h4>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={lineIdx} className="text-xl font-bold text-indigo-700 mt-6 mb-4 border-b border-indigo-100 pb-2">{renderInline(trimmed.replace(/^##\s+/, ''))}</h3>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={lineIdx} className="text-2xl font-bold text-indigo-800 mt-6 mb-4">{renderInline(trimmed.replace(/^#\s+/, ''))}</h2>;
    }

    // Lists (Bulleted)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={lineIdx} className="flex gap-3 ml-1 mb-2 items-start">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0" />
          <div className="text-slate-700 leading-relaxed text-base">{renderInline(trimmed.replace(/^[-*]\s+/, ''))}</div>
        </div>
      );
    }

    // Lists (Numbered)
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberMatch) {
      return (
        <div key={lineIdx} className="flex gap-3 ml-1 mb-2 items-start">
          <span className="font-bold text-indigo-600 min-w-[1.4rem] mt-0.5">{numberMatch[1]}.</span>
          <span className="text-slate-700 leading-relaxed text-base">{renderInline(numberMatch[2])}</span>
        </div>
      );
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
       return <div key={lineIdx} className="border-l-4 border-indigo-300 pl-4 py-2 my-3 bg-indigo-50 text-slate-700 italic rounded-r-lg">{renderInline(trimmed.replace(/^>\s+/, ''))}</div>;
    }

    // Regular paragraph
    return <p key={lineIdx} className="mb-2 text-slate-700 leading-relaxed text-base">{renderInline(line)}</p>;
  });
};

export const LiveAgent: React.FC<LiveAgentProps> = ({ contextData, market, onUsePrompt, onBatchGenerate }) => {
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string, image?: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Image Upload State
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingMimeType, setPendingMimeType] = useState<string>('image/jpeg');
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or Re-initialize chat when context or MARKET changes
  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let systemInstruction = getSystemInstruction(market);
    if (contextData) {
      systemInstruction += `\n\n【当前分析的产品信息】：\n${contextData.text.substring(0, 1500)}...\n\n请基于以上产品信息回答用户问题。重点关注 SKU 建议和视频营销内容。`;
    }

    chatSessionRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction },
    });

    const marketFlags: Record<string, string> = { TH: '🇹🇭', PH: '🇵🇭', VN: '🇻🇳', MY: '🇲🇾', SG: '🇸🇬', ID: '🇮🇩' };
    const flag = marketFlags[market] || '';
    
    setMessages([
        { 
          role: 'model', 
          text: contextData 
            ? `### 已接收${market}市场分析报告！${flag}\n\n我可以针对这个产品为您提供更深度的落地建议：\n\n1. **SKU 策略**：在${market}如何设置变体更好卖？\n2. **视频脚本**：TikTok ${market} 爆款视频怎么拍？\n3. **SKU 配图**：为详情页生成全套场景提示词。\n\n您也可以点击左下角图片按钮，上传竞品 SKU 让我分析。` 
            : `### Hello！我是你的${market}市场专属顾问 ${flag}。\n\n关于选品趋势、平台规则或本地化营销策略，有什么想问的吗？\n\n📸 **特殊功能**：您可以上传任何 SKU 图片，让我分析卖点或提取 AI 绘画/视频提示词。` 
        }
    ]);
  }, [contextData, market]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, pendingImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Strip prefix for API sending, keep full for display
        setPendingImage(base64);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearPendingImage = () => {
    setPendingImage(null);
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const extractPrompts = (text: string) => {
    const prompts: Array<{label: string, prompt: string}> = [];
    const regex = /\*\*(.*?)\*\*\s*\n\s*🎨 Prompt[:：]\s*(.*?)(?=\n\n|\n\*\*|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        let rawLabel = match[1].replace(/^\d+\.\s*/, '').trim();
        const shortLabel = rawLabel.split('(')[0].trim() || rawLabel; 
        
        prompts.push({
            label: shortLabel,
            prompt: match[2].trim()
        });
    }
    return prompts;
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && !pendingImage) || !chatSessionRef.current) return;

    // Save current image state to local vars before clearing
    const imageToSend = pendingImage;
    const mimeTypeToSend = pendingMimeType;

    // Clear inputs immediately
    setInput('');
    setPendingImage(null);

    // Add user message to UI
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: textToSend,
      image: imageToSend || undefined
    }]);
    
    setIsTyping(true);

    try {
      let messagePayload: any;
      
      if (imageToSend) {
        const base64Data = imageToSend.split(',')[1];
        messagePayload = [
          { text: textToSend || "请分析这张图片" },
          { inlineData: { mimeType: mimeTypeToSend, data: base64Data } }
        ];
      } else {
        messagePayload = textToSend;
      }

      const resultStream = await chatSessionRef.current.sendMessageStream({ 
        message: messagePayload 
      });
      
      let fullResponse = "";
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of resultStream) {
        const text = (chunk as GenerateContentResponse).text;
        if (text) {
            fullResponse += text;
            setMessages(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { role: 'model', text: fullResponse };
                return newHistory;
            });
        }
      }
    } catch (e) {
      console.error("Chat error", e);
      setMessages(prev => [...prev, { role: 'model', text: '抱歉，连接出现问题或图片无法处理，请稍后再试。' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = contextData ? [
    { text: "生成 SKU 组合策略", icon: <Box size={16}/> },
    { text: "生成 SKU 详情页配图", icon: <ImageIcon size={16}/> },
    { text: "写一个 TikTok 视频脚本", icon: <Clapperboard size={16}/> },
    { text: "分析差评风险", icon: <MessageSquarePlus size={16}/> },
  ] : [
    { text: `写 3 个本地化标题`, icon: <MessageSquarePlus size={16}/> },
    { text: `现在什么品类最火？`, icon: <Sparkles size={16}/> },
    { text: "Shopee/Lazada 哪个好做？", icon: <MessageSquarePlus size={16}/> },
    { text: "提取这张图片的 Veo 提示词", icon: <ImageIcon size={16}/> }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm z-10">
        <div className={`w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md`}>
          <Bot className="text-white" size={28} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            AI 专家顾问 ({market}站)
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Online</span>
          </h3>
          <p className="text-sm text-slate-500">Gemini 3.0 • {contextData ? '已关联产品分析' : '通用咨询模式'}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
        {messages.map((msg, idx) => {
          const detectedPrompts = msg.role === 'model' ? extractPrompts(msg.text) : [];
          
          return (
            <div 
              key={idx} 
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                msg.role === 'user' ? 'bg-indigo-600' : 'bg-white border border-slate-200'
              }`}>
                {msg.role === 'user' ? <User size={20} className="text-white"/> : <Sparkles size={20} className="text-purple-600"/>}
              </div>
              
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.image && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-[240px]">
                    <img src={msg.image} alt="User upload" className="w-full h-auto" />
                  </div>
                )}
                
                {msg.text && (
                   <div className={`group relative rounded-2xl px-6 py-4 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-100 rounded-tl-none w-full'
                  }`}>
                    {msg.role === 'model' ? (
                      <div className="w-full pr-8">
                        {formatMessageText(msg.text, onUsePrompt)}
                        
                        {/* BATCH GENERATION BUTTON */}
                        {detectedPrompts.length > 1 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">检测到 {detectedPrompts.length} 个设计提示词</span>
                                <button 
                                  onClick={() => onBatchGenerate(detectedPrompts)}
                                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    <Layers size={16} /> 一键生成全套素材
                                </button>
                            </div>
                        )}

                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => handleCopy(msg.text, idx)}
                             className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-indigo-600 transition-colors"
                             title="复制内容"
                           >
                             {copiedId === idx ? <Check size={16} className="text-green-600"/> : <Copy size={16}/>}
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-base leading-relaxed">{msg.text}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-4">
             <div className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm">
                <Sparkles size={20} className="text-purple-600"/>
             </div>
             <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions & Input Area */}
      <div className="p-4 border-t border-slate-100 bg-white space-y-3">
        {/* Quick Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {suggestions.map((s, i) => (
            <button 
              key={i}
              onClick={() => handleSend(s.text)}
              disabled={isTyping}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                contextData 
                  ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' 
                  : 'bg-slate-100 text-slate-600 border-transparent hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              {s.icon}
              {s.text}
            </button>
          ))}
        </div>

        {/* Image Preview Area */}
        {pendingImage && (
          <div className="relative inline-block">
             <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-indigo-200 shadow-sm group">
               <img src={pendingImage} alt="Preview" className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center transition-all">
               </div>
             </div>
             <button 
               onClick={clearPendingImage}
               className="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-1 hover:bg-slate-600 shadow-sm z-10"
             >
               <X size={14} />
             </button>
          </div>
        )}

        <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
            title="上传图片"
          >
            <ImageIcon size={24} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileSelect}
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={pendingImage ? "描述您想了解的图片内容（如：提取 SKU 提示词）..." : (contextData ? "询问关于 SKU 或视频脚本的问题..." : "输入您的问题或上传图片...")}
            className="flex-1 bg-transparent border-none focus:ring-0 text-base text-slate-800 resize-none max-h-32 p-1"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !pendingImage) || isTyping}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};