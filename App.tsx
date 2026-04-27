
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ImportView from './components/ImportView';
import EntryView from './components/EntryView';
import ReportsView from './components/ReportsView';
import ConfigView from './components/ConfigView';
import DashboardView from './components/DashboardView';
import FinalResultsView from './components/FinalResultsView';
import StudentManagerView from './components/StudentManagerView';
import UserManagerView from './components/UserManagerView';
import AdminDashboardView from './components/AdminDashboardView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import { Student, GradingConfig, Gender, SportType, BaremeRow, CompetitionCategory, StudentStatus, GradingHistoryEntry, GlobalSettings, User } from './types';
import { db } from './services/db';
import { login, logout, setCurrentUser, getCurrentUser, initSecurity, isSystemConfigured } from './services/security';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUserState] = useState<Omit<User, 'passwordHash' | 'recoveryAnswerHash'> | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [preSelectedEntryParams, setPreSelectedEntryParams] = useState<{school: string, className: string} | null>(null);

  // Ref pour bloquer les sauvegardes pendant le reset
  const isResettingRef = useRef(false);

  useEffect(() => {
    initSecurity();
    const user = getCurrentUser();
    if (user && isSystemConfigured()) {
      setCurrentUserState(user);
      setIsAuthenticated(true);
    }
  }, []);

  // Initialize from DB Service
  const [students, setStudents] = useState<Student[]>(() => db.getStudents());
  const [gradingConfig, setGradingConfig] = useState<GradingConfig>(() => db.getConfig());
  const [gradingHistory, setGradingHistory] = useState<GradingHistoryEntry[]>(() => db.getHistory());
  const [categories, setCategories] = useState<CompetitionCategory[]>(() => db.getCategories());
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => db.getSettings());

  // Persistence via DB Service
  // On ajoute la condition !isResettingRef.current pour empêcher React de réécrire les données pendant le reset
  useEffect(() => { if(isAuthenticated && !isResettingRef.current) db.saveStudents(students); }, [students, isAuthenticated]);
  useEffect(() => { if(isAuthenticated && !isResettingRef.current) db.saveConfig(gradingConfig); }, [gradingConfig, isAuthenticated]);
  useEffect(() => { if(isAuthenticated && !isResettingRef.current) db.saveCategories(categories); }, [categories, isAuthenticated]);
  useEffect(() => { if(isAuthenticated && !isResettingRef.current) db.saveHistory(gradingHistory); }, [gradingHistory, isAuthenticated]);
  useEffect(() => { if(isAuthenticated && !isResettingRef.current) db.saveSettings(globalSettings); }, [globalSettings, isAuthenticated]);

  const currentVersionInfo = useMemo(() => {
      const lastEntry = gradingHistory[gradingHistory.length - 1];
      return {
          version: lastEntry ? lastEntry.version : 1,
          date: lastEntry ? new Date(lastEntry.timestamp).toLocaleDateString('fr-TN') : new Date().toLocaleDateString('fr-TN')
      };
  }, [gradingHistory]);

  const handleSaveConfig = (newConfig: GradingConfig, author: string, description: string) => {
      const nextVersion = (gradingHistory[gradingHistory.length - 1]?.version || 0) + 1;
      const newEntry: GradingHistoryEntry = {
          version: nextVersion,
          timestamp: Date.now(),
          author,
          config: newConfig,
          description
      };
      
      setGradingHistory(prev => [...prev, newEntry]);
      setGradingConfig(newConfig);
      
      db.logAction(author, 'UPDATE_CONFIG', `Mise à jour du barème vers la version ${nextVersion}: ${description}`);
  };

  const handleUpdateSettings = (newSettings: GlobalSettings) => {
      setGlobalSettings(newSettings);
      db.logAction('Admin', 'UPDATE_SETTINGS', `Modification de la région : ${newSettings.regionName}`);
  };

  const handleAppReset = () => {
      // 1. VERROUILLER IMMEDIATEMENT TOUTE SAUVEGARDE
      isResettingRef.current = true;

      // 2. Nettoyer l'interface (optionnel mais propre)
      setIsAuthenticated(false);
      setCurrentUserState(null);
      logout();
      setStudents([]);
      setGradingHistory([]);

      // 3. Vider physiquement la base de données
      const success = db.clearAllData(currentUser?.username || 'Admin');

      if (success) {
        // 4. Recharger la page
        // Utilisation de reload() standard au lieu de l'assignation de href qui peut être bloquée
        window.location.reload();
      } else {
          isResettingRef.current = false;
          alert("Erreur lors de la réinitialisation.");
      }
  };

  /**
   * دالة مطورة وشاملة لحساب العدد بناءً على سلم التنقيط
   */
  const calculateNote = (perf: number, scale: BaremeRow[]): number => {
    if (!scale || scale.length === 0 || perf <= 0) return 0;
    
    // ترتيب السلم تنازلياً حسب العدد (الأفضل أولاً)
    const sortedScale = [...scale].sort((a, b) => b.score - a.score);
    
    // تحديد نوع الرياضة: جري (توقيت أقل أفضل) أم وثب/رمي (مسافة أبعد أفضل)
    const isTimeBased = sortedScale[0].performance < sortedScale[sortedScale.length - 1].performance;

    if (isTimeBased) {
        // في الجري: التوقيت الأقل هو الأفضل
        const row = sortedScale.find(r => perf <= (r.performance + 0.001));
        return row ? row.score : sortedScale[sortedScale.length - 1].score;
    } else {
        // في الوثب والرمي: المسافة الأطول هي الأفضل
        const row = sortedScale.find(r => perf >= (r.performance - 0.001));
        if (!row) {
            const minRow = sortedScale[sortedScale.length - 1];
            // Tolérance de 0.2 pour gérer les erreurs d'arrondi mineures
            if (perf >= minRow.performance - 0.2) return minRow.score;
            return 0;
        }
        return row.score;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    setStudents(prevStudents => {
        let changed = false;
        const newStudents = prevStudents.map(student => {
            const scores = { ...student.scores };
            let updated = false;

            // Si statut global différent de "présent", tout est à 0
            if (student.status !== 'present') {
                if (scores.final !== 0) { 
                    scores.course = 0; scores.saut = 0; scores.lancer = 0; scores.gym = 0; scores.final = 0; 
                    updated = true; 
                }
                return updated ? { ...student, scores } : student;
            }

            // Pour chaque sport, on ne calcule la note que s'il n'est PAS dispensé
            
            // 1. Course
            if (student.assignedSports.course && !student.exemptions.course && !student.absences?.course) {
                const sportConfig = gradingConfig[student.assignedSports.course];
                if (sportConfig) {
                    const newScore = calculateNote(student.performance.course || 0, sportConfig[student.gender]);
                    if (scores.course !== newScore) { scores.course = newScore; updated = true; }
                }
            } else {
                if (scores.course !== undefined && scores.course !== 0) { scores.course = 0; updated = true; }
            }

            // 2. Saut
            if (student.assignedSports.saut && !student.exemptions.saut && !student.absences?.saut) {
                const sportConfig = gradingConfig[student.assignedSports.saut];
                if (sportConfig) {
                    const newScore = calculateNote(student.performance.saut || 0, sportConfig[student.gender]);
                    if (scores.saut !== newScore) { scores.saut = newScore; updated = true; }
                }
            } else {
                if (scores.saut !== undefined && scores.saut !== 0) { scores.saut = 0; updated = true; }
            }

            // 3. Lancer
            if (student.assignedSports.lancer && !student.exemptions.lancer && !student.absences?.lancer) {
                const sportConfig = gradingConfig[student.assignedSports.lancer];
                if (sportConfig) {
                    const newScore = calculateNote(student.performance.lancer || 0, sportConfig[student.gender]);
                    if (scores.lancer !== newScore) { scores.lancer = newScore; updated = true; }
                }
            } else {
                if (scores.lancer !== undefined && scores.lancer !== 0) { scores.lancer = 0; updated = true; }
            }

            // 3.5 Gym - note directe (0-20)
            if (!student.exemptions.gym && !student.repechage.gym && !student.absences?.gym) {
                const gymScore = Math.min(20, Math.max(0, student.performance.gymnastics || 0));
                if (scores.gym !== gymScore) { scores.gym = gymScore; updated = true; }
            } else {
                if (scores.gym !== undefined && scores.gym !== 0) { scores.gym = 0; updated = true; }
            }

            // 4. Calcul de la moyenne finale
            // On ne prend en compte que les matières assignées, non dispensées, ET non en repechage
            const scoresToAverage: number[] = [];
            
            if (student.assignedSports.course && !student.exemptions.course && !student.repechage.course && !student.absences?.course && scores.course > 0) scoresToAverage.push(scores.course);
            if (student.assignedSports.saut && !student.exemptions.saut && !student.repechage.saut && !student.absences?.saut && scores.saut > 0) scoresToAverage.push(scores.saut);
            if (student.assignedSports.lancer && !student.exemptions.lancer && !student.repechage.lancer && !student.absences?.lancer && scores.lancer > 0) scoresToAverage.push(scores.lancer);
            // Gym n'est pas "assigné" par défaut, tout le monde l'a sauf si dispensé, en repechage ou absent
            if (!student.exemptions.gym && !student.repechage.gym && !student.absences?.gym && scores.gym > 0) scoresToAverage.push(scores.gym);

            // Règle: Au minimum 2 notes numériques pour calculer la moyenne
            if (scoresToAverage.length >= 2) {
                const total = scoresToAverage.reduce((a, b) => a + b, 0);
                const final = parseFloat((total / scoresToAverage.length).toFixed(2));
                if (scores.final !== final) { scores.final = final; updated = true; }
            } else {
                if (scores.final !== 0) { scores.final = 0; updated = true; }
            }

            if (updated) { changed = true; return { ...student, scores }; }
            return student;
        });

        return changed ? newStudents : prevStudents;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradingConfig, students.map(s => JSON.stringify(s.performance) + s.status + JSON.stringify(s.exemptions) + JSON.stringify(s.repechage) + JSON.stringify(s.absences) + JSON.stringify(s.assignedSports)).join(','), isAuthenticated]); 

  const handleUpdatePerformance = (id: string, type: 'course' | 'saut' | 'lancer' | 'gym', value: number, index?: number, obs?: string) => {
    setStudents(prev => prev.map(s => {
        if (s.id === id) {
            const perf = { ...s.performance };
            let safeValue = isNaN(value) ? 0 : value;
            
            if ((type === 'saut' || type === 'lancer') && safeValue > 20) {
                const original = safeValue;
                safeValue = safeValue / 100;
                console.warn(`Conversion: ${original} → ${safeValue} (cm→m). Si cette valeur était déjà en mètres, elle est incorrecte.`);
            }

            if (type === 'course') {
                perf.course = safeValue;
            } else if (type === 'gym') {
                if (obs !== undefined) perf.gymObservation = obs;
                else perf.gymnastics = safeValue;
            } else if (type === 'saut') {
                const newTrials = [...(perf.sautTrials || [0, 0, 0])] as [number, number, number];
                if (index !== undefined) newTrials[index] = safeValue;
                perf.sautTrials = newTrials;
                perf.saut = Math.max(...newTrials);
            } else if (type === 'lancer') {
                const newTrials = [...(perf.lancerTrials || [0, 0, 0])] as [number, number, number];
                if (index !== undefined) newTrials[index] = safeValue;
                perf.lancerTrials = newTrials;
                perf.lancer = Math.max(...newTrials);
            }
            return { ...s, performance: perf };
        }
        return s;
    }));
  };

  const handleUpdateStatus = (id: string, status: StudentStatus) => {
      setStudents(prev => prev.map(s => { if (s.id === id) return { ...s, status }; return s; }));
  };

  const handleToggleRepechage = (id: string, sport: 'course' | 'saut' | 'lancer' | 'gym') => {
      setStudents(prev => prev.map(s => { if (s.id === id) return { ...s, repechage: { ...s.repechage, [sport]: !s.repechage[sport] } }; return s; }));
  };

  const handleToggleExemption = (id: string, sport: 'course' | 'saut' | 'lancer' | 'gym') => {
      setStudents(prev => prev.map(s => { 
          if (s.id === id) {
              // Initialiser exemptions si elles n'existent pas (compatibilité rétroactive)
              const currentExemptions = s.exemptions || { course: false, saut: false, lancer: false, gym: false };
              return { 
                  ...s, 
                  exemptions: { 
                      ...currentExemptions, 
                      [sport]: !currentExemptions[sport] 
                  } 
              }; 
          }
          return s; 
      }));
  };

  const handleToggleAbsence = (id: string, sport: 'course' | 'saut' | 'lancer' | 'gym') => {
      setStudents(prev => prev.map(s => { 
          if (s.id === id) {
              // Initialiser absences si elles n'existent pas (compatibilité rétroactive)
              const currentAbsences = s.absences || { course: false, saut: false, lancer: false, gym: false };
              return { 
                  ...s, 
                  absences: { 
                      ...currentAbsences, 
                      [sport]: !currentAbsences[sport] 
                  } 
              }; 
          }
          return s; 
      }));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const handleDeleteStudent = (studentId: string) => {
      setStudents(prev => prev.filter(s => s.id !== studentId));
      db.logAction(currentUser.username, 'DELETE_STUDENT', `Suppression d'un élève (ID: ${studentId})`);
  };

  const handleDataImported = (newStudents: Student[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
        setStudents(newStudents);
        db.logAction('System', 'IMPORT_DATA', `Importation (Remplacement) de ${newStudents.length} élèves.`);
    } else {
        const existing = [...students];
        let addedCount = 0;
        let skippedCount = 0;
        
        newStudents.forEach(newS => {
            const exists = existing.some(ex => 
                ex.name === newS.name && 
                ex.institution === newS.institution && 
                ex.className === newS.className
            );
            if (!exists) {
                existing.push(newS);
                addedCount++;
            } else {
                skippedCount++;
            }
        });
        
        setStudents(existing);
        db.logAction('System', 'IMPORT_DATA', `Importation (Ajout) : ${addedCount} ajoutés, ${skippedCount} ignorés (doublons).`);
    }
    setActiveTab('dashboard');
  };

  const handleNavigateToClassEntry = (school: string, className: string) => {
    setPreSelectedEntryParams({ school, className });
    setActiveTab('entry');
  };

  if (!isAuthenticated || !currentUser) {
      console.log('Showing LoginView - isAuthenticated:', isAuthenticated, 'currentUser:', currentUser);
      return (
        <LoginView
            onLoginSuccess={(user: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>) => {
              console.log('onLoginSuccess called with user:', user);
              setCurrentUserState(user);
              setCurrentUser(user);
              setIsAuthenticated(true);
              console.log('After setting state - isAuthenticated:', true);
            }}
            logoUrl={globalSettings.logoUrl}
            region={globalSettings.regionName}
        />
      );
  }

  console.log('Rendering main app - currentUser.role:', currentUser?.role);
  return (
    <div className="flex bg-slate-100 min-h-screen font-sans text-slate-900 overflow-hidden" dir="rtl">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'entry') setPreSelectedEntryParams(null);
        }}
        region={globalSettings.regionName}
        logoUrl={globalSettings.logoUrl}
        currentUser={currentUser}
        onLogout={() => {
          setIsAuthenticated(false);
          setCurrentUserState(null);
          logout();
        }}
      />
      
      {/* Main Content Area - Fixed margin for desktop sidebar */}
      <main className="flex-1 mr-64 h-screen overflow-auto">
        {activeTab === 'dashboard' && (
            <DashboardView
                students={students}
                onNavigateToClass={handleNavigateToClassEntry}
                onReset={handleAppReset}
            />
        )}
        {activeTab === 'import' && <ImportView onDataImported={handleDataImported} existingCount={students.length} currentUser={currentUser} />}
        {activeTab === 'students' && <StudentManagerView students={students} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} currentUser={currentUser} />}
        {activeTab === 'users' && currentUser.role === 'superadmin' && (
            <UserManagerView
                currentUserId={currentUser.id}
                onClose={() => setActiveTab('dashboard')}
            />
        )}
        {activeTab === 'admin' && currentUser.role === 'superadmin' && (
            <AdminDashboardView
                currentUser={currentUser}
                students={students}
                onClose={() => setActiveTab('dashboard')}
            />
        )}
        {activeTab === 'profile' && (
            <ProfileView
                currentUser={currentUser}
                onClose={() => setActiveTab('dashboard')}
            />
        )}
        {activeTab === 'entry' && (
            <EntryView
                students={students}
                onUpdatePerformance={handleUpdatePerformance}
                onUpdateStatus={handleUpdateStatus}
                onToggleRepechage={handleToggleRepechage}
                onToggleExemption={handleToggleExemption}
                onToggleAbsence={handleToggleAbsence}
                gradingScale={gradingConfig}
                preSelectedParams={preSelectedEntryParams}
                region={globalSettings.regionName}
                globalSettings={globalSettings}
            />
        )}
        {activeTab === 'results' && <FinalResultsView students={students} gradingVersion={currentVersionInfo} region={globalSettings.regionName} globalSettings={globalSettings} />}
        {activeTab === 'reports' && <ReportsView students={students} gradingVersion={currentVersionInfo} region={globalSettings.regionName} globalSettings={globalSettings} />}
        {activeTab === 'config' && (
            <ConfigView
                config={gradingConfig}
                onSaveConfig={handleSaveConfig}
                history={gradingHistory}
                categories={categories}
                setCategories={setCategories}
                settings={globalSettings}
                onUpdateSettings={handleUpdateSettings}
            />
        )}
      </main>
    </div>
  );
}

export default App;
