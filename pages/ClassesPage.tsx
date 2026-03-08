
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Class, StaffRole } from '../types';
import ClassModal from '../components/ClassModal';
import { generateSingleClassCSV, generateBulkClassCSV } from '../utils/reportGenerator';
import { parseClassCSV } from '../utils/csvParser';
import ImportResultsModal from '../components/ImportResultsModal';

interface ImportResults {
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string }[];
}

const ClassesPage: React.FC = () => {
    const { classes, staff, students, timeSlots, levels, deleteClass, addClasses, highlightedClassId, setHighlightedClassId, enrollments, currentUser } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const highlightedRowRef = useRef<HTMLDivElement>(null);
    const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

    // --- Bulk Selection State ---
    const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

    // --- Filter State ---
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
    const [selectedTime, setSelectedTime] = useState<string>('all');
    const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
    const teacherDropdownRef = useRef<HTMLDivElement>(null);

    // --- Import State ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importResults, setImportResults] = useState<ImportResults | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableTeachers = useMemo(() => staff.filter(s => s.role === StaffRole.Teacher), [staff]);
    const allSessionLabels = useMemo(() => timeSlots.map(s => s.time), [timeSlots]);

    // Close teacher dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(event.target as Node)) {
                setIsTeacherDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Effect for highlighting row from global search
    useEffect(() => {
        if (highlightedClassId) {
            highlightedRowRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
            const timer = setTimeout(() => {
                setHighlightedClassId(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [highlightedClassId, setHighlightedClassId]);


    /**
     * Opens the class creation/edit modal.
     */
    const handleOpenModal = (e?: React.MouseEvent, classData: Class | null = null) => {
        if (e) e.stopPropagation();
        setEditingClass(classData);
        setIsModalOpen(true);
    };

    /**
     * Closes the class modal and resets editing state.
     */
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClass(null);
    };

    const filteredClasses = useMemo(() => {
        let baseClasses = classes;
        if (currentUser?.role === StaffRole.Teacher) {
            baseClasses = classes.filter(cls => cls.teacherId === currentUser.id);
        }
        return baseClasses
            .filter(cls => selectedLevel === 'all' || cls.level === selectedLevel)
            .filter(cls => selectedTeacherIds.length === 0 || selectedTeacherIds.includes(cls.teacherId))
            .filter(cls => selectedTime === 'all' || cls.schedule.includes(selectedTime));
    }, [classes, selectedLevel, selectedTeacherIds, selectedTime, currentUser]);

    /**
     * Toggles the selection of a class for bulk actions.
     */
    const handleToggleSelect = (classId: string) => {
        setSelectedClassIds(prev => {
            const next = new Set(prev);
            if (next.has(classId)) next.delete(classId);
            else next.add(classId);
            return next;
        });
    };

    /**
     * Selects or deselects all currently filtered classes.
     */
    const handleSelectAllInView = () => {
        if (selectedClassIds.size >= filteredClasses.length) {
            setSelectedClassIds(new Set());
        } else {
            setSelectedClassIds(new Set(filteredClasses.map(c => c.id)));
        }
    };

    /**
     * Exports selected classes to a CSV file.
     * Generates a single class roster or a bulk export depending on selection count.
     */
    const handleExportSelected = () => {
        const selectedList = filteredClasses.filter(c => selectedClassIds.has(c.id));
        if (selectedList.length === 0) return;

        let csvContent = "";
        let filename = "exported_classes.csv";

        if (selectedList.length === 1) {
            csvContent = generateSingleClassCSV(selectedList[0], staff, students, enrollments);
            filename = `${selectedList[0].name.replace(/\s+/g, '_')}_roster.csv`;
        } else {
            csvContent = generateBulkClassCSV(selectedList, staff, students, enrollments);
            filename = `bulk_class_export_${new Date().toISOString().split('T')[0]}.csv`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Generates and downloads a CSV template for class imports.
     */
    const handleDownloadTemplate = () => {
        const headers = ['Class Name', 'Level', 'Teacher', 'Schedule'];
        const csvContent = headers.join(',');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'class_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    /**
     * Triggers the file input click for importing classes.
     */
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    /**
     * Processes a CSV file upload for importing classes.
     */
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const fileContent = await file.text();
        const { validClasses, errors } = parseClassCSV(fileContent, staff);

        if (validClasses.length > 0) {
            await addClasses(validClasses);
        }

        setImportResults({
            successCount: validClasses.length,
            errorCount: errors.length,
            errors: errors,
        });
        setIsImportModalOpen(true);

        if (event.target) {
            event.target.value = '';
        }
    };

    /**
     * Retrieves the name of a teacher by their ID.
     */
    const getTeacherName = (teacherId: string) => {
        return staff.find(t => t.id === teacherId)?.name || 'Unassigned';
    };

    /**
     * Toggles a teacher's inclusion in the filter criteria.
     */
    const handleTeacherSelect = (teacherId: string) => {
        setSelectedTeacherIds(prev =>
            prev.includes(teacherId)
                ? prev.filter(id => id !== teacherId)
                : [...prev, teacherId]
        );
    };

    // Group classes by session label
    const classesByTimeSlot = useMemo(() => {
        const grouped: { [key: string]: Class[] } = {};
        allSessionLabels.forEach(label => {
            grouped[label] = [];
        });
        grouped['Other Schedule'] = []; // Fallback bucket for unmatched schedules

        filteredClasses.forEach(cls => {
            const matchedSlot = allSessionLabels.find(label => cls.schedule.includes(label));
            if (matchedSlot) {
                grouped[matchedSlot].push(cls);
            } else {
                grouped['Other Schedule'].push(cls);
            }
        });
        return grouped;
    }, [filteredClasses, allSessionLabels]);

    const selectClasses = "block w-full pl-3 pr-10 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow";

    return (
        <div className="max-w-7xl mx-auto pb-10 space-y-6">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classes</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage schedules, room assignments, and enrollment.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedClassIds.size > 0 && (
                        <button
                            onClick={handleExportSelected}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm animate-in fade-in zoom-in duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            <span>Export ({selectedClassIds.size})</span>
                        </button>
                    )}
                    <button
                        onClick={handleDownloadTemplate}
                        className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Template
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        Import
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv"
                        className="hidden"
                    />
                    <button
                        onClick={(e) => handleOpenModal(e)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Class
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-3 mr-auto">
                    <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={filteredClasses.length > 0 && selectedClassIds.size === filteredClasses.length}
                            onChange={handleSelectAllInView}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Select All</span>
                    </label>
                    <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:block">Filters:</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} className={selectClasses}>
                        <option value="all">All Levels</option>
                        {levels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>

                    <div className="relative w-full sm:w-64" ref={teacherDropdownRef}>
                        <button onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)} className={`${selectClasses} text-left flex justify-between items-center`}>
                            <span className="truncate">
                                {selectedTeacherIds.length === 0 ? 'All Teachers' : `${selectedTeacherIds.length} teachers selected`}
                            </span>
                            <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {isTeacherDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full bg-white shadow-xl border border-slate-100 rounded-lg max-h-60 overflow-auto">
                                <ul className="p-1">
                                    {availableTeachers.map(teacher => (
                                        <li key={teacher.id}>
                                            <label className="flex items-center gap-3 p-2.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                    checked={selectedTeacherIds.includes(teacher.id)}
                                                    onChange={() => handleTeacherSelect(teacher.id)}
                                                />
                                                <span className="text-sm text-slate-700">{teacher.name}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className={selectClasses}>
                        <option value="all">All Times</option>
                        {allSessionLabels.map(label => <option key={label} value={label}>{label}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Content: List View */}
            <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
                {allSessionLabels.length === 0 && classesByTimeSlot['Other Schedule']?.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-slate-500 italic">No sessions defined and no classes exist. Go to Settings to add school sessions (time slots).</p>
                    </div>
                ) : (
                    [...allSessionLabels, 'Other Schedule'].map(label => {
                        const slotClasses = classesByTimeSlot[label];

                        // Prevent undefined errors if it doesn't exist
                        if (!slotClasses) return null;

                        // Skip rendering empty time slots 
                        if (slotClasses.length === 0) return null;

                        return (
                            <div key={label} className="border-b last:border-b-0 border-slate-100">
                                {/* Time Slot Header */}
                                <div className="bg-slate-50/80 backdrop-blur-sm px-6 py-2.5 flex justify-between items-center border-y border-slate-100 sticky top-0 z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</h3>
                                    </div>
                                    {/* Class count badge removed as per request */}
                                </div>

                                {/* Class Rows */}
                                <div className="divide-y divide-slate-100">
                                    {slotClasses.map(cls => {
                                        const isHighlighted = cls.id === highlightedClassId;
                                        const isSelected = selectedClassIds.has(cls.id);
                                        const teacherName = getTeacherName(cls.teacherId);
                                        const studentCount = enrollments.filter(e => e.classId === cls.id).length;
                                        // Assume capacity 30 for visualization
                                        const capacity = 30;
                                        const percentage = Math.min((studentCount / capacity) * 100, 100);

                                        return (
                                            <div
                                                key={cls.id}
                                                ref={isHighlighted ? highlightedRowRef : null}
                                                className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 transition-all duration-200 ${isSelected ? 'bg-emerald-50/50' : isHighlighted ? 'bg-yellow-50' : ''
                                                    }`}
                                            >
                                                {/* Left Section: Checkbox & Info */}
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="flex items-center h-full">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(cls.id)}
                                                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                        />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-sm font-bold text-slate-900 truncate">{cls.name}</p>
                                                            <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                                {cls.level}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center text-xs text-slate-500">
                                                            <svg className="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                            <span className="truncate">{teacherName}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle Section: Level Tag */}
                                                <div className="hidden sm:flex w-32 justify-center px-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                        {cls.level}
                                                    </span>
                                                </div>

                                                {/* Right Section: Enrollment Bar */}
                                                <div className="mt-3 sm:mt-0 w-full sm:w-48 px-4">
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="text-slate-500 font-medium">Enrollment</span>
                                                        <span className="font-semibold text-slate-700">{studentCount} <span className="text-slate-400 font-normal">/ {capacity}</span></span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className={`hidden sm:flex items-center justify-end gap-1 w-auto pl-4 transition-opacity relative z-20 ${deletingClassId === cls.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                    {deletingClassId === cls.id ? (
                                                        <div className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                                                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Sure?</span>
                                                            <button onClick={() => setDeletingClassId(null)} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-xs font-bold">Cancel</button>
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteClass(cls.id);
                                                                setSelectedClassIds(prev => { const n = new Set(prev); n.delete(cls.id); return n; });
                                                                setDeletingClassId(null);
                                                            }} className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-bold shadow-sm shadow-red-200">Delete</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={(e) => handleOpenModal(e, cls)}
                                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                                title="Edit Class"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setDeletingClassId(cls.id); }}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                title="Delete Class"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Mobile Actions (Always visible) */}
                                                <div className="sm:hidden flex items-center justify-end gap-3 mt-3 pt-3 border-t border-slate-50">
                                                    {deletingClassId === cls.id ? (
                                                        <div className="flex items-center space-x-2 w-full justify-between animate-in fade-in zoom-in duration-200">
                                                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Are you sure?</span>
                                                            <div className="flex space-x-2">
                                                                <button onClick={() => setDeletingClassId(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-xs font-bold">Cancel</button>
                                                                <button onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteClass(cls.id);
                                                                    setSelectedClassIds(prev => { const n = new Set(prev); n.delete(cls.id); return n; });
                                                                    setDeletingClassId(null);
                                                                }} className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-bold shadow-sm shadow-red-200">Delete</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={(e) => handleOpenModal(e, cls)} className="text-xs font-medium text-emerald-600">Edit</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setDeletingClassId(cls.id); }} className="text-xs font-medium text-red-600">Delete</button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {isModalOpen && <ClassModal classData={editingClass} onClose={handleCloseModal} />}
            {isImportModalOpen && <ImportResultsModal results={importResults} onClose={() => setIsImportModalOpen(false)} />}
        </div>
    );
};

export default ClassesPage;
