import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Wallet, 
  Car,
  Calendar,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { statsAPI, transactionAPI, vehicleAPI } from '../services/api';
import Layout from '../components/Layout';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'];

const Analytics = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState({ transactions: [], summary: { income: 0, expenses: 0, profit: 0 } });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const statsRes = await statsAPI.get();
      setStats(statsRes.data);

      const transRes = await transactionAPI.getAll();
      setTransactions(transRes.data);

      const vehiclesRes = await vehicleAPI.getAll();
      setVehicles(vehiclesRes.data);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" dir="rtl">
          <div className="text-center">
            <BarChart3 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
            <p className="text-slate-600">جاري تحميل التحليلات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const cashFlow = stats.thisMonth.income - stats.thisMonth.expenses;

  // Chart data
  const statusData = [
    { name: 'تشخيص', value: vehicles.filter(v => v.status === 'diagnosis').length, color: '#3b82f6' },
    { name: 'تعميد', value: vehicles.filter(v => v.status === 'quotation').length, color: '#f59e0b' },
    { name: 'إصلاح', value: vehicles.filter(v => v.status === 'repair').length, color: '#ef4444' },
    { name: 'جاهز', value: vehicles.filter(v => v.status === 'ready').length, color: '#10b981' },
  ];

  const financialData = [
    { name: 'المبيعات', amount: stats.thisMonth.income },
    { name: 'المصروفات', amount: stats.thisMonth.expenses },
    { name: 'الربح', amount: stats.thisMonth.profit },
  ];

  // Recent transactions for chart
  const recentTrans = transactions.transactions.slice(0, 7).reverse();
  const transChartData = recentTrans.map(t => ({
    date: new Date(t.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    income: t.type === 'income' ? t.amount : 0,
    expense: t.type === 'expense' ? t.amount : 0,
  }));

  return (
    <Layout>
      <div className="min-h-screen" dir="rtl">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">التحليلات والتقارير</h1>
              <p className="text-slate-600">نظرة شاملة على أداء الورشة</p>
            </div>
          </div>

          {/* Main Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 text-sm font-medium mb-1">المبيعات (الشهر الحالي)</p>
                    <p className="text-3xl font-bold text-green-900">{stats.thisMonth.income.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="text-green-600" size={16} />
                      <span className="text-sm text-green-700">نشط</span>
                    </div>
                  </div>
                  <div className="bg-green-600 p-3 rounded-full">
                    <DollarSign className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-700 text-sm font-medium mb-1">المصروفات (الشهر الحالي)</p>
                    <p className="text-3xl font-bold text-red-900">{stats.thisMonth.expenses.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingDown className="text-red-600" size={16} />
                      <span className="text-sm text-red-700">نشط</span>
                    </div>
                  </div>
                  <div className="bg-red-600 p-3 rounded-full">
                    <ShoppingCart className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-700 text-sm font-medium mb-1">صافي الربح</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.thisMonth.profit.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="text-blue-600" size={16} />
                      <span className="text-sm text-blue-700">ممتاز</span>
                    </div>
                  </div>
                  <div className="bg-blue-600 p-3 rounded-full">
                    <DollarSign className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 text-sm font-medium mb-1">السيولة النقدية</p>
                    <p className="text-3xl font-bold text-purple-900">{cashFlow.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Wallet className="text-purple-600" size={16} />
                      <span className="text-sm text-purple-700">متوفر</span>
                    </div>
                  </div>
                  <div className="bg-purple-600 p-3 rounded-full">
                    <Wallet className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Pie Chart - Vehicle Status */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>توزيع المركبات حسب المرحلة</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart - Financial Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>نظرة مالية شاملة</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} ر.س`} />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Line Chart - Transactions */}
          {transChartData.length > 0 && (
            <Card className="shadow-lg mb-8">
              <CardHeader>
                <CardTitle>المبيعات والمصروفات (آخر 7 أيام)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={transChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} ر.س`} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10b981" name="مبيعات" strokeWidth={2} />
                    <Line type="monotone" dataKey="expense" stroke="#ef4444" name="مصروفات" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Rest of the component remains the same */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-l from-blue-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Car size={24} />
                  دخول السيارات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-slate-700">إجمالي المركبات</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.vehicles.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-slate-700">قيد العمل</span>
                    <span className="text-2xl font-bold text-orange-600">{stats.vehicles.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-slate-700">جاهز للتسليم</span>
                    <span className="text-2xl font-bold text-green-600">{stats.vehicles.ready}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-l from-green-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Calendar size={24} />
                  إحصائيات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">العملاء</span>
                    <span className="text-2xl font-bold text-slate-800">{stats.customers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">الفنيين</span>
                    <span className="text-2xl font-bold text-slate-800">{stats.technicians}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-slate-700">قطع قليلة المخزون</span>
                    <span className="text-2xl font-bold text-red-600">{stats.lowStockParts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-l from-purple-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <BarChart3 size={24} />
                  تقدم العمل
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">معدل الإنجاز</span>
                      <span className="text-sm font-bold text-slate-800">
                        {stats.vehicles.total > 0 
                          ? Math.round((stats.vehicles.ready / stats.vehicles.total) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stats.vehicles.total > 0 
                            ? (stats.vehicles.ready / stats.vehicles.total) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <p className="text-sm text-slate-600 mb-2">توزيع المراحل:</p>
                    <div className="space-y-2">
                      {statusData.map((status, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span style={{ color: status.color }}>● {status.name}</span>
                          <span className="font-semibold">{status.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>آخر المعاملات</span>
                <Button variant="outline" size="sm">
                  عرض الكل
                  <ArrowRight size={16} className="mr-2" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {transactions.transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">لا توجد معاملات</p>
              ) : (
                <div className="space-y-3">
                  {transactions.transactions.slice(0, 5).map((transaction, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'income' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="text-green-600" size={20} />
                          ) : (
                            <TrendingDown className="text-red-600" size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{transaction.description}</p>
                          <p className="text-sm text-slate-500">{transaction.category}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-lg font-bold ${
                          transaction.type === 'income' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {transaction.amount.toLocaleString()} ر.س
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(transaction.date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;

  return (
    <Layout>
      <div className="min-h-screen" dir="rtl">
        <div className="container mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">التحليلات والتقارير</h1>
              <p className="text-slate-600">نظرة شاملة على أداء الورشة</p>
            </div>
          </div>

          {/* Main Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Income */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 text-sm font-medium mb-1">المبيعات (الشهر الحالي)</p>
                    <p className="text-3xl font-bold text-green-900">{stats.thisMonth.income.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="text-green-600" size={16} />
                      <span className="text-sm text-green-700">+12% عن الشهر الماضي</span>
                    </div>
                  </div>
                  <div className="bg-green-600 p-3 rounded-full">
                    <DollarSign className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-700 text-sm font-medium mb-1">المصروفات (الشهر الحالي)</p>
                    <p className="text-3xl font-bold text-red-900">{stats.thisMonth.expenses.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingDown className="text-red-600" size={16} />
                      <span className="text-sm text-red-700">-5% عن الشهر الماضي</span>
                    </div>
                  </div>
                  <div className="bg-red-600 p-3 rounded-full">
                    <ShoppingCart className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-700 text-sm font-medium mb-1">صافي الربح</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.thisMonth.profit.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="text-blue-600" size={16} />
                      <span className="text-sm text-blue-700">+18% عن الشهر الماضي</span>
                    </div>
                  </div>
                  <div className="bg-blue-600 p-3 rounded-full">
                    <DollarSign className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-none shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 text-sm font-medium mb-1">السيولة النقدية</p>
                    <p className="text-3xl font-bold text-purple-900">{cashFlow.toLocaleString()} ر.س</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Wallet className="text-purple-600" size={16} />
                      <span className="text-sm text-purple-700">متوفر</span>
                    </div>
                  </div>
                  <div className="bg-purple-600 p-3 rounded-full">
                    <Wallet className="text-white" size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vehicle Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-l from-blue-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Car size={24} />
                  دخول السيارات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-slate-700">إجمالي المركبات</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.vehicles.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-slate-700">قيد العمل</span>
                    <span className="text-2xl font-bold text-orange-600">{stats.vehicles.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-slate-700">جاهز للتسليم</span>
                    <span className="text-2xl font-bold text-green-600">{stats.vehicles.ready}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-l from-green-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Calendar size={24} />
                  إحصائيات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">العملاء</span>
                    <span className="text-2xl font-bold text-slate-800">{stats.customers}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">الفنيين</span>
                    <span className="text-2xl font-bold text-slate-800">{stats.technicians}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-slate-700">قطع قليلة المخزون</span>
                    <span className="text-2xl font-bold text-red-600">{stats.lowStockParts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Work Progress Summary */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-l from-purple-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <BarChart3 size={24} />
                  تقدم العمل
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">معدل الإنجاز</span>
                      <span className="text-sm font-bold text-slate-800">
                        {stats.vehicles.total > 0 
                          ? Math.round((stats.vehicles.ready / stats.vehicles.total) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stats.vehicles.total > 0 
                            ? (stats.vehicles.ready / stats.vehicles.total) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <p className="text-sm text-slate-600 mb-2">توزيع المراحل:</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">● تشخيص</span>
                        <span className="font-semibold">
                          {vehicles.filter(v => v.status === 'diagnosis').length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-700">● تعميد</span>
                        <span className="font-semibold">
                          {vehicles.filter(v => v.status === 'quotation').length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700">● إصلاح</span>
                        <span className="font-semibold">
                          {vehicles.filter(v => v.status === 'repair').length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">● جاهز</span>
                        <span className="font-semibold">
                          {vehicles.filter(v => v.status === 'ready').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>آخر المعاملات</span>
                <Button variant="outline" size="sm">
                  عرض الكل
                  <ArrowRight size={16} className="mr-2" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {transactions.transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">لا توجد معاملات</p>
              ) : (
                <div className="space-y-3">
                  {transactions.transactions.slice(0, 5).map((transaction, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'income' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'income' ? (
                            <TrendingUp className="text-green-600" size={20} />
                          ) : (
                            <TrendingDown className="text-red-600" size={20} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{transaction.description}</p>
                          <p className="text-sm text-slate-500">{transaction.category}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`text-lg font-bold ${
                          transaction.type === 'income' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {transaction.amount.toLocaleString()} ر.س
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(transaction.date).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
