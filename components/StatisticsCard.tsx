import React, { useMemo } from 'react';
import { Student } from '../types';
import { calculateStatistics, DayStatistics } from '../services/grading';
import { BarChart3, Users, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface StatisticsCardProps {
  students: Student[];
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ students }) => {
  const stats = useMemo(() => calculateStatistics(students), [students]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        إحصائيات اليوم
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* إجمالي الطلاب */}
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">إجمالي الطلاب</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
        </div>

        {/* طلاب معافون كليًا */}
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">معافون كليًا</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalDispenseCount}</p>
        </div>

        {/* طلاب غائبون كليًا */}
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">غائبون كليًا</p>
          <p className="text-3xl font-bold text-red-600">{stats.totalAbsentCount}</p>
        </div>

        {/* طلاب لهم معدل */}
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">لهم معدل</p>
          <p className="text-3xl font-bold text-purple-600">{stats.calculatedAverageCount}</p>
        </div>
      </div>

      {/* صفوف إضافية */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {/* الإعفاءات الجزئية */}
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">إعفاءات جزئية</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.partialDispenseCount}</p>
        </div>

        {/* الغيابات الجزئية */}
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">غيابات جزئية</p>
          <p className="text-2xl font-bold text-orange-600">{stats.partialAbsentCount}</p>
        </div>

        {/* المعدل العام */}
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm font-medium">المعدل العام</p>
          <p className="text-2xl font-bold text-indigo-600">
            {stats.overallAverage !== null ? stats.overallAverage.toFixed(2) : '—'}
          </p>
        </div>
      </div>

      {/* التوزيع النسبي */}
      <div className="border-t pt-6">
        <h4 className="font-semibold mb-4 text-gray-700">التوزيع حسب الفئات</h4>
        <div className="space-y-3">
          <DistributionBar label="[0 – 5[" value={stats.distribution.veryLow} color="bg-red-500" />
          <DistributionBar label="[5 – 10[" value={stats.distribution.low} color="bg-orange-500" />
          <DistributionBar label="[10 – 12[" value={stats.distribution.medium} color="bg-yellow-500" />
          <DistributionBar label="[12 – 14[" value={stats.distribution.mediumHigh} color="bg-blue-500" />
          <DistributionBar label="[14 – 16[" value={stats.distribution.high} color="bg-green-500" />
          <DistributionBar label="[16 – 20]" value={stats.distribution.veryHigh} color="bg-emerald-500" />
        </div>
      </div>
    </div>
  );
};

interface DistributionBarProps {
  label: string;
  value: number;
  color: string;
}

const DistributionBar: React.FC<DistributionBarProps> = ({ label, value, color }) => {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 text-sm font-medium text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
        <div className={`${color} h-full flex items-center justify-end pr-2`} style={{ width: `${value > 0 ? Math.max(20, value * 5) : 0}%` }}>
          {value > 0 && <span className="text-white text-xs font-semibold">{value}</span>}
        </div>
      </div>
    </div>
  );
};

export default StatisticsCard;
