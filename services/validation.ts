/**
 * Validation utilities for performance data and student inputs
 */

export const ValidationErrors = {
  INVALID_TIME: 'الوقت يجب أن يكون رقماً موجباً',
  INVALID_DISTANCE: 'المسافة يجب أن تكون رقماً موجباً',
  INVALID_SCORE: 'النقاط يجب أن تكون بين 0 و 20',
  INVALID_NAME: 'الاسم يجب أن يكون نصاً صحيحاً',
  INVALID_CLASS: 'رمز الفصل غير صحيح',
  EMPTY_FIELD: 'هذا الحقل مطلوب',
};

/**
 * Valide une performance temporelle (en secondes)
 */
export const validateTimePerformance = (value: number | undefined): { valid: boolean; error?: string } => {
  if (value === undefined || value === null) {
    return { valid: true }; // Optionnel
  }
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { valid: false, error: ValidationErrors.INVALID_TIME };
  }
  if (value > 1000) {
    // Limite raisonnable : pas plus de ~16 minutes
    return { valid: false, error: 'الوقت أكبر من المتوقع (> 1000 ثانية)' };
  }
  return { valid: true };
};

/**
 * Valide une performance de distance (en mètres)
 */
export const validateDistancePerformance = (value: number | undefined): { valid: boolean; error?: string } => {
  if (value === undefined || value === null) {
    return { valid: true }; // Optionnel
  }
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { valid: false, error: ValidationErrors.INVALID_DISTANCE };
  }
  if (value > 100) {
    // Limite : pas plus de 100 mètres (déraisonnable)
    return { valid: false, error: 'المسافة أكبر من المتوقع (> 100 متر)' };
  }
  return { valid: true };
};

/**
 * Valide un score (0-20)
 */
export const validateScore = (value: number | undefined): { valid: boolean; error?: string } => {
  if (value === undefined || value === null) {
    return { valid: true }; // Optionnel
  }
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: ValidationErrors.INVALID_SCORE };
  }
  if (value < 0 || value > 20) {
    return { valid: false, error: ValidationErrors.INVALID_SCORE };
  }
  return { valid: true };
};

/**
 * Valide un nom d'étudiant
 */
export const validateStudentName = (name: string): { valid: boolean; error?: string } => {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: ValidationErrors.EMPTY_FIELD };
  }
  if (name.length > 200) {
    return { valid: false, error: 'الاسم طويل جداً' };
  }
  return { valid: true };
};

/**
 * Valide un code de classe
 */
export const validateClassName = (className: string): { valid: boolean; error?: string } => {
  if (!className || typeof className !== 'string' || className.trim().length === 0) {
    return { valid: false, error: ValidationErrors.EMPTY_FIELD };
  }
  if (className.length > 100) {
    return { valid: false, error: 'رمز الفصل طويل جداً' };
  }
  return { valid: true };
};

/**
 * Valide une institution
 */
export const validateInstitution = (institution: string): { valid: boolean; error?: string } => {
  if (!institution || typeof institution !== 'string' || institution.trim().length === 0) {
    return { valid: false, error: ValidationErrors.EMPTY_FIELD };
  }
  if (institution.length > 200) {
    return { valid: false, error: 'اسم المؤسسة طويل جداً' };
  }
  return { valid: true };
};

/**
 * Valide une entrée pour les essais (trials) - doit être un tableau de 3 nombres
 */
export const validateTrials = (trials: any): { valid: boolean; error?: string } => {
  if (!Array.isArray(trials) || trials.length !== 3) {
    return { valid: false, error: 'يجب تقديم 3 محاولات بالضبط' };
  }
  for (const trial of trials) {
    if (typeof trial !== 'number' || isNaN(trial) || trial < 0) {
      return { valid: false, error: 'كل محاولة يجب أن تكون رقماً موجباً' };
    }
  }
  return { valid: true };
};
