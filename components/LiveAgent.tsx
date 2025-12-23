import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Send, Bot, User, Loader2, Sparkles, MessageSquarePlus, Box, Clapperboard } from 'lucide-react';
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
`;

export const LiveAgent: React.FC<LiveAgentProps> = ({ contextData }) => {
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    // Logic: If context changes, we start a new conversation focused on that context
    setMessages([
      { 
        role: 'model', 
        text: contextData 
          ? '已接收市场分析报告！💡\n\n我可以针对这个产品为您提供更深度的落地建议：\n1. **SKU 策略**：如何设置变体更好卖？\n2. **视频脚本**：TikTok 爆款视频怎么拍？\n3. **卖点提炼**：泰语详情页怎么写？\n\n您想先聊哪个？' 
          : '你好！我是你的专属泰国市场顾问。关于选品趋势、平台规则或营销策略，有什么想问的吗？' 
      }
    ]);
  }, [contextData]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || !chatSessionRef.current) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setIsTyping(true);

    try {
      const resultStream = await chatSessionRef.current.sendMessageStream({ message: textToSend });
      
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
      setMessages(prev => [...prev, { role: 'model', text: '抱歉，连接出现问题，请稍后再试。' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Dynamic suggestions based on context
  const suggestions = contextData ? [
    { text: "生成高转化 SKU 组合建议", icon: <Box size={14}/> },
    { text: "写一个 TikTok 爆款视频脚本", icon: <Clapperboard size={14}/> },
    { text: "分析泰语差评风险点", icon: <MessageSquarePlus size={14}/> },
    { text: "Shopee 详情页卖点描述", icon: <Sparkles size={14}/> }
  ] : [
    { text: "帮我写 3 个泰语 TikTok 标题", icon: <MessageSquarePlus size={14}/> },
    { text: "目前曼谷流行什么产品？", icon: <Sparkles size={14}/> },
    { text: "Shopee 和 Lazada 哪个好做？", icon: <MessageSquarePlus size={14}/> },
    { text: "泰国物流时效要求", icon: <Box size={14}/> }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-white/80 backdrop-blur-sm z-10">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
          <Bot className="text-white" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            AI 专家顾问
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-medium">Online</span>
          </h3>
          <p className="text-xs text-slate-500">Gemini 3.0 • {contextData ? '已关联产品分析' : '通用咨询模式'}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-100' : 'bg-white border border-slate-200'
            }`}>
              {msg.role === 'user' ? <User size={16} className="text-indigo-600"/> : <Sparkles size={16} className="text-purple-600"/>}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none prose prose-sm max-w-none'
            }`}>
              {msg.role === 'model' ? (
                <div className="markdown-body whitespace-pre-wrap">{msg.text}</div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3">
             <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                <Sparkles size={16} className="text-purple-600"/>
             </div>
             <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <Loader2 className="animate-spin text-indigo-500" size={18} />
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
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
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

        <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={contextData ? "询问关于 SKU 或视频脚本的问题..." : "输入您的问题..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 resize-none max-h-32 p-2"
            rows={1}
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};