
import React, { useState, useRef, useMemo } from 'react';
import { Student, Gender, GlobalSettings } from '../types';
import { Printer, Download, BarChart3, FileSpreadsheet, TableProperties, Filter } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ReportsViewProps {
  students: Student[];
  gradingVersion?: { version: number, date: string };
  region: string;
  globalSettings: GlobalSettings;
}

type ReportType = 'stats_summary' | 'list_no_2' | 'daily_stats';

const ReportsView: React.FC<ReportsViewProps> = ({ students, gradingVersion, region, globalSettings }) => {
  const [selectedSchool, setSelectedSchool] = useState<string>(students[0]?.institution ?? '');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [reportType, setReportType] = useState<ReportType>('list_no_2');
  const [isExporting, setIsExporting] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [eventDate, setEventDate] = useState<{
    day: string;
    month: string;
    year: string;
  }>({
    day: new Date().getDate().toString(),
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString()
  });
  const printRef = useRef<HTMLDivElement>(null);

  /** ===== Data prep ===== */
  // Unique schools
  const schools = useMemo(() => Array.from(new Set(students.map(s => s.institution))).sort(), [students]);

  // Filter by school
  const schoolStudents = useMemo(() => students.filter(s => s.institution === selectedSchool), [students, selectedSchool]);

  // Unique classes within school
  const classesInSchool = useMemo(() => Array.from(new Set(schoolStudents.map(s => s.className))).sort(), [schoolStudents]);

  // ===== Pagination for List No.2 =====
  const STUDENTS_PER_PAGE = 25;

  const pages = useMemo(() => {
    const resultPages: Student[][] = [];
    const chunkStudents = (list: Student[]) => {
      for (let i = 0; i < list.length; i += STUDENTS_PER_PAGE) {
        resultPages.push(list.slice(i, i + STUDENTS_PER_PAGE));
      }
    };
    if (selectedClass !== 'All') {
      const classList = schoolStudents
        .filter(s => s.className === selectedClass)
        .sort((a, b) => a.excelId - b.excelId);
      chunkStudents(classList);
    } else {
      // Respect "one class per sequence", chunk each class independently
      classesInSchool.forEach(cls => {
        const classList = schoolStudents
          .filter(s => s.className === cls)
          .sort((a, b) => a.excelId - b.excelId);
        if (classList.length > 0) chunkStudents(classList);
      });
    }
    return resultPages.length > 0 ? resultPages : [[]];
  }, [schoolStudents, selectedClass, classesInSchool]);

  /** ===== Stats data ===== */
  const statsData = useMemo(() => {
    const classMap: Record<string, any> = {};
    const targetStudents = selectedClass === 'All' ? schoolStudents : schoolStudents.filter(s => s.className === selectedClass);
    targetStudents.forEach(s => {
      if (!classMap[s.className]) {
        classMap[s.className] = {
          name: s.className,
          regM: 0, regF: 0,
          testM: 0, testF: 0,
          excM: 0, excF: 0,
          absM: 0, absF: 0,
          runM: 0, runF: 0,
          sautM: 0, sautF: 0,
          lanM: 0, lanF: 0
        };
      }
      const c = classMap[s.className];
      const isM = s.gender === Gender.Male;
      if (isM) c.regM++; else c.regF++;
      if (s.status === 'present') {
        if (isM) c.testM++; else c.testF++;
        if (s.scores.course && s.scores.course >= 10) { if (isM) c.runM++; else c.runF++; }
        if (s.scores.saut && s.scores.saut >= 10) { if (isM) c.sautM++; else c.sautF++; }
        if (s.scores.lancer && s.scores.lancer >= 10) { if (isM) c.lanM++; else c.lanF++; }
      } else if (s.status === 'exempt') { if (isM) c.excM++; else c.excF++; }
      else { if (isM) c.absM++; else c.absF++; }
    });
    return Object.values(classMap).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [schoolStudents, selectedClass]);

  const statsTotal = useMemo(() => {
    return statsData.reduce((acc, curr) => ({
      regM: acc.regM + curr.regM, regF: acc.regF + curr.regF,
      testM: acc.testM + curr.testM, testF: acc.testF + curr.testF,
      excM: acc.excM + curr.excM, excF: acc.excF + curr.excF,
      absM: acc.absM + curr.absM, absF: acc.absF + curr.absF,
      runM: acc.runM + curr.runM, runF: acc.runF + curr.runF,
      sautM: acc.sautM + curr.sautM, sautF: acc.sautF + curr.sautF,
      lanM: acc.lanM + curr.lanM, lanF: acc.lanF + curr.lanF
    }), {
      regM: 0, regF: 0, testM: 0, testF: 0, excM: 0, excF: 0,
      absM: 0, absF: 0, runM: 0, runF: 0, sautM: 0, sautF: 0, lanM: 0, lanF: 0
    });
  }, [statsData]);

  const dailyStatsData = useMemo(() => {
    const classMap: Record<string, any> = {};
    const targetStudents = selectedClass === 'All' ? schoolStudents : schoolStudents.filter(s => s.className === selectedClass);
    targetStudents.forEach(s => {
      if (!classMap[s.className]) {
        classMap[s.className] = { name: s.className, candidates: 0, attendees: 0, exempted: 0, absent: 0, repechage: 0 };
      }
      const c = classMap[s.className];
      c.candidates++;
      if (s.status === 'present') c.attendees++;
      if (s.status === 'exempt') c.exempted++;
      if (s.status === 'absent') c.absent++;
      const hasRepechage = Object.values(s.repechage).some(v => v === true);
      if (hasRepechage) c.repechage++;
    });
    return Object.values(classMap).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [schoolStudents, selectedClass]);

  const dailyStatsTotal = useMemo(() => {
    return dailyStatsData.reduce((acc, curr) => ({
      candidates: acc.candidates + curr.candidates,
      attendees: acc.attendees + curr.attendees,
      exempted: acc.exempted + curr.exempted,
      absent: acc.absent + curr.absent,
      repechage: acc.repechage + curr.repechage
    }), { candidates: 0, attendees: 0, exempted: 0, absent: 0, repechage: 0 });
  }, [dailyStatsData]);

  const repechageStudents = useMemo(() => {
    const targetStudents = selectedClass === 'All' ? schoolStudents : schoolStudents.filter(s => s.className === selectedClass);
    return targetStudents
      .filter(s => Object.values(s.repechage).some(v => v === true))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [schoolStudents, selectedClass]);

  const getRepechageTests = (s: Student) => {
    const tests: string[] = [];
    if (s.repechage.course) tests.push('عدو');
    if (s.repechage.saut) tests.push('وثب');
    if (s.repechage.lancer) tests.push('رمي');
    if (s.repechage.gym) tests.push('جمباز');
    return tests.join('، ');
  };

  /** ===== Pagination Repechage (حالات التدارك) ===== */
  const REPECHAGE_ROWS_PER_PAGE_FIRST = 12;  // petit tableau → rester sur la 1ère page
  const REPECHAGE_ROWS_PER_PAGE_NEXT = 22;   // pages suivantes (dédiées)

  const chunkArray = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const repechagePages = useMemo(() => {
    if (repechageStudents.length === 0) return [] as Student[][];
    if (repechageStudents.length <= REPECHAGE_ROWS_PER_PAGE_FIRST) {
      // tout sur la 1ère page (sous le tableau principal)
      return [repechageStudents];
    }
    // sinon : pages dédiées (pas sur la 1ère)
    return chunkArray(repechageStudents, REPECHAGE_ROWS_PER_PAGE_NEXT);
  }, [repechageStudents]);

  // Fonction pour obtenir le nom du mois en arabe
  const getMonthName = (month: number): string => {
    const monthNames = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return monthNames[month - 1] || month.toString();
  };

  // Fonction simplifiée pour ouvrir le modal de date
  const openDateModal = () => {
    setShowDateModal(true);
  };

  // Fonction pour confirmer la date
  const handleDateConfirm = (date: { day: string; month: string; year: string }) => {
    setEventDate(date);
    setShowDateModal(false);
  };

  /** ===== Print & PDF ===== */
  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const element = printRef.current;
    if (!element) return;
    setIsExporting(true);
    html2pdf()
      .set({
        margin: 0,
        filename: `${reportType === 'list_no_2' ? 'قائمة_مناداة' : reportType === 'daily_stats' ? 'إحصاء_يومي' : 'إحصائيات'}_${selectedSchool}_${selectedClass}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: {
          mode: ['css', 'legacy'],
          before: ['.page-break-before'],
          after: ['.page-break-after'],
          avoid: ['.avoid-break', 'tr']
        }
      } as any)
      .from(element)
      .save()
      .finally(() => setIsExporting(false));
  };

  // Composant DateModal simplifié
  const DateModal = () => {
    const [day, setDay] = useState(eventDate.day);
    const [month, setMonth] = useState(eventDate.month);
    const [year, setYear] = useState(eventDate.year);
    const [error, setError] = useState<string>('');

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

      handleDateConfirm({ day: dayNum.toString(), month: monthNum.toString(), year: yearNum.toString() });
    };

    if (!showDateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print" dir="rtl">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-slate-800">
          <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 font-['Cairo'] text-lg">
              <span>📅</span> تعيين تاريخ الإختبار
            </h3>
            <button onClick={() => setShowDateModal(false)} className="p-1 hover:bg-slate-800 rounded-full">
              <span>✕</span>
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

  return (
    <div
      className="p-6 h-screen flex flex-col bg-slate-100 overflow-hidden font-sans"
      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Helvetica, Arial' }}
      dir="rtl"
    >
      {/* Date Modal */}
      <DateModal />

      {/* ==== styles ==== */}
      <style>{`
/* ====== TABLE (Times New Roman for official look) ====== */
.official-table {
  border: 1.5px solid #000 !important;
  border-collapse: collapse !important;
  width: 100% !important;
  page-break-inside: avoid;
  break-inside: avoid;
}
.official-table thead, .official-table tbody, .official-table tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
.official-table th, .official-table td {
  border: 1px solid #000 !important;
  color: #000 !important;
  padding: 3px 6px !important;
  font-family: 'Times New Roman', serif !important;
  font-size: 9pt;
  text-align: center;
  vertical-align: middle;
  height: 22px;
  line-height: 1.2;
  white-space: nowrap;
}
.official-table th {
  background-color: #f9f9f9 !important;
  font-family: 'Cairo', sans-serif !important;
  font-weight: 900;
  font-size: 8.5pt;
  height: 26px;
}

/* ====== A4 page ====== */
.report-paper {
  width: 210mm;
  height: 297mm;
  padding: 20mm 15mm;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
  margin: 0 auto 10mm auto;
  position: relative;
  display: flex;
  flex-direction: column;
  page-break-after: always;
}

/* ====== Group table + signatures to avoid split ====== */
.section-table {
  page-break-inside: avoid;
  break-inside: avoid;
  display: block;
}

/* ====== Body reserves space for bottom footer ====== */
.page-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 6mm;
  box-sizing: border-box;
  padding-bottom: 20mm; /* = footer height */
  overflow: hidden;
}

/* ====== Signatures directly under table ====== */
.signatures {
  margin-top: 5mm; /* Reduced from 10mm */
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-family: 'Cairo', sans-serif;
}
.sig-block { text-align: center; width: 32%; }
.sig-title { font-weight: 700; font-size: 9pt; line-height: 1.4; margin-bottom: 2px; }
.sig-subtitle { font-weight: 700; font-size: 9pt; line-height: 1.4; }

/* ====== Fixed footer: pagination only ====== */
.page-footer-fixed {
  position: absolute;
  left: 15mm; right: 15mm;
  bottom: 8mm;            /* space from bottom */
  height: 18mm;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 10px;
  color: #334155;
  text-align: center;
}
.page-footer-fixed .meta {
  display: block;
  font-size: 7pt;
  color: #94a3b8;
  margin-top: 2px;
}

/* ====== Utility backgrounds ====== */
.stats-header-bg { background-color: #f1f5f9 !important; }
.blue-header-bg  { background-color: #e2e8f0 !important; }
.gray-header-bg  { background-color: #cbd5e1 !important; }

/* ====== Helpers for pagebreak (html2pdf + print) ====== */
.page-break-before { page-break-before: always; break-before: page; }
.page-break-after  { page-break-after:  always; break-after:  page; }
.avoid-break       { page-break-inside: avoid; break-inside: avoid; }

/* ====== Print rules ====== */
@media print {
  .no-print { display: none !important; }

  html, body, #root {
    height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }

  /* show only the report container when printing */
  body * { visibility: hidden; }
  #report-container, #report-container * { visibility: visible; }
  #report-container {
    position: absolute; left: 0; top: 0; width: 100%;
    margin: 0; padding: 0;
  }

  /* repeat table headers on each printed page */
  thead { display: table-header-group !important; }
  tfoot { display: table-footer-group !important; }

  .report-paper {
    margin: 0 !important;
    box-shadow: none !important;
    page-break-after: always !important;
    break-after: page;
  }

  /* ensure rows/cells are not split */
  .official-table, .official-table tr, .official-table td, .official-table th {
    page-break-inside: avoid; break-inside: avoid;
  }

  @page { size: A4 portrait; margin: 0; }
}
      `}</style>

      {/* Control Panel */}
      <div className="flex justify-between items-center mb-4 no-print shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => setReportType('list_no_2')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${reportType === 'list_no_2' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
            <FileSpreadsheet className="w-4 h-4" /> القائمة عدد 2
          </button>

          <button
            onClick={() => setReportType('daily_stats')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${reportType === 'daily_stats' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}
          >
            <TableProperties className="w-4 h-4" /> الإحصاء اليومي
          </button>

          <button
            onClick={() => setReportType('stats_summary')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all ${reportType === 'stats_summary' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border'}`}
          >
            <BarChart3 className="w-4 h-4" /> الجدول الإحصائي
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            disabled={isExporting}
          >
            <Download className="w-4 h-4" /> {isExporting ? 'جاري التحميل...' : 'حفظ PDF'}
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> طباعة التقارير
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl shadow-sm border mb-4 grid grid-cols-2 gap-4 no-print shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 pr-2">المعهد (Lycée)</label>
          <select
            className="border rounded-lg p-2 font-bold text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSchool}
            onChange={(e) => { setSelectedSchool(e.target.value); setSelectedClass('All'); }}
          >
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-400 pr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> القسم (Classe)
          </label>
          <select
            className={`border rounded-lg p-2 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 ${selectedClass === 'All' ? 'bg-blue-50 text-blue-800' : 'bg-slate-50'}`}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="All">طباعة جميع الأقسام (كل قسم في صفحة)</option>
            {classesInSchool.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-auto bg-slate-400/50 p-8 flex flex-col items-center no-scrollbar">
        <div id="report-container" ref={printRef}>
          {/* ===== LIST NO.2 ===== */}
          {reportType === 'list_no_2' && pages.map((pageStudents, pageIdx) => {
            const currentClassTitle = pageStudents.length > 0 ? pageStudents[0].className : selectedClass;
            return (
              <div key={pageIdx} className="report-paper">
                {/* Header */}
                <div className="flex justify-between items-start text-[8.5pt] font-bold mb-6" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                  <div className="text-right space-y-0.5 leading-[1.3]">
                    <p>الجمهورية التونسية</p>
                    <p>وزارة الشباب و الرياضة</p>
                    <p>الإدارة العامة للتربية البدنية و التكوين و البحث</p>
                   <p>إدارة التربية البدنية و الأنشطة الرياضية</p>
                    <p className="pr-4">في الوسط المدرسي</p>
                  </div>
                  <div className="text-left space-y-0.5 pt-1">
                    <p>المندوبية الجهوية للشباب و الرياضة ب{region}</p>
                  </div>
                </div>

                <div className="text-center mb-6 shrink-0" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                  <h1 className="text-[16pt] font-black underline mb-2">(القائمة عدد 2)</h1>
                  <h2 className="text-[11pt] font-bold">اختبار آخر السنة في مادة التربية البدنية - باكالوريا دورة {globalSettings.sessionMonth} {globalSettings.sessionYear}</h2>
                </div>

                {/* Info bar */}
                <div className="flex gap-0 mb-4 font-bold text-[11pt] border-2 border-black" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                  <div className="flex-1 p-2 border-l-2 border-black flex items-center gap-3">
                    <span className="text-[9pt] text-slate-500">المعهد:</span>
                    <span className="font-black">{selectedSchool}</span>
                  </div>
                  <div className="w-64 p-2 flex items-center gap-3">
                    <span className="text-[9pt] text-slate-500">القسم:</span>
                    <span className="font-black text-blue-900">{currentClassTitle}</span>
                  </div>
                </div>

                {/* Body (reserves footer space) */}
                <div className="page-body">
                  {/* TABLE + SIGNATURES grouped */}
                  <div className="section-table">
                    <table className="official-table">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="w-[35px]">ر.ت</th>
                          <th rowSpan={2} className="text-right pr-4">الإسم واللقب</th>
                          <th colSpan={2} className="w-[110px]">العدو</th>
                          <th colSpan={2} className="w-[110px]">الوثب</th>
                          <th colSpan={2} className="w-[110px]">الرمي</th>
                          <th rowSpan={2} className="w-[55px]">جمباز</th>
                          <th rowSpan={2} className="w-[60px]">المجموع</th>
                          <th rowSpan={2} className="w-[60px] bg-slate-100">المعدل</th>
                        </tr>
                        <tr className="h-6 text-[8pt]">
                          <th className="w-[70px]">النتيجة</th><th className="w-[40px]">العدد</th>
                          <th className="w-[70px]">النتيجة</th><th className="w-[40px]">العدد</th>
                          <th className="w-[70px]">النتيجة</th><th className="w-[40px]">العدد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageStudents.map((s, idx) => {
                          const isPresent = s.status === 'present';
                          const isAbsent = s.status === 'absent';
                          const isExempt = s.status === 'exempt';
                          const scoreCourse = (!s.exemptions?.course && !s.repechage?.course && !s.absences?.course && s.scores.course) ? s.scores.course : 0;
                          const scoreSaut = (!s.exemptions?.saut && !s.repechage?.saut && !s.absences?.saut && s.scores.saut) ? s.scores.saut : 0;
                          const scoreLancer = (!s.exemptions?.lancer && !s.repechage?.lancer && !s.absences?.lancer && s.scores.lancer) ? s.scores.lancer : 0;
                          const scoreGym = (!s.exemptions?.gym && !s.repechage?.gym && !s.absences?.gym && s.performance.gymnastics) ? s.performance.gymnastics : 0;
                          const numericCount = (scoreCourse > 0 ? 1 : 0) + (scoreSaut > 0 ? 1 : 0) + (scoreLancer > 0 ? 1 : 0) + (scoreGym > 0 ? 1 : 0);
                          const total = isPresent && numericCount >= 2 ? (scoreCourse + scoreSaut + scoreLancer + scoreGym) : 0;
                          const displayId = s.excelId ?? ((pageIdx * STUDENTS_PER_PAGE) + idx + 1);

                          return (
                            <tr key={s.id}>
                              <td className="font-bold">{displayId}</td>
                              <td className="text-right pr-4 font-black">{s.name}</td>

                              {isPresent ? (
                                <>
                                  {/* Course */}
                                  {s.exemptions?.course ? (
                                    <td colSpan={2} className="text-[8pt] italic text-slate-500 bg-slate-50">معفى</td>
                                  ) : s.repechage?.course ? (
                                    <td colSpan={2} className="text-[8pt] italic text-red-600 bg-red-50 font-bold">تدارك</td>
                                  ) : s.absences?.course ? (
                                    <td colSpan={2} className="text-[8pt] italic text-red-600 bg-red-50 font-bold">غائب</td>
                                  ) : (
                                    <>
                                      <td>{s.performance.course && s.performance.course > 0 ? s.performance.course : '-'}</td>
                                      <td className="font-bold">{s.scores.course && s.scores.course > 0 ? s.scores.course.toFixed(2) : '-'}</td>
                                    </>
                                  )}

                                  {/* Saut */}
                                  {s.exemptions?.saut ? (
                                    <td colSpan={2} className="text-[8pt] italic text-slate-500 bg-slate-50">معفى</td>
                                  ) : s.repechage?.saut ? (
                                    <td colSpan={2} className="text-[8pt] italic text-red-600 bg-red-50 font-bold">تدارك</td>
                                  ) : s.absences?.saut ? (
                                    <td colSpan={2} className="text-[8pt] italic text-red-600 bg-red-50 font-bold">غائب</td>
                                  ) : (
                                    <>
                                      <td>{s.performance.saut && s.performance.saut > 0 ? s.performance.saut : '-'}</td>
                                      <td className="font-bold">{s.scores.saut && s.scores.saut > 0 ? s.scores.saut.toFixed(2) : '-'}</td>
                                    </>
                                  )}

                                  {/* Lancer */}
                                  {s.exemptions?.lancer ? (
                                    <td colSpan={2} className="text-[8pt] italic text-slate-500 bg-slate-50">معفى</td>
                                  ) : s.repechage?.lancer ? (
                                    <td colSpan={2} className="text-[8pt] italic text-red-600 bg-red-50 font-bold">تدارك</td>
                                  ) : s.absences?.lancer ? (
                                    <td colSpan={2} className="text-[8pt] italic text-red-600 bg-red-50 font-bold">غائب</td>
                                  ) : (
                                    <>
                                      <td>{s.performance.lancer && s.performance.lancer > 0 ? s.performance.lancer : '-'}</td>
                                      <td className="font-bold">{s.scores.lancer && s.scores.lancer > 0 ? s.scores.lancer.toFixed(2) : '-'}</td>
                                    </>
                                  )}

                                  {/* Gym */}
                                  {s.exemptions?.gym ? (
                                    <td className="text-[8pt] italic text-slate-500 bg-slate-50">معفى</td>
                                  ) : s.repechage?.gym ? (
                                    <td className="text-[8pt] italic text-red-600 bg-red-50 font-bold">تدارك</td>
                                  ) : s.absences?.gym ? (
                                    <td className="text-[8pt] italic text-red-600 bg-red-50 font-bold">غائب</td>
                                  ) : (
                                    <td className="font-bold">{s.performance.gymnastics && s.performance.gymnastics > 0 ? s.performance.gymnastics.toFixed(2) : ''}</td>
                                  )}

                                  <td className="font-black bg-slate-50">{numericCount >= 2 ? total.toFixed(2) : ''}</td>
                                  <td className="font-black text-[9pt] bg-slate-100">{numericCount >= 2 && s.scores.final && s.scores.final > 0 ? s.scores.final.toFixed(2) : ''}</td>
                                </>
                              ) : isAbsent ? (
                                <>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                  <td className="text-center font-black bg-red-50 text-red-700">غائب</td>
                                </>
                              ) : (
                                <>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                  <td className="text-center font-black bg-yellow-50 text-yellow-700">99.99</td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Signatures */}
                    <div className="signatures">
                      <div className="sig-block">
                        <p className="sig-title">إمضاء و ختم</p>
                        <p className="sig-subtitle">المندوب الجهوي للشباب و الرياضة</p>
                      </div>
                      <div className="sig-block">
                        <p className="sig-title">إمضاء و ختم</p>
                        <p className="sig-subtitle">رئيس مكتب تطوير الرياضة</p>
                        <p className="sig-subtitle">و التربية البدنية أو من ينوبه</p>
                      </div>
                      <div className="sig-block">
                        <p className="sig-title">إمضاء و ختم</p>
                        <p className="sig-subtitle">رئيس لجنة الاختبارات</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed footer: page number only */}
                <div className="page-footer-fixed">
                  <div>
                    صفحة {pageIdx + 1} / {pages.length}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ===== DAILY STATS (الإحصاء اليومي) ===== */}
          {reportType === 'daily_stats' && (() => {
            const hasBigRepechage = repechageStudents.length > REPECHAGE_ROWS_PER_PAGE_FIRST;
            const extraRepechagePages = hasBigRepechage ? repechagePages.length : 0;
            const totalPages = 1 + extraRepechagePages;

            // ---------- PAGE 1 ----------
            const FirstPage = (
              <div className="report-paper">
                {/* Header */}
                <div className="flex justify-between items-start text-[8.5pt] font-bold mb-8" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                  <div className="text-right space-y-0.5 leading-[1.3]">
                    <p>الجمهورية التونسية</p>
                    <p>وزارة الشباب و الرياضة</p>
                    <p>المندوبية الجهوية ب{region}</p>
                  </div>
                </div>

                <div className="text-center mb-8" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                  <h1 className="text-[16pt] font-black mb-2">جدول بياني لإختبار آخر السنة في مادة التربية البدنية</h1>
                  <h2 className="text-[14pt] font-bold"> باكالوريا دورة {globalSettings.sessionMonth} {globalSettings.sessionYear}</h2>
                </div>

                {/* Bandeau d'infos */}
                <div className="grid grid-cols-12 gap-0 mb-4 font-bold text-[10pt]" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                  <div className="col-span-2 border border-black p-2 flex items-center justify-between"><span>المركز:</span></div>
                  <div className="col-span-6 border border-black border-r-0 p-2 flex items-center gap-2">
                    <span>المعهد:</span>
                    <span className="bg-slate-100 px-4 py-1 flex-1 text-center font-black">{selectedSchool}</span>
                  </div>
                  <div className="col-span-4 border border-black border-r-0 p-2 flex items-center gap-2">
                    <span>التاريخ:</span>
                    <span className="bg-slate-100 px-4 py-1 flex-1 text-center font-black">
                      {parseInt(eventDate.day)} {getMonthName(parseInt(eventDate.month))} {eventDate.year}
                    </span>
                    <button 
                      onClick={openDateModal}
                      className="no-print p-1 hover:bg-slate-100 rounded-full transition-colors text-[10pt]"
                      title="تغيير تاريخ الإختبار"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="col-span-12 border border-black border-t-0 p-2">
                    الزيارات الخاصة :
                  </div>
                </div>

                {/* Corps */}
                <div className="page-body">
                  <div className="section-table">
                    <table className="official-table mb-6 avoid-break">
                      <thead className="blue-header-bg">
                        <tr>
                          <th rowSpan={2} className="w-[35px]">N°</th>
                          <th rowSpan={2} className="w-[180px]">القسم</th>
                          <th rowSpan={2} className="w-[60px]">المترشحين</th>
                          <th colSpan={2}>الحاضرين</th>
                          <th colSpan={2}>المعفيين</th>
                          <th colSpan={2}>الغائبين</th>
                          <th colSpan={2}>المتداركين</th>
                        </tr>
                        <tr>
                          <th className="w-[35px] text-[7pt]">عدد</th>
                          <th className="w-[45px] text-[7pt]">% النسبة</th>
                          <th className="w-[35px] text-[7pt]">عدد</th>
                          <th className="w-[45px] text-[7pt]">% النسبة</th>
                          <th className="w-[35px] text-[7pt]">عدد</th>
                          <th className="w-[45px] text-[7pt]">% النسبة</th>
                          <th className="w-[35px] text-[7pt]">عدد</th>
                          <th className="w-[45px] text-[7pt]">% النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyStatsData.map((cls: any, idx) => {
                          const pExempt = cls.candidates > 0 ? (cls.exempted / cls.candidates * 100).toFixed(2) : '0,00';
                          const pAbsent = cls.candidates > 0 ? (cls.absent / cls.candidates * 100).toFixed(2) : '0,00';
                          const pRep = cls.candidates > 0 ? (cls.repechage / cls.candidates * 100).toFixed(2) : '0,00';
                          const pAttendance = cls.candidates > 0 ? (cls.attendees / cls.candidates * 100).toFixed(2) : '0,00';
                          return (
                            <tr key={cls.name}>
                              <td className="font-bold">{idx + 1}</td>
                              <td className="text-right pr-4 font-bold">{cls.name}</td>
                              <td className="font-black">{cls.candidates}</td>
                              <td className="font-black">{cls.attendees}</td>
                              <td className="text-[7.5pt] font-black">{pAttendance}</td>
                              <td className="font-black">{cls.exempted}</td>
                              <td className="text-[7.5pt] font-black">{pExempt}</td>
                              <td className="font-black">{cls.absent}</td>
                              <td className="text-[7.5pt] font-black">{pAbsent}</td>
                              <td className="font-black">{cls.repechage}</td>
                              <td className="text-[7.5pt] font-black">{pRep}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-yellow-50 font-black h-11 text-[9pt]">
                          <td colSpan={2}>المجموع</td>
                          <td>{dailyStatsTotal.candidates}</td>
                          <td>{dailyStatsTotal.attendees}</td>
                          <td className="text-[7.5pt]">{dailyStatsTotal.candidates > 0 ? (dailyStatsTotal.attendees / dailyStatsTotal.candidates * 100).toFixed(2) : '0,00'}</td>
                          <td>{dailyStatsTotal.exempted}</td>
                          <td className="text-[7.5pt]">{dailyStatsTotal.candidates > 0 ? (dailyStatsTotal.exempted / dailyStatsTotal.candidates * 100).toFixed(2) : '0,00'}</td>
                          <td>{dailyStatsTotal.absent}</td>
                          <td className="text-[7.5pt]">{dailyStatsTotal.candidates > 0 ? (dailyStatsTotal.absent / dailyStatsTotal.candidates * 100).toFixed(2) : '0,00'}</td>
                          <td>{dailyStatsTotal.repechage}</td>
                          <td className="text-[7.5pt]">{dailyStatsTotal.candidates > 0 ? (dailyStatsTotal.repechage / dailyStatsTotal.candidates * 100).toFixed(2) : '0,00'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Repechage petit volume (≤ seuil) : collé sous le tableau principal */}
                    {(repechageStudents.length > 0 && repechageStudents.length <= REPECHAGE_ROWS_PER_PAGE_FIRST) && (
                      <div className="mb-6 flex justify-end">
                        <div className="w-2/3">
                          <table className="official-table avoid-break">
                            <thead>
                              <tr className="bg-gray-400">
                                <th colSpan={4} className="text-[11pt] font-black py-2">حالات التدارك</th>
                              </tr>
                              <tr className="bg-gray-200">
                                <th className="w-[40px]">ع/ر</th>
                                <th>الاسم و اللقب</th>
                                <th className="w-[100px]">القسم</th>
                                <th className="w-[150px]">الاختبارات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {repechageStudents.map((s, idx) => (
                                <tr key={s.id}>
                                  <td className="font-bold">{idx + 1}</td>
                                  <td className="font-bold">{s.name}</td>
                                  <td className="font-bold">{s.className}</td>
                                  <td className="font-bold">{getRepechageTests(s)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Signatures : uniquement si pas de pages supplémentaires */}
                    {(!hasBigRepechage) && (
                      <div className="signatures">
                        <div className="sig-block"><p className="sig-title">إمضاء و ختم</p><p className="sig-subtitle">المندوب الجهوي للشباب و الرياضة</p></div>
                        <div className="sig-block"><p className="sig-title">إمضاء و ختم</p><p className="sig-subtitle">رئيس مكتب تطوير الرياضة</p><p className="sig-subtitle">و التربية البدنية أو من ينوبه</p></div>
                        <div className="sig-block"><p className="sig-title">إمضاء و ختم</p><p className="sig-subtitle">رئيس لجنة الاختبارات</p></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="page-footer-fixed">
                  <div> صفحة 1 / {totalPages} </div>
                </div>
              </div>
            );

            // ---------- PAGES SUIVANTES : التدارك volumineux ----------
            const RepechagePages = hasBigRepechage ? repechagePages.map((rows, pIdx) => {
              const isLast = pIdx === repechagePages.length - 1;
              const pageNumber = 2 + pIdx;
              return (
                <div key={`rep-${pIdx}`} className="report-paper page-break-before">
                  <div className="text-center mb-4" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                    <h2 className="text-[13pt] font-black underline">حالات التدارك</h2>
                    {repechagePages.length > 1 && (
                      <div className="text-[9pt] text-slate-500 mt-1">متابعة ({pageNumber - 1}/{repechagePages.length})</div>
                    )}
                  </div>

                  <div className="page-body">
                    <div className="section-table">
                      <div className="flex justify-end mb-6">
                        <div className="w-2/3">
                          <table className="official-table avoid-break">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="w-[40px]">ع/ر</th>
                                <th>الاسم و اللقب</th>
                                <th className="w-[100px]">القسم</th>
                                <th className="w-[150px]">الاختبارات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((s, i) => (
                                <tr key={s.id}>
                                  <td className="font-bold">{(pIdx * REPECHAGE_ROWS_PER_PAGE_NEXT) + i + 1}</td>
                                  <td className="font-bold">{s.name}</td>
                                  <td className="font-bold">{s.className}</td>
                                  <td className="font-bold">{getRepechageTests(s)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Signatures sous le DERNIER fragment */}
                      {isLast && (
                        <div className="signatures">
                          <div className="sig-block"><p className="sig-title">إمضاء و ختم</p><p className="sig-subtitle">المندوب الجهوي للشباب و الرياضة</p></div>
                          <div className="sig-block"><p className="sig-title">إمضاء و ختم</p><p className="sig-subtitle">رئيس مكتب تطوير الرياضة</p><p className="sig-subtitle">و التربية البدنية أو من ينوبه</p></div>
                          <div className="sig-block"><p className="sig-title">إمضاء و ختم</p><p className="sig-subtitle">رئيس لجنة الاختبارات</p></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="page-footer-fixed">
                    <div> صفحة {pageNumber} / {totalPages} </div>
                  </div>
                </div>
              );
            }) : null;

            return (
              <>
                {FirstPage}
                {RepechagePages}
              </>
            );
          })()}

          {/* ===== STATS SUMMARY ===== */}
          {reportType === 'stats_summary' && (
            <div className="report-paper">
              {/* Header */}
              <div className="flex justify-between items-start text-[8.5pt] font-bold mb-8" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                <div className="text-right space-y-0.5 leading-[1.3]">
                  <p>الجمهورية التونسية</p>
                  <p>وزارة الشباب و الرياضة</p>
                  <p>الإدارة العامة للتربية البدنية و التكوين و البحث</p>
                  <p>إدارة التربية البدنية و الأنشطة الرياضية</p>
                  <p className="pr-4">في الوسط المدرسي</p>
                </div>
                <div className="text-left space-y-0.5 pt-1">
                  <p>المندوبية الجهوية للشباب و الرياضة ب{region}</p>
                </div>
              </div>

              <div className="text-center mb-6" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                <h1 className="text-[15pt] font-black underline">
                  إحصائيات نتائج إختبار آخر السنة - باكالوريا دورة {globalSettings.sessionMonth} {globalSettings.sessionYear}
                </h1>
              </div>

              <div className="flex justify-between mb-6 font-bold text-[11pt]" style={{ fontFamily: 'Cairo, ui-sans-serif' }}>
                <div className="flex gap-2">
                  <span>المعهد:</span> 
                  <span className="border-b-2 border-black px-6">{selectedSchool}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span>التاريخ:</span> 
                  <span className="border-b-2 border-black px-6">
                    {parseInt(eventDate.day)} {getMonthName(parseInt(eventDate.month))} {eventDate.year}
                  </span>
                  <button 
                    onClick={openDateModal}
                    className="no-print p-1 hover:bg-slate-100 rounded-full transition-colors text-[10pt]"
                    title="تغيير تاريخ الإختبار"
                  >
                    ✏️
                  </button>
                </div>
              </div>

              <div className="page-body">
                <div className="section-table">
                  <table className="official-table">
                    <thead className="stats-header-bg">
                      <tr>
                        <th rowSpan={2} className="w-[40px]">ر.ت</th>
                        <th rowSpan={2} className="w-[160px]">الأقسام</th>
                        <th colSpan={2}>المرسمون</th>
                        <th colSpan={2}>الممتحنون</th>
                        <th colSpan={2}>المعفيون</th>
                        <th colSpan={2}>الغائبون</th>
                        <th colSpan={2}>نتائج العدو</th>
                        <th colSpan={2}>نتائج الوثب</th>
                        <th colSpan={2}>نتائج الرمي</th>
                      </tr>
                      <tr>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                        <th className="w-[32px]">إ</th><th className="w-[32px]">ذ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.map((cls: any, idx) => (
                        <tr key={cls.name}>
                          <td className="font-bold">{idx + 1}</td>
                          <td className="text-right pr-4 font-bold">{cls.name}</td>
                          <td>{cls.regF}</td><td className="font-bold">{cls.regM}</td>
                          <td>{cls.testF}</td><td className="font-bold">{cls.testM}</td>
                          <td>{cls.excF}</td><td className="font-bold">{cls.excM}</td>
                          <td>{cls.absF}</td><td className="font-bold">{cls.absM}</td>
                          <td className="bg-slate-50 italic">{cls.runF ?? 0}</td><td className="bg-slate-50 italic font-bold">{cls.runM ?? 0}</td>
                          <td className="bg-slate-50 italic">{cls.sautF ?? 0}</td><td className="bg-slate-50 italic font-bold">{cls.sautM ?? 0}</td>
                          <td className="bg-slate-50 italic">{cls.lanF ?? 0}</td><td className="bg-slate-50 italic font-bold">{cls.lanM ?? 0}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-200 font-black h-11 text-[9pt]">
                        <td colSpan={2}>المجموع العام</td>
                        <td>{statsTotal.regF}</td><td>{statsTotal.regM}</td>
                        <td>{statsTotal.testF}</td><td>{statsTotal.testM}</td>
                        <td>{statsTotal.excF}</td><td>{statsTotal.excM}</td>
                        <td>{statsTotal.absF}</td><td>{statsTotal.absM}</td>
                        <td>{statsTotal.runF}</td><td>{statsTotal.runM}</td>
                        <td>{statsTotal.sautF}</td><td>{statsTotal.sautM}</td>
                        <td>{statsTotal.lanF}</td><td>{statsTotal.lanM}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="signatures">
                    <div className="sig-block">
                      <p className="sig-title">إمضاء و ختم</p>
                      <p className="sig-subtitle">المندوب الجهوي للشباب و الرياضة</p>
                    </div>
                    <div className="sig-block">
                      <p className="sig-title">إمضاء و ختم</p>
                      <p className="sig-subtitle">رئيس مكتب تطوير الرياضة</p>
                      <p className="sig-subtitle">و التربية البدنية أو من ينوبه</p>
                    </div>
                    <div className="sig-block">
                      <p className="sig-title">إمضاء و ختم</p>
                      <p className="sig-subtitle">رئيس لجنة الاختبارات</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer fixed */}
              <div className="page-footer-fixed">
                <div> صفحة 1 / 1 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
