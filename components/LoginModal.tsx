import React, { useState } from 'react';
import { X, Smartphone, MessageCircle, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'phone' | 'wechat'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert("请先阅读并同意用户协议");
      return;
    }
    if (!phone || !code) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess({
        id: 'u_' + Date.now(),
        name: `用户_${phone.slice(-4)}`,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone,
        type: 'phone'
      });
    }, 1500);
  };

  const handleWeChatLoginMock = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess({
        id: 'wx_' + Date.now(),
        name: '微信用户_Pro',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wechat',
        type: 'wechat'
      });
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-[400px] rounded-2xl shadow-2xl overflow-hidden relative flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8 pb-6">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-1">欢迎回来</h2>
          <p className="text-center text-slate-500 text-sm mb-6">登录以同步您的市场分析历史</p>

          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Smartphone size={16} /> 手机验证
            </button>
            <button
              onClick={() => setActiveTab('wechat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'wechat' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <MessageCircle size={16} /> 微信扫码
            </button>
          </div>

          {activeTab === 'phone' ? (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div>
                <input
                  type="tel"
                  placeholder="手机号码"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition-all"
                />
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
                <button type="button" className="px-4 py-2 text-indigo-600 text-sm font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                  获取验证码
                </button>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : '登录 / 注册'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
               <div className="relative group cursor-pointer" onClick={handleWeChatLoginMock}>
                 <div className="w-40 h-40 border-2 border-slate-100 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden">
                    <QrCode size={100} className="text-slate-800 opacity-80" />
                 </div>
                 {/* Simulation Overlay */}
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                   <p className="text-white text-sm font-medium">点击模拟扫码成功</p>
                 </div>
               </div>
               <p className="text-sm text-slate-500">请使用微信扫描二维码登录</p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
           <label className="flex items-start gap-3 cursor-pointer">
             <div className="relative flex items-center">
               <input 
                 type="checkbox" 
                 checked={agreed} 
                 onChange={(e) => setAgreed(e.target.checked)}
                 className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 shadow-sm transition-all checked:border-indigo-600 checked:bg-indigo-600"
               />
               <CheckCircle2 size={16} className="absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-white" />
             </div>
             <span className="text-xs text-slate-500 leading-tight select-none">
               我已阅读并同意 <a href="#" className="text-indigo-600 hover:underline">《用户服务协议》</a> 和 <a href="#" className="text-indigo-600 hover:underline">《隐私政策》</a>
             </span>
           </label>
        </div>
      </div>
    </div>
  );
};