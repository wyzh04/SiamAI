import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Send, Bot, User, Loader2, Sparkles, MessageSquarePlus, Box, Clapperboard, Image as ImageIcon, X, Copy, Check } from 'lucide-react';
import { AnalysisData } from '../types';

interface LiveAgentProps {
  contextData?: AnalysisData | null;
}

const SYSTEM_INSTRUCTION_BASE = `
你是一位针对泰国市场（Shopee, Lazada, TikTok Shop）的跨境电商高级顾问。
你的任务是帮助用户解决选品、定价、营销和物流方面的具体问题。
请使用中文与用户进行专业、热情且切中要害的对话。
如果涉及货币，默认使用泰铢 (THB)。
回答时请条理清晰，可以使用 Markdown 格式（如列表、加粗）来增强可读性。

【特殊能力 - 当已知产品信息时】：
1. SKU 规划：请根据产品特性，建议适合泰国市场的 SKU 组合（如：颜色、尺寸、打包销售策略）。
2. 视频脚本：可以为该产品生成 TikTok 短视频拍摄脚本（包含分镜、运镜、台词）。
3. 详情页优化：撰写 Shopee/Lazada/TikTok 不同风格的产品详情页卖点（TikTok 偏向短快痛点、情绪价值，Shopee 偏向参数、信任感）。

【图片分析能力】：
如果用户上传了图片（例如竞品 SKU、海报、买家秀），请分析图片的视觉元素、卖点、材质和适用场景。
用户可能会要求你“提取提示词”，此时请生成适合 Veo 或 Midjourney 使用的英文 Prompt。
`;

// Helper function to render formatted text
const formatMessageText = (text: string) => {
  const lines = text.split('\n');
  
  return lines.map((line, lineIdx) => {
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

    const trimmed = line.trim();
    if (!trimmed) return <div key={lineIdx} className="h-3" />; // Spacer

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

export const LiveAgent: React.FC<LiveAgentProps> = ({ contextData }) => {
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

  // Initialize or Re-initialize chat when context changes
  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let systemInstruction = SYSTEM_INSTRUCTION_BASE;
    if (contextData) {
      systemInstruction += `\n\n【当前分析的产品信息】：\n${contextData.text.substring(0, 1500)}...\n\n请基于以上产品信息回答用户问题。重点关注 SKU 建议和视频营销内容。`;
    }

    chatSessionRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: { systemInstruction },
    });

    // Reset messages if it's a fresh load (or context changed), otherwise keep history
    if (messages.length === 0) {
      setMessages([
        { 
          role: 'model', 
          text: contextData 
            ? '### 已接收市场分析报告！💡\n\n我可以针对这个产品为您提供更深度的落地建议：\n\n1. **SKU 策略**：如何设置变体更好卖？\n2. **视频脚本**：TikTok 爆款视频怎么拍？\n3. **卖点提炼**：泰语详情页怎么写？\n\n您也可以点击左下角图片按钮，上传竞品 SKU 让我分析。' 
            : '### 你好！我是你的专属泰国市场顾问。\n\n关于选品趋势、平台规则或营销策略，有什么想问的吗？\n\n📸 **特殊功能**：您可以上传任何 SKU 图片，让我分析卖点或提取 AI 绘画/视频提示词。' 
        }
      ]);
    }
  }, [contextData]);

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
        // Prepare multimodal message
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

  // Dynamic suggestions based on context
  const suggestions = contextData ? [
    { text: "生成高转化 SKU 组合建议", icon: <Box size={16}/> },
    { text: "写一个 TikTok 爆款视频脚本", icon: <Clapperboard size={16}/> },
    { text: "分析泰语差评风险点", icon: <MessageSquarePlus size={16}/> },
    { text: "Shopee 详情页卖点描述", icon: <Sparkles size={16}/> },
    { text: "TikTok 详情页卖点描述", icon: <Sparkles size={16}/> }
  ] : [
    { text: "帮我写 3 个泰语 TikTok 标题", icon: <MessageSquarePlus size={16}/> },
    { text: "目前曼谷流行什么产品？", icon: <Sparkles size={16}/> },
    { text: "Shopee 和 Lazada 哪个好做？", icon: <MessageSquarePlus size={16}/> },
    { text: "提取这张图片的 Veo 提示词", icon: <ImageIcon size={16}/> } // Added useful default
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-140px)] min-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm z-10">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
          <Bot className="text-white" size={28} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            AI 专家顾问
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Online</span>
          </h3>
          <p className="text-sm text-slate-500">Gemini 3.0 • {contextData ? '已关联产品分析' : '通用咨询模式'}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
        {messages.map((msg, idx) => (
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
              {/* Image Bubble if exists */}
              {msg.image && (
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-[240px]">
                  <img src={msg.image} alt="User upload" className="w-full h-auto" />
                </div>
              )}
              
              {/* Text Bubble */}
              {msg.text && (
                 <div className={`group relative rounded-2xl px-6 py-4 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 rounded-tl-none w-full'
                }`}>
                  {msg.role === 'model' ? (
                    <div className="w-full pr-8">
                      {formatMessageText(msg.text)}
                      {/* Copy Button */}
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
        ))}

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