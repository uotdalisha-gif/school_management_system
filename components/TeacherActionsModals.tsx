import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Class, Student, AttendanceStatus, Attendance, Grade } from '../types';

interface AttendanceModalProps {
    classData: Class;
    students: Student[];
    onClose: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ classData, students, onClose }) => {
    const { attendance, saveAttendanceBatch } = useData();
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Map of studentId -> AttendanceStatus
    const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

    // Read existing attendance for this date
    useEffect(() => {
        const existingForDate = attendance.filter(a => a.date === date);
        const newMap: Record<string, AttendanceStatus> = {};

        // Initialize with default 'Present' for everyone in the class
        students.forEach(s => {
            newMap[s.id] = AttendanceStatus.Present;
        });

        // Override with existing records if they exist
        students.forEach(s => {
            const existing = existingForDate.find(a => a.studentId === s.id);
            if (existing) {
                newMap[s.id] = existing.status;
            }
        });

        setStatusMap(newMap);
    }, [date, students, attendance]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStatusMap(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        // Collect existing records to keep their IDs, or generate new ones
        const existingForDate = attendance.filter(a => a.date === date);

        const recordsToSave: Attendance[] = students.map(s => {
            const existing = existingForDate.find(a => a.studentId === s.id);
            return {
                id: existing ? existing.id : `att_${Date.now()}_${s.id}`,
                studentId: s.id,
                date,
                status: statusMap[s.id] || AttendanceStatus.Present,
            };
        });

        await saveAttendanceBatch(recordsToSave);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Attendance</h2>
                        <p className="text-sm text-slate-500">{classData.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-3">
                        {students.map(student => (
                            <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                <span className="font-medium text-slate-800 mb-2 sm:mb-0">{student.name}</span>
                                <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200">
                                    {(Object.values(AttendanceStatus) as AttendanceStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(student.id, status)}
                                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${statusMap[student.id] === status
                                                    ? status === AttendanceStatus.Present ? 'bg-emerald-500 text-white' :
                                                        status === AttendanceStatus.Late ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {students.length === 0 && (
                            <p className="text-center text-slate-500 py-4">No students enrolled in this class.</p>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm">
                        Save Attendance
                    </button>
                </div>
            </div>
        </div>
    );
};

interface GradesModalProps {
    classData: Class;
    students: Student[];
    onClose: () => void;
}

export const GradesModal: React.FC<GradesModalProps> = ({ classData, students, onClose }) => {
    const { grades, subjects, saveGradeBatch } = useData();
    const [selectedSubject, setSelectedSubject] = useState(subjects[0] || 'General');
    const [term, setTerm] = useState('Midterm');

    // Map of studentId -> score
    const [scoreMap, setScoreMap] = useState<Record<string, number | "">>({});

    // Read existing grades for this subject and term
    useEffect(() => {
        const existingGrades = grades.filter(g => g.subject === selectedSubject && g.term === term);
        const newMap: Record<string, number | ""> = {};

        students.forEach(s => {
            const existing = existingGrades.find(g => g.studentId === s.id);
            if (existing) {
                newMap[s.id] = existing.score;
            } else {
                newMap[s.id] = "";
            }
        });

        setScoreMap(newMap);
    }, [selectedSubject, term, students, grades]);

    const handleScoreChange = (studentId: string, val: string) => {
        const num = parseFloat(val);
        if (val === "") {
            setScoreMap(prev => ({ ...prev, [studentId]: "" }));
        } else if (!isNaN(num) && num >= 0 && num <= 10) {
            setScoreMap(prev => ({ ...prev, [studentId]: num }));
        }
    };

    const handleSave = async () => {
        const existingGrades = grades.filter(g => g.subject === selectedSubject && g.term === term);

        const recordsToSave: Grade[] = [];

        students.forEach(s => {
            const score = scoreMap[s.id];
            if (score !== "") {
                const existing = existingGrades.find(g => g.studentId === s.id);
                recordsToSave.push({
                    id: existing ? existing.id : `grade_${Date.now()}_${s.id}`,
                    studentId: s.id,
                    subject: selectedSubject,
                    score: score as number,
                    term
                });
            }
        });

        if (recordsToSave.length > 0) {
            await saveGradeBatch(recordsToSave);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Grades</h2>
                        <p className="text-sm text-slate-500">{classData.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            >
                                {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                {subjects.length === 0 && <option value="General">General</option>}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Term</label>
                            <select
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            >
                                <option value="Midterm">Midterm</option>
                                <option value="Finals">Finals</option>
                                <option value="Q1">Quarter 1</option>
                                <option value="Q2">Quarter 2</option>
                                <option value="Q3">Quarter 3</option>
                                <option value="Q4">Quarter 4</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <span>Student</span>
                            <span>Score (0-10)</span>
                        </div>
                        {students.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                <span className="font-medium text-slate-800">{student.name}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    placeholder="--"
                                    value={scoreMap[student.id] === "" ? "" : scoreMap[student.id]}
                                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                    className="w-20 px-3 py-1.5 text-center bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-700"
                                />
                            </div>
                        ))}
                        {students.length === 0 && (
                            <p className="text-center text-slate-500 py-4">No students enrolled in this class.</p>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm">
                        Save Grades
                    </button>
                </div>
            </div>
        </div>
    );
};
