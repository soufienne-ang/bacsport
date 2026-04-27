
import React, { useState, useMemo } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, ChevronRight, School, Users, CheckSquare, Square, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import { parseExcelFile } from '../services/excelParser';
import { Student } from '../types';

interface ImportViewProps {
  onDataImported: (students: Student[], mode: 'append' | 'replace') => void;
  existingCount: number;
  currentUser: { username: string };
}

interface ClassSelection {
    school: string;
    className: string;
    studentCount: number;
    isSelected: boolean;
    students: Student[];
}

const ImportView: React.FC<ImportViewProps> = ({ onDataImported, existingCount, currentUser }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ClassSelection[]>([]);
  const [step, setStep] = useState<'upload' | 'selection'>('upload');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (fileList: FileList) => {
    setIsLoading(true);
    setError(null);
    
    const files = Array.from(fileList);
    let allStudents: Student[] = [];
    let errors: string[] = [];

    for (const file of files) {
        try {
            const students = await parseExcelFile(file, currentUser.username);
            if (students.length > 0) {
                allStudents = [...allStudents, ...students];
            } else {
                errors.push(`- الملف "${file.name}": لا يحتوي على بيانات متوافقة.`);
            }
        } catch (err) {
            console.error(err);
            errors.push(`- الملف "${file.name}": خطأ في القراءة.`);
        }
    }

    if (allStudents.length > 0) {
        // Group by school and class for selection
        const grouped: Record<string, ClassSelection> = {};
        allStudents.forEach(s => {
            const key = `${s.institution}_${s.className}`;
            if (!grouped[key]) {
                grouped[key] = {
                    school: s.institution,
                    className: s.className,
                    studentCount: 0,
                    isSelected: true,
                    students: []
                };
            }
            grouped[key].studentCount++;
            grouped[key].students.push(s);
        });

        setPreviewData(Object.values(grouped).sort((a, b) => a.school.localeCompare(b.school) || a.className.localeCompare(b.className)));
        setStep('selection');
    } else {
        setError(`فشل استيراد الملفات:\n${errors.join('\n')}`);
    }
    
    setIsLoading(false);
  };

  const toggleClassSelection = (index: number) => {
      setPreviewData(prev => {
          const newData = [...prev];
          newData[index].isSelected = !newData[index].isSelected;
          return newData;
      });
  };

  const toggleAll = (select: boolean) => {
      setPreviewData(prev => prev.map(item => ({ ...item, isSelected: select })));
  };

  const finalizeImport = (mode: 'append' | 'replace') => {
      const selectedStudents = previewData
          .filter(p => p.isSelected)
          .flatMap(p => p.students);

      if (selectedStudents.length === 0) {
          alert("الرجاء اختيار قسم واحد على الأقل للاستيراد.");
          return;
      }

      onDataImported(selectedStudents, mode);
  };

  const selectedCount = useMemo(() => 
    previewData.filter(p => p.isSelected).reduce((acc, curr) => acc + curr.studentCount, 0),
  [previewData]);

  if (step === 'selection') {
      return (
          <div className="p-8 max-w-5xl mx-auto font-['Cairo'] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800">اختيار البيانات المراد استيرادها</h2>
                      <p className="text-slate-500">تم التعرف على {previewData.length} قسم. حدد الأقسام التي ترغب في إضافتها للنظام.</p>
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => toggleAll(true)} 
                        className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                      >
                          تحديد الكل
                      </button>
                      <button 
                        onClick={() => toggleAll(false)} 
                        className="text-xs font-bold text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                      >
                          إلغاء التحديد
                      </button>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-8">
                  <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                              <th className="p-4 w-12"></th>
                              <th className="p-4 font-bold text-slate-600">المعهد</th>
                              <th className="p-4 font-bold text-slate-600">القسم</th>
                              <th className="p-4 font-bold text-slate-600 text-center">عدد التلاميذ</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {previewData.map((item, idx) => (
                              <tr 
                                key={`${item.school}-${item.className}`} 
                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${item.isSelected ? 'bg-blue-50/30' : ''}`}
                                onClick={() => toggleClassSelection(idx)}
                              >
                                  <td className="p-4 text-center">
                                      {item.isSelected ? (
                                          <CheckSquare className="w-6 h-6 text-blue-600" />
                                      ) : (
                                          <Square className="w-6 h-6 text-slate-300" />
                                      )}
                                  </td>
                                  <td className="p-4">
                                      <div className="flex items-center gap-2">
                                          <School className="w-4 h-4 text-slate-400" />
                                          <span className="font-bold text-slate-700">{item.school}</span>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <span className="bg-white border px-2 py-1 rounded text-sm font-black text-blue-800 shadow-sm">{item.className}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                      <div className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                                          <Users className="w-3 h-3" />
                                          {item.studentCount}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-2xl shadow-lg text-white gap-6">
                  <div className="flex items-center gap-6">
                      <div className="border-r border-slate-700 pr-6">
                          <p className="text-slate-400 text-xs mb-1 font-bold">الأقسام المختارة</p>
                          <p className="text-xl font-black">{previewData.filter(p => p.isSelected).length}</p>
                      </div>
                      <div>
                          <p className="text-slate-400 text-xs mb-1 font-bold">إجمالي التلاميذ</p>
                          <p className="text-xl font-black">{selectedCount}</p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setStep('upload')} 
                        className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-sm"
                      >
                          <X className="w-4 h-4" /> إلغاء
                      </button>
                      
                      {existingCount > 0 ? (
                        <>
                            <button 
                                onClick={() => finalizeImport('replace')} 
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-sm"
                            >
                                <Trash2 className="w-4 h-4" /> استبدال البيانات
                            </button>
                            <button 
                                onClick={() => finalizeImport('append')} 
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all active:scale-95 text-sm"
                            >
                                <PlusCircle className="w-4 h-4" /> إضافة للموجود
                            </button>
                        </>
                      ) : (
                        <button 
                            onClick={() => finalizeImport('replace')} 
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all active:scale-95"
                        >
                            <Save className="w-5 h-5" /> تأكيد واستيراد
                        </button>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto font-['Cairo'] animate-in fade-in duration-700">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <UploadCloud className="text-blue-600 w-8 h-8" />
            استيراد القوائم
        </h2>
        <p className="text-slate-500 mt-2 font-medium">قم بتحميل ملفات Excel الرسمية. يمكنك معاينة الأقسام واختيار ما تريد استيراده في الخطوة التالية.</p>
      </div>

      <div className="grid gap-8">
        {existingCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex items-center gap-5 shadow-sm">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 text-lg">قاعدة البيانات نشطة</h3>
              <p className="text-blue-700 text-sm font-medium">
                  يوجد حالياً <span className="font-black text-blue-900">{existingCount}</span> تلميذ مسجل. 
                  عند الاستيراد، يمكنك اختيار <span className="underline">إضافة</span> بيانات جديدة للقائمة الحالية أو <span className="underline">استبدالها</span> بالكامل.
              </p>
            </div>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-4 border-dashed rounded-[2rem] p-16 text-center transition-all duration-500 group overflow-hidden ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-2xl shadow-blue-100'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 shadow-inner'
          }`}
        >
          {/* Decorative background circles */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100/50 rounded-full blur-3xl transition-all group-hover:bg-blue-200/50"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-100/50 rounded-full blur-3xl transition-all group-hover:bg-indigo-200/50"></div>

          <div className="relative flex flex-col items-center justify-center gap-6">
            <div className={`p-6 rounded-3xl transition-transform duration-500 group-hover:scale-110 ${isDragging ? 'bg-blue-200 shadow-xl' : 'bg-white shadow-lg border border-slate-100'}`}>
              <FileSpreadsheet className={`w-16 h-16 ${isDragging ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-700">اسحب وأفلت الملفات هنا</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">أو</p>
              <label className="inline-block pt-2">
                <span className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl cursor-pointer font-black transition-all shadow-xl active:scale-95 inline-flex items-center gap-3">
                  <UploadCloud className="w-5 h-5" /> تصفح الملفات
                </span>
                <input 
                    type="file" 
                    accept=".xlsx, .xls, .xlsm" 
                    className="hidden" 
                    onChange={handleFileChange} 
                    multiple 
                />
              </label>
            </div>
            <div className="flex gap-4 mt-6">
                <span className="bg-white border border-slate-200 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">.XLSX</span>
                <span className="bg-white border border-slate-200 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">.XLS</span>
                <span className="bg-white border border-slate-200 text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">.XLSM</span>
            </div>
          </div>
        </div>

        {isLoading && (
            <div className="text-center py-12 animate-pulse">
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 font-black text-lg">جاري قراءة البيانات...</p>
                <p className="text-slate-400 text-sm mt-1">الرجاء الانتظار قليلاً</p>
            </div>
        )}

        {error && (
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 flex items-start gap-5 shadow-sm animate-in shake-1">
                <div className="bg-red-100 p-2 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                </div>
                <div>
                    <h4 className="font-bold text-red-900">حدث خطأ أثناء المعالجة</h4>
                    <p className="text-red-800 text-sm mt-1 whitespace-pre-line font-medium leading-relaxed">{error}</p>
                </div>
            </div>
        )}

        <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">تعليمات هامة للاستيراد</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <ChevronRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                            <p className="text-sm text-slate-600 font-medium">يجب استخدام الملفات الرسمية بصيغة <span className="font-bold text-slate-900">Excel</span> الصادرة عن الإدارة.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <ChevronRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                            <p className="text-sm text-slate-600 font-medium">تأكد من وجود اسم المعهد في الخلية <span className="font-bold text-slate-900">B7</span>.</p>
                        </li>
                    </ul>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <ChevronRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                            <p className="text-sm text-slate-600 font-medium">سيقوم النظام بالتعرف على الأقسام وتوزيع التلاميذ تلقائياً.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <ChevronRight className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                            <p className="text-sm text-slate-600 font-medium">يمكنك اختيار ملفات متعددة في نفس الوقت لدمج بيانات عدة معاهد.</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImportView;
