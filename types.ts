
export enum Gender {
  Male = 'M',
  Female = 'F'
}

export enum SportType {
  Course1 = 'Course 1 (60m)',
  Course2 = 'Course 2 (Endurance)',
  Course3 = 'Course 3 (Technique/Haies)',
  Saut1 = 'Saut 1 (Hauteur)',
  Saut2 = 'Saut 2 (Longueur)',
  Saut3 = 'Saut 3 (Triple)',
  Lancer = 'Lancer (Poids)'
}

export type StudentStatus = 'present' | 'absent' | 'exempt';

export interface Student {
  id: string; // generated uuid
  excelId: number; // The "1", "2", "3" from the excel file
  name: string;
  institution: string;
  className: string;
  gender: Gender;
  importedBy: string; // Username who imported this student
  status: StudentStatus; // Global status (Total exemption or Absence)
  repechage: { 
    course: boolean;
    saut: boolean;
    lancer: boolean;
    gym: boolean;
  };
  exemptions: { // New: Partial exemptions
    course: boolean;
    saut: boolean;
    lancer: boolean;
    gym: boolean;
  };
  absences: { // New: Partial absences (absence for one exam only)
    course: boolean;
    saut: boolean;
    lancer: boolean;
    gym: boolean;
  };
  assignedSports: {
    course?: SportType.Course1 | SportType.Course2 | SportType.Course3;
    saut?: SportType.Saut1 | SportType.Saut2 | SportType.Saut3;
    lancer?: SportType.Lancer;
  };
  performance: {
    course?: number; // Time in seconds
    
    // Jumping
    saut?: number; // The BEST performance (calculated)
    sautTrials?: [number, number, number]; // The 3 trials
    
    // Throwing
    lancer?: number; // The BEST performance (calculated)
    lancerTrials?: [number, number, number]; // The 3 trials
    
    // Gym
    gymnastics?: number; // Score out of 20
    gymObservation?: string; // Text observation
  };
  scores: {
    course?: number;
    saut?: number;
    lancer?: number;
    gym?: number;
    final?: number;
  };
}

export interface BaremeRow {
  performance: number; // The value achieved (e.g. 13.5 seconds, or 4.5 meters)
  score: number; // The note out of 20
}

export interface GradingConfig {
  [SportType.Course1]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
  [SportType.Course2]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
  [SportType.Course3]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
  [SportType.Saut1]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
  [SportType.Saut2]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
  [SportType.Saut3]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
  [SportType.Lancer]: { [Gender.Male]: BaremeRow[], [Gender.Female]: BaremeRow[] };
}

export interface CompetitionCategory {
  id: string;
  name: string;
  sports: SportType[];
}

export interface GradingHistoryEntry {
    version: number;
    timestamp: number;
    author: string;
    config: GradingConfig;
    description: string;
}

export interface AuditLog {
    id: string;
    timestamp: number;
    user: string;
    action: string;
    details: string;
}

export interface GlobalSettings {
    regionName: string; // ex: "صفاقس", "تونس", "قابس"
    sessionMonth: string; // ex: "أفريل", "جوان", "مارس"
    sessionYear: number; // ex: 2026
    logoUrl?: string; // Base64 or URL of the custom logo
}

export type UserRole = 'superadmin' | 'admin' | 'operator';

export type UserDelegationRole = 'director' | 'operator' | 'inspector';

export const DELEGATION_ROLE_LABELS: Record<UserDelegationRole, string> = {
  director: 'مسؤول',
  operator: 'مشغل',
  inspector: 'متفقد'
};

export type Permission = 
  | 'students:view'
  | 'students:create'
  | 'students:edit'
  | 'students:delete'
  | 'students:import'
  | 'grading:view'
  | 'grading:edit'
  | 'reports:view'
  | 'reports:export'
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'settings:view'
  | 'settings:edit'
  | 'config:view'
  | 'config:edit'
  | 'governorates:view'
  | 'governorates:edit'
  | 'delegations:view'
  | 'delegations:edit';

export const PERMISSION_LABELS: Record<Permission, string> = {
  'students:view': 'عرض التلاميذ',
  'students:create': 'إضافة تلاميذ',
  'students:edit': 'تعديل التلاميذ',
  'students:delete': 'حذف التلاميذ',
  'students:import': 'استيراد بيانات',
  'grading:view': 'عرض سلم التنقيط',
  'grading:edit': 'تعديل سلم التنقيط',
  'reports:view': 'عرض التقارير',
  'reports:export': 'تصدير التقارير',
  'users:view': 'عرض المستخدمين',
  'users:create': 'إضافة مستخدمين',
  'users:edit': 'تعديل المستخدمين',
  'users:delete': 'حذف مستخدمين',
  'settings:view': 'عرض الإعدادات',
  'settings:edit': 'تعديل الإعدادات',
  'config:view': 'عرض التكوين',
  'config:edit': 'تعديل التكوين',
  'governorates:view': 'عرض الولايات',
  'governorates:edit': 'تعديل الولايات',
  'delegations:view': 'عرض المندوبيات',
  'delegations:edit': 'تعديل المندوبيات',
};

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    'students:view', 'students:create', 'students:edit', 'students:delete', 'students:import',
    'grading:view', 'grading:edit',
    'reports:view', 'reports:export',
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'settings:view', 'settings:edit',
    'config:view', 'config:edit',
    'governorates:view', 'governorates:edit',
    'delegations:view', 'delegations:edit'
  ],
  admin: [
    'students:view', 'students:create', 'students:edit', 'students:delete', 'students:import',
    'grading:view', 'grading:edit',
    'reports:view', 'reports:export',
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'settings:view', 'settings:edit',
    'config:view', 'config:edit'
  ],
  operator: [
    'students:view', 'students:create', 'students:edit',
    'grading:view', 'grading:edit',
    'reports:view'
  ]
};

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'مدير عام',
  admin: 'مسؤول',
  operator: 'مشغّل'
};

export interface User {
    id: string;
    username: string;
    passwordHash: string;
    salt: string;
    role: UserRole;
    permissions?: Permission[];
    createdAt: number;
    lastLogin?: number;
    isActive: boolean;
    recoveryQuestion: string;
    recoveryAnswerHash: string;
    governorate?: string;
    delegationRole?: UserDelegationRole;
}
