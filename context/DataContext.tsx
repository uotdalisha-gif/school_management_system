/**
 * context/DataContext.tsx
 * Global state provider using React Context API.
 * Orchestrates local-first data access, background sync with Supabase,
 * and optimistic UI updates for a seamless offline-capable experience.
 */
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Student, Staff, Class, SchoolEvent, Grade, Attendance, Enrollment, AuditLog, StaffPermission, DailyLog, IncidentReport, RoomStatus, UserRole } from '../types';
import { apiService, TimeSlot } from '../services/apiService';

interface DataContextType {
    students: Student[];
    staff: Staff[];
    classes: Class[];
    events: SchoolEvent[];
    grades: Grade[];
    attendance: Attendance[];
    enrollments: Enrollment[];
    staffPermissions: StaffPermission[];
    dailyLogs: DailyLog[];
    incidentReports: IncidentReport[];
    roomStatuses: RoomStatus[];
    subjects: string[];
    levels: string[];
    timeSlots: TimeSlot[];
    adminPassword: string;
    loading: boolean;
    isSyncing: boolean;
    lastSyncedAt: Date | null;
    error: string | null;
    currentUser: { id: string, name: string, role: UserRole } | null;
    setCurrentUser: (user: { id: string, name: string, role: UserRole } | null) => void;
    highlightedStudentId: string | null;
    setHighlightedStudentId: (id: string | null) => void;
    highlightedStaffId: string | null;
    setHighlightedStaffId: (id: string | null) => void;
    highlightedClassId: string | null;
    setHighlightedClassId: (id: string | null) => void;
    addStudent: (student: Omit<Student, 'id'>) => Promise<void>;
    addStudents: (students: Omit<Student, 'id'>[]) => Promise<void>;
    updateStudent: (student: Student) => Promise<void>;
    updateStudentsBatch: (students: Student[]) => Promise<void>;
    deleteStudent: (studentId: string) => Promise<void>;
    addStaff: (staffMember: Omit<Staff, 'id'>) => Promise<void>;
    addStaffBatch: (staffMembers: Omit<Staff, 'id'>[]) => Promise<void>;
    updateStaff: (staffMember: Staff) => Promise<void>;
    deleteStaff: (staffId: string) => Promise<void>;
    addClass: (classData: Omit<Class, 'id'> & { id?: string }) => Promise<void>;
    addClasses: (classesData: Omit<Class, 'id'>[]) => Promise<void>;
    updateClass: (classData: Class) => Promise<void>;
    deleteClass: (classId: string) => Promise<void>;
    addGrade: (grade: Omit<Grade, 'id'>) => Promise<void>;
    updateGrade: (grade: Grade) => Promise<void>;
    saveGradeBatch: (grades: Grade[]) => Promise<void>;
    deleteGrade: (gradeId: string) => Promise<void>;
    addAttendance: (record: Omit<Attendance, 'id'>) => Promise<void>;
    updateAttendance: (record: Attendance) => Promise<void>;
    saveAttendanceBatch: (records: Attendance[]) => Promise<void>;
    deleteAttendance: (attendanceId: string) => Promise<void>;
    addStaffPermission: (permission: Omit<StaffPermission, 'id'>) => Promise<void>;
    updateStaffPermission: (permission: StaffPermission) => Promise<void>;
    deleteStaffPermission: (permissionId: string) => Promise<void>;
    addDailyLog: (log: Omit<DailyLog, 'id'>) => Promise<void>;
    addIncidentReport: (report: Omit<IncidentReport, 'id'>) => Promise<void>;
    updateRoomStatus: (status: RoomStatus) => Promise<void>;
    addEnrollment: (enrollment: Omit<Enrollment, 'id'>) => Promise<void>;
    deleteEnrollment: (enrollmentId: string) => Promise<void>;
    updateClassEnrollments: (classId: string, studentIds: string[]) => Promise<void>;
    addEvent: (eventData: Omit<SchoolEvent, 'id'>) => Promise<void>;
    updateEvent: (eventData: SchoolEvent) => Promise<void>;
    deleteEvent: (eventId: string) => Promise<void>;
    addSubject: (subject: string) => Promise<void>;
    updateSubject: (oldSubject: string, newSubject: string) => Promise<void>;
    deleteSubject: (subject: string) => Promise<void>;
    addLevel: (level: string) => Promise<void>;
    updateLevel: (oldLevel: string, newLevel: string) => Promise<void>;
    deleteLevel: (level: string) => Promise<void>;
    addTimeSlot: (slot: Omit<TimeSlot, 'id'>) => Promise<void>;
    deleteTimeSlot: (id: string) => Promise<void>;
    setAdminPassword: (password: string) => Promise<void>;
    importAllData: (data: any) => Promise<void>;
    triggerSync: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [staffPermissions, setStaffPermissions] = useState<StaffPermission[]>([]);
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
    const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
    const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [levels, setLevels] = useState<string[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [adminPassword, setAdminPasswordState] = useState<string>('admin123');
    const [loading, setLoading] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string, name: string, role: UserRole } | null>(() => {
        try {
            const saved = localStorage.getItem('school_admin_currentUser');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
    const [highlightedStaffId, setHighlightedStaffId] = useState<string | null>(null);
    const [highlightedClassId, setHighlightedClassId] = useState<string | null>(null);

    // Initial Bootstrap: Prioritize Local Storage for speed, then sync from remote
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [s, st, c, e, g, att, enr, sub, pwd, slots, lvls, sp, logs, reports, rooms] = await Promise.all([
                    apiService.getStudents(),
                    apiService.getStaff(),
                    apiService.getClasses(),
                    apiService.getEvents(),
                    apiService.getGrades(),
                    apiService.getAttendance(),
                    apiService.getEnrollments(),
                    apiService.getSubjects(),
                    apiService.getAdminPassword(),
                    apiService.getTimeSlots(),
                    apiService.getLevels(),
                    apiService.getStaffPermissions(),
                    apiService.getDailyLogs(),
                    apiService.getIncidentReports(),
                    apiService.getRoomStatuses()
                ]);
                setStudents(s);
                setStaff(st);
                setClasses(c);
                setEvents(e);
                setGrades(g);
                setAttendance(att);
                setEnrollments(enr);
                setSubjects(sub);
                setAdminPasswordState(pwd);
                setTimeSlots(slots);
                setLevels(lvls);
                setStaffPermissions(sp);
                setDailyLogs(logs);
                setIncidentReports(reports);
                setRoomStatuses(rooms);

                if (navigator.onLine) setLastSyncedAt(new Date());
            } catch (err) {
                console.error('Initial load error:', err);
                setError('Failed to load data.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const isSyncingRef = useRef(false);

    // Sync Engine: Pushes all local state to the cloud
    /**
     * Triggers a full synchronization of all local data to Supabase.
     * Uses the batch sync RPC function for efficiency.
     */
    const triggerSync = useCallback(async () => {
        if (!navigator.onLine || isSyncingRef.current || loading) return;

        isSyncingRef.current = true;
        setIsSyncing(true);

        try {
            console.log('Starting full batch sync via RPC...');

            await apiService.syncAll({
                students,
                staff,
                staffPermissions,
                classes,
                events,
                grades,
                attendance,
                enrollments,
                dailyLogs,
                incidentReports,
                roomStatuses,
                config: [
                    { key: 'subjects', value: subjects },
                    { key: 'levels', value: levels },
                    { key: 'time_slots', value: timeSlots },
                    { key: 'admin_password', value: adminPassword }
                ]
            });

            setLastSyncedAt(new Date());
            setError(null);
            console.log('Full sync completed successfully.');
        } catch (err) {
            console.error('Sync failed:', err);
            setError('Sync failed. Some data may not be backed up.');
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [students, staff, classes, events, grades, attendance, enrollments, subjects, levels, timeSlots, adminPassword, loading, staffPermissions, dailyLogs, incidentReports, roomStatuses]);

    // Background Sync on Online Recovery
    useEffect(() => {
        const handleOnline = () => triggerSync();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [triggerSync]);

    /**
     * Optimistic UI Wrapper: Updates local state immediately for 0ms latency
     * then attempts a background sync to the persistence layer.
     */
    const performUpdate = async <T,>(
        saveFn: (data: T[]) => Promise<void>,
        setFn: React.Dispatch<React.SetStateAction<T[]>>,
        updateFn: (prev: T[]) => T[]
    ) => {
        setFn(prev => {
            const nextData = updateFn(prev);
            // Trigger sync in background immediately to update localStore and Supabase
            // We use a microtask to ensure we don't block the current render
            Promise.resolve().then(() => {
                saveFn(nextData).catch(err => {
                    console.error('Background save failed:', err);
                    setError('Save failed. Changes kept locally.');
                });
            });
            return nextData;
        });
    };

    // Auto-sync when data changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            triggerSync();
        }, 500); // 0.5 second debounce for near-immediate auto-sync
        return () => clearTimeout(timer);
    }, [students, staff, staffPermissions, dailyLogs, incidentReports, roomStatuses, classes, events, grades, attendance, enrollments, subjects, levels, timeSlots, triggerSync]);

    // --- Student Actions ---
    /**
     * Adds multiple students to the system.
     * Generates unique IDs for each new student.
     */
    const addStudents = (newStudentsData: Omit<Student, 'id'>[]) =>
        performUpdate<Student>((data) => apiService.saveStudents(data), setStudents, (current) => {
            let lastId = current.map(s => parseInt(s.id.substring(1), 10)).filter(id => !isNaN(id)).reduce((max, curr) => Math.max(max, curr), 0);
            const newOnes = newStudentsData.map(data => ({ ...data, id: `s${++lastId}` }));
            return [...current, ...newOnes];
        });

    /** Adds a single student to the system. */
    const addStudent = (data: Omit<Student, 'id'>) => addStudents([data]);
    /** Updates an existing student's information. */
    const updateStudent = (updated: Student) => performUpdate<Student>((data) => apiService.saveStudents(data), setStudents, (prev) => prev.map(s => s.id === updated.id ? updated : s));
    /** Updates multiple students at once. */
    const updateStudentsBatch = (updatedList: Student[]) =>
        performUpdate<Student>((data) => apiService.saveStudents(data), setStudents, (prev) => {
            const updatedMap = new Map(updatedList.map(s => [s.id, s]));
            return prev.map(s => updatedMap.has(s.id) ? updatedMap.get(s.id)! : s);
        });
    /** Deletes a student from the system. */
    const deleteStudent = async (id: string) => {
        setStudents(prev => prev.filter(s => s.id !== id));
        try {
            await apiService.deleteRecord('students', id);
            if (navigator.onLine) setLastSyncedAt(new Date());
        } catch (err) {
            console.warn('Delete saved locally, will sync when online.');
        }
    };

    // --- Staff Actions ---
    /** Adds multiple staff members to the system. */
    const addStaffBatch = (newData: Omit<Staff, 'id'>[]) =>
        performUpdate<Staff>((data) => apiService.saveStaff(data), setStaff, (current) => {
            const newItems = newData.map((data, idx) => {
                const shortName = data.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';
                const suffix = Date.now().toString().slice(-3) + idx;
                return { ...data, id: `${shortName}_${suffix}` };
            });
            return [...current, ...newItems];
        });
    /** Adds a single staff member. */
    const addStaff = (data: Omit<Staff, 'id'>) => addStaffBatch([data]);
    /** Updates an existing staff member's information. */
    const updateStaff = (updated: Staff) => performUpdate<Staff>((data) => apiService.saveStaff(data), setStaff, (prev) => prev.map(s => s.id === updated.id ? updated : s));
    /** Deletes a staff member from the system. */
    const deleteStaff = async (id: string) => {
        setStaff(prev => prev.filter(s => s.id !== id));
        try {
            await apiService.deleteRecord('staff', id);
            if (navigator.onLine) setLastSyncedAt(new Date());
        } catch (err) {
            console.warn('Delete saved locally, will sync when online.');
        }
    };

    // --- Class Actions ---
    /** Adds a new class. */
    const addClass = (data: Omit<Class, 'id'> & { id?: string }) => performUpdate<Class>((d) => apiService.saveClasses(d), setClasses, (prev) => [...prev, { ...data, id: data.id || `class_${Date.now()}` } as Class]);
    /** Adds multiple classes. */
    const addClasses = (data: Omit<Class, 'id'>[]) => performUpdate<Class>((d) => apiService.saveClasses(d), setClasses, (prev) => [...prev, ...data.map((d, i) => ({ ...d, id: `class_${Date.now()}_${i}` }))]);
    /** Updates an existing class. */
    const updateClass = (updated: Class) => performUpdate<Class>((d) => apiService.saveClasses(d), setClasses, (prev) => prev.map(c => c.id === updated.id ? updated : c));
    /** Deletes a class from the system. */
    const deleteClass = async (id: string) => {
        setClasses(prev => prev.filter(c => c.id !== id));
        try {
            await apiService.deleteRecord('classes', id);
            if (navigator.onLine) setLastSyncedAt(new Date());
        } catch (err) {
            console.warn('Delete saved locally, will sync when online.');
        }
    };

    // --- Grade Actions ---
    /** Adds a new grade record for a student. */
    const addGrade = (data: Omit<Grade, 'id'>) => performUpdate<Grade>((d) => apiService.saveGrades(d), setGrades, (prev) => [...prev, { ...data, id: `grade_${Date.now()}` }]);
    /** Updates an existing grade record. */
    const updateGrade = (updated: Grade) => performUpdate<Grade>((d) => apiService.saveGrades(d), setGrades, (prev) => prev.map(g => g.id === updated.id ? updated : g));
    /** Saves or updates multiple grade records efficiently. */
    const saveGradeBatch = (records: Grade[]) => performUpdate<Grade>((d) => apiService.saveGrades(d), setGrades, (prev) => {
        const next = [...prev];
        const updatedMap = new Map(records.map(r => [r.id, r]));
        return [...next.filter(r => !updatedMap.has(r.id)), ...records];
    });
    /** Deletes a grade record. */
    const deleteGrade = async (id: string) => {
        setGrades(prev => prev.filter(g => g.id !== id));
        try {
            await apiService.deleteRecord('grades', id);
        } catch (err) { }
    };

    // --- Attendance Actions ---
    /** Adds a new attendance record. */
    const addAttendance = (data: Omit<Attendance, 'id'>) => performUpdate<Attendance>((d) => apiService.saveAttendance(d), setAttendance, (prev) => [...prev, { ...data, id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` }]);
    /** Updates an existing attendance record. */
    const updateAttendance = (updated: Attendance) => performUpdate<Attendance>((d) => apiService.saveAttendance(d), setAttendance, (prev) => prev.map(a => a.id === updated.id ? updated : a));
    /** Saves or updates multiple attendance records efficiently. */
    const saveAttendanceBatch = (records: Attendance[]) => performUpdate<Attendance>((d) => apiService.saveAttendance(d), setAttendance, (prev) => {
        const next = [...prev];
        const updatedMap = new Map(records.map(r => [r.id, r]));
        return [...next.filter(r => !updatedMap.has(r.id)), ...records];
    });
    /** Deletes an attendance record. */
    const deleteAttendance = async (id: string) => {
        setAttendance(prev => prev.filter(a => a.id !== id));
        try {
            await apiService.deleteRecord('attendance', id);
        } catch (err) { }
    };

    // --- Staff Permission Actions ---
    /** Adds a new staff permission/leave record. */
    const addStaffPermission = (data: Omit<StaffPermission, 'id'>) => performUpdate<StaffPermission>((d) => apiService.saveStaffPermissions(d), setStaffPermissions, (prev) => [...prev, { ...data, id: `perm_${Date.now()}` }]);
    /** Updates an existing staff permission record. */
    const updateStaffPermission = (updated: StaffPermission) => performUpdate<StaffPermission>((d) => apiService.saveStaffPermissions(d), setStaffPermissions, (prev) => prev.map(p => p.id === updated.id ? updated : p));
    /** Deletes a staff permission record. */
    const deleteStaffPermission = async (id: string) => {
        setStaffPermissions(prev => prev.filter(p => p.id !== id));
        try {
            await apiService.deleteRecord('staff_permissions', id);
        } catch (err) { }
    };

    // --- Daily Log Actions ---
    const addDailyLog = (data: Omit<DailyLog, 'id'>) => performUpdate<DailyLog>((d) => apiService.saveDailyLogs(d), setDailyLogs, (prev) => [...prev, { ...data, id: `log_${Date.now()}` }]);

    // --- Incident Report Actions ---
    const addIncidentReport = (data: Omit<IncidentReport, 'id'>) => performUpdate<IncidentReport>((d) => apiService.saveIncidentReports(d), setIncidentReports, (prev) => [...prev, { ...data, id: `inc_${Date.now()}` }]);

    // --- Room Status Actions ---
    const updateRoomStatus = (updated: RoomStatus) => performUpdate<RoomStatus>((d) => apiService.saveRoomStatuses(d), setRoomStatuses, (prev) => {
        const exists = prev.find(s => s.id === updated.id);
        if (exists) return prev.map(s => s.id === updated.id ? updated : s);
        return [...prev, updated];
    });

    // --- Enrollment Actions ---
    /** Adds a new enrollment record (associates a student with a class). */
    const addEnrollment = (data: Omit<Enrollment, 'id'>) => performUpdate<Enrollment>((d) => apiService.saveEnrollments(d), setEnrollments, (prev) => [...prev, { ...data, id: `enr_${Date.now()}` }]);
    /** Deletes an enrollment record. */
    const deleteEnrollment = async (id: string) => {
        setEnrollments(prev => prev.filter(e => e.id !== id));
        try {
            await apiService.deleteRecord('enrollments', id);
        } catch (err) { }
    };
    /**
     * Updates the entire enrollment list for a specific class.
     * Replaces existing enrollments for that class with the new set of student IDs.
     */
    const updateClassEnrollments = async (classId: string, studentIds: string[]) => {
        const academicYear = new Date().getFullYear().toString();
        const newEnrollments: Enrollment[] = studentIds.map(sid => ({
            id: `enr_${classId}_${sid}`,
            classId,
            studentId: sid,
            academicYear
        }));

        await performUpdate<Enrollment>(
            (d) => apiService.saveEnrollments(d),
            setEnrollments,
            (prev) => {
                const otherEnrollments = prev.filter(e => e.classId !== classId);
                return [...otherEnrollments, ...newEnrollments];
            }
        );
    };

    // --- Event Actions ---
    /** Adds a new school event. */
    const addEvent = (data: Omit<SchoolEvent, 'id'>) => performUpdate<SchoolEvent>((d) => apiService.saveEvents(d), setEvents, (prev) => [...prev, { ...data, id: `evt_${Date.now()}` }].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    /** Updates an existing school event. */
    const updateEvent = (updated: SchoolEvent) => performUpdate<SchoolEvent>((d) => apiService.saveEvents(d), setEvents, (prev) => prev.map(e => e.id === updated.id ? updated : e).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    /** Deletes a school event. */
    const deleteEvent = async (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        try {
            await apiService.deleteRecord('events', id);
            if (navigator.onLine) setLastSyncedAt(new Date());
        } catch (err) {
            console.warn('Delete saved locally, will sync when online.');
        }
    };

    // --- Config Actions (Subjects, Levels, TimeSlots) ---
    /** Adds a new subject to the global list. */
    const addSubject = (subject: string) => performUpdate<string>((d) => apiService.saveSubjects(d), setSubjects, (prev) => [...new Set([...prev, subject])].sort());
    /** Updates a subject name globally and in staff records. */
    const updateSubject = async (old: string, next: string) => {
        const nextSubs = subjects.map(s => s === old ? next : s);
        const nextStaff = staff.map(s => s.subject === old ? { ...s, subject: next } : s);
        setSubjects(nextSubs);
        setStaff(nextStaff);
        try { await Promise.all([apiService.saveSubjects(nextSubs), apiService.saveStaff(nextStaff)]); } catch (e) { }
    };
    /** Deletes a subject globally. */
    const deleteSubject = async (target: string) => {
        const nextSubs = subjects.filter(s => s !== target);
        const nextStaff = staff.map(s => s.subject === target ? { ...s, subject: undefined } : s);
        setSubjects(nextSubs);
        setStaff(nextStaff);
        try { await Promise.all([apiService.saveSubjects(nextSubs), apiService.saveStaff(nextStaff)]); } catch (e) { }
    };

    /** Adds a new academic level. */
    const addLevel = (level: string) => performUpdate<string>((d) => apiService.saveLevels(d), setLevels, (prev) => [...new Set([...prev, level])]);
    /** Updates an academic level name globally. */
    const updateLevel = async (old: string, next: string) => {
        const nextLevels = levels.map(l => l === old ? next : l);
        const nextStudents = students.map(s => s.level === old ? { ...s, level: next } : s);
        const nextClasses = classes.map(c => c.level === old ? { ...c, level: next } : c);
        setLevels(nextLevels);
        setStudents(nextStudents);
        setClasses(nextClasses);
        try { await Promise.all([apiService.saveLevels(nextLevels), apiService.saveStudents(nextStudents), apiService.saveClasses(nextClasses)]); } catch (e) { }
    };
    /** Deletes an academic level. */
    const deleteLevel = (target: string) => performUpdate(apiService.saveLevels, setLevels, (prev) => prev.filter(l => l !== target));

    /** Adds a new class time slot. */
    const addTimeSlot = (slot: Omit<TimeSlot, 'id'>) => performUpdate<TimeSlot>((d) => apiService.saveTimeSlots(d), setTimeSlots, (prev) => [...prev, { ...slot, id: `slot_${Date.now()}` }]);
    /** Deletes a class time slot. */
    const deleteTimeSlot = (id: string) => performUpdate<TimeSlot>((d) => apiService.saveTimeSlots(d), setTimeSlots, (prev) => prev.filter(s => s.id !== id));

    /** Sets the administrative password. */
    const setAdminPassword = async (pwd: string) => {
        setAdminPasswordState(pwd);
        await apiService.saveAdminPassword(pwd);
    };

    /** Imports a full data backup into the system. */
    const importAllData = async (data: any) => {
        setLoading(true);
        try {
            await apiService.importAllData(data);
            setStudents(data.students || []);
            setStaff(data.staff || []);
            setStaffPermissions(data.staffPermissions || []);
            setClasses(data.classes || []);
            setEvents(data.events || []);
            setSubjects(data.subjects || []);
            setLevels(data.levels || []);
            setTimeSlots(data.timeSlots || []);
            setAdminPasswordState(data.adminPassword || 'admin123');
            setLastSyncedAt(new Date());
        } finally {
            setLoading(false);
        }
    };

    const handleSetCurrentUser = useCallback((user: { id: string, name: string, role: UserRole } | null) => {
        setCurrentUser(user);
        if (user) {
            localStorage.setItem('school_admin_currentUser', JSON.stringify(user));
        } else {
            localStorage.removeItem('school_admin_currentUser');
        }
    }, []);

    const value = {
        students, staff, classes, events, grades, attendance, enrollments, staffPermissions, dailyLogs, incidentReports, roomStatuses, subjects, levels, timeSlots, adminPassword,
        loading, isSyncing, lastSyncedAt, error, currentUser, setCurrentUser: handleSetCurrentUser, highlightedStudentId, setHighlightedStudentId,
        highlightedStaffId, setHighlightedStaffId, highlightedClassId, setHighlightedClassId,
        addStudent, addStudents, updateStudent, updateStudentsBatch, deleteStudent,
        addStaff, addStaffBatch, updateStaff, deleteStaff,
        addClass, addClasses, updateClass, deleteClass,
        addGrade, updateGrade, saveGradeBatch, deleteGrade,
        addAttendance, updateAttendance, saveAttendanceBatch, deleteAttendance,
        addStaffPermission, updateStaffPermission, deleteStaffPermission,
        addDailyLog, addIncidentReport, updateRoomStatus,
        addEnrollment, deleteEnrollment, updateClassEnrollments,
        addEvent, updateEvent, deleteEvent,
        addSubject, updateSubject, deleteSubject,
        addLevel, updateLevel, deleteLevel,
        addTimeSlot, deleteTimeSlot, setAdminPassword,
        importAllData, triggerSync
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) throw new Error('useData must be used within a DataProvider');
    return context;
};
