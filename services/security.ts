// Service de sécurité client-side pour la gestion du barème
// Gestion de l'authentification et des utilisateurs

import { User, UserRole, UserDelegationRole, Permission, ROLE_DEFAULT_PERMISSIONS } from '../types';

export type { User, Permission } from '../types';
export { ROLE_DEFAULT_PERMISSIONS } from '../types';

const STORAGE_KEY_USERS = 'bac_sport_users';
const STORAGE_KEY_CURRENT_USER = 'bac_sport_current_user';
const STORAGE_KEY_ATTEMPTS = 'bac_sport_auth_attempts';
const STORAGE_KEY_LOCKOUT = 'bac_sport_auth_lockout';

// Global base salt for context (combined with per-password salt)
const BASE_SALT = "BAC_SPORT_TUNISIE_2026_SECURE_";

/**
 * Génère une salt aléatoire pour renforcer le hachage
 */
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Génère un hash SHA-256 pour le mot de passe avec salt amélioré
 */
const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(BASE_SALT + salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Récupère la liste des utilisateurs
 */
const getUsers = (): User[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_USERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * Sauvegarde la liste des utilisateurs
 */
const saveUsers = (users: User[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    return true;
  } catch (e) {
    console.error('Failed to save users', e);
    return false;
  }
};

/**
 * Vérifie si le système a été initialisé (au moins un utilisateur existe)
 */
export const isSystemConfigured = (): boolean => {
  const users = getUsers();
  return users.length > 0;
};

/**
 * Configure le premier utilisateur administrateur (compatibilité ascendante)
 */
export const setupAccount = async (
  username: string,
  password: string,
  question: string,
  answer: string,
  role: 'superadmin' | 'admin' = 'superadmin'
): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  if (users.length > 0) {
    return { success: false, error: 'النظام مهيأ مسبقاً' };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const answerHash = await hashPassword(answer.toLowerCase().trim(), salt);

  const adminUser: User = {
    id: role === 'superadmin' ? 'superadmin-' + Date.now() : 'admin-' + Date.now(),
    username,
    passwordHash,
    salt,
    role,
    createdAt: Date.now(),
    isActive: true,
    recoveryQuestion: question,
    recoveryAnswerHash: answerHash,
  };

  users.push(adminUser);
  saveUsers(users);
  return { success: true };
};

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export const hasPermission = (
  user: Omit<User, 'passwordHash' | 'recoveryAnswerHash'> | null,
  permission: Permission
): boolean => {
  if (!user) return false;
  
  const permissions = user.permissions || ROLE_DEFAULT_PERMISSIONS[user.role];
  return permissions.includes(permission);
};

/**
 * Récupère les permissions d'un utilisateur
 */
export const getUserPermissions = (
  user: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>
): Permission[] => {
  return user.permissions || ROLE_DEFAULT_PERMISSIONS[user.role];
};

/**
 * Crée un nouvel utilisateur (réservé aux admins)
 */
export const createUser = async (
  username: string,
  password: string,
  role: UserRole,
  recoveryQuestion: string,
  recoveryAnswer: string,
  customPermissions?: Permission[],
  governorate?: string,
  delegationRole?: UserDelegationRole
): Promise<{ success: boolean; user?: User; error?: string }> => {
  const users = getUsers();

  // Vérifier si le nom d'utilisateur existe déjà
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
  }

  if (password.length < 4) {
    return { success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const answerHash = await hashPassword(recoveryAnswer.toLowerCase().trim(), salt);

  const newUser: User = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
    username,
    passwordHash,
    salt,
    role,
    permissions: customPermissions,
    createdAt: Date.now(),
    isActive: true,
    recoveryQuestion,
    recoveryAnswerHash: answerHash,
    governorate,
    delegationRole,
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true, user: newUser };
};

/**
 * Met à jour un utilisateur existant
 */
export const updateUser = (
  userId: string,
  updates: Partial<Pick<User, 'username' | 'role' | 'isActive' | 'permissions' | 'governorate' | 'delegationRole'>>
): { success: boolean; user?: User; error?: string } => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  // Vérifier l'unicité du nom d'utilisateur si modifié
  if (updates.username) {
    const exists = users.some((u, i) => i !== userIndex && u.username.toLowerCase() === updates.username!.toLowerCase());
    if (exists) {
      return { success: false, error: 'اسم المستخدم موجود مسبقاً' };
    }
  }

  users[userIndex] = { ...users[userIndex], ...updates };
  saveUsers(users);
  return { success: true, user: users[userIndex] };
};

/**
 * Change le mot de passe d'un utilisateur
 */
export const changeUserPassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  // Vérifier l'ancien mot de passe
  const oldHash = await hashPassword(oldPassword, user.salt);
  if (oldHash !== user.passwordHash) {
    return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
  }

  if (newPassword.length < 4) {
    return { success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' };
  }

  // Mettre à jour avec le nouveau hash
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  user.passwordHash = newHash;
  user.salt = newSalt;

  saveUsers(users);
  return { success: true };
};

/**
 * Réinitialise le mot de passe via la question de récupération
 */
export const resetPasswordViaRecovery = async (
  username: string,
  answer: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !user.isActive) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  const answerHash = await hashPassword(answer.toLowerCase().trim(), user.salt);
  if (answerHash !== user.recoveryAnswerHash) {
    return { success: false, error: 'الإجابة غير صحيحة' };
  }

  if (newPassword.length < 4) {
    return { success: false, error: 'كلمة المرور قصيرة جداً' };
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  user.passwordHash = newHash;
  user.salt = newSalt;
  saveUsers(users);
  return { success: true };
};

/**
 * Met à jour les informations de récupération d'un utilisateur
 */
export const updateUserRecovery = async (
  userId: string,
  question: string,
  answer: string
): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  const answerHash = await hashPassword(answer.toLowerCase().trim(), user.salt);
  user.recoveryQuestion = question;
  user.recoveryAnswerHash = answerHash;

  saveUsers(users);
  return { success: true };
};

/**
 * Supprime un utilisateur (ne peut pas supprimer le dernier admin)
 */
export const deleteUser = (userId: string): { success: boolean; error?: string } => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);

  if (!user) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  // Vérifier qu'il reste au moins un admin actif
  const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
  if (user.role === 'admin' && adminCount <= 1) {
    return { success: false, error: 'يجب أن يبقى مسؤول واحد على الأقل' };
  }

  const filteredUsers = users.filter(u => u.id !== userId);
  saveUsers(filteredUsers);
  return { success: true };
};

/**
 * Récupère tous les utilisateurs (sans les hashes de mot de passe pour la sécurité)
 */
export const getAllUsers = (): Omit<User, 'passwordHash' | 'recoveryAnswerHash'>[] => {
  const users = getUsers();
  return users.map(({ passwordHash, recoveryAnswerHash, ...rest }) => rest);
};

/**
 * Récupère un utilisateur par son ID
 */
export const getUserById = (userId: string): Omit<User, 'passwordHash' | 'recoveryAnswerHash'> | undefined => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    const { passwordHash, recoveryAnswerHash, ...rest } = user;
    return rest;
  }
  return undefined;
};

/**
 * Récupère la question de récupération d'un utilisateur
 */
export const getRecoveryQuestion = (username: string): string | null => {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  return user?.recoveryQuestion || null;
};

/**
 * Vérifie le statut de verrouillage pour un utilisateur
 */
export const checkLockout = (username: string): { isLocked: boolean; remainingTime: number } => {
  const lockoutKey = `${STORAGE_KEY_LOCKOUT}_${username.toLowerCase()}`;
  const lockoutUntil = localStorage.getItem(lockoutKey);

  if (lockoutUntil) {
    const now = Date.now();
    const until = parseInt(lockoutUntil, 10);
    if (now < until) {
      return { isLocked: true, remainingTime: Math.ceil((until - now) / 60000) };
    } else {
      localStorage.removeItem(lockoutKey);
      localStorage.setItem(`${STORAGE_KEY_ATTEMPTS}_${username.toLowerCase()}`, '0');
    }
  }
  return { isLocked: false, remainingTime: 0 };
};

/**
 * Tente de connecter un utilisateur
 */
export const login = async (username: string, password: string): Promise<{ success: boolean; user?: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>; error?: string }> => {
  // Vérifier le verrouillage
  const lockoutStatus = checkLockout(username);
  if (lockoutStatus.isLocked) {
    return { success: false, error: `تم تجاوز عدد المحاولات المسموح بها. الرجاء الانتظار ${lockoutStatus.remainingTime} دقيقة.` };
  }

  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !user.isActive) {
    return { success: false, error: 'المستخدم غير موجود أو غير نشط' };
  }

  const inputHash = await hashPassword(password, user.salt);

  if (inputHash === user.passwordHash) {
    // Succès : Mettre à jour lastLogin et reset des tentatives
    user.lastLogin = Date.now();
    saveUsers(users);

    const attemptsKey = `${STORAGE_KEY_ATTEMPTS}_${username.toLowerCase()}`;
    const lockoutKey = `${STORAGE_KEY_LOCKOUT}_${username.toLowerCase()}`;
    localStorage.removeItem(attemptsKey);
    localStorage.removeItem(lockoutKey);

    const { passwordHash, recoveryAnswerHash, ...safeUser } = user;
    return { success: true, user: safeUser };
  } else {
    // Echec : Incrémenter les tentatives
    const attemptsKey = `${STORAGE_KEY_ATTEMPTS}_${username.toLowerCase()}`;
    const attempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10) + 1;
    localStorage.setItem(attemptsKey, attempts.toString());

    if (attempts >= 5) {
      const lockoutKey = `${STORAGE_KEY_LOCKOUT}_${username.toLowerCase()}`;
      const lockoutTime = Date.now() + 15 * 60 * 1000;
      localStorage.setItem(lockoutKey, lockoutTime.toString());
      return { success: false, error: 'تم تجميد الحساب لمدة 15 دقيقة بسبب تكرار المحاولات الخاطئة.' };
    }

    return { success: false, error: `كلمة المرور غير صحيحة. المحاولات المتبقية: ${5 - attempts}` };
  }
};

/**
 * Déconnecte l'utilisateur actuel
 */
export const logout = () => {
  localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
};

/**
 * Récupère l'utilisateur actuellement connecté
 */
export const getCurrentUser = (): Omit<User, 'passwordHash' | 'recoveryAnswerHash'> | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Définit l'utilisateur actuellement connecté
 */
export const setCurrentUser = (user: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>) => {
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
};

/**
 * Initialise le contexte de sécurité
 */
export const initSecurity = () => {
  // Nettoyer les lockouts expirés
  const users = getUsers();
  users.forEach(u => {
    checkLockout(u.username);
  });
};

/**
 * Vérifie le mot de passe de l'utilisateur actuellement connecté
 */
export const verifyPassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'لا يوجد مستخدم متصل' };
  }

  const users = getUsers();
  const user = users.find(u => u.id === currentUser.id);

  if (!user) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  const inputHash = await hashPassword(password, user.salt);
  if (inputHash === user.passwordHash) {
    return { success: true };
  }
  return { success: false, error: 'كلمة المرور غير صحيحة' };
};

/**
 * Change le mot de passe de l'utilisateur actuellement connecté
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'لا يوجد مستخدم متصل' };
  }

  return changeUserPassword(currentUser.id, currentPassword, newPassword);
};
