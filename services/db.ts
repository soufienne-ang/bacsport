
import { Student, GradingConfig, CompetitionCategory, GradingHistoryEntry, AuditLog, GlobalSettings } from '../types';
import { INITIAL_BAREME, INITIAL_CATEGORIES } from '../constants';

// Clés de stockage
const KEY_STUDENTS = 'bac_sport_students';
const KEY_CONFIG = 'bac_sport_config';
const KEY_CATEGORIES = 'bac_sport_categories';
const KEY_HISTORY = 'bac_sport_config_history';
const KEY_AUDIT = 'bac_sport_audit';
const KEY_SETTINGS = 'bac_sport_settings';

// URL du logo par défaut (Ministère JS)
const DEFAULT_LOGO = "https://upload.wikimedia.org/wikipedia/commons/e/e5/Logo_minist%C3%A8re_de_la_jeunesse_et_des_sports_-_Tunisie.png";

/**
 * Fonction utilitaire pour sauvegarder en toute sécurité dans localStorage
 * avec gestion des erreurs de quota
 */
const safeSave = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e instanceof DOMException && e.code === 22) {
            console.error(`LocalStorage quota exceeded for key: ${key}`);
            // Try to clear old audit logs to free up space
            try {
                const logs = db.getAuditLogs();
                if (logs.length > 500) {
                    const recentLogs = logs.slice(0, 100);
                    localStorage.setItem(KEY_AUDIT, JSON.stringify(recentLogs));
                    // Retry the original save
                    localStorage.setItem(key, value);
                    return true;
                }
            } catch (innerError) {
                console.error('Failed to free storage space', innerError);
            }
            return false;
        }
        console.error(`Failed to save to localStorage: ${e}`);
        return false;
    }
};

// Service DB simulant une base de données locale persistante
export const db = {
    // --- LOADERS ---
    getStudents: (): Student[] => {
        try {
            const data = localStorage.getItem(KEY_STUDENTS);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    getConfig: (): GradingConfig => {
        try {
            const data = localStorage.getItem(KEY_CONFIG);
            return data ? { ...INITIAL_BAREME, ...JSON.parse(data) } : INITIAL_BAREME;
        } catch { return INITIAL_BAREME; }
    },

    getCategories: (): CompetitionCategory[] => {
        try {
            const data = localStorage.getItem(KEY_CATEGORIES);
            return data ? JSON.parse(data) : INITIAL_CATEGORIES;
        } catch { return INITIAL_CATEGORIES; }
    },

    getHistory: (): GradingHistoryEntry[] => {
        try {
            const data = localStorage.getItem(KEY_HISTORY);
            if (data) return JSON.parse(data);
            return [{
                version: 1,
                timestamp: Date.now(),
                author: 'System',
                config: INITIAL_BAREME,
                description: 'Initial Import (2011/2012)'
            }];
        } catch { return []; }
    },

    getAuditLogs: (): AuditLog[] => {
        try {
            const data = localStorage.getItem(KEY_AUDIT);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    },

    getSettings: (): GlobalSettings => {
        try {
            const data = localStorage.getItem(KEY_SETTINGS);
            const parsed = data ? JSON.parse(data) : {};
            return {
                regionName: parsed.regionName || 'الوزارة',
                sessionMonth: parsed.sessionMonth || 'جوان',
                sessionYear: parsed.sessionYear || new Date().getFullYear(),
                logoUrl: parsed.logoUrl || DEFAULT_LOGO
            };
        } catch { return { regionName: 'الوزارة', sessionMonth: 'جوان', sessionYear: new Date().getFullYear(), logoUrl: DEFAULT_LOGO }; }
    },

    // --- SAVERS ---
    saveStudents: (students: Student[]) => {
        safeSave(KEY_STUDENTS, JSON.stringify(students));
    },

    saveConfig: (config: GradingConfig) => {
        safeSave(KEY_CONFIG, JSON.stringify(config));
    },

    saveCategories: (cats: CompetitionCategory[]) => {
        safeSave(KEY_CATEGORIES, JSON.stringify(cats));
    },

    saveHistory: (hist: GradingHistoryEntry[]) => {
        safeSave(KEY_HISTORY, JSON.stringify(hist));
    },

    saveSettings: (settings: GlobalSettings) => {
        safeSave(KEY_SETTINGS, JSON.stringify(settings));
    },

    // --- AUDIT ---
    logAction: (user: string, action: string, details: string) => {
        const logs = db.getAuditLogs();
        const newLog: AuditLog = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
            timestamp: Date.now(),
            user,
            action,
            details
        };
        // Garder les 1000 derniers logs
        const updatedLogs = [newLog, ...logs].slice(0, 1000);
        safeSave(KEY_AUDIT, JSON.stringify(updatedLogs));
    },

    // --- DANGER ZONE ---
    /**
     * Supprime toutes les données métier de l'application.
     * Conserve la sécurité (mot de passe) et les paramètres globaux (région).
     * Crée un nouveau log d'audit post-reset (l'historique précédent est perdu).
     */
    clearAllData: (user: string) => {
        try {
            // Sauvegarde temporaire des clés de sécurité et settings UNIQUEMENT
            const authHash = localStorage.getItem('bac_sport_auth_hash');
            const authUser = localStorage.getItem('bac_sport_auth_username');
            const recovery = localStorage.getItem('bac_sport_auth_recovery');
            const settings = localStorage.getItem(KEY_SETTINGS);
            const authSalt = localStorage.getItem('bac_sport_auth_salt');
            
            // Sauvegarde المستخدمين (لا تحذفهم عند مسح قاعدة البيانات)
            const users = localStorage.getItem('bac_sport_users');
            const currentUser = localStorage.getItem('bac_sport_current_user');
            const accessToken = localStorage.getItem('bac_sport_access_token');
            
            // 1. SUPPRESSION TOTALE (NUCLEAR OPTION)
            // On vide tout le localStorage pour être sûr qu'aucune donnée ne traîne
            localStorage.clear();

            // 2. Restauration Sécurité et Settings
            if (authHash) localStorage.setItem('bac_sport_auth_hash', authHash);
            if (authUser) localStorage.setItem('bac_sport_auth_username', authUser);
            if (recovery) localStorage.setItem('bac_sport_auth_recovery', recovery);
            if (settings) localStorage.setItem(KEY_SETTINGS, settings);
            if (authSalt) localStorage.setItem('bac_sport_auth_salt', authSalt);
            
            // 3. استعادة المستخدمين (لا تحذفهم)
            if (users) localStorage.setItem('bac_sport_users', users);
            if (currentUser) localStorage.setItem('bac_sport_current_user', currentUser);
            if (accessToken) localStorage.setItem('bac_sport_access_token', accessToken);

            // 4. Initialisation d'un nouveau log d'audit post-reset
            const initLog: AuditLog = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
                timestamp: Date.now(),
                user: user,
                action: 'DB_RESET',
                details: 'Réinitialisation complète de la base de données (Factory Reset).'
            };
            localStorage.setItem(KEY_AUDIT, JSON.stringify([initLog]));
            
            return true;
        } catch (e) {
            console.error("Error clearing data", e);
            return false;
        }
    }
};
