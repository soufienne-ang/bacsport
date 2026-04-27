
import React, { useMemo, useState } from 'react';
import { Student } from '../types';
import { Users, CheckCircle, AlertCircle, ArrowRight, Activity, AlertTriangle, Eraser, Database, Lock, Trash2 } from 'lucide-react';
import { verifyPassword } from '../services/security';
import StatisticsCard from './StatisticsCard';

interface DashboardViewProps {
  students: Student[];
  onNavigateToClass: (school: string, className: string) => void;
  onReset: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ students, onNavigateToClass, onReset }) => {
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Logic to aggregate data by class
  const classStats = useMemo(() => {
    const stats: Record<string, {
        school: string;
        className: string;
        totalStudents: number;
        presentStudents: number;
        fullyGraded: number;
        pending: number;
        missingDetails: number;
    }> = {};

    students.forEach(s => {
        const key = `${s.institution}_${s.className}`;
        
        if (!stats[key]) {
            stats[key] = {
                school: s.institution,
                className: s.className,
                totalStudents: 0,
                presentStudents: 0,
                fullyGraded: 0,
                pending: 0,
                missingDetails: 0
            };
        }

        const stat = stats[key];
        stat.totalStudents++;

        if (s.status === 'present') {
            stat.presentStudents++;
            
            let isComplete = true;
            let missingCount = 0;

            if (s.assignedSports.course && (!s.scores.course || s.scores.course === 0)) {
                isComplete = false;
                missingCount++;
            }
            
            if (s.assignedSports.saut && (!s.scores.saut || s.scores.saut === 0)) {
                isComplete = false;
                missingCount++;
            }

            if (s.assignedSports.lancer && (!s.scores.lancer || s.scores.lancer === 0)) {
                isComplete = false;
                missingCount++;
            }

            if (s.performance.gymnastics === 0) {
                isComplete = false;
                missingCount++;
            }

            if (isComplete) {
                stat.fullyGraded++;
            } else {
                stat.pending++;
                stat.missingDetails += missingCount;
            }
        } else {
            stat.fullyGraded++;
        }
    });

    return Object.values(stats).sort((a, b) => {
        if (a.school !== b.school) return a.school.localeCompare(b.school);
        return a.className.localeCompare(b.className);
    });

  }, [students]);

  const globalStats = useMemo(() => {
    const total = students.length;
    const graded = classStats.reduce((acc, curr) => acc + curr.fullyGraded, 0);
    const pending = total - graded;
    const progress = total > 0 ? (graded / total) * 100 : 0;
    return { total, graded, pending, progress };
  }, [students, classStats]);

  const handlePerformReset = async () => {
      if (!resetInput) return;
      
      setIsCheckingPassword(true);
      setResetError(null);
      
      try {
          const result = await verifyPassword(resetInput);
          
          if (result.success) {
              // Appeler la fonction de réinitialisation parente qui gère le nettoyage complet et le rechargement
              onReset();
          } else {
              setResetError(result.error || 'كلمة المرور غير صحيحة');
          }
      } catch (error) {
          console.error("Erreur lors de la suppression:", error);
          setResetError("حدث خطأ أثناء محاولة إزالة البيانات: " + (error as Error).message);
      } finally {
          setIsCheckingPassword(false);
      }
  };

  const ResetWarningModal = () => (
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowResetWarning(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border-t-4 border-red-600 animate-in zoom-in-95" dir="rtl">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                      <h3 className="text-xl font-black">تنبيه (Attention)</h3>
                      <p className="text-xs text-red-500">إجراء لا رجعة فيه</p>
                  </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                      <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                          <p className="text-slate-800 font-bold mb-1">⚠️ هل أنت متأكد أنك تريد حذف جميع البيانات؟</p>
                          <p className="text-slate-600 text-sm mb-2">(Êtes‑vous sûr de vouloir supprimer toutes les données ?)</p>
<ul className="text-red-700 text-xs space-y-1">
                              <li>• سيتم حذف جميع التلاميذ</li>
                              <li>• سيتم حذف جميع الأعداد والنتائج</li>
                              <li>• سيتم حذف سجل الاستيراد</li>
                              <li>• ❌ لن يتم حذف المستخدمين</li>
                              <li>• لا يمكن استرجاع البيانات بعد الحذف</li>
                            </ul>
                      </div>
                  </div>
              </div>
              <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowResetWarning(false)} 
                    className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                    disabled={isCheckingPassword}
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={() => { 
                      setShowResetWarning(false); 
                      setShowResetConfirm(true); 
                      setResetInput(''); 
                      setResetError(null);
                    }} 
                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-900/20 flex items-center gap-2"
                    disabled={isCheckingPassword}
                  >
                    <Trash2 className="w-4 h-4" /> نعم، حذف الكل
                  </button>
              </div>
          </div>
      </div>
  );

  const ResetConfirmModal = () => (
      <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowResetConfirm(false)}>
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95" dir="rtl">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-full">
                      <Lock className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-lg font-bold text-slate-800">تأكيد الحذف النهائي</h3>
                      <p className="text-slate-500 text-sm">(Confirmation finale)</p>
                  </div>
              </div>
              
              <div className="mb-6">
                  <p className="text-slate-700 font-bold mb-2">لإتمام عملية الحذف الكلي، يرجى إدخال كلمة المرور:</p>
                  <p className="text-slate-500 text-sm mb-4">(Pour terminer la suppression totale, veuillez entrer le mot de passe)</p>
                  
                  <input 
                      type="password" 
                      className="w-full border-2 border-slate-300 p-3 rounded-lg font-bold text-center outline-none focus:border-red-500 transition-colors text-lg"
                      placeholder="••••••••"
                      value={resetInput}
                      onChange={e => {
                        setResetInput(e.target.value);
                        setResetError(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && resetInput && !isCheckingPassword) {
                          handlePerformReset();
                        }
                        if (e.key === 'Escape') {
                          setShowResetConfirm(false);
                        }
                      }}
                      autoFocus
                      disabled={isCheckingPassword}
                  />
              </div>
              
              {resetError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetError(null);
                    }} 
                    className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg border border-slate-300" 
                    disabled={isCheckingPassword}
                  >
                    رجوع
                  </button>
                  <button 
                      onClick={handlePerformReset} 
                      disabled={!resetInput || isCheckingPassword}
                      className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                  >
                      {isCheckingPassword ? (
                        <>
                          <span className="animate-pulse flex items-center gap-2">
                            <span className="h-2 w-2 bg-white rounded-full animate-bounce"></span>
                            <span className="h-2 w-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                            <span className="h-2 w-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                          </span>
                          جاري الحذف...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" /> تأكيد حذف جميع البيانات
                        </>
                      )}
                  </button>
              </div>
          </div>
      </div>
  );

  if (students.length === 0) {
      return (
          <div className="p-8 flex flex-col items-center justify-center h-full text-slate-500">
              <div className="relative mb-6">
                  <Database className="w-20 h-20 mb-4 text-slate-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">✓</span>
                      </div>
                  </div>
              </div>
              <p className="text-xl font-bold text-slate-700 mb-2">قاعدة البيانات فارغة</p>
              <p className="text-sm text-slate-500">لا توجد بيانات مستوردة حالياً.</p>
              <p className="text-sm text-slate-400 mt-1">يرجى الذهاب إلى صفحة "استيراد البيانات" للبدء.</p>
          </div>
      );
  }

  return (
    <div className="p-8 font-['Cairo'] bg-slate-50 min-h-full">
      {showResetWarning && <ResetWarningModal />}
      {showResetConfirm && <ResetConfirmModal />}

      <div className="mb-8 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">لوحة القيادة</h2>
            <p className="text-slate-500">نظرة عامة على تقدم عملية رصد الأعداد حسب الأقسام.</p>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                  <Users className="w-8 h-8" />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-bold">مجموع التلاميذ</p>
                  <p className="text-2xl font-bold text-slate-800">{globalStats.total}</p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-green-100 text-green-600 rounded-full">
                  <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-bold">تم رصد أعدادهم</p>
                  <p className="text-2xl font-bold text-green-700">{globalStats.graded}</p>
                  <p className="text-xs text-green-600 font-bold mt-1">
                      {globalStats.progress.toFixed(1)}% مكتمل
                  </p>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="p-4 bg-orange-100 text-orange-600 rounded-full">
                  <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                  <p className="text-sm text-slate-500 font-bold">بانتظار الإكمال</p>
                  <p className="text-2xl font-bold text-orange-700">{globalStats.pending}</p>
                  <p className="text-xs text-orange-600 font-bold mt-1">
                      ناقصين تفاصيلهم
                  </p>
              </div>
          </div>
      </div>

      {/* Statistics Card */}
      <div className="mb-8">
        <StatisticsCard students={students} />
      </div>

      {/* Class Grid */}
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          تقدم الإنجاز حسب الأقسام
      </h3>
      
      <div className="grid grid-cols-4 gap-6 pb-20">
          {classStats.map((cls) => {
              const progress = cls.totalStudents > 0 ? (cls.fullyGraded / cls.totalStudents) * 100 : 0;
              const isComplete = cls.pending === 0;

              return (
                  <div key={`${cls.school}-${cls.className}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="font-bold text-lg text-slate-800">{cls.className}</h4>
                                  <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]" title={cls.school}>{cls.school}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded font-bold ${isComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {isComplete ? 'مكتمل' : 'قيد الإنجاز'}
                              </span>
                          </div>
                      </div>
                      
                      <div className="p-5 flex-1">
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500">التقدم:</span>
                              <span className="font-bold text-slate-700">{Math.round(progress)}%</span>
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-4 mb-4 overflow-hidden">
                              <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${progress}%` }}
                              ></div>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                              <div className="text-slate-500 w-full">
                                  <span className="block mb-1">المجموع: <strong className="text-slate-800">{cls.totalStudents}</strong></span>
                                  {cls.pending > 0 && (
                                      <span className="block text-red-600 font-bold bg-red-50 p-1 rounded text-center">
                                          ⚠ {cls.pending} تلاميذ ناقصين
                                      </span>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="p-3 bg-slate-50 border-t border-slate-100">
                          <button 
                              onClick={() => onNavigateToClass(cls.school, cls.className)}
                              className="w-full py-3 bg-white border border-slate-300 rounded-xl text-slate-700 text-sm font-bold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center justify-center gap-2 active:scale-95"
                          >
                              {cls.pending > 0 ? 'إتمام النواقص' : 'مراجعة الأعداد'}
                              <ArrowRight className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* Danger Zone */}
      <div className="mt-8 border-t-2 border-red-100 pt-8 flex justify-between items-center bg-red-50 p-6 rounded-xl">
         <div>
             <h5 className="font-bold text-red-800 flex items-center gap-2 text-lg mb-1"><Database className="w-5 h-5" /> منطقة الخطر</h5>
             <p className="text-red-600 text-sm">حذف جميع البيانات والبدء من جديد. استخدم هذا الخيار بحذر شديد.</p>
             <p className="text-red-400 text-xs mt-1">(Suppression totale de la base de données)</p>
         </div>
         <button 
            onClick={() => setShowResetWarning(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-red-600 border-2 border-red-200 rounded-xl font-bold text-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95 hover:shadow-md"
         >
             <Trash2 className="w-4 h-4" /> حذف قاعدة البيانات بالكامل
         </button>
      </div>
    </div>
  );
};

export default DashboardView;
