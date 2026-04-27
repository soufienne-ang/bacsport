
import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, KeyRound, AlertTriangle, HelpCircle, UserPlus, CheckCircle } from 'lucide-react';
import { login, checkLockout, getRecoveryQuestion, resetPasswordViaRecovery, isSystemConfigured, setupAccount, User as UserType } from '../services/security';

interface LoginViewProps {
  onLoginSuccess: (user: Omit<UserType, 'passwordHash' | 'recoveryAnswerHash'>) => void;
  logoUrl?: string;
  region?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, logoUrl, region }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'loading' | 'setup' | 'login' | 'recovery'>('loading');

  // Setup States
  const [setupUser, setSetupUser] = useState('');
  const [setupPass, setSetupPass] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupQ, setSetupQ] = useState('ما هو اسم مدرستك الابتدائية؟');
  const [setupA, setSetupA] = useState('');

  // Recovery States
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryUsername, setRecoveryUsername] = useState('');

  useEffect(() => {
    // Check system status on mount
    const configured = isSystemConfigured();
    if (configured) {
        setView('login');
    } else {
        setView('setup');
    }
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!setupUser || !setupPass || !setupA) { setError('الرجاء ملء جميع الحقول الإجبارية'); return; }
      if (setupPass.length < 4) { setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); return; }
      if (setupPass !== setupConfirm) { setError('كلمتي المرور غير متطابقتين'); return; }

      setLoading(true);
      try {
          await setupAccount(setupUser, setupPass, setupQ, setupA);
          alert('تم إنشاء الحساب بنجاح. يمكنك الدخول الآن.');
          setView('login');
      } catch (err) {
          setError('حدث خطأ أثناء الحفظ');
      } finally {
          setLoading(false);
      }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
        const result = await login(username, password);
        if (result.success && result.user) {
            onLoginSuccess(result.user);
        } else {
            setError(result.error || 'Authentication failed');
        }
    } catch (err) {
        setError('System error occurred');
    } finally {
        setLoading(false);
    }
  };

  const handleStartRecovery = () => {
      if (!username) {
          setError('الرجاء إدخال اسم المستخدم أولاً');
          return;
      }
      const q = getRecoveryQuestion(username);
      if (q) {
          setRecoveryUsername(username);
          setRecoveryQuestion(q);
          setView('recovery');
          setError('');
      } else {
          setError('لم يتم العثور على سؤال الأمان لهذا المستخدم.');
      }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      const isValid = await resetPasswordViaRecovery(recoveryUsername, recoveryAnswer, newPassword);
      if (isValid.success) {
          alert('تم إعادة تعيين كلمة المرور بنجاح.');
          setView('login');
          setPassword('');
          setRecoveryUsername('');
      } else {
          setError(isValid.error || 'الإجابة غير صحيحة.');
      }
      setLoading(false);
  };

  if (view === 'loading') return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // --- SETUP VIEW ---
  if (view === 'setup') {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-200 flex items-center justify-center p-4 font-['Cairo']" dir="rtl">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-6">
                    <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">التثبيت الأولي</h1>
                    <p className="text-slate-500 text-sm mt-1">إنشاء حساب المسؤول عن النظام</p>
                </div>

                <form onSubmit={handleSetup} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 font-bold mb-4 flex gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        يرجى حفظ هذه البيانات جيداً للدخول لاحقاً.
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">اسم المستخدم</label>
                        <input type="text" className="w-full p-3 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={setupUser} onChange={e => setSetupUser(e.target.value)} placeholder="مثال: Admin" autoFocus />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">كلمة المرور</label>
                            <input type="password" className="w-full p-3 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={setupPass} onChange={e => setSetupPass(e.target.value)} placeholder="****" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">تأكيد الكلمة</label>
                            <input type="password" className="w-full p-3 border rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={setupConfirm} onChange={e => setSetupConfirm(e.target.value)} placeholder="****" />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 mt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-2">سؤال الأمان (لاسترجاع الحساب)</label>
                        <select className="w-full p-3 border rounded-xl mb-2 text-sm font-bold bg-slate-50 outline-none" value={setupQ} onChange={e => setSetupQ(e.target.value)}>
                            <option>ما هو اسم مدرستك الابتدائية؟</option>
                            <option>ما هو اسم حيوانك الأليف؟</option>
                            <option>ما هو مكان ميلاد والدتك؟</option>
                            <option>ما هو فريقك الرياضي المفضل؟</option>
                        </select>
                        <input type="text" className="w-full p-3 border rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={setupA} onChange={e => setSetupA(e.target.value)} placeholder="الإجابة السرية..." />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 mt-2"
                    >
                        {loading ? 'جاري الحفظ...' : 'إنشاء الحساب وبدء الاستخدام'}
                    </button>
                </form>
            </div>
        </div>
    );
  }

  // --- RECOVERY VIEW ---
  if (view === 'recovery') {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Cairo']" dir="rtl">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
                <div className="text-center mb-6">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">استرجاع كلمة المرور</h2>
                    <p className="text-slate-500 text-sm mt-1">الرجاء الإجابة على سؤال الأمان</p>
                </div>

                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center font-bold text-slate-700">
                        {recoveryQuestion}
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">الإجابة</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={recoveryAnswer}
                            onChange={(e) => setRecoveryAnswer(e.target.value)}
                            placeholder="اكتب إجابتك هنا..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">كلمة المرور الجديدة</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="****"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-70"
                    >
                        {loading ? 'جاري التحقق...' : 'تغيير كلمة المرور'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={() => setView('login')}
                        className="w-full text-slate-500 py-2 text-sm font-bold hover:text-slate-700 transition-colors"
                    >
                        عودة لتسجيل الدخول
                    </button>
                </form>
            </div>
        </div>
      );
  }

  // --- LOGIN VIEW ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 font-['Cairo']" dir="rtl">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 relative overflow-hidden">
        
        {/* Decorative header */}
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        
        <div className="text-center mb-8 pt-4">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-md bg-white border border-slate-100 p-2">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                    <div className="bg-slate-900 w-full h-full rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-10 h-10 text-white" />
                    </div>
                )}
            </div>
            <h1 className="text-2xl font-black text-slate-800">نظام إدارة البكالوريا</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">تربية بدنية - دورة 2026</p>
            {region && <p className="text-blue-600 text-xs font-bold mt-1">المندوبية الجهوية ب{region}</p>}
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">اسم المستخدم</label>
                <div className="relative">
                    <User className="absolute right-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="اسم المستخدم"
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">كلمة المرور</label>
                <div className="relative">
                    <Lock className="absolute right-3 top-3 text-slate-400 w-5 h-5" />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-lg shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 group"
            >
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                {!loading && <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                onClick={handleStartRecovery}
                className="text-xs text-slate-400 hover:text-blue-600 font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
            >
                <HelpCircle className="w-3 h-3" /> نسيت كلمة المرور؟
            </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-[10px] text-center text-slate-400 font-medium leading-relaxed">
            تطبيق محلي آمن - نسخة سطح المكتب<br/>
            © 2026 وزارة الشباب والرياضة
        </div>
      </div>
    </div>
  );
};

export default LoginView;
