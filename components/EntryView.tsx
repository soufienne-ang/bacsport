import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, GradingConfig, Gender, SportType, StudentStatus, GlobalSettings } from '../types';
import { Calculator, Lock, X, ChevronDown, Download, Printer, Info, ShieldBan, Check, AlertCircle, Calendar } from 'lucide-react';
import { SPORT_TRANSLATIONS } from '../constants';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface EntryViewProps {
  students: Student[];
  onUpdatePerformance: (studentId: string, type: 'course' | 'saut' | 'lancer' | 'gym', value: number, index?: number, obs?: string) => void;
  onUpdateStatus: (studentId: string, status: StudentStatus) => void;
  onToggleRepechage: (studentId: string, sport: 'course' | 'saut' | 'lancer' | 'gym') => void;
  onToggleExemption: (studentId: string, sport: 'course' | 'saut' | 'lancer' | 'gym') => void;
  onToggleAbsence: (studentId: string, sport: 'course' | 'saut' | 'lancer' | 'gym') => void;
  gradingScale: GradingConfig;
  preSelectedParams?: { school: string, className: string } | null;
  region: string;
  globalSettings: GlobalSettings;
}

type EntryCategory = 'course' | 'saut' | 'lancer' | 'gym';

// Validation Modal Component
interface ValidationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: number) => void;
    title: string;
    studentName: string;
}

const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, onConfirm, title, studentName }) => {
    const [val1, setVal1] = useState<string>('');
    const [val2, setVal2] = useState<string>('');
    const [error, setError] = useState<string>('');
    const input1Ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setVal1(''); setVal2(''); setError('');
            setTimeout(() => input1Ref.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const cleanVal1 = val1.replace(',', '.');
        const cleanVal2 = val2.replace(',', '.');
        const v1 = parseFloat(cleanVal1);
        const v2 = parseFloat(cleanVal2);

        if (isNaN(v1) || isNaN(v2)) { setError('الرجاء إدخال أرقام صحيحة'); return; }
        if (Math.abs(v1 - v2) > 0.0001) { setError('الأرقام غير متطابقة!'); return; }
        onConfirm(v1);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-slate-800">
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 font-['Cairo'] text-lg"><Lock className="w-6 h-6" /> تأكيد الإدخال</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 space-y-6 font-['Cairo']">
                    <div className="text-center mb-4">
                        <p className="text-slate-500 text-sm font-bold">التلميذ: <span className="font-black text-slate-800 text-lg block mt-1">{studentName}</span></p>
                        <p className="text-blue-600 font-black text-xl mt-2">{title}</p>
                    </div>
                    <input 
                        ref={input1Ref} 
                        type="text" 
                        inputMode="decimal"
                        className="w-full p-4 border-2 rounded-xl text-center font-black text-3xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-600 outline-none transition-all" 
                        value={val1} 
                        onChange={e => setVal1(e.target.value)} 
                        placeholder="الإدخال الأول" 
                    />
                    <input 
                        type="text" 
                        inputMode="decimal"
                        className="w-full p-4 border-2 rounded-xl text-center font-black text-3xl focus:ring-4 focus:ring-blue-500/30 focus:border-blue-600 outline-none transition-all" 
                        value={val2} 
                        onChange={e => setVal2(e.target.value)} 
                        placeholder="تأكيد الإدخال" 
                    />
                    {error && <div className="p-3 bg-red-50 text-red-600 text-center font-bold text-sm rounded-xl border border-red-100">{error}</div>}
                    <button onClick={handleConfirm} className="w-full bg-blue-600 text-white py-5 rounded-xl font-black text-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 active:scale-95">حفظ البيانات</button>
                </div>
            </div>
        </div>
    );
};

// Date Modal Component
interface DateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: { day: string; month: string; year: string }) => void;
    currentDate: { day: string; month: string; year: string };
}

const DateModal: React.FC<DateModalProps> = ({ isOpen, onClose, onConfirm, currentDate }) => {
    const [day, setDay] = useState(currentDate.day);
    const [month, setMonth] = useState(currentDate.month);
    const [year, setYear] = useState(currentDate.year);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setDay(currentDate.day);
            setMonth(currentDate.month);
            setYear(currentDate.year);
            setError('');
        }
    }, [isOpen, currentDate]);

    const handleConfirm = () => {
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
            setError('الرجاء إدخال أرقام صحيحة');
            return;
        }

        if (dayNum < 1 || dayNum > 31) {
            setError('اليوم يجب أن يكون بين 1 و 31');
            return;
        }

        if (monthNum < 1 || monthNum > 12) {
            setError('الشهر يجب أن يكون بين 1 و 12');
            return;
        }

        if (yearNum < 2000 || yearNum > 2100) {
            setError('السنة يجب أن تكون بين 2000 و 2100');
            return;
        }

        onConfirm({ day: dayNum.toString(), month: monthNum.toString(), year: yearNum.toString() });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-slate-800">
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 font-['Cairo'] text-lg">
                        <Calendar className="w-6 h-6" /> تعيين تاريخ الإختبار
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-8 space-y-6 font-['Cairo']">
                    <div className="text-center mb-4">
                        <p className="text-slate-800 font-bold text-lg">حدد تاريخ انعقاد الإختبار</p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-600 text-sm font-bold">اليوم</label>
                            <input 
                                type="number"
                                min="1"
                                max="31"
                                className="w-full p-3 border-2 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none"
                                value={day}
                                onChange={e => setDay(e.target.value)}
                                placeholder="اليوم"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-600 text-sm font-bold">الشهر</label>
                            <input 
                                type="number"
                                min="1"
                                max="12"
                                className="w-full p-3 border-2 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none"
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                placeholder="الشهر"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-slate-600 text-sm font-bold">السنة</label>
                            <input 
                                type="number"
                                min="2000"
                                max="2100"
                                className="w-full p-3 border-2 rounded-xl text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                placeholder="السنة"
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-center font-bold text-sm rounded-xl border border-red-100">
                            {error}
                        </div>
                    )}
                    
                    <button 
                        onClick={handleConfirm}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 active:scale-95"
                    >
                        حفظ التاريخ
                    </button>
                </div>
            </div>
        </div>
    );
};

const EntryView: React.FC<EntryViewProps> = ({ students, onUpdatePerformance, onUpdateStatus, onToggleRepechage, onToggleExemption, onToggleAbsence, preSelectedParams, region, globalSettings }) => {
    const [selectedSchool, setSelectedSchool] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<EntryCategory>('course'); 
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [editingTarget, setEditingTarget] = useState<any>(null);
    const [eventDate, setEventDate] = useState<{
        day: string;
        month: string;
        year: string;
    }>({
        day: new Date().getDate().toString(),
        month: (new Date().getMonth() + 1).toString(),
        year: new Date().getFullYear().toString()
    });
    const [showDateModal, setShowDateModal] = useState(false);

    const schools = useMemo(() => Array.from(new Set(students.map(s => s.institution))).sort(), [students]);
    
    useEffect(() => {
        if (preSelectedParams) { 
            setSelectedSchool(preSelectedParams.school); 
            setSelectedClass(preSelectedParams.className); 
        } else if (schools.length > 0 && !selectedSchool) {
            setSelectedSchool(schools[0]);
        }
    }, [schools, preSelectedParams]);

    const classes = useMemo(() => Array.from(new Set(students.filter(s => s.institution === selectedSchool).map(s => s.className))).sort(), [students, selectedSchool]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (s.institution !== selectedSchool || s.className !== selectedClass) return false;
            if (selectedCategory === 'course') return !!s.assignedSports.course;
            if (selectedCategory === 'saut') return !!s.assignedSports.saut;
            if (selectedCategory === 'lancer') return !!s.assignedSports.lancer;
            return true;
        }).sort((a, b) => a.excelId - b.excelId);
    }, [students, selectedSchool, selectedClass, selectedCategory]);

    const handleExportPDF = () => {
        setShowDownloadMenu(false);
        const element = document.getElementById('field-sheet-container');
        if (!element) return;
        
        html2pdf().from(element).set({
            margin: 0,
            filename: `ورقة_رصد_${selectedCategory}_${selectedClass}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
    };

    const handleStatusChange = (studentId: string, value: string) => {
        if (value === 'present') {
            onUpdateStatus(studentId, 'present');
            const s = students.find(st => st.id === studentId);
            if (s?.repechage[selectedCategory]) onToggleRepechage(studentId, selectedCategory);
        } else if (value === 'absent') onUpdateStatus(studentId, 'absent');
        else if (value === 'exempt') onUpdateStatus(studentId, 'exempt');
        else if (value === 'repechage') {
            onUpdateStatus(studentId, 'present');
            const s = students.find(st => st.id === studentId);
            if (!s?.repechage[selectedCategory]) onToggleRepechage(studentId, selectedCategory);
        }
    };

    const getMonthName = (month: number): string => {
        const monthNames = [
            'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
            'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return monthNames[month - 1] || month.toString();
    };

    return (
        <div className="p-8 h-full flex flex-col font-['Cairo'] bg-slate-100" dir="rtl">
            <style>{`
                /* Styles pour l'impression A4 standard */
                #field-sheet-container {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 10mm 12mm !important;
                    background: white;
                    box-sizing: border-box;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }
                #field-sheet-container table { border: 1.5px solid #000 !important; border-collapse: collapse !important; width: 100% !important; table-layout: fixed; }
                #field-sheet-container th, #field-sheet-container td { border: 1px solid #000 !important; color: #000 !important; padding: 1px 2px !important; line-height: 1 !important; vertical-align: middle !important; font-family: 'Arial', sans-serif !important; font-size: 7pt !important; height: 5.5mm !important; }
                #field-sheet-container th { font-family: 'Cairo', 'Arial', sans-serif !important; font-weight: 900; font-size: 7.5pt !important; }
                #field-sheet-container .official-font { font-family: 'Cairo', sans-serif !important; }
                #field-sheet-container .col-name { white-space: pre-wrap !important; word-spacing: normal !important; letter-spacing: normal !important; }
                .meta-box { border: 1.5px solid black; height: 24px; display: flex; align-items: center; background: white; }
                .meta-label { background: #f8f8f8; padding: 0 4px; font-weight: 900; font-size: 7px; border-left: 1.5px solid black; height: 100%; display: flex; align-items: center; width: 45px; flex-shrink: 0; }
                .meta-val { flex-grow: 1; text-align: center; font-weight: 900; font-size: 10px; }
                .category-header-text { color: #e11d48; font-weight: 900; font-size: 14pt; }
                .status-select { appearance: none; background-color: transparent; border: none; font-family: 'Cairo', sans-serif; font-size: 8px; font-weight: bold; text-align: center; width: 100%; cursor: pointer; outline: none; }
                .assigned-sport-badge { font-size: 6px; color: #64748b; font-weight: bold; display: block; line-height: 1; margin-top: 0; }
                .header-zone { height: 18mm !important; }
                .header-zone p { font-size: 7.5pt !important; line-height: 1.1 !important; margin: 0; white-space: pre-wrap !important; }
                .title-zone h1 { font-size: 11pt !important; margin-bottom: 2px !important; }
                .title-zone h2 { font-size: 9pt !important; margin: 0 !important; }
                .footer-zone { height: auto !important; margin-top: 8px !important; font-size: 8pt !important; display: flex; justify-content: space-between; align-items: flex-end; min-height: 70px; }
                .col-id { width: 25px !important; }
                .col-name { min-width: 100px !important; word-break: keep-all !important; white-space: pre-wrap !important; }
                .col-status { width: 45px !important; }
                .col-result { width: 40px !important; }
                .col-time { width: 50px !important; }
                .col-score { width: 45px !important; }
                .col-observation { font-size: 6.5pt !important; }
                .sig-block { text-align: center; width: 30%; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; }
                .sig-title, .sig-subtitle { font-weight: 700; font-size: 8pt; line-height: 1.2; white-space: pre-wrap !important; margin: 0; }
                .sig-space { height: 40px; width: 100%; }
                .print-hidden { display: none !important; }
                .force-spaces { white-space: pre-wrap !important; word-spacing: normal !important; }
                .pdf-optimize { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
                
                /* Media Query pour impression */
                @media print {
                    .no-print { display: none !important; }
                    html, body, #root { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
                    body * { visibility: hidden; }
                    #field-sheet-container, #field-sheet-container * { visibility: visible; }
                    #field-sheet-container { position: absolute; left: 0; top: 0; width: 100%; height: auto !important; margin: 0 !important; padding: 5mm !important; box-shadow: none !important; }
                    .status-select { display: none !important; }
                    .print-status-label { display: block !important; font-size: 6.5pt !important; }
                    body, table, th, td { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    @page { size: A4 portrait; margin: 0; }
                    
                    /* Amélioration pour l'espace de signature */
                    .footer-zone { 
                        page-break-inside: avoid !important; 
                        break-inside: avoid !important; 
                        margin-top: 5px !important; 
                        min-height: 60px !important;
                    }
                    .sig-space { height: 50px !important; }
                }
                .print-status-label { display: none; }
            `}</style>

            <ValidationModal 
                isOpen={!!editingTarget} 
                onClose={() => setEditingTarget(null)} 
                onConfirm={(v) => { onUpdatePerformance(editingTarget.studentId, editingTarget.type, v, editingTarget.index); }}
                title={editingTarget?.label || "رصد نتيجة"}
                studentName={editingTarget?.studentName}
            />

            <DateModal 
                isOpen={showDateModal}
                onClose={() => setShowDateModal(false)}
                onConfirm={(date) => {
                    setEventDate(date);
                    setShowDateModal(false);
                }}
                currentDate={eventDate}
            />

            {/* Control Panel - Desktop Row Layout */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border mb-8 no-print shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800">
                        <Calculator className="text-blue-600 w-8 h-8" /> رصد الأعداد
                    </h2>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400">المعهد</span>
                            <select className="border rounded-lg p-1.5 font-bold text-sm min-w-[200px] outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}>{schools.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-400">القسم</span>
                            <select className="border rounded-lg p-1.5 font-bold text-sm min-w-[120px] outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={!selectedSchool}>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {['course','saut','lancer','gym'].map(c => (
                            <button key={c} onClick={() => setSelectedCategory(c as any)} className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${selectedCategory === c ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {c === 'course' ? 'العدو' : c === 'saut' ? 'الوثب' : c === 'lancer' ? 'الرمي' : 'الجمباز'}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2 relative">
                        <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-colors">
                            <Download className="w-4 h-4" /> تحميل <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                            <Printer className="w-4 h-4" /> طباعة
                        </button>
                        {showDownloadMenu && (
                            <div className="absolute top-12 left-0 bg-white shadow-xl border rounded-lg z-50 py-2 w-48 animate-in fade-in zoom-in-95">
                                <button onClick={handleExportPDF} className="w-full px-4 py-3 text-right hover:bg-slate-50 text-sm font-bold">ملف PDF</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Container - Centered */}
            <div className="flex-1 overflow-auto bg-slate-200/50 p-8 rounded-2xl flex justify-center">
                <div id="field-sheet-container" className="shadow-2xl pdf-optimize origin-top" dir="rtl">
                    
                    {/* Header Zone */}
                    <div className="flex justify-between items-start mb-2 official-font header-zone" style={{ height: '18mm' }}>
                        <div className="text-right space-y-0 font-bold leading-tight">
                            <p>الجمهورية التونسية</p>
                            <p>وزارة الشباب و الرياضة</p>
                            <p>الإدارة العامة للتربية البدنية و التكوين و البحث</p>
                            <p>إدارة التربية البدنية و الأنشطة الرياضية</p>
                            <p className="pr-2">في الوسط المدرسي</p>
                        </div>
                        
                        <div className="text-left font-bold space-y-0">
                            <p>المندوبية الجهوية للشباب و الرياضة ب{region}</p>
                        </div>
                    </div>

                    <div className="text-center mb-2 title-zone">
                        <h1 className="font-black mb-0"> اختبار آخر السنة - باكالوريا دورة {globalSettings.sessionMonth} {globalSettings.sessionYear}</h1>
                        <h2 className="font-black">الاختصاص: {selectedCategory === 'course' || selectedCategory === 'saut' || selectedCategory === 'lancer' ? 'ألعاب القوى' : 'الجمباز'}</h2>
                    </div>

                    <div className="grid grid-cols-10 gap-0 mb-1 official-font">
                        <div className="col-span-3 meta-box">
                            <div className="meta-label">المعهد :</div>
                            <div className="meta-val">{selectedSchool}</div>
                        </div>
                        <div className="col-span-3 meta-box border-r-0">
                            <div className="meta-label">القسم :</div>
                            <div className="meta-val">{selectedClass}</div>
                        </div>
                        <div className="col-span-2 meta-box border-r-0">
                            <div className="meta-label">التاريخ :</div>
                            <div className="meta-val flex items-center justify-center gap-1">
                                {parseInt(eventDate.day)} {getMonthName(parseInt(eventDate.month))} {eventDate.year}
                                <button 
                                    onClick={() => setShowDateModal(true)}
                                    className="no-print p-1 hover:bg-slate-100 rounded-full transition-colors"
                                    title="تغيير تاريخ الإختبار"
                                >
                                    <Calendar className="w-3 h-3 text-slate-500 hover:text-blue-600" />
                                </button>
                            </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end pr-2">
                            <span className="category-header-text">
                                {selectedCategory === 'course' ? 'العدو' : selectedCategory === 'saut' ? 'الوثب' : selectedCategory === 'lancer' ? 'الرمي' : 'الجمباز'}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                {selectedCategory === 'course' && (
                                    <>
                                        <tr className="bg-gray-100 font-black h-7">
                                            <th rowSpan={2} className="col-id">ر.ت</th>
                                            <th rowSpan={2} className="text-right pr-2 col-name force-spaces">الإسم واللقب</th>
                                            <th rowSpan={2} className="col-status">الوضعية</th>
                                            <th colSpan={3} className="text-center">نتائج الاختبار في مادة العدو</th>
                                            <th rowSpan={2} className="col-time">التوقيت</th>
                                            <th rowSpan={2} className="col-score">العدد</th>
                                        </tr>
                                        <tr className="bg-gray-50 font-black h-6">
                                            <th className="w-12">60م</th><th className="w-12">600م</th><th className="w-12">1000م</th>
                                        </tr>
                                    </>
                                )}
                                {(selectedCategory === 'saut' || selectedCategory === 'lancer') && (
                                    <tr className="bg-gray-100 font-black h-7">
                                        <th className="col-id">ر.ت</th>
                                        <th className="text-right pr-2 col-name force-spaces">الإسم واللقب</th>
                                        <th className="col-status">الوضعية</th>
                                        <th className="w-14 text-center">المحاولة 1</th>
                                        <th className="w-14 text-center">المحاولة 2</th>
                                        <th className="w-14 text-center">المحاولة 3</th>
                                        <th className="w-14 text-center">أحسن إنجاز</th>
                                        <th className="w-14 text-center">العدد</th>
                                    </tr>
                                )}
                                {selectedCategory === 'gym' && (
                                    <tr className="bg-gray-100 font-black h-7">
                                        <th className="col-id">ر.ت</th>
                                        <th className="text-right pr-2 col-name force-spaces">الإسم واللقب</th>
                                        <th className="col-status">الوضعية</th>
                                        <th className="w-16 text-center">النتيجة</th>
                                        <th className="text-right pr-2">الملاحظات</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {filteredStudents.map((s, rowIndex) => {
                                    const isPresent = s.status === 'present';
                                    const isRepechage = s.repechage[selectedCategory];
                                    const isExempt = s.exemptions && s.exemptions[selectedCategory];
                                    const isAbsentPartial = s.absences && s.absences[selectedCategory];
                                    const currentVal = isRepechage ? 'repechage' : s.status;
                                    const isMale = s.gender === Gender.Male;
                                    const labelAbsent = isMale ? 'غائب' : 'غائبة';
                                    const labelExempt = isMale ? 'معفى' : 'معفاة';
                                    const labelPresent = isMale ? 'حاضر' : 'حاضرة';

                                    const assignedSportName = 
                                        selectedCategory === 'course' ? SPORT_TRANSLATIONS[s.assignedSports.course || ''] :
                                        selectedCategory === 'saut' ? SPORT_TRANSLATIONS[s.assignedSports.saut || ''] :
                                        selectedCategory === 'lancer' ? (s.assignedSports.lancer ? 'رمي الجلة' : '') : '';

                                    return (
                                        <tr key={s.id} className={`${!isPresent ? 'bg-slate-50' : ''}`}>
                                            <td className="text-center font-bold">{rowIndex + 1}</td>
                                            <td className="text-right pr-2 font-bold relative group force-spaces">
                                                <div className="flex flex-col">
                                                    <span className="force-spaces" style={{whiteSpace: 'pre-wrap'}}>
                                                        {s.name.replace(/\s+/g, '\u00A0')}
                                                    </span>
                                                    {assignedSportName && <span className="assigned-sport-badge official-font">{assignedSportName}</span>}
                                                </div>
                                            </td>
                                            <td className="text-center p-0 relative group">
                                                <select 
                                                    className={`status-select absolute inset-0 w-full h-full opacity-0 z-10`} 
                                                    value={currentVal} 
                                                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                                >
                                                    <option value="present">{labelPresent}</option>
                                                    <option value="absent">{labelAbsent}</option>
                                                    <option value="exempt">{labelExempt}</option>
                                                    <option value="repechage">تدارك</option>
                                                </select>
                                                <div className={`w-full h-full flex items-center justify-center font-bold text-[7pt] relative ${isRepechage ? 'text-red-600' : s.status === 'exempt' || s.status === 'absent' ? 'text-yellow-600' : isPresent ? 'text-green-700' : 'text-slate-400'}`}>
                                                    {isRepechage ? 'تدارك' : s.status === 'absent' ? labelAbsent : s.status === 'exempt' ? labelExempt : labelPresent}
                                                    
                                                    {/* Bouton pour basculer la dispense partielle (Visible seulement si Présent au survol) */}
                                                    {isPresent && (
                                                        <>
                                                            <button 
                                                                className={`absolute -left-5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white border shadow-sm no-print ${isExempt ? 'text-orange-500 border-orange-200 opacity-100' : 'text-slate-300 border-slate-200 opacity-0 group-hover:opacity-100'} hover:text-orange-600 transition-all z-20`}
                                                                onClick={() => onToggleExemption(s.id, selectedCategory)}
                                                                title="إعفاء من هذا الاختصاص فقط (Dispense Partielle)"
                                                            >
                                                                <ShieldBan className="w-3 h-3" />
                                                            </button>
                                                            <button 
                                                                className={`absolute -left-11 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white border shadow-sm no-print ${isAbsentPartial ? 'text-red-500 border-red-200 opacity-100' : 'text-slate-300 border-slate-200 opacity-0 group-hover:opacity-100'} hover:text-red-600 transition-all z-20`}
                                                                onClick={() => onToggleAbsence(s.id, selectedCategory)}
                                                                title="غياب من هذا الاختصاص فقط (Absence Partielle)"
                                                            >
                                                                <AlertCircle className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            {s.status === 'exempt' ? (
                                                <td colSpan={selectedCategory === 'course' ? 5 : (selectedCategory === 'gym' ? 2 : 5)} className="bg-yellow-50 text-yellow-700 text-center font-black text-sm">
                                                    معفى
                                                </td>
                                            ) : s.status === 'absent' ? (
                                                <td colSpan={selectedCategory === 'course' ? 5 : (selectedCategory === 'gym' ? 2 : 5)} className="bg-red-50 text-red-700 text-center font-black text-sm">
                                                    غائب
                                                </td>
                                            ) : isAbsentPartial ? (
                                                <td colSpan={selectedCategory === 'course' ? 5 : (selectedCategory === 'gym' ? 2 : 5)} className="bg-red-50 text-red-700 text-center font-black text-sm">
                                                    غائب
                                                </td>
                                            ) : isRepechage ? (
                                                <td colSpan={selectedCategory === 'course' ? 5 : (selectedCategory === 'gym' ? 2 : 5)} className="bg-red-50 text-red-700 text-center font-black text-sm">
                                                    تدارك
                                                </td>
                                            ) : s.status !== 'present' ? (
                                                <td colSpan={selectedCategory === 'course' ? 5 : (selectedCategory === 'gym' ? 2 : 5)} className="bg-gray-50 text-gray-400 italic text-center font-bold">{s.status === 'absent' ? labelAbsent : labelExempt}</td>
                                            ) : isExempt ? (
                                                <td colSpan={selectedCategory === 'course' ? 5 : (selectedCategory === 'gym' ? 2 : 5)} className="bg-yellow-50 text-yellow-700 italic text-center font-bold text-xs">معفى من هذا الاختصاص</td>
                                            ) : (
                                                <>
                                                    {selectedCategory === 'course' && (
                                                        <>
                                                            <td className={`text-center font-black cursor-pointer relative ${!s.assignedSports.course?.includes('60m') ? 'bg-gray-100 opacity-20' : 'active:bg-blue-100'}`} onClick={() => s.assignedSports.course?.includes('60m') && setEditingTarget({studentId:s.id, studentName:s.name, type:'course', label:'توقيت 60م'})}>{s.assignedSports.course?.includes('60m') ? (s.performance.course || '-') : ''}</td>
                                                            <td className="text-center font-black print-hidden">{s.assignedSports.course?.includes('60m') ? (s.performance.course || '-') : ''}</td>
                                                            
                                                            <td className={`text-center font-black cursor-pointer relative ${!(s.assignedSports.course?.includes('Endurance') && s.gender === 'F') ? 'bg-gray-100 opacity-20' : 'active:bg-blue-100'}`} onClick={() => (s.assignedSports.course?.includes('Endurance') && s.gender === 'F') && setEditingTarget({studentId:s.id, studentName:s.name, type:'course', label:'توقيت 600م'})}>{(s.assignedSports.course?.includes('Endurance') && s.gender === 'F') ? (s.performance.course || '-') : ''}</td>
                                                            <td className="text-center font-black print-hidden">{(s.assignedSports.course?.includes('Endurance') && s.gender === 'F') ? (s.performance.course || '-') : ''}</td>
                                                            
                                                            <td className={`text-center font-black cursor-pointer relative ${!(s.assignedSports.course?.includes('Endurance') && s.gender === 'M') ? 'bg-gray-100 opacity-20' : 'active:bg-blue-100'}`} onClick={() => (s.assignedSports.course?.includes('Endurance') && s.gender === 'M') && setEditingTarget({studentId:s.id, studentName:s.name, type:'course', label:'توقيت 1000م'})}>{(s.assignedSports.course?.includes('Endurance') && s.gender === 'M') ? (s.performance.course || '-') : ''}</td>
                                                            <td className="text-center font-black print-hidden">{(s.assignedSports.course?.includes('Endurance') && s.gender === 'M') ? (s.performance.course || '-') : ''}</td>
                                                            
                                                            <td className="text-center font-black bg-gray-50">{(s.performance.course || '-')}</td>
                                                            <td className="text-center font-black bg-gray-100">{s.scores.course && s.scores.course > 0 ? s.scores.course.toFixed(2) : '-'}</td>
                                                        </>
                                                    )}
                                                    {selectedCategory === 'saut' && (
                                                        <>
                                                            {[0,1,2].map(trialIdx => (
                                                                <td key={trialIdx} className={`text-center font-black cursor-pointer relative ${!s.assignedSports.saut ? 'bg-gray-100 opacity-20' : 'active:bg-blue-100'}`} onClick={() => s.assignedSports.saut && setEditingTarget({studentId:s.id, studentName:s.name, type:'saut', index:trialIdx, label:`محاولة ${trialIdx+1}`})}>
                                                                    {s.performance.sautTrials?.[trialIdx] || '-'}
                                                                </td>
                                                            ))}
                                                            {[0,1,2].map(trialIdx => (
                                                                <td key={`p-${trialIdx}`} className="text-center font-black print-hidden">
                                                                    {s.performance.sautTrials?.[trialIdx] || '-'}
                                                                </td>
                                                            ))}
                                                            <td className="text-center font-black bg-gray-50">{s.performance.saut || '-'}</td>
                                                            <td className="text-center font-black bg-gray-100">{s.scores.saut && s.scores.saut > 0 ? s.scores.saut.toFixed(2) : '-'}</td>
                                                        </>
                                                    )}
                                                    {selectedCategory === 'lancer' && (
                                                        <>
                                                            {[0,1,2].map(trialIdx => (
                                                                <td key={trialIdx} className={`text-center font-black cursor-pointer relative ${!s.assignedSports.lancer ? 'bg-gray-100 opacity-20' : 'active:bg-blue-100'}`} onClick={() => s.assignedSports.lancer && setEditingTarget({studentId:s.id, studentName:s.name, type:'lancer', index:trialIdx, label:`محاولة ${trialIdx+1}`})}>
                                                                    {s.performance.lancerTrials?.[trialIdx] || '-'}
                                                                </td>
                                                            ))}
                                                            {[0,1,2].map(trialIdx => (
                                                                <td key={`p-${trialIdx}`} className="text-center font-black print-hidden">
                                                                    {s.performance.lancerTrials?.[trialIdx] || '-'}
                                                                </td>
                                                            ))}
                                                            <td className="text-center font-black bg-gray-50">{s.performance.lancer || '-'}</td>
                                                            <td className="text-center font-black bg-gray-100">{s.scores.lancer && s.scores.lancer > 0 ? s.scores.lancer.toFixed(2) : '-'}</td>
                                                        </>
                                                    )}
                                                    {selectedCategory === 'gym' && (
                                                        <>
                                                            <td className="text-center font-black cursor-pointer relative active:bg-blue-100" onClick={() => setEditingTarget({studentId:s.id, studentName:s.name, type:'gym', label:'عدد الجمباز'})}>{s.performance.gymnastics || '-'}</td>
                                                            <td className="text-center font-black print-hidden">{s.performance.gymnastics || '-'}</td>
                                                            <td className="text-right pr-2 col-observation">
                                                                <input type="text" className="w-full border-none bg-transparent outline-none no-print text-[6.5pt] font-bold" value={s.performance.gymObservation || ''} onChange={(e) => onUpdatePerformance(s.id, 'gym', s.performance.gymnastics || 0, undefined, e.target.value)} />
                                                                <span className="hidden print:inline text-[6.5pt]">{s.performance.gymObservation}</span>
                                                            </td>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Zone - Signature blocs directement sous le tableau */}
                    <div className="official-font footer-zone">
                        <div className="sig-block">
                            <p className="sig-title">إمضاء و ختم</p>
                            <p className="sig-subtitle">رئيس لجنة الاختبارات</p>
                            <div className="sig-space"></div>
                        </div>
                        <div className="sig-block">
                            <p className="sig-title">إمضاء و ختم</p>
                            <p className="sig-subtitle">رئيس مكتب تطوير الرياضة</p>
                            <p className="sig-subtitle">و التربية البدنية أو من ينوبه</p>
                            <div className="sig-space"></div>
                        </div>
                        <div className="sig-block">
                            <p className="sig-title">إمضاء و ختم</p>
                            <p className="sig-subtitle">المندوب الجهوي للشباب و الرياضة</p>
                            <div className="sig-space"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EntryView;