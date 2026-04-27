
import { GradingConfig, Gender, SportType, BaremeRow, CompetitionCategory, UserDelegationRole } from './types';

export const GOVERNORATES = [
  { id: 'ariana', name: 'أريانة' },
  { id: 'ben_arous', name: 'بن عروس' },
  { id: 'bizerte', name: 'بنزرت' },
  { id: 'beja', name: 'باجة' },
  { id: 'gabes', name: 'قابس' },
  { id: 'gafsa', name: 'قفصة' },
  { id: 'jendouba', name: 'جندوبة' },
  { id: 'kairouan', name: 'القيروان' },
  { id: 'kasserine', name: 'القصرين' },
  { id: 'kebili', name: 'قبي' },
  { id: 'kef', name: 'الكاف' },
  { id: 'mahdia', name: 'المهدية' },
  { id: 'manouba', name: 'منوبة' },
  { id: 'medenine', name: 'مدنين' },
  { id: 'monastir', name: 'المنستير' },
  { id: 'nabeul', name: 'نابل' },
  { id: 'sfax', name: 'صفاقس' },
  { id: 'sidi_bouzid', name: 'سيدي بوزيد' },
  { id: 'siliana', name: 'سليانة' },
  { id: 'sousse', name: 'سوسة' },
  { id: 'tataouine', name: 'تطاوين' },
  { id: 'tozeur', name: 'توزر' },
  { id: 'tunis', name: 'تونس' },
  { id: 'zaghouan', name: 'زغوان' },
] as const;

export const DELEGATION_ROLES: { value: UserDelegationRole; label: string }[] = [
  { value: 'director', label: 'مسؤول' },
  { value: 'operator', label: 'مشغل' },
  { value: 'inspector', label: 'متفقد' },
];

export const DELEGATION_ROLE_PERMISSIONS: Record<UserDelegationRole, string[]> = {
  director: [
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
  ],
  inspector: [
    'students:view',
    'grading:view',
    'reports:view', 'reports:export'
  ]
};

// ملاحظة: تم استخراج هذه البيانات من الجداول الرسمية لوزارة الشباب والرياضة 2011/2012
const NOTES = [20, 19.5, 19, 18.5, 18, 17.5, 17, 16.5, 16, 15.5, 15, 14.5, 14, 13.5, 13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

const createScale = (perfList: number[]): BaremeRow[] => {
    return NOTES.map((note, idx) => ({
        performance: perfList[idx],
        score: note
    }));
};

export const INITIAL_BAREME: GradingConfig = {
  [SportType.Course1]: { // 60m
    [Gender.Male]: createScale([7.5, 7.6, 7.7, 7.8, 7.9, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.0, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.0, 11.1, 11.2, 11.3, 11.4]),
    [Gender.Female]: createScale([9.0, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.0, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.0, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9])
  },
  [SportType.Course2]: { // 1000m (G) / 600m (F)
    [Gender.Male]: createScale([2.54, 2.56, 2.58, 3.00, 3.02, 3.04, 3.06, 3.08, 3.10, 3.12, 3.14, 3.16, 3.18, 3.20, 3.22, 3.24, 3.26, 3.28, 3.30, 3.32, 3.34, 3.36, 3.38, 3.40, 3.42, 3.44, 3.46, 3.48, 3.50, 3.52, 3.54, 3.56, 3.58, 4.00, 4.02, 4.04, 4.06, 4.08, 4.10, 4.12]),
    [Gender.Female]: createScale([2.06, 2.08, 2.10, 2.12, 2.14, 2.16, 2.18, 2.20, 2.22, 2.24, 2.26, 2.28, 2.30, 2.32, 2.34, 2.36, 2.38, 2.40, 2.42, 2.44, 2.46, 2.48, 2.50, 2.52, 2.54, 2.56, 2.58, 3.00, 3.02, 3.04, 3.06, 3.08, 3.10, 3.12, 3.14, 3.16, 3.18, 3.20, 3.22, 3.24])
  },
  [SportType.Course3]: { // حواجز/تقني - Placeholder using Course1 logic
    [Gender.Male]: createScale([14.0, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 15.0, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 16.0, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 17.0, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9]),
    [Gender.Female]: createScale([16.0, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 17.0, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 18.0, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 19.0, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9])
  },
  [SportType.Saut1]: { // Hauteur
    [Gender.Male]: createScale([1.60, 1.57, 1.55, 1.52, 1.50, 1.47, 1.45, 1.42, 1.40, 1.37, 1.35, 1.32, 1.30, 1.27, 1.25, 1.22, 1.20, 1.17, 1.15, 1.12, 1.10, 1.08, 1.06, 1.04, 1.02, 1.00, 0.98, 0.96, 0.94, 0.92, 0.90, 0.88, 0.86, 0.84, 0.82, 0.80, 0.78, 0.76, 0.74, 0.72]),
    [Gender.Female]: createScale([1.30, 1.27, 1.25, 1.22, 1.20, 1.17, 1.15, 1.12, 1.10, 1.07, 1.05, 1.02, 1.00, 0.97, 0.95, 0.92, 0.90, 0.87, 0.85, 0.82, 0.80, 0.78, 0.76, 0.74, 0.72, 0.70, 0.68, 0.66, 0.64, 0.62, 0.60, 0.58, 0.56, 0.54, 0.52, 0.50, 0.48, 0.46, 0.44, 0.42])
  },
  [SportType.Saut2]: { // Longueur
    [Gender.Male]: createScale([5.50, 5.40, 5.30, 5.20, 5.10, 5.00, 4.90, 4.80, 4.70, 4.60, 4.50, 4.40, 4.35, 4.30, 4.25, 4.20, 4.15, 4.10, 4.05, 4.00, 3.95, 3.90, 3.85, 3.80, 3.75, 3.70, 3.65, 3.60, 3.55, 3.50, 3.45, 3.40, 3.35, 3.30, 3.25, 3.20, 3.15, 3.10, 3.05, 3.00]),
    [Gender.Female]: createScale([4.20, 4.10, 4.00, 3.90, 3.80, 3.75, 3.70, 3.65, 3.60, 3.55, 3.50, 3.45, 3.35, 3.30, 3.25, 3.20, 3.15, 3.10, 3.05, 3.00, 2.90, 2.85, 2.80, 2.75, 2.70, 2.65, 2.60, 2.55, 2.50, 2.45, 2.40, 2.35, 2.30, 2.25, 2.20, 2.15, 2.10, 2.05, 2.00, 1.95])
  },
  [SportType.Saut3]: { // Triple Saut (T. Saut)
    [Gender.Male]: createScale([11.00, 10.90, 10.80, 10.70, 10.60, 10.50, 10.40, 10.30, 10.20, 10.10, 10.00, 9.90, 9.80, 9.70, 9.60, 9.50, 9.40, 9.30, 9.20, 9.10, 9.00, 8.90, 8.80, 8.70, 8.60, 8.50, 8.40, 8.30, 8.20, 8.10, 8.00, 7.95, 7.90, 7.85, 7.80, 7.75, 7.70, 7.65, 7.60, 7.55]),
    [Gender.Female]: createScale([9.00, 8.90, 8.80, 8.70, 8.60, 8.50, 8.40, 8.30, 8.20, 8.10, 8.00, 7.90, 7.80, 7.70, 7.60, 7.50, 7.40, 7.30, 7.20, 7.10, 7.00, 6.90, 6.80, 6.70, 6.60, 6.50, 6.40, 6.30, 6.20, 6.10, 6.00, 5.90, 5.80, 5.70, 5.60, 5.50, 5.40, 5.30, 5.20, 5.10])
  },
  [SportType.Lancer]: { // Poids (5kg M / 3kg F)
    [Gender.Male]: createScale([11.50, 11.20, 10.90, 10.60, 10.30, 10.00, 9.70, 9.40, 9.10, 8.80, 8.50, 8.30, 8.20, 8.10, 8.00, 7.90, 7.80, 7.70, 7.60, 7.50, 7.40, 7.30, 7.20, 7.10, 7.00, 6.90, 6.80, 6.70, 6.60, 6.50, 6.40, 6.20, 6.00, 5.80, 5.60, 5.40, 5.20, 5.00, 4.80, 4.60]),
    [Gender.Female]: createScale([9.80, 9.50, 9.20, 8.90, 8.60, 8.30, 8.00, 7.70, 7.40, 7.10, 6.90, 6.70, 6.50, 6.30, 6.10, 5.90, 5.70, 5.50, 5.30, 5.10, 5.00, 4.90, 4.80, 4.70, 4.60, 4.50, 4.40, 4.30, 4.20, 4.10, 4.00, 3.90, 3.80, 3.70, 3.60, 3.50, 3.40, 3.30, 3.20, 3.00])
  }
};

export const INITIAL_CATEGORIES: CompetitionCategory[] = [
    { id: 'cat_course', name: 'العدو (Courses)', sports: [SportType.Course1, SportType.Course2, SportType.Course3] },
    { id: 'cat_saut', name: 'الوثب (Sauts)', sports: [SportType.Saut1, SportType.Saut2, SportType.Saut3] },
    { id: 'cat_lancer', name: 'الرمي (Lancers)', sports: [SportType.Lancer] }
];

export const SPORT_TRANSLATIONS: Record<string, string> = {
    [SportType.Course1]: '60م',
    [SportType.Course2]: 'تحمل',
    [SportType.Course3]: 'حواجز/تقني',
    [SportType.Saut1]: 'وثب عالي',
    [SportType.Saut2]: 'وثب طويل',
    [SportType.Saut3]: 'وثب ثلاثي',
    [SportType.Lancer]: 'رمي الجلة'
};

export const GENDER_TRANSLATIONS: Record<string, string> = {
    [Gender.Male]: 'ذكور',
    [Gender.Female]: 'إناث'
};
