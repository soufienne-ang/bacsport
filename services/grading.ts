/**
 * Logique métier complète pour gestion des dispenses et absences
 * Toutes les libellés sont en arabe comme demandé
 */

import { Student, StudentStatus } from '../types';

export const LABELS = {
  DISPENSE: 'dispense',
  ABSENT: 'absent',
  TOTAL_DISPENSE_VALUE: 99.99,
};

/**
 * Détermine l'état d'une épreuve pour un étudiant
 * Retourne: "numérique" | "dispense" | "absent" | "vide"
 */
export const getPerformanceState = (
  student: Student,
  sportType: 'course' | 'saut' | 'lancer' | 'gym'
): 'numeric' | 'dispense' | 'absent' | 'empty' => {
  // 1. Vérifier l'absence totale
  if (student.status === 'absent') {
    return 'absent';
  }

  // 2. Vérifier la dispense totale
  if (student.status === 'exempt') {
    return 'dispense';
  }

  // 3. Vérifier les exemptions partielles
  const currentExemptions = student.exemptions || { course: false, saut: false, lancer: false, gym: false };
  if (currentExemptions[sportType as keyof typeof currentExemptions]) {
    return 'dispense';
  }

  // 4. Vérifier si l'élève est en repechage (rattrapage) pour cette catégorie
  const currentRepechage = student.repechage || { course: false, saut: false, lancer: false, gym: false };
  if (currentRepechage[sportType as keyof typeof currentRepechage]) {
    return 'absent';
  }

  // 5. Vérifier si une note numérique existe
  const perf = student.performance;
  let hasNumericPerformance = false;

  if (sportType === 'course' && perf.course !== undefined && perf.course > 0) {
    hasNumericPerformance = true;
  } else if (sportType === 'gym' && perf.gymnastics !== undefined && perf.gymnastics > 0) {
    hasNumericPerformance = true;
  } else if ((sportType === 'saut' || sportType === 'lancer') && perf[sportType] !== undefined && perf[sportType]! > 0) {
    hasNumericPerformance = true;
  }

  if (hasNumericPerformance) {
    return 'numeric';
  }

  return 'empty';
};

/**
 * Affiche la valeur d'une épreuve pour la liste 2
 */
export const formatPerformanceDisplay = (
  student: Student,
  sportType: 'course' | 'saut' | 'lancer' | 'gym',
  score?: number
): string => {
  const state = getPerformanceState(student, sportType);

  if (state === 'dispense') {
    return '99.99';
  }
  if (state === 'absent') {
    return 'absent';
  }
  if (state === 'numeric' && score !== undefined) {
    return score.toFixed(2);
  }

  return ''; // Vide
};

/**
 * Interface pour les données calculées d'une ligne
 */
export interface CalculatedRow {
  totalValue: number | null;
  averageValue: number | null;
  totalDisplay: string;
  averageDisplay: string;
  numericCount: number; // Nombre d'épreuves numériques
}

/**
 * Calcule le total et la moyenne pour un étudiant
 * Règle 5: Ignorer dispense et absent, moyenne sur au moins 2 notes numériques
 */
export const calculateTotalAndAverage = (
  student: Student,
  scores: { course?: number; saut?: number; lancer?: number; gym?: number }
): CalculatedRow => {
  // Cas 1: Absence totale ou dispense totale
  if (student.status === 'absent' || student.status === 'exempt') {
    return {
      totalValue: null,
      averageValue: null,
      totalDisplay: student.status === 'absent' ? 'absent' : '99.99',
      averageDisplay: student.status === 'absent' ? 'absent' : '99.99',
      numericCount: 0,
    };
  }

  // Collecter les scores numériques (ignorer dispense/absent)
  const numericScores: number[] = [];

  const courseState = getPerformanceState(student, 'course');
  if (courseState === 'numeric' && scores.course !== undefined) {
    numericScores.push(scores.course);
  }

  const sautState = getPerformanceState(student, 'saut');
  if (sautState === 'numeric' && scores.saut !== undefined) {
    numericScores.push(scores.saut);
  }

  const lancerState = getPerformanceState(student, 'lancer');
  if (lancerState === 'numeric' && scores.lancer !== undefined) {
    numericScores.push(scores.lancer);
  }

  const gymState = getPerformanceState(student, 'gym');
  if (gymState === 'numeric' && scores.gym !== undefined) {
    numericScores.push(scores.gym);
  }

  // Calculer moyenne uniquement s'il y a au moins 2 notes
  if (numericScores.length >= 2) {
    const sum = numericScores.reduce((a, b) => a + b, 0);
    const average = sum / numericScores.length;

    return {
      totalValue: sum,
      averageValue: average,
      totalDisplay: sum.toFixed(2),
      averageDisplay: average.toFixed(2),
      numericCount: numericScores.length,
    };
  }

  // Moins de 2 notes: pas de calcul
  return {
    totalValue: null,
    averageValue: null,
    totalDisplay: '',
    averageDisplay: '',
    numericCount: numericScores.length,
  };
};

/**
 * Détermine la note et observation finales
 * Règle 6: Propagation vers liste finale
 */
export interface FinalResult {
  note: string | number;
  observation: string;
  isDropdown: boolean; // True si c'est une liste déroulante
  noteOptions?: string[];
  observationOptions?: string[];
}

export const calculateFinalResult = (
  calculatedRow: CalculatedRow,
  student: StudentStatus
): FinalResult => {
  // Si dispense totale
  if (student === 'exempt') {
    return {
      note: 99.99,
      observation: 'dispense',
      isDropdown: false,
    };
  }

  // Si absence totale
  if (student === 'absent') {
    return {
      note: 'absent',
      observation: 'absent',
      isDropdown: false,
    };
  }

  // Si moyenne numérique existe
  if (calculatedRow.averageValue !== null) {
    // Si la moyenne contient 99.99 (dispense)
    if (calculatedRow.averageDisplay === '99.99') {
      return {
        note: 99.99,
        observation: 'dispense',
        isDropdown: false,
      };
    }
    // Si la moyenne contient 'absent'
    if (calculatedRow.averageDisplay === 'absent') {
      return {
        note: 'absent',
        observation: 'absent',
        isDropdown: false,
      };
    }
    // Sinon, note numérique normale
    return {
      note: calculatedRow.averageValue,
      observation: '',
      isDropdown: false,
    };
  }

  // Si pas de moyenne: listes déroulantes
  return {
    note: 'absent', // Valeur par défaut
    observation: 'absent',
    isDropdown: true,
    noteOptions: ['absent', '99.99'],
    observationOptions: ['absent', 'dispense'],
  };
};

/**
 * Interface pour les statistiques
 */
export interface DayStatistics {
  totalStudents: number;
  totalDispenseCount: number; // Élèves avec dispense totale
  totalAbsentCount: number; // Élèves avec absence totale
  partialDispenseCount: number; // Épreuves avec dispense partielle
  partialAbsentCount: number; // Épreuves avec absence partielle
  calculatedAverageCount: number; // Élèves avec moyenne calculée (≥ 2 notes)
  overallAverage: number | null; // Moyenne générale
  distribution: {
    veryLow: number; // [0–5[
    low: number; // [5–10[
    medium: number; // [10–12[
    mediumHigh: number; // [12–14[
    high: number; // [14–16[
    veryHigh: number; // [16–20]
  };
}

/**
 * Calcule les statistiques du jour
 */
export const calculateStatistics = (students: Student[]): DayStatistics => {
  let totalDispenseCount = 0;
  let totalAbsentCount = 0;
  let partialDispenseCount = 0;
  let partialAbsentCount = 0;
  let calculatedAverageCount = 0;
  const averages: number[] = [];
  const distribution = {
    veryLow: 0,
    low: 0,
    medium: 0,
    mediumHigh: 0,
    high: 0,
    veryHigh: 0,
  };

  for (const student of students) {
    // Compter dispenses/absences totales
    if (student.status === 'exempt') {
      totalDispenseCount++;
    } else if (student.status === 'absent') {
      totalAbsentCount++;
    }

    // Compter les dispenses/absences partielles
    const currentExemptions = student.exemptions || { course: false, saut: false, lancer: false, gym: false };
    const currentRepechage = student.repechage || { course: false, saut: false, lancer: false, gym: false };

    Object.values(currentExemptions).forEach(v => { if (v) partialDispenseCount++; });
    Object.values(currentRepechage).forEach(v => { if (v) partialAbsentCount++; });

    // Calculer moyenne pour statistiques
    const calculated = calculateTotalAndAverage(student, student.scores);
    if (calculated.averageValue !== null && calculated.numericCount >= 2) {
      calculatedAverageCount++;
      averages.push(calculated.averageValue);

      // Classer dans distribution
      const avg = calculated.averageValue;
      if (avg < 5) distribution.veryLow++;
      else if (avg < 10) distribution.low++;
      else if (avg < 12) distribution.medium++;
      else if (avg < 14) distribution.mediumHigh++;
      else if (avg < 16) distribution.high++;
      else distribution.veryHigh++;
    }
  }

  const overallAverage = averages.length > 0 ? averages.reduce((a, b) => a + b, 0) / averages.length : null;

  return {
    totalStudents: students.length,
    totalDispenseCount,
    totalAbsentCount,
    partialDispenseCount,
    partialAbsentCount,
    calculatedAverageCount,
    overallAverage,
    distribution,
  };
};
