import React from 'react';
import { Upload, Edit, FileText, Settings, LayoutDashboard, Trophy, UserCog, LogOut, Users, Shield, BarChart3, UserCircle } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  region: string;
  logoUrl?: string;
  currentUser: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, region, logoUrl, currentUser, onLogout }) => {
  const role = currentUser.role;
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const hasUserManagement = isSuperAdmin;
  const hasStudentManagement = isAdmin;
  const hasConfigAccess = isAdmin;

  const menuItems = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: LayoutDashboard },
    { id: 'profile', label: 'ملفي الشخصي', icon: UserCircle },
    ...(hasStudentManagement ? [{ id: 'import', label: 'استيراد البيانات', icon: Upload }] : []),
    ...(hasStudentManagement ? [{ id: 'students', label: 'تعديل المعطيات', icon: UserCog }] : []),
    { id: 'entry', label: 'إدخال الأعداد', icon: Edit },
    { id: 'results', label: 'النتائج النهائية', icon: Trophy },
    { id: 'reports', label: 'طباعة التقارير', icon: FileText },
    ...(hasConfigAccess ? [{ id: 'config', label: 'سلم التنقيط', icon: Settings }] : []),
    ...(hasUserManagement ? [{ id: 'admin', label: 'إدارة المستخدمين', icon: BarChart3 }] : []),
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed right-0 top-0 shadow-2xl z-50">
      {/* Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-700">
        <div className="bg-white p-2 rounded-lg w-14 h-14 flex items-center justify-center shrink-0 overflow-hidden">
          <img 
            src={logoUrl || "https://upload.wikimedia.org/wikipedia/commons/e/e5/Logo_minist%C3%A8re_de_la_jeunesse_et_des_sports_-_Tunisie.png"} 
            alt="Logo" 
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3616/3616215.png";
            }}
          />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">باكالوريا</h1>
          <p className="text-xs font-medium text-slate-400">تربية بدنية</p>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 ml-2" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        {/* Current User Info */}
        <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSuperAdmin ? 'bg-purple-600' : role === 'admin' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{currentUser.username}</p>
            <p className="text-xs text-slate-400">{isSuperAdmin ? 'مدير عام' : role === 'admin' ? 'مسؤول' : 'مشغّل'}</p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-200 hover:bg-red-600/20 transition-all duration-200 font-medium text-sm"
          >
            <LogOut className="w-5 h-5 ml-2" />
            <span>تسجيل الخروج</span>
          </button>
        )}
        <div className="text-[10px] text-slate-400 text-center leading-relaxed space-y-1">
          <p>المندوبية الجهوية</p>
          <p>الشباب والرياضة ب{region}</p>
          <p className="text-slate-500 font-semibold">v1.2 - 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;