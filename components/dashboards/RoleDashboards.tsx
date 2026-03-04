import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { UserRole, StaffRole, AttendanceStatus, StudentStatus, DailyLog, IncidentReport, RoomStatus } from '../../types';
import PerformanceChart from '../charts/PerformanceChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AttendanceModal, GradesModal } from '../TeacherActionsModals';

// --- Shared Components ---
const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ${className}`}>
        <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

// --- Admin Dashboard ---
export const AdminDashboard: React.FC = () => {
    const { students, staff, classes, enrollments } = useData();

    const revenueData = useMemo(() => {
        const totalTuition = students.reduce((acc, s) => acc + s.tuition.total, 0);
        const paidTuition = students.reduce((acc, s) => acc + s.tuition.paid, 0);
        return [
            { name: 'Paid', value: paidTuition, color: '#10b981' },
            { name: 'Unpaid', value: totalTuition - paidTuition, color: '#f43f5e' }
        ];
    }, [students]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Revenue Status">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={revenueData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {revenueData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card title="Staff Overview">
                    <div className="space-y-4">
                        {Object.values(StaffRole).map(role => (
                            <div key={role} className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">{role}</span>
                                <span className="font-bold text-slate-800">{staff.filter(s => s.role === role).length}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title="Quick Stats">
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-xs text-blue-600 font-bold uppercase">Total Students</p>
                            <p className="text-2xl font-bold text-blue-900">{students.length}</p>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-xl">
                            <p className="text-xs text-indigo-600 font-bold uppercase">Active Classes</p>
                            <p className="text-2xl font-bold text-indigo-900">{classes.length}</p>
                        </div>
                    </div>
                </Card>
            </div>
            <Card title="Academic Performance Heatmap">
                <PerformanceChart subjectFilter="All" />
            </Card>
        </div>
    );
};

// --- Teacher Dashboard ---
console.log('Teacher Dashboard Initializing...')
export const TeacherDashboard: React.FC = () => {
    const { currentUser, classes, enrollments, students } = useData();
    const myClasses = classes.filter(c => c.teacherId === currentUser?.id);

    const [actionState, setActionState] = useState<{ type: 'attendance' | 'grades', classId: string } | null>(null);

    const getStudentsForClass = (classId: string) => {
        const classEnrolls = enrollments.filter(e => e.classId === classId);
        return classEnrolls.map(e => students.find(s => s.id === e.studentId)).filter(Boolean) as any[];
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">My Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myClasses.map(c => {
                    const classEnrollments = enrollments.filter(e => e.classId === c.id);
                    return (
                        <Card key={c.id} title={c.name} className="hover:border-primary-300 transition-colors cursor-pointer">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">{c.schedule}</p>
                                    <p className="text-sm font-bold text-slate-700">{classEnrollments.length} Students Enrolled</p>
                                </div>
                                {classEnrollments.length > 0 && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-40 overflow-y-auto">
                                        <ul className="space-y-1">
                                            {classEnrollments.map(e => {
                                                const s = students.find(st => st.id === e.studentId);
                                                return s ? (
                                                    <li key={e.id} className="text-sm text-slate-600 flex items-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mr-2"></span>
                                                        {s.name}
                                                    </li>
                                                ) : null;
                                            })}
                                        </ul>
                                    </div>
                                )}
                                <div className="pt-2 flex space-x-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActionState({ type: 'attendance', classId: c.id }); }}
                                        className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-bold shadow hover:bg-primary-700 transition"
                                    >
                                        Attendance
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActionState({ type: 'grades', classId: c.id }); }}
                                        className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-bold shadow-sm border border-slate-200 hover:bg-slate-200 transition"
                                    >
                                        Grades
                                    </button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                {myClasses.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400">You are not assigned to any classes yet.</p>
                    </div>
                )}
            </div>

            {actionState?.type === 'attendance' && (
                <AttendanceModal
                    classData={classes.find(c => c.id === actionState.classId)!}
                    students={getStudentsForClass(actionState.classId)}
                    onClose={() => setActionState(null)}
                />
            )}

            {actionState?.type === 'grades' && (
                <GradesModal
                    classData={classes.find(c => c.id === actionState.classId)!}
                    students={getStudentsForClass(actionState.classId)}
                    onClose={() => setActionState(null)}
                />
            )}
        </div>
    );
};

// --- Office Worker Dashboard ---
export const OfficeWorkerDashboard: React.FC = () => {
    const { students } = useData();
    const pendingTuition = students.filter(s => s.tuition.paid < s.tuition.total);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Pending Tuition Payments">
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {pendingTuition.map(s => (
                            <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                    <p className="text-xs text-slate-500">Balance: ${(s.tuition.total - s.tuition.paid).toLocaleString()}</p>
                                </div>
                                <button className="text-xs font-bold text-primary-600 hover:underline">Record Payment</button>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title="Recent Registrations">
                    <div className="space-y-3">
                        {students.slice(-5).reverse().map(s => (
                            <div key={s.id} className="p-3 border border-slate-100 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{s.name}</p>
                                    <p className="text-xs text-slate-500">Joined: {new Date(s.enrollmentDate).toLocaleDateString()}</p>
                                </div>
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">New</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Guard Dashboard ---
export const GuardDashboard: React.FC = () => {
    const { dailyLogs, addDailyLog, addIncidentReport, currentUser } = useData();
    const [logType, setLogType] = useState<'Entry' | 'Exit'>('Entry');
    const [personName, setPersonName] = useState('');
    const [purpose, setPurpose] = useState('');

    const handleLogSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!personName || !currentUser) return;
        addDailyLog({
            staffId: currentUser.id,
            type: logType,
            personName,
            purpose,
            timestamp: new Date().toISOString()
        });
        setPersonName('');
        setPurpose('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
                <Card title="Daily Log Entry">
                    <form onSubmit={handleLogSubmit} className="space-y-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setLogType('Entry')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${logType === 'Entry' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Entry
                            </button>
                            <button
                                type="button"
                                onClick={() => setLogType('Exit')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${logType === 'Exit' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Exit
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Person Name"
                            value={personName}
                            onChange={(e) => setPersonName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-black"
                            required
                        />
                        <textarea
                            placeholder="Purpose of visit"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all min-h-[80px] text-black"
                        />
                        <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all">
                            Submit Log
                        </button>
                    </form>
                </Card>
                <button
                    onClick={() => {
                        const title = window.prompt('Incident Title:');
                        if (title && currentUser) {
                            addIncidentReport({
                                staffId: currentUser.id,
                                title,
                                description: window.prompt('Description:') || '',
                                severity: 'Medium',
                                timestamp: new Date().toISOString()
                            });
                        }
                    }}
                    className="w-full bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center space-x-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Report Incident</span>
                </button>
            </div>
            <div className="lg:col-span-8">
                <Card title="Recent Activity Log">
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {dailyLogs.slice().reverse().map(log => (
                            <div key={log.id} className="flex items-start space-x-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className={`p-2 rounded-xl ${log.type === 'Entry' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {log.type === 'Entry' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800">{log.personName}</h4>
                                        <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-500">{log.purpose}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Cleaner Dashboard ---
export const CleanerDashboard: React.FC = () => {
    const { roomStatuses, updateRoomStatus, currentUser } = useData();

    // Mock rooms if none exist
    const rooms = roomStatuses.length > 0 ? roomStatuses : [
        { id: 'r1', roomName: 'Room 101', status: 'Cleaned', lastUpdatedBy: 'cleaner_1', timestamp: new Date().toISOString() },
        { id: 'r2', roomName: 'Room 102', status: 'Needs Attention', lastUpdatedBy: 'cleaner_1', timestamp: new Date().toISOString() },
        { id: 'r3', roomName: 'Cafeteria', status: 'Cleaned', lastUpdatedBy: 'cleaner_1', timestamp: new Date().toISOString() },
        { id: 'r4', roomName: 'Gym', status: 'Needs Attention', lastUpdatedBy: 'cleaner_1', timestamp: new Date().toISOString() },
    ] as RoomStatus[];

    const toggleStatus = (room: RoomStatus) => {
        if (!currentUser) return;
        updateRoomStatus({
            ...room,
            status: room.status === 'Cleaned' ? 'Needs Attention' : 'Cleaned',
            lastUpdatedBy: currentUser.id,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Facility Maintenance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.map(room => (
                    <div
                        key={room.id}
                        onClick={() => toggleStatus(room)}
                        className={`p-6 rounded-3xl border-2 cursor-pointer transition-all active:scale-95 ${room.status === 'Cleaned'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                            : 'bg-amber-50 border-amber-100 text-amber-800'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${room.status === 'Cleaned' ? 'bg-emerald-200' : 'bg-amber-200'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${room.status === 'Cleaned' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
                                {room.status}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-1">{room.roomName}</h3>
                        <p className="text-xs opacity-70">Last update: {new Date(room.timestamp).toLocaleTimeString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
