import React, { useState, useMemo, useRef } from 'react';
import { Student, Gender, GlobalSettings } from '../types';
import { Search, Printer, Download } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface FinalResultsViewProps {
  students: Student[];
  gradingVersion?: { version: number, date: string };
  region: string;
  globalSettings: GlobalSettings;
}

const FinalResultsView: React.FC<FinalResultsViewProps> = ({ students, gradingVersion, region, globalSettings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>(students[0]?.institution || '');
  const [selectedClass, setSelectedClass] = useState<string>(
    Array.from(new Set(students.filter(s => s.institution === (students[0]?.institution || '')).map(s => s.className))).sort()[0] || 'All'
  );
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const schools = useMemo(() => Array.from(new Set(students.map(s => s.institution))).sort(), [students]);
  const schoolStudents = useMemo(() => students.filter(s => s.institution === selectedSchool), [students, selectedSchool]);
  const classes = useMemo(() => Array.from(new Set(schoolStudents.map(s => s.className))).sort(), [schoolStudents]);

  const filteredStudents = useMemo(() => {
    return schoolStudents
      .filter(s => {
        const matchClass = selectedClass === 'All' || s.className === selectedClass;
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchClass && matchSearch;
      })
      .sort((a, b) => a.excelId - b.excelId);
  }, [schoolStudents, selectedClass, searchTerm]);

  // 🔒 25 élèves par page
  const STUDENTS_PER_PAGE = 25;
  const pages = useMemo(() => {
    const chunks: Student[][] = [];
    for (let i = 0; i < filteredStudents.length; i += STUDENTS_PER_PAGE) {
      chunks.push(filteredStudents.slice(i, i + STUDENTS_PER_PAGE));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [filteredStudents]);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const element = printRef.current;
    if (!element) return;

    setIsExporting(true);
    
    html2pdf()
      .set({
        margin: 0,
        filename: `النتائج_النهائية_${selectedClass}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      } as any)
      .from(element)
      .save()
      .finally(() => setIsExporting(false));
  };

  return (
    <div className="p-4 min-h-screen bg-slate-100 font-['Cairo'] flex flex-col items-center" dir="rtl">
        {/* ... (Keep existing styles and JSX) ... */}
        {/* Same note. Providing full content below. */}
      <style>{`
        /* ===== Tableau ===== */
        .official-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid black;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .official-table thead, .official-table tbody, .official-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .official-table th, .official-table td {
          border: 1px solid black;
          padding: 3px 6px;
          text-align: center;
          font-family: 'Times New Roman', serif;
          font-size: 9pt;      /* compact et lisible */
          height: 22px;        /* stabilité des 25 lignes */
          line-height: 1.2;
          vertical-align: middle;
          white-space: nowrap;
        }
        .official-table th {
          font-family: 'Cairo', sans-serif;
          font-weight: bold;
          font-size: 8.5pt;
          background: #f9f9f9;
          height: 26px;
        }

        /* ===== Regrouper tableau + signatures (pas de coupure entre eux) ===== */
        .section-table {
          page-break-inside: avoid;
          break-inside: avoid;
          display: block;
        }

        /* ===== Page ===== */
        .result-paper {
          width: 210mm;
          height: 297mm;
          padding: 20mm 15mm;
          background: white;
          margin: 0 auto 10mm auto;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          position: relative;
          page-break-after: always;
        }
        .result-paper:last-child { margin-bottom: 0; }

        .page-header {
          height: 30mm; /* tu peux réduire à 28mm si besoin de plus d'espace */
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-size: 8.5pt;
          font-weight: bold;
          margin-bottom: 5mm;
          line-height: 1.3;
          flex-shrink: 0;
        }

        .page-body {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          gap: 6mm;
          overflow: hidden;
          box-sizing: border-box;

          /* ✅ Réserver l'espace du footer pour éviter tout chevauchement */
          padding-bottom: 22mm; /* = hauteur du footer */
        }

        /* ===== Signatures directement sous le tableau ===== */
        .signatures {
          margin-top: 5mm; /* Reduced from 10mm */
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          font-family: 'Cairo', sans-serif;
        }
        
        .sig-block {
            text-align: center;
            width: 32%;
        }
        
        .sig-title {
            font-weight: 700;
            font-size: 9pt;
            line-height: 1.4;
            margin-bottom: 2px;
        }
        
        .sig-subtitle {
            font-weight: 700;
            font-size: 9pt;
            line-height: 1.4;
        }

        /* ===== Footer : numérotation toujours en bas de page ===== */
        .page-footer {
          position: absolute;
          left: 15mm;   /* aligné avec padding horizontal */
          right: 15mm;
          bottom: 10mm; /* Moved down from 20mm */
          height: 22mm; /* même valeur que le padding-bottom de .page-body */
          display: flex;
          align-items: flex-end;
          justify-content: center; /* numérotation centrée */
          font-size: 10px;
          text-align: center;
          box-sizing: border-box;
        }
        .page-footer .meta {
          display: block;
          font-size: 7pt;
          color: #94a3b8; /* slate-400 */
          margin-top: 2px;
        }

        /* ===== Impression ===== */
        @media print {
          .no-print { display: none !important; }
          html, body, #root { 
            height: auto !important; 
            overflow: visible !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
          }
          body * { visibility: hidden; }
          #print-container, #print-container * { visibility: visible; }
          #print-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
          }
          .result-paper { margin: 0 !important; box-shadow: none !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      {/* Panneau de contrôle */}
      <div className="w-[210mm] bg-white p-4 rounded-xl shadow-sm border mb-6 no-print flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">النتائج النهائية</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
              disabled={isExporting}
              title={isExporting ? 'Génération en cours...' : 'Exporter en PDF'}
            >
              <Download className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> طباعة
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="بحث عن تلميذ..."
              className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="border rounded-lg p-2 font-bold text-sm bg-slate-50 outline-none"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="border rounded-lg p-2 font-bold text-sm bg-slate-50 outline-none"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="All">جميع الأقسام</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Zone imprimable */}
      <div id="print-container" ref={printRef} className="overflow-hidden">
        {pages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="result-paper">
            {/* En-tête */}
            <div className="page-header">
              <div className="text-right">
                <p>الجمهورية التونسية</p>
                <p>وزارة الشباب و الرياضة</p>
                <p>الإدارة العامة للتربية البدنية و التكوين و البحث</p>
                <p>إدارة التربية البدنية و الأنشطة الرياضية</p>
                <p className="pr-4">في الوسط المدرسي</p>
              </div>
              <div className="text-left pt-2">
                <p>المندوبية الجهوية للشباب و الرياضة ب{region}</p>
                <p className="mt-2 text-[7pt]">با كالوريا دورة {globalSettings.sessionMonth} {globalSettings.sessionYear}</p>
              </div>
            </div>

            {/* Corps */}
            <div className="page-body">
              <div className="text-center mb-2">
                <h1 className="text-[16pt] font-black underline">النتائج النهائية لامتحان الباكالوريا تربية بدنية</h1>
              </div>

              <div className="flex border border-black mb-4">
                <div className="flex-1 border-l-[1.5px] border-black p-2 font-bold text-[10pt]">
                  <span className="ml-2">المعهد:</span><span>{selectedSchool}</span>
                </div>
                <div className="flex-1 p-2 font-bold text-[10pt]">
                  <span className="ml-2">القسم:</span><span>{selectedClass === 'All' ? '-' : selectedClass}</span>
                </div>
              </div>

              {/* ===== Tableau + Signatures regroupés (pas de coupure) ===== */}
              <div className="section-table">
                <table className="official-table">
                  <thead>
                    <tr>
                      <th className="w-[80px]">ر.ت</th>
                      <th className="text-right pr-6">الإسم واللقب</th>
                      <th className="w-[140px]">عدد الاختبار</th>
                      <th className="w-[200px]">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStudents.map((s, idx) => {
                      const isAbsent = s.status === 'absent';
                      const isExempt = s.status === 'exempt';
                      
                      // Compter les notes numériques (ignorer exempt, repechage et absences)
                      const numericScores = [
                        (!s.exemptions?.course && !s.repechage?.course && !s.absences?.course && s.scores.course && s.scores.course > 0) ? s.scores.course : 0,
                        (!s.exemptions?.saut && !s.repechage?.saut && !s.absences?.saut && s.scores.saut && s.scores.saut > 0) ? s.scores.saut : 0,
                        (!s.exemptions?.lancer && !s.repechage?.lancer && !s.absences?.lancer && s.scores.lancer && s.scores.lancer > 0) ? s.scores.lancer : 0,
                        (!s.exemptions?.gym && !s.repechage?.gym && !s.absences?.gym && s.scores.gym && s.scores.gym > 0) ? s.scores.gym : 0
                      ];
                      const numericCount = numericScores.filter(n => n > 0).length;
                      const hasRepechage = s.repechage?.course || s.repechage?.saut || s.repechage?.lancer || s.repechage?.gym;
                      const hasAbsence = s.absences?.course || s.absences?.saut || s.absences?.lancer || s.absences?.gym;
                      
                      const score =
                        isAbsent
                          ? 'غائب'
                          : isExempt
                          ? '99.99'
                          : numericCount < 2
                          ? '-'
                          : s.scores.final && s.scores.final > 0
                          ? s.scores.final.toFixed(2)
                          : '-';

                      let observation = '';
                      if (isAbsent) observation = 'غائب';
                      else if (isExempt) observation = 'معفى';
                      else if (numericCount < 2 && hasAbsence) observation = 'غائب';
                      else if (numericCount < 2 && hasRepechage) observation = 'تدارك';
                      else if (s.scores.final && s.scores.final < 10 && s.scores.final > 0) observation = 'دون المتوسط';

                      const globalIndex = (pageIdx * STUDENTS_PER_PAGE) + idx + 1;

                      return (
                        <tr key={s.id}>
                          <td className="font-bold">{globalIndex}</td>
                          <td className="text-right pr-6 font-bold">{s.name}</td>
                          <td className="font-black text-[11pt]">{score}</td>
                          <td className="text-sm font-bold">{observation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* ✅ Signatures directement sous le tableau */}
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
              {/* ===== Fin regroupement ===== */}
            </div>

            {/* ✅ Footer : numéro de page toujours en bas */}
            <div className="page-footer">
              <div>
                صفحة {pageIdx + 1} / {pages.length}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinalResultsView;