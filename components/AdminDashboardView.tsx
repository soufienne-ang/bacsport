import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser as updateUserFn, deleteUser } from '../services/security';
import { db } from '../services/db';
import { User, UserRole, Permission, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS } from '../types';
import { Users, Activity, Shield, BarChart3, CheckCircle, XCircle, Clock, Trash2, UserPlus, Key, Crown, Edit2, Save, X, Check } from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>;
  students: any[];
  onClose: () => void;
}

const ALL_PERMISSIONS: Permission[] = [
  'students:view', 'students:create', 'students:edit', 'students:delete', 'students:import',
  'grading:view', 'grading:edit',
  'reports:view', 'reports:export',
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'settings:view', 'settings:edit',
  'config:view', 'config:edit'
];

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ currentUser, students, onClose }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [users, setUsers] = useState<(Omit<User, 'passwordHash' | 'recoveryAnswerHash'>)[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({ username: '', password: '', role: 'admin' as UserRole, permissions: [] as Permission[] });
  
  // Edit user modal
  const [editingUser, setEditingUser] = useState<Omit<User, 'passwordHash' | 'recoveryAnswerHash'> | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('admin');
  const [editPermissions, setEditPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    loadUsers();
    loadActivityLogs();
  }, []);

  const loadUsers = () => {
    setUsers(getAllUsers());
  };

  const loadActivityLogs = () => {
    const logs = db.getAuditLogs ? db.getAuditLogs().slice(0, 50) : [];
    setActivityLogs(logs);
  };

  const handleCreateUser = async () => {
    if (!newUserData.username || !newUserData.password) {
      alert('الرجاء ملء جميع الحقول');
      return;
    }
    if (newUserData.password.length < 4) {
      alert('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }

    const result = await createUser(
      newUserData.username,
      newUserData.password,
      newUserData.role,
      'ما هي مدرستك الابتدائية؟',
      'تونس',
      newUserData.permissions.length > 0 ? newUserData.permissions : undefined
    );

    if (result.success) {
      alert('تم إنشاء المستخدم بنجاح');
      setShowUserForm(false);
      setNewUserData({ username: '', password: '', role: 'admin', permissions: [] });
      loadUsers();
    } else {
      alert(result.error || 'خطأ في إنشاء المستخدم');
    }
  };

  const handleOpenEditModal = (user: Omit<User, 'passwordHash' | 'recoveryAnswerHash'>) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPermissions(user.permissions || ROLE_DEFAULT_PERMISSIONS[user.role]);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;

    const result = updateUserFn(editingUser.id, {
      role: editRole,
      permissions: editPermissions
    });

    if (result.success) {
      alert('تم تحديث المستخدم بنجاح');
      setEditingUser(null);
      loadUsers();
    } else {
      alert(result.error || 'خطأ في تحديث المستخدم');
    }
  };

  const togglePermission = (perm: Permission) => {
    if (editPermissions.includes(perm)) {
      setEditPermissions(editPermissions.filter(p => p !== perm));
    } else {
      setEditPermissions([...editPermissions, perm]);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.role === 'superadmin') {
      const adminCount = users.filter(u => u.role === 'superadmin').length;
      if (adminCount <= 1) {
        alert('لا يمكن حذف آخر مدير عام');
        return;
      }
    }

    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    const { deleteUser: deleteUserFn } = await import('../services/security');
    const result = deleteUserFn(userId);
    if (result.success) {
      loadUsers();
    } else {
      alert(result.error || 'خطأ في حذف المستخدم');
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'superadmin') return 'مدير عام';
    if (role === 'admin') return 'مسؤول';
    return 'مشغل';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ar-TN');
  };

  // Calculate stats
  const totalStudents = students.length;
  const gradedStudents = students.filter(s => s.scores?.final !== undefined && s.scores?.final !== null).length;
  const passedStudents = students.filter(s => (s.scores?.final || 0) >= 10).length;
  const avgScore = gradedStudents > 0 
    ? (students.reduce((sum, s) => sum + (s.scores?.final || 0), 0) / gradedStudents).toFixed(2)
    : '-';
  const passingRate = gradedStudents > 0 ? ((passedStudents / gradedStudents) * 100).toFixed(1) : '-';

  const maleCount = students.filter(s => s.gender === 'M').length;
  const femaleCount = students.filter(s => s.gender === 'F').length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const exemptCount = students.filter(s => s.status === 'exempt').length;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 text-white p-4">
        <h3 className="text-lg font-bold mb-4">لوحة التحكم</h3>
        <nav className="space-y-1">
          <button
            onClick={() => setActiveSection('overview')}
            className={`w-full text-right px-3 py-2 rounded-lg flex items-center gap-2 ${activeSection === 'overview' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
          >
            <BarChart3 className="w-4 h-4" />
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveSection('students')}
            className={`w-full text-right px-3 py-2 rounded-lg flex items-center gap-2 ${activeSection === 'students' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
          >
            <Users className="w-4 h-4" />
            التلاميذ
          </button>
          <button
            onClick={() => setActiveSection('activity')}
            className={`w-full text-right px-3 py-2 rounded-lg flex items-center gap-2 ${activeSection === 'activity' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
          >
            <Activity className="w-4 h-4" />
            النشاطات
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`w-full text-right px-3 py-2 rounded-lg flex items-center gap-2 ${activeSection === 'users' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
          >
            <Shield className="w-4 h-4" />
            المستخدمون
          </button>
          <button
            onClick={() => setActiveSection('permissions')}
            className={`w-full text-right px-3 py-2 rounded-lg flex items-center gap-2 ${activeSection === 'permissions' ? 'bg-indigo-600' : 'hover:bg-slate-700'}`}
          >
            <Key className="w-4 h-4" />
            الصلاحيات
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto bg-slate-100">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">نظرة عامة</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-gray-500 text-sm">إجمالي التلاميذ</p>
                <p className="text-3xl font-bold">{totalStudents}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-gray-500 text-sm">التلاميذ المصححون</p>
                <p className="text-3xl font-bold">{gradedStudents}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-gray-500 text-sm">المعدل العام</p>
                <p className="text-3xl font-bold">{avgScore}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow">
                <p className="text-gray-500 text-sm">نسبة النجاح</p>
                <p className="text-3xl font-bold">{passingRate}%</p>
              </div>
            </div>

            {/* Distribution */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="font-bold mb-4">توزيع الجنس</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>ذكور</span>
                    <span className="font-bold">{maleCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>إناث</span>
                    <span className="font-bold">{femaleCount}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="font-bold mb-4">حالة التلاميذ</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> حاضر</span>
                    <span className="font-bold">{presentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> غائب</span>
                    <span className="font-bold">{absentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /> معفى</span>
                    <span className="font-bold">{exemptCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Section */}
        {activeSection === 'students' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">قائمة التلاميذ</h1>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right p-3">الاسم</th>
                    <th className="text-right p-3">القسم</th>
                    <th className="text-right p-3">الجنس</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">النتيجة</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 50).map((student, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{student.name}</td>
                      <td className="p-3">{student.className}</td>
                      <td className="p-3">{student.gender === 'M' ? 'ذكر' : 'أنثى'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          student.status === 'present' ? 'bg-green-100 text-green-600' :
                          student.status === 'absent' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {student.status === 'present' ? 'حاضر' : student.status === 'absent' ? 'غائب' : 'معفى'}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        {student.scores?.final !== undefined ? student.scores.final.toFixed(1) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Section */}
        {activeSection === 'activity' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">سجل النشاطات</h1>
            <div className="bg-white rounded-xl shadow p-6">
              {activityLogs.length > 0 ? (
                <div className="space-y-3">
                  {activityLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{log.action}</p>
                        <p className="text-sm text-gray-500">{log.details}</p>
                      </div>
                      <span className="text-sm text-gray-400">{formatDate(log.timestamp)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">لا توجد نشاطات</p>
              )}
            </div>
          </div>
        )}

        {/* Users Section */}
        {activeSection === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
              <button
                onClick={() => setShowUserForm(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2 hover:bg-green-600"
              >
                <UserPlus className="w-4 h-4" />
                إضافة مستخدم
              </button>
            </div>

            {/* Add User Form */}
            {showUserForm && (
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="font-bold mb-4">إضافة مستخدم جديد</h3>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="اسم المستخدم"
                    value={newUserData.username}
                    onChange={e => setNewUserData({ ...newUserData, username: e.target.value })}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={newUserData.password}
                    onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="p-2 border rounded-lg"
                  />
                  <select
                    value={newUserData.role}
                    onChange={e => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                    className="p-2 border rounded-lg"
                  >
                    <option value="admin">مسؤول</option>
                    <option value="operator">مشغل</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleCreateUser} className="px-4 py-2 bg-green-500 text-white rounded-lg">إضافة</button>
                  <button onClick={() => setShowUserForm(false)} className="px-4 py-2 bg-gray-300 rounded-lg">إلغاء</button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right p-3">اسم المستخدم</th>
                    <th className="text-right p-3">الدور</th>
                    <th className="text-right p-3">الحالة</th>
                    <th className="text-right p-3">الصلاحيات</th>
                    <th className="text-right p-3">تاريخ الإنشاء</th>
                    <th className="text-right p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="p-3 font-semibold">{user.username}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          user.role === 'superadmin' ? 'bg-purple-100 text-purple-600' :
                          user.role === 'admin' ? 'bg-blue-100 text-blue-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm ${user.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {user.isActive ? 'نشط' : 'مغلق'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-gray-500">
                          {(user.permissions?.length || ROLE_DEFAULT_PERMISSIONS[user.role]?.length || 0)} صلاحية
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="text-blue-500 hover:text-blue-700"
                          title="تعديل"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={user.id === currentUser.id}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Permissions Section */}
        {activeSection === 'permissions' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">إدارة الصلاحيات والأدوار</h1>
            
            {/* Role Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Super Admin */}
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg">مدير عام</h3>
                      <p className="text-sm opacity-80">superadmin</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> إضافة تلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تعديل التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> حذف التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> استيراد بيانات</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض سلم التنقيط</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تعديل سلم التنقيط</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض التقارير</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تصدير التقارير</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> إدارة المستخدمين</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> لوحة التحكم</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> الإعدادات</li>
                  </ul>
                </div>
              </div>

              {/* Admin */}
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg">مسؤول</h3>
                      <p className="text-sm opacity-80">admin</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> إضافة تلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تعديل التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> حذف التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> استيراد بيانات</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض سلم التنقيط</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تعديل سلم التنقيط</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض التقارير</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تصدير التقارير</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> إدارة المستخدمين</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> لوحة التحكم</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> الإعدادات</li>
                  </ul>
                </div>
              </div>

              {/* Operator */}
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg">مشغل</h3>
                      <p className="text-sm opacity-80">operator</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض التلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> إضافة تلاميذ</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> تعديل التلاميذ</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> حذف التلاميذ</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> استيراد بيانات</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض سلم التنقيط</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> تعديل سلم التنقيط</li>
                    <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> عرض التقارير</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> تصدير التقارير</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> إدارة المستخدمين</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> لوحة التحكم</li>
                    <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-gray-400" /> الإعدادات</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">تعديل: {editingUser.username}</h2>
                <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block font-semibold mb-2">الدور</label>
                <select
                  value={editRole}
                  onChange={e => {
                    setEditRole(e.target.value as UserRole);
                    setEditPermissions(ROLE_DEFAULT_PERMISSIONS[e.target.value as UserRole]);
                  }}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="superadmin">مدير عام</option>
                  <option value="admin">مسؤول</option>
                  <option value="operator">مشغل</option>
                </select>
              </div>

              {/* Permissions Selection */}
              <div className="mb-6">
                <label className="block font-semibold mb-2">الصلاحيات</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto p-2 bg-slate-50 rounded-lg">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm">{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  عدد الصلاحيات المختارة: {editPermissions.length}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-300 rounded-lg flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardView;