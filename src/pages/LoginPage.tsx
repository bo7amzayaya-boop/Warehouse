import React, { useState } from 'react';
import { Boxes, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginUser, resetPasswordEmail } from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const { showSuccess, showError, showInfo } = useNotification();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('يرجى كتابة البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      await loginUser(email, password);
      showSuccess('تم تسجيل الدخول بنجاح! مرحباً بك في نظام الخيال.');
    } catch (err: any) {
      console.error('Login error:', err);
      showError(err.message || 'فشل تسجيل الدخول. يرجى التأكد من كلمة المرور والبريد.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await resetPasswordEmail(forgotEmail);
      showSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
      setShowForgotModal(false);
    } catch (err: any) {
      showError('تعذر إرسال البريد. تأكد من صحة البريد الإلكتروني.');
    }
  };

  const fillDemoAdmin = () => {
    setEmail('bo7amzayaya@gmail.com');
    setPassword('123456');
    showInfo('تم تعبئة بريد المدير التجريبي. اضغط تسجيل الدخول.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-cairo">
      {/* Background Glow Circles */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Badge */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex p-4 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl shadow-2xl shadow-indigo-500/40 text-white mb-1">
            <Boxes className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            نظام مستودع الخيال
          </h1>
          <p className="text-xs text-indigo-300 font-medium">
            نظام إدارة وتتبع مواد الطباعة والإعلان الذكي
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
            <h2 className="text-lg font-bold text-white">تسجيل الدخول للنظام</h2>
            <span className="px-2.5 py-1 text-[11px] font-bold bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
              نسخة آمنة
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@khayal.com"
                  className="w-full bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-2xl py-3 pr-10 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all dir-ltr text-right"
                />
                <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300 block">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-2xl py-3 pr-10 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all dir-ltr text-right"
                />
                <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>تذكر بيانات الدخول</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold rounded-2xl text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>تسجيل الدخول للمستودع</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Helper */}
          <div className="pt-4 border-t border-slate-700/60 text-center">
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors"
            >
              اضغط هنا لتعبئة حساب المدير التجريبي تلقائياً
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          جميع الحقوق محفوظة © {new Date().getFullYear()} مؤسسة الخيال للطباعة والإعلان
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-white text-base">إعادة تعيين كلمة المرور</h3>
            <p className="text-xs text-slate-300">
              أدخل بريدك الإلكتروني ليصلك رابط إعادة الضبط:
            </p>
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
                >
                  إرسال رابط الضبط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
