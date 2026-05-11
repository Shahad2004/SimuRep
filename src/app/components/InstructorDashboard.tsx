import { useState } from 'react';
import { Users, TrendingDown, TrendingUp, Trophy, Target, Star } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StudentData {
  id: string;
  name: string;
  avgInventory: number;
  totalCost: number;
  avgServiceLevel: number;
  totalScore: number;
  stockoutCount: number;
  lastActive: string;
}

const students: StudentData[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    avgInventory: 28,
    totalCost: 2450,
    avgServiceLevel: 99,
    totalScore: 2450,
    stockoutCount: 0,
    lastActive: 'Just now',
  },
  {
    id: '2',
    name: 'Mike Johnson',
    avgInventory: 22,
    totalCost: 2115,
    avgServiceLevel: 97,
    totalScore: 2115,
    stockoutCount: 1,
    lastActive: '2 min ago',
  },
  {
    id: '3',
    name: 'Emma Davis',
    avgInventory: 18,
    totalCost: 2680,
    avgServiceLevel: 91,
    totalScore: 1995,
    stockoutCount: 4,
    lastActive: 'Just now',
  },
  {
    id: '4',
    name: 'Alex Kim',
    avgInventory: 32,
    totalCost: 2890,
    avgServiceLevel: 95,
    totalScore: 2080,
    stockoutCount: 2,
    lastActive: '5 min ago',
  },
  {
    id: '5',
    name: 'Jordan Lee',
    avgInventory: 15,
    totalCost: 3120,
    avgServiceLevel: 85,
    totalScore: 1890,
    stockoutCount: 7,
    lastActive: '1 min ago',
  },
];

const inventoryOverTimeData = [
  { round: 1, Sarah: 20, Mike: 22, Emma: 18, Alex: 30, Jordan: 12 },
  { round: 2, Sarah: 35, Mike: 28, Emma: 20, Alex: 38, Jordan: 15 },
  { round: 3, Sarah: 28, Mike: 15, Emma: 14, Alex: 32, Jordan: 10 },
  { round: 4, Sarah: 30, Mike: 28, Emma: 22, Alex: 35, Jordan: 18 },
  { round: 5, Sarah: 27, Mike: 22, Emma: 16, Alex: 25, Jordan: 20 },
];

const costComparisonData = students.map((s) => ({
  name: s.name.split(' ')[0],
  cost: s.totalCost,
}));

const alerts = [
  {
    id: '1',
    type: 'warning',
    student: 'Jordan Lee',
    message: 'Has experienced 7 stockouts - significantly above class average',
    icon: TrendingDown,
  },
  {
    id: '2',
    type: 'alert',
    student: 'Emma Davis',
    message: 'Service level dropped to 85% in last round',
    icon: TrendingDown,
  },
  {
    id: '3',
    type: 'success',
    student: 'Sarah Chen',
    message: 'Maintaining perfect service level with optimal costs',
    icon: TrendingUp,
  },
  {
    id: '4',
    type: 'warning',
    student: 'Alex Kim',
    message: 'High inventory levels - potential over-ordering',
    icon: Target,
  },
];

export function InstructorDashboard() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [currentRound, setCurrentRound] = useState(5);

  const handleFeedbackChange = (studentId: string, text: string) => {
    setFeedback((prev) => ({ ...prev, [studentId]: text }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-1">Instructor Dashboard</h1>
            <p className="text-purple-100">Monitor and guide student performance</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-purple-100">Current Round</div>
              <div className="text-3xl">{currentRound}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-100">Active Students</div>
              <div className="text-3xl">{students.length}</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-purple-500/50 rounded-lg p-4">
            <div className="text-sm text-purple-100">Avg Service Level</div>
            <div className="text-2xl font-semibold">
              {(students.reduce((acc, s) => acc + s.avgServiceLevel, 0) / students.length).toFixed(1)}%
            </div>
          </div>
          <div className="bg-purple-500/50 rounded-lg p-4">
            <div className="text-sm text-purple-100">Avg Total Cost</div>
            <div className="text-2xl font-semibold">
              ${Math.round(students.reduce((acc, s) => acc + s.totalCost, 0) / students.length)}
            </div>
          </div>
          <div className="bg-purple-500/50 rounded-lg p-4">
            <div className="text-sm text-purple-100">Students with Stockouts</div>
            <div className="text-2xl font-semibold">{students.filter((s) => s.stockoutCount > 0).length}</div>
          </div>
          <div className="bg-purple-500/50 rounded-lg p-4">
            <div className="text-sm text-purple-100">High Performers (95%+)</div>
            <div className="text-2xl font-semibold">{students.filter((s) => s.avgServiceLevel >= 95).length}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel - Class Overview */}
        <div className="col-span-5 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Class Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-sm text-slate-600 pb-2 px-2">Student</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Avg Inv</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Cost</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Service %</th>
                    <th className="text-right text-sm text-slate-600 pb-2 px-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((student, index) => (
                      <tr
                        key={student.id}
                        onClick={() => setSelectedStudent(student.id)}
                        className={`border-b border-slate-100 cursor-pointer transition-colors ${
                          selectedStudent === student.id ? 'bg-purple-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Trophy
                                className={`w-4 h-4 ${
                                  index === 0
                                    ? 'text-yellow-500'
                                    : index === 1
                                    ? 'text-slate-400'
                                    : 'text-orange-400'
                                }`}
                              />
                            )}
                            <span className="font-semibold text-slate-800">{student.name}</span>
                          </div>
                          <div className="text-xs text-slate-500">{student.lastActive}</div>
                        </td>
                        <td className="py-3 px-2 text-right text-slate-700">{student.avgInventory}</td>
                        <td className="py-3 px-2 text-right text-slate-700">${student.totalCost}</td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              student.avgServiceLevel >= 95
                                ? 'text-green-600'
                                : student.avgServiceLevel >= 85
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {student.avgServiceLevel}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-slate-800">{student.totalScore}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Detail Card */}
          {selectedStudent && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">
                {students.find((s) => s.id === selectedStudent)?.name} - Detailed Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Total Stockouts</div>
                  <div className="text-2xl font-semibold text-slate-800">
                    {students.find((s) => s.id === selectedStudent)?.stockoutCount || 0}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Avg Inventory</div>
                  <div className="text-2xl font-semibold text-slate-800">
                    {students.find((s) => s.id === selectedStudent)?.avgInventory || 0}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Total Cost</div>
                  <div className="text-2xl font-semibold text-slate-800">
                    ${students.find((s) => s.id === selectedStudent)?.totalCost || 0}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Service Level</div>
                  <div className="text-2xl font-semibold text-green-600">
                    {students.find((s) => s.id === selectedStudent)?.avgServiceLevel || 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Panel - Charts */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Inventory Trends</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={inventoryOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="round" tickFormatter={(v) => `R${v}`} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Sarah" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Mike" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Emma" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="Alex" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="Jordan" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Total Cost Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Panel - Insights & Alerts */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Insights & Alerts</h3>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'success'
                      ? 'bg-green-50 border-green-500'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <alert.icon
                      className={`w-5 h-5 mt-0.5 ${
                        alert.type === 'success'
                          ? 'text-green-600'
                          : alert.type === 'warning'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-slate-800">{alert.student}</div>
                      <div className="text-xs text-slate-600 mt-1">{alert.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Performance Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Excellent (95%+)</span>
                  <span className="text-sm font-semibold text-green-600">
                    {students.filter((s) => s.avgServiceLevel >= 95).length}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(students.filter((s) => s.avgServiceLevel >= 95).length / students.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Good (85-94%)</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {students.filter((s) => s.avgServiceLevel >= 85 && s.avgServiceLevel < 95).length}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${
                        (students.filter((s) => s.avgServiceLevel >= 85 && s.avgServiceLevel < 95).length /
                          students.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Needs Improvement (&lt;85%)</span>
                  <span className="text-sm font-semibold text-red-600">
                    {students.filter((s) => s.avgServiceLevel < 85).length}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{
                      width: `${(students.filter((s) => s.avgServiceLevel < 85).length / students.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Class Achievements</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">Perfect Service</div>
                  <div className="text-xs text-slate-600">1 student</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">Cost Optimizer</div>
                  <div className="text-xs text-slate-600">2 students</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Star className="w-6 h-6 text-purple-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">Quick Learner</div>
                  <div className="text-xs text-slate-600">3 students</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Feedback Tool */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Student Feedback</h2>
        <div className="grid grid-cols-2 gap-4">
          {students.slice(0, 4).map((student) => (
            <div key={student.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-slate-800">{student.name}</div>
                <div
                  className={`text-xs px-2 py-1 rounded-full ${
                    student.avgServiceLevel >= 95
                      ? 'bg-green-100 text-green-700'
                      : student.avgServiceLevel >= 85
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {student.avgServiceLevel}%
                </div>
              </div>
              <textarea
                value={feedback[student.id] || ''}
                onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
                rows={3}
                placeholder={`Write feedback for ${student.name}...`}
              />
              <button className="mt-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                Send Feedback
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
