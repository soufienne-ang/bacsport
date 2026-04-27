
import React, { useState, useMemo } from 'react';
import { Student, SportType, Gender } from '../types';
import { Search, UserCog, Check, X, Filter, AlertCircle, Save, Activity, ShieldBan, Trash2 } from 'lucide-react';
import { SPORT_TRANSLATIONS } from '../constants';

interface StudentManagerViewProps {
  students: Student[];
  onUpdateStudent: (updatedStudent: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  currentUser: { username: string; role: string };
}

const StudentManagerView: React.FC<StudentManagerViewProps> = ({ students, onUpdateStudent, onDeleteStudent, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>(students[0]?.institution || '');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const isSuperAdmin = currentUser.role === 'superadmin';
  
  // Edit State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [editForm, setEditForm] = useState<{
      course: SportType.Course1 | SportType.Course2 | SportType.Course3 | undefined;
      saut: SportType.Saut1 | SportType.Saut2 | SportType.Saut3 | undefined;
      lancer: boolean;
      exemptions: { course: boolean; saut: boolean; lancer: boolean; gym: boolean; };
  }>({ 
      course: undefined, 
      saut: undefined, 
      lancer: false,
      exemptions: { course: false, saut: false, lancer: false, gym: false }
  });

  const schools = useMemo(() => Array.from(new Set(students.map(s => s.institution))).sort(), [students]);
  
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSchool = s.institution === selectedSchool;
      const matchClass = selectedClass === 'All' || s.className === selectedClass;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const canEdit = isSuperAdmin || s.importedBy === currentUser.username;
      return matchSchool && matchClass && matchSearch && canEdit;
    }).sort((a, b) => a.excelId - b.excelId);
  }, [students, selectedSchool, selectedClass, searchTerm, currentUser.username, isSuperAdmin]);

  const classes = useMemo(() => {
      const schoolStudents = students.filter(s => s.institution === selectedSchool);
      return Array.from(new Set(schoolStudents.map(s => s.className))).sort();
  }, [students, selectedSchool]);

  const handleEditClick = (student: Student) => {
      setEditingStudent(student);
      setEditForm({
          course: student.assignedSports.course,
          saut: student.assignedSports.saut,
          lancer: !!student.assignedSports.lancer,
          exemptions: student.exemptions || { course: false, saut: false, lancer: false, gym: false }
      });
  };

  const selectedCount = (editForm.course ? 1 : 0) + (editForm.saut ? 1 : 0) + (editForm.lancer ? 1 : 0);

  const handleSetCourse = (val: SportType | undefined) => {
      if (val !== undefined && editForm.course === undefined && selectedCount >= 2) {
          alert("تنبيه: لا يمكن اختيار أكثر من اختصاصين. الرجاء إلغاء اختصاص آخر أولاً (اختيار 'غير معني').");
          return;
      }
      setEditForm(prev => ({ ...prev, course: val as any }));
  };

  const handleSetSaut = (val: SportType | undefined) => {
      if (val !== undefined && editForm.saut === undefined && selectedCount >= 2) {
          alert("تنبيه: لا يمكن اختيار أكثر من اختصاصين. الرجاء إلغاء اختصاص آخر أولاً (اختيار 'غير معني').");
          return;
      }
      setEditForm(prev => ({ ...prev, saut: val as any }));
  };

  const handleToggleLancer = (checked: boolean) => {
      if (checked && !editForm.lancer && selectedCount >= 2) {
          alert("تنبيه: لا يمكن اختيار أكثر من اختصاصين. الرجاء إلغاء اختصاص آخر أولاً.");
          return;
      }
      setEditForm(prev => ({ ...prev, lancer: checked }));
  };

  const handleToggleExemption = (sport: 'course' | 'saut' | 'lancer' | 'gym') => {
      setEditForm(prev => ({ 
          ...prev, 
          exemptions: { 
              ...prev.exemptions, 
              [sport]: !prev.exemptions[sport] 
          } 
      }));
  };

  const handleSave = () => {
      if (!editingStudent) return;
      
      if (selectedCount !== 2) {
          alert(`يجب اختيار اختصاصين (2) بالضبط. عدد الاختصاصات المختارة حالياً: ${selectedCount}`);
          return;
      }

      const updatedStudent: Student = {
          ...editingStudent,
          assignedSports: {
              course: editForm.course,
              saut: editForm.saut,
              lancer: editForm.lancer
          },
          exemptions: editForm.exemptions
      };

      onUpdateStudent(updatedStudent);
      setEditingStudent(null);
  };

  return (
    <div className="p-8 font-['Cairo'] min-h-screen bg-slate-50" dir="rtl">
      
      {/* Modal / Fiche Détail */}
      {editingStudent && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 flex flex-col max-h-[90vh]">
                  
                  {/* En-tête */}
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-start shrink-0">
                      <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black">
                              {editingStudent.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="text-2xl font-bold">{editingStudent.name}</h3>
                              <p className="text-slate-300 text-sm flex gap-2 items-center">
                                  <span>{editingStudent.className}</span>
                                  <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                                  <span>{editingStudent.institution}</span>
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setEditingStudent(null)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  </div>

                  {/* Contenu - Sélection Unique */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
                       <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <span className="font-bold text-slate-700">عدد الاختصاصات المختارة:</span>
                          <span className={`font-black px-4 py-1.5 rounded-lg text-sm transition-colors ${selectedCount === 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>
                              {selectedCount} / 2
                          </span>
                      </div>

                      <div className="space-y-4">
                          {/* Course */}
                          <div className={`bg-white p-4 rounded-xl border transition-all ${editForm.exemptions.course ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> اختصاص العدو</label>
                                  <div className="flex items-center gap-4">
                                      <label className="flex items-center gap-2 text-xs font-bold text-orange-700 cursor-pointer select-none">
                                          <input type="checkbox" checked={editForm.exemptions.course} onChange={() => handleToggleExemption('course')} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                                          <ShieldBan className="w-3 h-3" /> إعفاء من العدو
                                      </label>
                                      {editForm.course && !editForm.exemptions.course && <Check className="w-4 h-4 text-blue-600" />}
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${editForm.course === undefined ? 'bg-slate-100 ring-2 ring-slate-200' : 'hover:bg-slate-50'}`}>
                                      <input type="radio" name="course" className="w-4 h-4 text-slate-500" checked={editForm.course === undefined} onChange={() => handleSetCourse(undefined)} disabled={editForm.exemptions.course} />
                                      <span className="font-bold text-xs text-slate-500">غير معني</span>
                                  </label>
                                  {[SportType.Course1, SportType.Course2, SportType.Course3].map((opt) => (
                                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${editForm.course === opt ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-slate-50'} ${editForm.exemptions.course ? 'opacity-50 grayscale' : ''}`}>
                                          <input type="radio" name="course" className="w-4 h-4 text-blue-600" checked={editForm.course === opt} onChange={() => handleSetCourse(opt)} disabled={editForm.exemptions.course} />
                                          <span className="font-bold text-xs text-slate-700">{SPORT_TRANSLATIONS[opt]}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>

                          {/* Saut */}
                          <div className={`bg-white p-4 rounded-xl border transition-all ${editForm.exemptions.saut ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> اختصاص الوثب</label>
                                  <div className="flex items-center gap-4">
                                      <label className="flex items-center gap-2 text-xs font-bold text-orange-700 cursor-pointer select-none">
                                          <input type="checkbox" checked={editForm.exemptions.saut} onChange={() => handleToggleExemption('saut')} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                                          <ShieldBan className="w-3 h-3" /> إعفاء من الوثب
                                      </label>
                                      {editForm.saut && !editForm.exemptions.saut && <Check className="w-4 h-4 text-indigo-600" />}
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${editForm.saut === undefined ? 'bg-slate-100 ring-2 ring-slate-200' : 'hover:bg-slate-50'}`}>
                                      <input type="radio" name="saut" className="w-4 h-4 text-slate-500" checked={editForm.saut === undefined} onChange={() => handleSetSaut(undefined)} disabled={editForm.exemptions.saut} />
                                      <span className="font-bold text-xs text-slate-500">غير معني</span>
                                  </label>
                                  {[SportType.Saut1, SportType.Saut2, SportType.Saut3].map((opt) => (
                                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${editForm.saut === opt ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'hover:bg-slate-50'} ${editForm.exemptions.saut ? 'opacity-50 grayscale' : ''}`}>
                                          <input type="radio" name="saut" className="w-4 h-4 text-indigo-600" checked={editForm.saut === opt} onChange={() => handleSetSaut(opt)} disabled={editForm.exemptions.saut} />
                                          <span className="font-bold text-xs text-slate-700">{SPORT_TRANSLATIONS[opt]}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>

                          {/* Lancer */}
                          <div className={`bg-white p-4 rounded-xl border transition-all ${editForm.exemptions.lancer ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> اختصاص الرمي</label>
                                  <label className="flex items-center gap-2 text-xs font-bold text-orange-700 cursor-pointer select-none">
                                      <input type="checkbox" checked={editForm.exemptions.lancer} onChange={() => handleToggleExemption('lancer')} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                                      <ShieldBan className="w-3 h-3" /> إعفاء من الرمي
                                  </label>
                              </div>
                              <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${editForm.lancer ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'hover:bg-slate-50'} ${editForm.exemptions.lancer ? 'opacity-50 grayscale' : ''}`}>
                                  <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={editForm.lancer} onChange={(e) => handleToggleLancer(e.target.checked)} disabled={editForm.exemptions.lancer} />
                                  <span className="font-bold text-sm text-slate-700">رمي الجلة (Lancer Poids)</span>
                              </label>
                          </div>
                          
                          {/* Gym Exemption Toggle (Add-on) */}
                          <div className={`bg-white p-4 rounded-xl border transition-all ${editForm.exemptions.gym ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-center">
                                  <label className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-500" /> اختصاص الجمباز</label>
                                  <label className="flex items-center gap-2 text-xs font-bold text-orange-700 cursor-pointer select-none">
                                      <input type="checkbox" checked={editForm.exemptions.gym} onChange={() => handleToggleExemption('gym')} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500" />
                                      <ShieldBan className="w-3 h-3" /> إعفاء من الجمباز
                                  </label>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Pied de page */}
                  <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                      <button onClick={() => setEditingStudent(null)} className="flex-1 py-3.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">إغلاق</button>
                      <button onClick={handleSave} className="flex-[2] py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                            <Save className="w-5 h-5" /> حفظ التغييرات
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><UserCog className="text-blue-600 w-8 h-8" /> إدارة بيانات التلاميذ</h2>
            <p className="text-slate-500 mt-1 font-medium">تصحيح الاختيارات والأخطاء الواردة في ملفات الاستيراد.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
         <div className="flex items-center gap-2 border-l pl-4 ml-2">
             <Filter className="w-5 h-5 text-slate-400" />
             <span className="font-bold text-slate-700 text-sm">تصفية القوائم:</span>
         </div>
         
         <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-400">المعهد</label>
            <select className="border rounded-lg p-2 font-bold text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={selectedSchool} onChange={(e) => { setSelectedSchool(e.target.value); setSelectedClass('All'); }}>
                {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>
         
         <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[10px] font-black text-slate-400">القسم</label>
            <select className="border rounded-lg p-2 font-bold text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="All">الكل</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
         </div>

         <div className="flex-1 relative min-w-[250px]">
             <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
                type="text" 
                placeholder="بحث بالإسم أو اللقب..." 
                className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
             />
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                  <tr>
                      <th className="p-4 w-16 text-center">ر.ت</th>
                      <th className="p-4">الإسم واللقب</th>
                      <th className="p-4">الجنس</th>
                      <th className="p-4">القسم</th>
                      <th className="p-4 w-1/4">الاختصاصات الحالية</th>
                      <th className="p-4 w-24 text-center">تفاصيل</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => {
                      const sportCount = (s.assignedSports.course ? 1 : 0) + (s.assignedSports.saut ? 1 : 0) + (s.assignedSports.lancer ? 1 : 0);
                      const isError = sportCount !== 2;
                      
                      return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="p-4 text-center font-bold text-slate-400">{s.excelId}</td>
                          <td className="p-4 font-bold text-slate-800">{s.name}</td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${s.gender === Gender.Male ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                  {s.gender === Gender.Male ? 'ذكر' : 'أنثى'}
                              </span>
                          </td>
                          <td className="p-4 font-bold text-slate-600">{s.className}</td>
                          <td className="p-4">
                              <div className="flex flex-wrap gap-1 items-center">
                                  {s.assignedSports.course && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.exemptions?.course ? 'bg-orange-100 text-orange-700 border-orange-200 line-through' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                          {SPORT_TRANSLATIONS[s.assignedSports.course]}
                                      </span>
                                  )}
                                  {s.assignedSports.saut && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.exemptions?.saut ? 'bg-orange-100 text-orange-700 border-orange-200 line-through' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                          {SPORT_TRANSLATIONS[s.assignedSports.saut]}
                                      </span>
                                  )}
                                  {s.assignedSports.lancer && (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.exemptions?.lancer ? 'bg-orange-100 text-orange-700 border-orange-200 line-through' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                          رمي الجلة
                                      </span>
                                  )}
                                  {isError && (
                                      <span className="text-red-500 mr-2 flex items-center gap-1 text-xs font-bold animate-pulse">
                                          <AlertCircle className="w-3 h-3" /> خطأ ({sportCount})
                                      </span>
                                  )}
                              </div>
                          </td>
<td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleEditClick(s)} 
                                  className={`border p-2 rounded-lg transition-all shadow-sm ${isError ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600'}`}
                                  title="تعديل وعرض التفاصيل"
                                >
                                    <UserCog className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من حذف التلميذ ${s.name}؟`)) {
                                      onDeleteStudent(s.id);
                                    }
                                  }}
                                  className="border p-2 rounded-lg bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                  title="حذف التلميذ"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                      </tr>
                  )}) : (
                      <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic font-medium">
                              لا توجد نتائج مطابقة للبحث
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
          <div className="bg-slate-50 border-t p-3 text-xs text-slate-500 font-bold text-center">
              العدد الجملي: {filteredStudents.length} تلميذ
          </div>
      </div>
    </div>
  );
};

export default StudentManagerView;
