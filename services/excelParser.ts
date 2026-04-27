
import { Student, Gender, SportType } from '../types';
import * as XLSX from 'xlsx';

export const parseExcelFile = async (file: File, importedBy?: string): Promise<Student[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        // Lecture directe via la librairie importée (fonctionne hors ligne)
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array of arrays (rows)
        // header: 1 gives us an array of arrays [[A1, B1], [A2, B2]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const students: Student[] = [];
        
        // Logic derived from VBA:
        // School is at cell (7, 2) => Row index 6, Col index 1
        const schoolName = jsonData[6] && jsonData[6][1] ? jsonData[6][1] : "Institution Inconnue";
        
        let currentClass = "";

        // Iterate rows starting from where data might begin. VBA starts loop at 1 but checks validity.
        // VBA Loop: For i = 1 To l1rows
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row) continue;

            const colA = row[0]; // Cell A(i)
            
            // Logic: If wb.Sheets(1).Cells(i, 1).Value = "1" Then class = wb.Sheets(1).Cells(i - 5, 7).Value
            // In 0-indexed array, i is the current row index.
            // VBA `Cells(i, 1)` corresponds to `row[0]`.
            // If row[0] == 1, then the class name was 5 rows BEFORE this row, at column G (index 6).
            if (colA == 1 || colA === "1") {
                if (i >= 5) {
                    const classRow = jsonData[i - 5];
                    if (classRow && classRow[6]) {
                        currentClass = classRow[6];
                    }
                }
            }

            // Check if valid student row
            // If IsNumeric(Cells(i, 1)) And Cells(i, 1) <> "" And Cells(i, 2) <> ""
            if (colA && !isNaN(parseInt(colA)) && row[1]) {
                const studentName = row[1]; // Column B
                const genderMarker = row[2]; // Column C
                
                // VBA: Cells(lastrows, 6) = IIf(wb.Sheets(1).Cells(i, 3).Value = "*", M, F)
                // If Column C has "*", it's Male (M - Dhakar), else Female (F - Ontha)
                const gender = (genderMarker === '*' || genderMarker === 'x' || genderMarker === 'X') 
                                ? Gender.Male 
                                : Gender.Female;

                // Determine Sports
                // Course (Running):
                // Col E (idx 4) -> Course 1
                // Col F (idx 5) OR G (idx 6) -> Course 2
                let course: SportType.Course1 | SportType.Course2 | SportType.Course3 | undefined;
                if (isMarked(row[4])) course = SportType.Course1;
                else if (isMarked(row[5]) || isMarked(row[6])) course = SportType.Course2;
                // Fallback or explicit check for potential 3rd course column if schema changes

                // Saut (Jumping):
                // Col H (idx 7) -> Saut 1
                // Col I (idx 8) -> Saut 2
                // Col J (idx 9) -> Saut 3
                let saut: SportType.Saut1 | SportType.Saut2 | SportType.Saut3 | undefined;
                if (isMarked(row[7])) saut = SportType.Saut1;
                else if (isMarked(row[8])) saut = SportType.Saut2;
                else if (isMarked(row[9])) saut = SportType.Saut3;

                // Lancer (Throwing):
                // Col K (idx 10)
                const lancer = isMarked(row[10]);

                students.push({
                    id: crypto.randomUUID(),
                    excelId: parseInt(colA),
                    name: studentName,
                    institution: schoolName,
                    className: currentClass || "Classe Inconnue",
                    gender: gender,
                    importedBy: importedBy || 'unknown',
                    status: 'present', // Default status
                    repechage: { // Default repechage
                        course: false,
                        saut: false,
                        lancer: false,
                        gym: false
                    },
                    exemptions: { // Default exemptions
                        course: false,
                        saut: false,
                        lancer: false,
                        gym: false
                    },
                    absences: { // Default absences
                        course: false,
                        saut: false,
                        lancer: false,
                        gym: false
                    },
                    assignedSports: {
                        course,
                        saut,
                        lancer
                    },
                    performance: {
                        course: 0,
                        saut: 0,
                        sautTrials: [0, 0, 0], // Initialize 3 trials
                        lancer: 0,
                        lancerTrials: [0, 0, 0], // Initialize 3 trials
                        gymnastics: 0, // Initialisé à 0
                        gymObservation: ''
                    },
                    scores: {}
                });
            }
        }

        resolve(students);

      } catch (error) {
        console.error("Error parsing Excel:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

const isMarked = (cellValue: any): boolean => {
    if (!cellValue) return false;
    const v = String(cellValue).toLowerCase().trim();
    return v === 'x' || v === '*';
}
