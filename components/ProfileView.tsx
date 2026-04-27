import React, { useState, useEffect } from 'react';
import { User, Permission, getUserPermissions, hasPermission, verifyPassword, changePassword, updateUserRecovery } from '../services/security';
import { Shield, Key, User as UserIcon, Save, X, CheckCircle } from 'lucide-react';

interface ProfileViewProps {
  currentUser: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>;
  onClose: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onClose }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Recovery
  const [recoveryQuestion, setRecoveryQuestion] = useState(currentUser.recoveryQuestion || 'ما هو اسم مدرستك الابتدائية؟');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  useEffect(() => {
    setPermissions(getUserPermissions(currentUser));
  }, []);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 4) {
      setPasswordError('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }

    const result = await changePassword(currentPassword, newPassword);
    if (result.success) {
      setPasswordSuccess('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error || 'خطأ في تغيير كلمة المرور');
    }
  };

  const handleUpdateRecovery = async () => {
    if (!recoveryAnswer) {
      alert('الرجاء إدخال الإجابة السرية');
      return;
    }

    const result = await updateUserRecovery(currentUser.id, recoveryQuestion, recoveryAnswer);
    if (result.success) {
      setRecoverySuccess('تم تحديث سؤال الأمان بنجاح');
      setRecoveryAnswer('');
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'superadmin') return 'مدير عام';
    if (role === 'admin') return 'مسؤول';
    return 'مشغل';
  };

  const getPermissionLabel = (perm: Permission) => {
    const labels: Record<Permission, string> = {
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
      'delegations:edit': 'تعديل المندوبيات'
    };
    return labels[perm] || perm;
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{currentUser.username}</h1>
            <p className="opacity-80">{getRoleLabel(currentUser.role)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-6 py-3 font-medium ${activeSection === 'profile' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            الملف الشخصي
          </button>
          <button
            onClick={() => setActiveSection('password')}
            className={`px-6 py-3 font-medium ${activeSection === 'password' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            تغيير كلمة المرور
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`px-6 py-3 font-medium ${activeSection === 'security' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
          >
            الأمان
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">معلومات الحساب</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">اسم المستخدم</label>
                  <p className="font-semibold">{currentUser.username}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">الدور</label>
                  <p className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    {getRoleLabel(currentUser.role)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">تاريخ الإنشاء</label>
                  <p className="font-semibold">{new Date(currentUser.createdAt).toLocaleDateString('ar-TN')}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">آخر دخول</label>
                  <p className="font-semibold">
                    {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleDateString('ar-TN') : 'لم يسجل الدخول بعد'}
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold mb-4">صلاحياتي</h2>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map(perm => (
                  <div key={perm} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{getPermissionLabel(perm)}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">إجمالي الصلاحيات: {permissions.length}</p>
            </div>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              تغيير كلمة المرور
            </h2>
            
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4">
                {passwordError}
              </div>
            )}
            
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">كلمة المرور الحالية</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                />
              </div>
              <button
                onClick={handleChangePassword}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                تغيير كلمة المرور
              </button>
            </div>
          </div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              إعدادات الأمان
            </h2>

            {recoverySuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {recoverySuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">سؤال الأمان</label>
                <select
                  value={recoveryQuestion}
                  onChange={e => setRecoveryQuestion(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="ما هو اسم مدرستك الابتدائية؟">ما هو اسم مدرستك الابتدائية؟</option>
                  <option value="ما هو اسم حيوانك الأليف؟">ما هو اسم حيوانك الأليف؟</option>
                  <option value="ما هي مدينتك الأصلية؟">ما هي مدينتك الأصلية؟</option>
                  <option value="ما هو كتابك المفضل؟">ما هو كتابك المفضل؟</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">الإجابة السرية</label>
                <input
                  type="text"
                  value={recoveryAnswer}
                  onChange={e => setRecoveryAnswer(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="أدخل الإجابة السرية"
                />
              </div>
              <button
                onClick={handleUpdateRecovery}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                تحديث سؤال الأمان
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileView;