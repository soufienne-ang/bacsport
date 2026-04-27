import React, { useState, useEffect } from 'react';
import { GradingConfig, SportType, Gender, BaremeRow, CompetitionCategory, GradingHistoryEntry, GlobalSettings } from '../types';
import { AlertCircle, Plus, Trash2, ArrowDownUp, Layers, Check, Lock, Unlock, History, Save, RotateCcw, X, AlertTriangle, ShieldAlert, KeyRound, MapPin, Image as ImageIcon, Upload } from 'lucide-react';
import { SPORT_TRANSLATIONS, GENDER_TRANSLATIONS } from '../constants';
import { verifyPassword, initSecurity, changePassword } from '../services/security';
import { db } from '../services/db';

interface ConfigViewProps {
  config: GradingConfig;
  onSaveConfig: (config: GradingConfig, author: string, desc: string) => void;
  history: GradingHistoryEntry[];
  categories: CompetitionCategory[];
  setCategories: React.Dispatch<React.SetStateAction<CompetitionCategory[]>>;
  settings: GlobalSettings;
  onUpdateSettings: (settings: GlobalSettings) => void;
}

const ConfigView: React.FC<ConfigViewProps> = ({ config, onSaveConfig, history, categories, setCategories, settings, onUpdateSettings }) => {
  // Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);

  // Data States for Editing
  const [tempConfig, setTempConfig] = useState<GradingConfig>(config);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  
  // Settings State
  const [tempRegion, setTempRegion] = useState(settings.regionName);
  const [tempLogo, setTempLogo] = useState(settings.logoUrl);
  const [tempSessionMonth, setTempSessionMonth] = useState(settings.sessionMonth);
  const [tempSessionYear, setTempSessionYear] = useState(settings.sessionYear);
  
  // Change Password States
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  // Save Meta
  const [saveDescription, setSaveDescription] = useState('');
  const [saveAuthor, setSaveAuthor] = useState('Admin');

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Initialize Security on Load
  useEffect(() => {
      initSecurity();
  }, []);

  // Update temp config when prop changes (if not editing)
  useEffect(() => {
      if (!isEditing) {
          setTempConfig(config);
          setTempRegion(settings.regionName);
          setTempLogo(settings.logoUrl);
          setTempSessionMonth(settings.sessionMonth);
          setTempSessionYear(settings.sessionYear);
      }
  }, [config, settings, isEditing]);

  const handleUnlock = async () => {
      if (!passwordInput.trim()) return;
      
      setIsProcessingAuth(true);
      setAuthError('');

      try {
          const result = await verifyPassword(passwordInput);
          if (result.success) {
              setIsEditing(true);
              setShowPasswordModal(false);
              setPasswordInput('');
              setAuthError('');
          } else {
              setAuthError(result.error || 'خطأ في المصادقة');
          }
      } catch (e) {
          setAuthError('حدث خطأ غير متوقع');
      } finally {
          setIsProcessingAuth(false);
      }
  };

  const handleChangePassword = async () => {
      setCpError('');
      setCpSuccess('');
      if (!cpCurrent || !cpNew || !cpConfirm) { setCpError('الرجاء ملء جميع الحقول'); return; }
      if (cpNew !== cpConfirm) { setCpError('كلمة المرور الجديدة غير متطابقة'); return; }

      setIsProcessingAuth(true);
      try {
          const result = await changePassword(cpCurrent, cpNew);
          if (result.success) {
              setCpSuccess('تم تغيير كلمة المرور بنجاح');
              setTimeout(() => { setShowChangePassModal(false); setCpCurrent(''); setCpNew(''); setCpConfirm(''); setCpSuccess(''); }, 1500);
          } else { setCpError(result.error || 'فشل التغيير'); }
      } catch (e) { setCpError('حدث خطأ غير متوقع'); } finally { setIsProcessingAuth(false); }
  };

  const handleCancelEdit = () => { 
      setTempConfig(config); 
      setTempRegion(settings.regionName);
      setTempLogo(settings.logoUrl);
      setTempSessionMonth(settings.sessionMonth);
      setTempSessionYear(settings.sessionYear);
      setIsEditing(false); 
  };

  const handlePreSave = () => {
      let isValid = true;
      Object.keys(tempConfig).forEach(sport => {
          [Gender.Male, Gender.Female].forEach(gender => {
              const rows = tempConfig[sport as SportType][gender];
              rows.forEach(r => { if (r.score < 0 || r.score > 20 || r.performance < 0) isValid = false; });
          });
      });
      if (!isValid) { 
          if (!confirm('تنبيه: توجد قيم غير صالحة (درجات خارج نطاق 0-20 أو أداء سلبي). هل تريد المتابعة؟')) return;
      }
      setShowSaveModal(true);
  };

  const confirmSave = () => {
      onSaveConfig(tempConfig, saveAuthor, saveDescription || 'تحديث المعايير');
      // Save global settings as well
      if (tempRegion !== settings.regionName || tempLogo !== settings.logoUrl || tempSessionMonth !== settings.sessionMonth || tempSessionYear !== settings.sessionYear) {
          onUpdateSettings({ ...settings, regionName: tempRegion, logoUrl: tempLogo, sessionMonth: tempSessionMonth, sessionYear: tempSessionYear });
      }
      setShowSaveModal(false);
      setIsEditing(false);
      setSaveDescription('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Check size (max 2MB to preserve localStorage)
          if (file.size > 2 * 1024 * 1024) {
              alert("حجم الصورة كبير جداً. الرجاء اختيار صورة أقل من 2 ميغابايت.");
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              setTempLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRestore = (entry: GradingHistoryEntry) => {
      if (confirm(`هل أنت متأكد من استرجاع النسخة v${entry.version}؟`)) {
          onSaveConfig(entry.config, 'System Restore', `استرجاع النسخة v${entry.version}`);
          setShowHistoryModal(false);
      }
  };

  // --- Input Handlers ---
  const handleValueChange = (sport: SportType, gender: Gender, index: number, field: keyof BaremeRow, newValue: string) => {
      const floatVal = parseFloat(newValue);
      if (isNaN(floatVal) && newValue !== "") return;
      const newCfg = { ...tempConfig };
      const newScale = [...newCfg[sport][gender]];
      newScale[index] = { ...newScale[index], [field]: newValue === "" ? 0 : floatVal };
      newCfg[sport][gender] = newScale;
      setTempConfig(newCfg);
  };

  const handleAddRow = (sport: SportType, gender: Gender) => {
    const newCfg = { ...tempConfig };
    const currentScale = newCfg[sport][gender];
    const lastRow = currentScale.length > 0 ? currentScale[currentScale.length - 1] : { performance: 0, score: 0 };
    newCfg[sport][gender] = [...currentScale, { ...lastRow }]; 
    setTempConfig(newCfg);
  };

  const handleRemoveRow = (sport: SportType, gender: Gender, index: number) => {
    const newCfg = { ...tempConfig };
    const newScale = [...newCfg[sport][gender]];
    newScale.splice(index, 1);
    newCfg[sport][gender] = newScale;
    setTempConfig(newCfg);
  };

  const handleSortRows = (sport: SportType, gender: Gender) => {
    const newCfg = { ...tempConfig };
    const newScale = [...newCfg[sport][gender]];
    newScale.sort((a, b) => a.performance - b.performance);
    newCfg[sport][gender] = newScale;
    setTempConfig(newCfg);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setCategories(prev => [...prev, { id: crypto.randomUUID(), name: newCategoryName, sports: [] }]);
    setNewCategoryName('');
  };

  const toggleSportInCategory = (catId: string, sport: SportType) => {
    if (!isEditing) return;
    setCategories(prev => prev.map(cat => {
        if (cat.id === catId) {
            return cat.sports.includes(sport) ? { ...cat, sports: cat.sports.filter(s => s !== sport) } : { ...cat, sports: [...cat.sports, sport] };
        }
        return cat;
    }));
  };

  // --- Modals ---
  const PasswordModal = () => (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800"><ShieldAlert className="w-6 h-6 text-blue-600" /> المصادقة مطلوبة</h3>
              <p className="text-slate-600 mb-4 text-sm leading-relaxed">هذه المنطقة محمية بكلمة عبور مشفرة.</p>
              <div className="relative mb-4">
                  <Lock className="absolute right-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input type="password" className={`w-full border p-2 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${authError ? 'border-red-500 bg-red-50' : 'border-slate-300'}`} placeholder="كلمة المرور" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlock()} autoFocus disabled={isProcessingAuth} />
              </div>
              {authError && <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded mb-4 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{authError}</span></div>}
              <div className="flex gap-2 justify-end mt-2">
                  <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm" disabled={isProcessingAuth}>إلغاء</button>
                  <button onClick={handleUnlock} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md disabled:opacity-70 flex items-center gap-2" disabled={isProcessingAuth || !passwordInput}>{isProcessingAuth ? 'جاري التحقق...' : 'دخول'}</button>
              </div>
          </div>
      </div>
  );

  // Other modals (Save, History, ChangePass) omitted for brevity but logic is preserved in return
  const SaveModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Save className="w-5 h-5 text-green-600" /> حفظ التغييرات</h3>
            <div className="space-y-3">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">اسم المسؤول</label><input type="text" className="w-full border p-2 rounded" value={saveAuthor} onChange={e => setSaveAuthor(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">وصف التغييرات</label><textarea className="w-full border p-2 rounded h-20" placeholder="مثال: تعديل مقاييس الجري..." value={saveDescription} onChange={e => setSaveDescription(e.target.value)} /></div>
                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> سيتم إنشاء نسخة جديدة وتطبيقها فوراً.</div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
                <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded">إلغاء</button>
                <button onClick={confirmSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold">تأكيد وحفظ</button>
            </div>
        </div>
    </div>
  );

  const HistoryModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5" /> سجل التغييرات</h3><button onClick={() => setShowHistoryModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="flex-1 overflow-auto border rounded-lg">
                <table className="w-full text-sm text-right">
                    <thead className="bg-slate-50 sticky top-0"><tr><th className="p-3 border-b">النسخة</th><th className="p-3 border-b">التاريخ</th><th className="p-3 border-b">المسؤول</th><th className="p-3 border-b">الوصف</th><th className="p-3 border-b">إجراء</th></tr></thead>
                    <tbody>{[...history].reverse().map(entry => (
                        <tr key={entry.version} className="hover:bg-slate-50"><td className="p-3 border-b font-bold">v{entry.version}</td><td className="p-3 border-b">{new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}</td><td className="p-3 border-b">{entry.author}</td><td className="p-3 border-b text-slate-600 truncate max-w-[200px]">{entry.description}</td><td className="p-3 border-b">{entry.version !== history[history.length-1].version && (<button onClick={() => handleRestore(entry)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"><RotateCcw className="w-3 h-3" /> استرجاع</button>)} {entry.version === history[history.length-1].version && <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">نشطة</span>}</td></tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    </div>
  );

  const ChangePasswordModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800"><KeyRound className="w-5 h-5 text-indigo-600" /> تغيير كلمة المرور</h3>
            <div className="space-y-3 mb-4">
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">كلمة المرور الحالية</label><input type="password" className="w-full border p-2 rounded-lg text-sm" value={cpCurrent} onChange={e => setCpCurrent(e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">كلمة المرور الجديدة</label><input type="password" className="w-full border p-2 rounded-lg text-sm" value={cpNew} onChange={e => setCpNew(e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500 mb-1 block">تأكيد كلمة المرور</label><input type="password" className="w-full border p-2 rounded-lg text-sm" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} /></div>
            </div>
            {cpError && <div className="bg-red-50 text-red-600 text-xs font-bold p-2 rounded mb-3">{cpError}</div>}
            {cpSuccess && <div className="bg-green-50 text-green-600 text-xs font-bold p-2 rounded mb-3">{cpSuccess}</div>}
            <div className="flex gap-2 justify-end mt-2"><button onClick={() => setShowChangePassModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg font-bold text-sm" disabled={isProcessingAuth}>إلغاء</button><button onClick={handleChangePassword} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm" disabled={isProcessingAuth}>حفظ التغيير</button></div>
        </div>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto font-['Cairo'] pb-24">
      {showPasswordModal && <PasswordModal />}
      {showChangePassModal && <ChangePasswordModal />}
      {showSaveModal && <SaveModal />}
      {showHistoryModal && <HistoryModal />}

      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-20">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                الإعدادات وسلم التنقيط
                <span className="text-xs font-normal px-2 py-1 bg-slate-100 rounded text-slate-500">v{history[history.length-1].version}</span>
            </h2>
            <p className="text-xs text-slate-500">آخر تحديث: {new Date(history[history.length-1].timestamp).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold transition-colors">
                <History className="w-4 h-4" /> السجل
            </button>
            {isEditing ? (
                <>
                    <button onClick={() => setShowChangePassModal(true)} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold transition-colors flex items-center gap-2">
                        <KeyRound className="w-4 h-4" /> تغيير كلمة المرور
                    </button>
                    <button onClick={handleCancelEdit} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors">إلغاء</button>
                    <button onClick={handlePreSave} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all">
                        <Save className="w-4 h-4" /> حفظ التغييرات
                    </button>
                </>
            ) : (
                <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white hover:bg-black rounded-lg font-bold shadow-lg transition-all">
                    <Unlock className="w-4 h-4" /> تعديل الإعدادات
                </button>
            )}
        </div>
      </div>
      
      {!isEditing && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-8 flex gap-3 items-center shadow-sm">
            <ShieldAlert className="text-blue-600 w-6 h-6 shrink-0" />
            <div>
                <p className="text-blue-900 text-sm font-bold">وضع القراءة (Read-Only)</p>
                <p className="text-blue-700 text-xs">البيانات محمية ضد التعديل العرضي. انقر على "تعديل الإعدادات" للمصادقة.</p>
            </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-8 flex flex-col gap-4 animate-in fade-in shadow-sm">
            <div className="flex gap-3 items-start">
                <Unlock className="text-amber-600 w-6 h-6 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-amber-900">وضع التعديل النشط (Admin Mode)</h4>
                    <p className="text-amber-700 text-sm">أنت الآن تقوم بتعديل المعايير الحساسة. سيتم إعادة احتساب جميع الأعداد فور الحفظ.</p>
                </div>
            </div>
            
            {/* General Settings Section - MODIFIED FOR LOGO UPLOAD */}
            <div className="mt-4 border-t border-amber-200 pt-4 grid md:grid-cols-2 gap-8">
                {/* Section 1: Nom du gouvernorat */}
                <div>
                    <h5 className="font-bold text-slate-800 flex items-center gap-2 text-sm mb-3">
                        <MapPin className="w-4 h-4" /> إعدادات الموقع (Gouvernorat)
                    </h5>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-600">اسم الولاية / المندوبية الجهوية</label>
                        <p className="text-[10px] text-slate-400 mb-1">هذا الإسم سيظهر في ترويسة التقارير وأسفل القوائم.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800" 
                                value={tempRegion}
                                onChange={(e) => setTempRegion(e.target.value)}
                                placeholder="أدخل اسم الولاية"
                            />
                             <select 
                                className="border rounded-lg p-2 bg-white outline-none text-sm font-bold text-slate-600"
                                onChange={(e) => setTempRegion(e.target.value)}
                                value={tempRegion}
                            >
                                <option value="" disabled>قائمة الولايات...</option>
                                <option value="صفاقس">صفاقس</option>
                                <option value="تونس 1">تونس 1</option>
                                <option value="تونس 2">تونس 2</option>
                                <option value="سوسة">سوسة</option>
                                <option value="المنستير">المنستير</option>
                                <option value="المهدية">المهدية</option>
                                <option value="قابس">قابس</option>
                                <option value="مدنين">مدنين</option>
                                <option value="قفصة">قفصة</option>
                                <option value="القيروان">القيروان</option>
                                <option value="القصرين">القصرين</option>
                                <option value="سيدي بوزيد">سيدي بوزيد</option>
                                <option value="جندوبة">جندوبة</option>
                                <option value="الكاف">الكاف</option>
                                <option value="باجة">باجة</option>
                                <option value="سليانة">سليانة</option>
                                <option value="توزر">توزر</option>
                                <option value="قبلي">قبلي</option>
                                <option value="تطاوين">تطاوين</option>
                                <option value="نابل">نابل</option>
                                <option value="بنزرت">بنزرت</option>
                                <option value="أريانة">أريانة</option>
                                <option value="بن عروس">بن عروس</option>
                                <option value="منوبة">منوبة</option>
                                <option value="زغوان">زغوان</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 2: Logo Upload */}
                <div>
                    <h5 className="font-bold text-slate-800 flex items-center gap-2 text-sm mb-3">
                        <ImageIcon className="w-4 h-4" /> شعار المندوبية (Logo)
                    </h5>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 shadow-sm overflow-hidden">
                            <img src={tempLogo || "https://placehold.co/100"} alt="Logo Preview" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-600 block mb-1">تغيير الشعار</label>
                            <p className="text-[10px] text-slate-400 mb-2">سيظهر هذا الشعار في شاشة الدخول والقائمة الجانبية. (PNG, JPG)</p>
                            <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors">
                                <Upload className="w-3 h-3" />
                                رفع صورة جديدة
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section 3: Session Month & Year */}
                <div>
                    <h5 className="font-bold text-slate-800 flex items-center gap-2 text-sm mb-3">
                        📅 إعدادات الدورة (الموسم)
                    </h5>
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">شهر الدورة</label>
                            <p className="text-[10px] text-slate-400 mb-2">الشهر الذي سيُطبع في التقارير والقوائم.</p>
                            <select 
                                className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800" 
                                value={tempSessionMonth}
                                onChange={(e) => setTempSessionMonth(e.target.value)}
                            >
                                <option value="جانفي">جانفي</option>
                                <option value="فيفري">فيفري</option>
                                <option value="مارس">مارس</option>
                                <option value="أفريل">أفريل</option>
                                <option value="ماي">ماي</option>
                                <option value="جوان">جوان</option>
                                <option value="جويليه">جويليه</option>
                                <option value="أوت">أوت</option>
                                <option value="سبتمبر">سبتمبر</option>
                                <option value="أكتوبر">أكتوبر</option>
                                <option value="نوفمبر">نوفمبر</option>
                                <option value="ديسمبر">ديسمبر</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">سنة الدورة</label>
                            <p className="text-[10px] text-slate-400 mb-2">السنة التي ستطبع في التقارير والقوائم والفيشات.</p>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-800" 
                                value={tempSessionYear}
                                onChange={(e) => setTempSessionYear(parseInt(e.target.value) || new Date().getFullYear())}
                                placeholder="السنة"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Categories Section */}
      <div className={`bg-white rounded-lg shadow-md border border-slate-200 p-6 mb-8 ${!isEditing ? 'opacity-80 pointer-events-none grayscale-[0.5]' : ''}`}>
        <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <Layers className="text-blue-600 w-6 h-6" />
            <h3 className="text-xl font-bold text-slate-800">فئات المنافسة</h3>
        </div>
        
        {isEditing && (
            <div className="flex gap-4 mb-6">
                <input 
                    type="text" 
                    placeholder="اسم الفئة الجديدة" 
                    className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button 
                    onClick={handleAddCategory}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50"
                    disabled={!newCategoryName.trim()}
                >
                    <Plus className="w-4 h-4" />
                    إضافة فئة
                </button>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(cat => (
                <div key={cat.id} className="border rounded-xl overflow-hidden bg-slate-50 flex flex-col">
                    <div className="bg-white p-3 border-b flex justify-between items-center">
                        <h4 className="font-bold text-slate-800">{cat.name}</h4>
                        {isEditing && <button onClick={() => setCategories(prev => prev.filter(c => c.id !== cat.id))} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <div className="p-3 flex-1">
                        <div className="space-y-2">
                            {Object.values(SportType).map(sport => {
                                const isSelected = cat.sports.includes(sport);
                                return (
                                    <button 
                                        key={sport}
                                        onClick={() => toggleSportInCategory(cat.id, sport)}
                                        disabled={!isEditing}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-all ${
                                            isSelected 
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm' 
                                            : 'bg-white text-slate-600 border border-slate-200'
                                        }`}
                                    >
                                        <span>{SPORT_TRANSLATIONS[sport] || sport}</span>
                                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-4">جداول الإسناد الرسمية</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.keys(tempConfig).map((sportKey) => {
            const sport = sportKey as SportType;
            return (
                <div key={sport} className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center shrink-0">
                        <span className="text-lg">{SPORT_TRANSLATIONS[sport] || sport}</span>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200">
                        {[Gender.Male, Gender.Female].map((gender) => (
                            <div key={gender} className="flex-1 flex flex-col overflow-hidden bg-white">
                                <div className="p-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                                    <h5 className={`font-bold px-3 py-1 rounded text-sm ${gender === Gender.Male ? 'text-blue-700 bg-blue-100' : 'text-pink-700 bg-pink-100'}`}>
                                        {GENDER_TRANSLATIONS[gender]}
                                    </h5>
                                    {isEditing && (
                                        <div className="flex gap-1">
                                            <button onClick={() => handleSortRows(sport, gender)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ArrowDownUp className="w-4 h-4" /></button>
                                            <button onClick={() => handleAddRow(sport, gender)} className="p-1 hover:bg-green-100 text-green-600 rounded"><Plus className="w-5 h-5" /></button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-2">
                                    <table className="w-full text-center text-sm">
                                        <thead className="text-slate-500 text-xs uppercase bg-white sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-2 w-2/5 bg-slate-50">الإنجاز</th>
                                                <th className="p-2 w-2/5 bg-slate-50">العدد</th>
                                                {isEditing && <th className="p-2 w-1/5 bg-slate-50"></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {tempConfig[sport][gender].map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 group">
                                                    <td className="p-1">
                                                        <input 
                                                            type="number" step="0.01"
                                                            disabled={!isEditing}
                                                            className={`w-full text-center p-1 border border-slate-200 rounded outline-none ${isEditing ? 'focus:border-blue-500 focus:ring-1' : 'bg-transparent border-none'}`}
                                                            value={row.performance}
                                                            onChange={(e) => handleValueChange(sport, gender, idx, 'performance', e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input 
                                                            type="number" step="0.25" max="20"
                                                            disabled={!isEditing}
                                                            className={`w-full text-center font-bold text-slate-700 p-1 border border-slate-200 rounded outline-none ${isEditing ? 'focus:border-blue-500 focus:ring-1' : 'bg-transparent border-none'}`}
                                                            value={row.score}
                                                            onChange={(e) => handleValueChange(sport, gender, idx, 'score', e.target.value)}
                                                        />
                                                    </td>
                                                    {isEditing && (
                                                        <td className="p-1 text-center">
                                                            <button onClick={() => handleRemoveRow(sport, gender, idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default ConfigView;