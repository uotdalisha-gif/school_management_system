
// FIX: Added missing React import to resolve namespace errors.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Student, StudentStatus, UserRole } from '../types';
import { parseStudentCSV } from '../utils/csvParser';
import ImportResultsModal from '../components/ImportResultsModal';
import ReportCardModal from '../components/ReportCardModal';
import { generateStudentListCSV } from '../utils/reportGenerator';

interface StudentModalProps {
    studentData: Student | null;
    onClose: () => void;
}

const StudentModal: React.FC<StudentModalProps> = ({ studentData, onClose }) => {
    const { addStudent, updateStudent, levels } = useData();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        dob: '',
        sex: 'Male' as 'Male' | 'Female',
        level: levels[0] || 'K1',
        status: StudentStatus.Active,
        phone: '',
        enrollmentDate: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (studentData) {
            setFormData({
                name: studentData.name,
                dob: studentData.dob,
                sex: studentData.sex,
                level: studentData.level,
                status: studentData.status,
                phone: studentData.phone,
                enrollmentDate: studentData.enrollmentDate,
            });
        }
    }, [studentData, levels]);

    /**
     * Handles changes to form input fields.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    /**
     * Validates and submits the student form data.
     * Handles both creation of new students and updates to existing ones.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSaving(true);

        if (!formData.name || !formData.sex) {
            setError('Please provide at least a Name and Gender.');
            setIsSaving(false);
            return;
        }

        // Logic Validation: Cannot enroll before being born
        if (formData.dob && formData.enrollmentDate) {
            const birth = new Date(formData.dob);
            const enrollment = new Date(formData.enrollmentDate);
            if (enrollment < birth) {
                setError('Enrollment date cannot be earlier than the date of birth.');
                setIsSaving(false);
                return;
            }
        }

        const payload = {
            ...formData,
            // Preserve existing tuition data or initialize with zeros
            tuition: studentData ? studentData.tuition : { total: 0, paid: 0 },
        };

        try {
            if (studentData) {
                await updateStudent({ ...studentData, ...payload });
            } else {
                await addStudent(payload);
            }
            onClose();
        } catch (err) {
            setError('Save failed: Verify network and storage.');
        } finally {
            setIsSaving(false);
        }
    };

    const labelStyle = "block text-sm font-semibold text-primary-900";
    const inputStyle = "mt-1 w-full px-3 py-2 bg-white border border-gray-400 rounded-md text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">{studentData ? 'Update Student Record' : 'Register New Student'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Full Name *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputStyle} required />
                        </div>
                        <div>
                            <label className={labelStyle}>Date of Birth</label>
                            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Sex *</label>
                            <select name="sex" value={formData.sex} onChange={handleChange} className={inputStyle}>
                                <option>Male</option>
                                <option>Female</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Phone Number</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelStyle}>Study Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className={inputStyle}>
                                {Object.values(StudentStatus).map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelStyle}>Enrollment Date</label>
                            <input type="date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleChange} className={inputStyle} required />
                        </div>
                    </div>
                    {error && (
                        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1">
                            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs font-bold text-red-600 leading-tight">{error}</p>
                        </div>
                    )}
                    <div className="flex justify-end pt-6 space-x-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-200 flex items-center">
                            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>}
                            {studentData ? 'Update Record' : 'Save Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ITEMS_PER_PAGE = 20;

const StudentsPage: React.FC = () => {
    const { students, deleteStudent, highlightedStudentId, setHighlightedStudentId, addStudents, loading, enrollments, classes, currentUser } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [selectedReportStudent, setSelectedReportStudent] = useState<Student | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importResults, setImportResults] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const highlightedRowRef = useRef<HTMLTableRowElement>(null);

    const isAdmin = currentUser?.role === UserRole.Admin;
    const isOffice = currentUser?.role === UserRole.OfficeWorker;

    const filteredStudents = useMemo(() => {
        if (!currentUser || isAdmin || isOffice) {
            return students;
        }

        if (currentUser.role === UserRole.Teacher) {
            // Find classes assigned to this teacher
            const teacherClasses = classes.filter(c => c.teacherId === currentUser.id);
            const teacherClassIds = new Set(teacherClasses.map(c => c.id));

            // Find students enrolled in those classes
            const teacherStudentIds = new Set(
                enrollments
                    .filter(e => teacherClassIds.has(e.classId))
                    .map(e => e.studentId)
            );

            return students.filter(s => teacherStudentIds.has(s.id));
        }

        return [];
    }, [students, currentUser, classes, enrollments, isAdmin, isOffice]);

    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    useEffect(() => {
        if (highlightedStudentId) {
            const index = filteredStudents.findIndex(s => s.id === highlightedStudentId);
            if (index !== -1) {
                const targetPage = Math.floor(index / ITEMS_PER_PAGE) + 1;
                if (currentPage !== targetPage) setCurrentPage(targetPage);
                setTimeout(() => highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
            const timer = setTimeout(() => setHighlightedStudentId(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [highlightedStudentId, setHighlightedStudentId, filteredStudents, currentPage]);

    /**
     * Opens the student creation/edit modal.
     */
    const handleOpenModal = (student: Student | null = null) => {
        setEditingStudent(student);
        setIsModalOpen(true);
    };

    /**
     * Handles the deletion of a student record with confirmation.
     */
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to permanently delete this student record?')) {
            try {
                setIsDeletingId(id);
                await deleteStudent(id);
            } catch (e) {
                console.error(e);
                alert('Deletion failed. Please try again.');
            } finally {
                setIsDeletingId(null);
            }
        }
    };

    /**
     * Generates and downloads a CSV template for student imports.
     */
    const handleDownloadTemplate = () => {
        const headers = ['Full Name', 'Sex', 'Date of Birth', 'Level', 'Phone Number', 'Enrollment Date', 'Status'];
        const blob = new Blob([headers.join(',')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'student_template.csv';
        link.click();
    };

    /**
     * Exports the current student list to a CSV file.
     */
    const handleExportCSV = () => {
        const csvContent = generateStudentListCSV(filteredStudents);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `student_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    /**
     * Processes a CSV file upload for importing students.
     * Checks for duplicates before adding.
     */
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const { validStudents, errors } = parseStudentCSV(await file.text());
        const existingIdentifiers = new Set(students.map(s => `${s.name.toLowerCase()}|${s.sex.toLowerCase()}`));
        const nonDuplicateStudents = validStudents.filter(s => !existingIdentifiers.has(`${s.name.toLowerCase()}|${s.sex.toLowerCase()}`));
        if (nonDuplicateStudents.length > 0) {
            await addStudents(nonDuplicateStudents);
        }
        setImportResults({ successCount: nonDuplicateStudents.length, errorCount: errors.length, errors: errors });
        setIsImportModalOpen(true);
        e.target.value = '';
    };

    /**
     * Returns Tailwind classes for student status badges based on their status.
     */
    const getStatusStyle = (status: StudentStatus) => {
        switch (status) {
            case StudentStatus.Active: return 'bg-blue-50 text-blue-600 border-blue-100';
            case StudentStatus.Suspended: return 'bg-amber-50 text-amber-600 border-amber-100';
            case StudentStatus.Dropout: return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-gray-50 text-gray-500';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Student Records</h1>
                    <p className="text-slate-500 mt-1">Manage enrollments and levels.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(isAdmin || isOffice) && (
                        <>
                            <button type="button" onClick={handleExportCSV} className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 text-sm font-semibold flex items-center transition-colors">Export</button>
                            <button type="button" onClick={handleDownloadTemplate} className="bg-white text-emerald-600 border border-emerald-100 px-4 py-2 rounded-lg hover:bg-emerald-50 text-sm font-semibold flex items-center transition-colors">Template</button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-semibold transition-all">Import CSV</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                            <button type="button" onClick={() => handleOpenModal()} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-bold shadow-lg shadow-primary-200 transition-all">+ New Student</button>
                        </>
                    )}
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Class</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {paginatedStudents.map(student => {
                                const isHighlighted = student.id === highlightedStudentId;
                                const isDeleting = isDeletingId === student.id;

                                const enrollment = enrollments.find(e => e.studentId === student.id);
                                const studentClass = enrollment ? classes.find(c => c.id === enrollment.classId) : null;

                                return (
                                    <tr key={student.id} ref={isHighlighted ? highlightedRowRef : null} className={`transition-all duration-700 ${isHighlighted ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-400">{student.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{student.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.sex}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {student.phone ? (
                                                <a href={`tel:${student.phone}`} className="flex items-center gap-1.5 text-primary-600 hover:text-primary-800 font-medium transition-colors">
                                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                    {student.phone}
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 italic">No contact</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {studentClass ? `${studentClass.name} (${studentClass.level})` : <span className="text-slate-300 italic">Unassigned</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-[10px] leading-tight font-bold rounded-full border ${getStatusStyle(student.status)}`}>
                                                {student.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold space-x-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedReportStudent(student);
                                                    setIsReportModalOpen(true);
                                                }}
                                                className="text-emerald-600 hover:text-emerald-800 transition-colors"
                                            >
                                                Report Card
                                            </button>
                                            {(isAdmin || isOffice) && (
                                                <>
                                                    <button type="button" onClick={() => handleOpenModal(student)} className="text-primary-600 hover:text-primary-800 transition-colors">Edit</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(student.id)}
                                                        disabled={loading || !!isDeletingId}
                                                        className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 min-w-[50px] inline-flex items-center justify-end"
                                                    >
                                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredStudents.length === 0 && !loading && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredStudents.length > 0 && (
                    <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                        <p className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border bg-white border-slate-200 disabled:opacity-50">Prev</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border bg-white border-slate-200 disabled:opacity-50">Next</button>
                        </div>
                    </div>
                )}
            </div>
            {isModalOpen && <StudentModal studentData={editingStudent} onClose={() => setIsModalOpen(false)} />}
            {isReportModalOpen && selectedReportStudent && (
                <ReportCardModal
                    student={selectedReportStudent}
                    onClose={() => setIsReportModalOpen(false)}
                />
            )}
            {isImportModalOpen && <ImportResultsModal results={importResults} onClose={() => setIsImportModalOpen(false)} />}
        </div>
    );
};

export default StudentsPage;
