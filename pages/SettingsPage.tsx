
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { UserRole } from '../types';

const OfflineGuide: React.FC = () => {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">How to Use Offline</h2>
                <p className="text-sm text-slate-500">This portal is a Progressive Web App (PWA). Once visited, it lives on your device.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold shrink-0">1</div>
                        <div>
                            <p className="font-bold text-slate-700">Install the App</p>
                            <p className="text-xs text-slate-500 mt-1">On Chrome or Edge (Desktop), click the <strong>Install Icon (+)</strong> in the address bar. On Mobile, use <strong>"Add to Home Screen"</strong>.</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold shrink-0">2</div>
                        <div>
                            <p className="font-bold text-slate-700">Open from Desktop</p>
                            <p className="text-xs text-slate-500 mt-1">Once installed, an icon appears on your Desktop or Apps folder. Open this icon even when you have <strong>no internet</strong>.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-primary-400 uppercase tracking-widest mb-2">Pro Tip</p>
                        <p className="text-sm leading-relaxed text-slate-300 font-medium">
                            If you share the link with someone else, tell them to visit the site <span className="text-white font-bold underline">once while online</span>. After that, they can use it offline forever on that device.
                        </p>
                    </div>
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl"></div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    System Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Offline Shell</p>
                        <p className="text-xs font-bold text-emerald-600 mt-0.5">Cached & Ready</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Data Storage</p>
                        <p className="text-xs font-bold text-blue-600 mt-0.5">Local + Sync</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Sync Version</p>
                        <p className="text-xs font-bold text-slate-600 mt-0.5">v7.0.0 (Production)</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataManager: React.FC = () => {
    const { students, staff, classes, events, subjects, levels, timeSlots, adminPassword, importAllData } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    /**
     * Exports all application data (students, staff, classes, etc.) to a JSON file.
     * Uses the File System Access API if available, otherwise falls back to standard download.
     */
    const handleExport = async () => {
        const fullData = {
            students,
            staff,
            classes,
            events,
            subjects,
            levels,
            timeSlots,
            adminPassword,
            exportDate: new Date().toISOString()
        };

        const jsonString = JSON.stringify(fullData, null, 2);
        const fileName = `school_admin_backup_${new Date().toISOString().split('T')[0]}.json`;

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'JSON Backup File',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                return;
            } catch (err) {
                if ((err as Error).name === 'AbortError') return;
                console.warn('File picker failed, falling back to standard download:', err);
            }
        }

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Imports application data from a JSON backup file.
     * WARNING: This overwrites all current local data.
     */
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (window.confirm('WARNING: Importing a backup will overwrite ALL current data in this application. This action cannot be undone. Are you sure?')) {
            setIsImporting(true);
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Basic validation
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid backup file format: Root must be an object.');
                }

                await importAllData(data);
                alert('Database restored successfully!');
            } catch (err) {
                console.error('Import Error:', err);
                const message = err instanceof Error ? err.message : 'Unknown error';
                alert(`Failed to import backup: ${message}\n\nPlease ensure the file is a valid SchoolAdmin backup JSON.`);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Data Management</h2>
            <p className="text-sm text-gray-500 mb-8">Take control of your database by exporting backups or restoring from a previous file.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-blue-900 mb-1">Backup Database</h3>
                        <p className="text-sm text-blue-700/70 mb-6">Download a copy of all your records. This will open a window asking you where to save the file on your computer.</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
                    >
                        Save To...
                    </button>
                </div>

                <div className="p-6 rounded-2xl border border-amber-100 bg-amber-50/50 flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center mb-4 shadow-lg shadow-amber-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-amber-900 mb-1">Restore Database</h3>
                        <p className="text-sm text-amber-700/70 mb-6">Upload a previously saved backup file to restore all student and staff data.</p>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold hover:bg-amber-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isImporting ? 'Restoring...' : 'Import from File'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                </div>
            </div>

            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-bold text-slate-700">Storage Information</p>
                        <p className="text-xs text-slate-500 mt-1">Your data is currently stored in your browser's private local storage on this computer. It is not shared with any servers. Regular backups are recommended.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LevelManager: React.FC = () => {
    const { levels, addLevel, updateLevel, deleteLevel } = useData();
    const [newLevel, setNewLevel] = useState('');
    const [editingLevel, setEditingLevel] = useState<string | null>(null);
    const [editedValue, setEditedValue] = useState('');
    const [error, setError] = useState('');
    const [deletingLevel, setDeletingLevel] = useState<string | null>(null);

    /**
     * Adds a new school level (grade) to the system.
     */
    const handleAddLevel = () => {
        setError('');
        if (!newLevel.trim()) {
            setError('Level name cannot be empty.');
            return;
        }
        if (levels.find(l => l.toLowerCase() === newLevel.trim().toLowerCase())) {
            setError('This level already exists.');
            return;
        }
        addLevel(newLevel.trim());
        setNewLevel('');
    };

    /**
     * Initiates the editing process for a specific level.
     */
    const handleStartEdit = (level: string) => {
        setEditingLevel(level);
        setEditedValue(level);
        setError('');
    };

    /** Cancels the level editing process. */
    const handleCancelEdit = () => {
        setEditingLevel(null);
        setEditedValue('');
    };

    /**
     * Updates an existing school level name.
     */
    const handleUpdateLevel = () => {
        setError('');
        if (!editedValue.trim()) {
            setError('Level name cannot be empty.');
            return;
        }
        if (levels.find(l => l.toLowerCase() === editedValue.trim().toLowerCase()) && editedValue.trim().toLowerCase() !== editingLevel?.toLowerCase()) {
            setError('This level already exists.');
            return;
        }
        if (editingLevel) {
            updateLevel(editingLevel, editedValue.trim());
        }
        handleCancelEdit();
    };

    /**
     * Deletes a school level without confirmation here (handled inline).
     */
    const handleDeleteLevel = (level: string) => {
        deleteLevel(level);
        setDeletingLevel(null);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">School Levels (Grades)</h2>
            <p className="text-sm text-gray-500 mb-6">Manage the grade levels available in your school.</p>

            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newLevel}
                        onChange={(e) => setNewLevel(e.target.value)}
                        placeholder="e.g., K1, Grade 12"
                        className="flex-grow px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-black"
                    />
                    <button onClick={handleAddLevel} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shrink-0 font-semibold">
                        Add Level
                    </button>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-6 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {levels.length > 0 ? levels.map(level => (
                    <div key={level} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 group">
                        {editingLevel === level ? (
                            <input
                                type="text"
                                value={editedValue}
                                onChange={(e) => setEditedValue(e.target.value)}
                                className="flex-grow px-2 py-1 bg-white border border-primary-500 rounded-md text-black"
                                autoFocus
                            />
                        ) : (
                            <span className="text-gray-800 font-medium">{level}</span>
                        )}
                        <div className="space-x-1 ml-2 flex shrink-0">
                            {editingLevel === level ? (
                                <>
                                    <button onClick={handleUpdateLevel} className="text-green-600 hover:text-green-800 font-semibold px-2 text-sm">Save</button>
                                    <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800 px-2 text-sm">Cancel</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleStartEdit(level)} className="text-gray-400 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    {deletingLevel === level ? (
                                        <div className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Sure?</span>
                                            <button onClick={() => setDeletingLevel(null)} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-xs font-bold">Cancel</button>
                                            <button onClick={() => handleDeleteLevel(level)} className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-bold shadow-sm shadow-red-200">Delete</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeletingLevel(level)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 italic py-4">No levels defined yet.</p>
                )}
            </div>
        </div>
    );
};

const SessionManager: React.FC = () => {
    const { timeSlots, addTimeSlot, deleteTimeSlot } = useData();
    const [newTime, setNewTime] = useState('');
    const [newType, setNewType] = useState<'weekday' | 'weekend' | ''>('weekday');
    const [error, setError] = useState('');
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

    /**
     * Adds a new school session (time slot) to the system.
     */
    const handleAdd = () => {
        setError('');
        if (!newTime.trim()) {
            setError('Time slot name cannot be empty.');
            return;
        }
        addTimeSlot({ time: newTime.trim(), type: newType as 'weekday' | 'weekend' });
        setNewTime('');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">School Sessions (Time Slots)</h2>
            <p className="text-sm text-gray-500 mb-6">Define the time slots available for your school's classes.</p>

            <div className="space-y-4">
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        placeholder="e.g., 8:00-10:00 AM"
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-black"
                    />
                    <div className="flex gap-2">
                        <select
                            value={newType}
                            onChange={(e) => setNewType(e.target.value as 'weekday' | 'weekend')}
                            className="flex-grow px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-black"
                        >
                            <option value="weekday">Weekday</option>
                            <option value="weekend">Weekend</option>
                        </select>
                        <button onClick={handleAdd} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors shrink-0 font-semibold">
                            Add Session
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-6 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {timeSlots.length > 0 ? timeSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 group">
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-800">{slot.time}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{slot.type}</span>
                        </div>
                        {deletingSessionId === slot.id ? (
                            <div className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Sure?</span>
                                <button onClick={() => setDeletingSessionId(null)} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-xs font-bold">Cancel</button>
                                <button onClick={() => { deleteTimeSlot(slot.id); setDeletingSessionId(null); }} className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-bold shadow-sm shadow-red-200">Delete</button>
                            </div>
                        ) : (
                            <button onClick={() => setDeletingSessionId(slot.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                )) : (
                    <p className="text-center text-gray-500 italic py-4">No sessions defined yet.</p>
                )}
            </div>
        </div>
    );
};

const SubjectManager: React.FC = () => {
    const { subjects, addSubject, updateSubject, deleteSubject } = useData();
    const [newSubject, setNewSubject] = useState('');
    const [editingSubject, setEditingSubject] = useState<string | null>(null);
    const [editedValue, setEditedValue] = useState('');
    const [error, setError] = useState('');
    const [deletingSubject, setDeletingSubject] = useState<string | null>(null);

    /**
     * Adds a new academic subject to the system.
     */
    const handleAddSubject = () => {
        setError('');
        if (!newSubject.trim()) {
            setError('Subject name cannot be empty.');
            return;
        }
        if (subjects.find(s => s.toLowerCase() === newSubject.trim().toLowerCase())) {
            setError('This subject already exists.');
            return;
        }
        addSubject(newSubject.trim());
        setNewSubject('');
    };

    /**
     * Initiates the editing process for a specific subject.
     */
    const handleStartEdit = (subject: string) => {
        setEditingSubject(subject);
        setEditedValue(subject);
        setError('');
    };

    /** Cancels the subject editing process. */
    const handleCancelEdit = () => {
        setEditingSubject(null);
        setEditedValue('');
    };

    /**
     * Updates an existing academic subject name.
     */
    const handleUpdateSubject = () => {
        setError('');
        if (!editedValue.trim()) {
            setError('Subject name cannot be empty.');
            return;
        }
        if (subjects.find(s => s.toLowerCase() === editedValue.trim().toLowerCase()) && editedValue.trim().toLowerCase() !== editingSubject?.toLowerCase()) {
            setError('This subject already exists.');
            return;
        }
        if (editingSubject) {
            updateSubject(editingSubject, editedValue.trim());
        }
        handleCancelEdit();
    };

    /**
     * Deletes an academic subject without confirmation here (handled inline).
     */
    const handleDeleteSubject = (subject: string) => {
        deleteSubject(subject);
        setDeletingSubject(null);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Manage Subjects</h2>
            <p className="text-sm text-gray-500 mb-6">Maintain the list of academic subjects taught at CES.</p>

            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="e.g. Creative Writing"
                        className="flex-grow px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-black"
                    />
                    <button onClick={handleAddSubject} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors shrink-0 font-semibold">
                        Add Subject
                    </button>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-6 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {subjects.length > 0 ? subjects.map(subject => (
                    <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100 group">
                        {editingSubject === subject ? (
                            <input
                                type="text"
                                value={editedValue}
                                onChange={(e) => setEditedValue(e.target.value)}
                                className="flex-grow px-2 py-1 bg-white border border-primary-500 rounded-md text-black"
                                autoFocus
                            />
                        ) : (
                            <span className="text-gray-800 font-medium">{subject}</span>
                        )}
                        <div className="space-x-1 ml-2 flex shrink-0">
                            {editingSubject === subject ? (
                                <>
                                    <button onClick={handleUpdateSubject} className="text-green-600 hover:text-green-800 font-semibold px-2 text-sm">Save</button>
                                    <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-800 px-2 text-sm">Cancel</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleStartEdit(subject)} className="text-gray-400 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                    {deletingSubject === subject ? (
                                        <div className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Sure?</span>
                                            <button onClick={() => setDeletingSubject(null)} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-xs font-bold">Cancel</button>
                                            <button onClick={() => handleDeleteSubject(subject)} className="px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-bold shadow-sm shadow-red-200">Delete</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeletingSubject(subject)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 italic py-4">No subjects defined yet.</p>
                )}
            </div>
        </div>
    );
};


const DatabaseScriptManager: React.FC = () => {
    const scripts = [
        {
            title: 'Initial Normalized Schema (v2)',
            date: '2026-03-02',
            description: 'Creates normalized tables for grades, attendance, enrollments, and audit logging.',
            sql: `-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Students Table
create table if not exists public.students (
  id text primary key,
  name text not null,
  sex text check (sex in ('Male', 'Female')),
  dob date,
  phone text,
  enrollment_date date default current_date,
  status text default 'Active',
  tuition jsonb default '{"total": 0, "paid": 0}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Staff Table
create table if not exists public.staff (
  id text primary key,
  name text not null,
  role text not null,
  subject text,
  contact text,
  hire_date date default current_date,
  password text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Classes Table
create table if not exists public.classes (
  id text primary key,
  name text not null,
  teacher_id text references public.staff(id) on delete set null,
  schedule text,
  level text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enrollments Table (Many-to-Many)
create table if not exists public.enrollments (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  class_id text not null references public.classes(id) on delete cascade,
  academic_year text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, class_id, academic_year)
);

-- 5. Grades Table
create table if not exists public.grades (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  subject text not null,
  score numeric(4,2) check (score >= 0 and score <= 10),
  term text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Attendance Table
create table if not exists public.attendance (
  id text primary key,
  student_id text not null references public.students(id) on delete cascade,
  date date not null,
  status text check (status in ('Present', 'Absent', 'Late')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, date)
);

-- 7. School Events Table
create table if not exists public.school_events (
  id text primary key,
  title text not null,
  date date not null,
  description text,
  type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Settings Table
create table if not exists public.settings (
  id text primary key default 'global',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Audit Log Table
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);`
        },
        {
            title: 'Batch Sync RPC Function',
            date: '2026-03-02',
            description: 'Handles high-performance synchronization of all school data.',
            sql: `create or replace function public.sync_school_data_v2(
  p_students jsonb,
  p_staff jsonb,
  p_staff_permissions jsonb,
  p_daily_logs jsonb,
  p_incident_reports jsonb,
  p_room_statuses jsonb,
  p_classes jsonb,
  p_enrollments jsonb,
  p_grades jsonb,
  p_attendance jsonb,
  p_events jsonb,
  p_config jsonb
) returns void as $$
begin
  -- 1. Sync Students
  delete from public.students;
  insert into public.students (id, name, sex, dob, phone, enrollment_date, status, tuition)
  select 
    (value->>'id'), (value->>'name'), (value->>'sex'), 
    (value->>'dob')::date, (value->>'phone'), 
    (value->>'enrollment_date')::date, (value->>'status'), 
    (value->'tuition')
  from jsonb_array_elements(p_students);

  -- 2. Sync Staff
  delete from public.staff;
  insert into public.staff (id, name, role, subject, contact, hire_date, password)
  select 
    (value->>'id'), (value->>'name'), (value->>'role'), 
    (value->>'subject'), (value->>'contact'), (value->>'hire_date')::date,
    (value->>'password')
  from jsonb_array_elements(p_staff);

  -- 2.5 Sync Staff Permissions
  delete from public.staff_permissions;
  insert into public.staff_permissions (id, staff_id, type, start_date, end_date, reason, created_at)
  select 
    (value->>'id'), (value->>'staff_id'), (value->>'type'), 
    (value->>'start_date')::date, (value->>'end_date')::date, 
    (value->>'reason'), (value->>'created_at')::timestamp with time zone
  from jsonb_array_elements(p_staff_permissions);

  -- 2.6 Sync Daily Logs
  delete from public.daily_logs;
  insert into public.daily_logs (id, staff_id, type, person_name, purpose, timestamp)
  select 
    (value->>'id'), (value->>'staff_id'), (value->>'type'), 
    (value->>'person_name'), (value->>'purpose'), 
    (value->>'timestamp')::timestamp with time zone
  from jsonb_array_elements(p_daily_logs);

  -- 2.7 Sync Incident Reports
  delete from public.incident_reports;
  insert into public.incident_reports (id, staff_id, title, description, severity, timestamp)
  select 
    (value->>'id'), (value->>'staff_id'), (value->>'title'), 
    (value->>'description'), (value->>'severity'), 
    (value->>'timestamp')::timestamp with time zone
  from jsonb_array_elements(p_incident_reports);

  -- 2.8 Sync Room Statuses
  delete from public.room_statuses;
  insert into public.room_statuses (id, room_name, status, last_updated_by, timestamp)
  select 
    (value->>'id'), (value->>'room_name'), (value->>'status'), 
    (value->>'last_updated_by'), (value->>'timestamp')::timestamp with time zone
  from jsonb_array_elements(p_room_statuses);

  -- 3. Sync Classes
  delete from public.classes;
  insert into public.classes (id, name, teacher_id, schedule, level)
  select 
    (value->>'id'), (value->>'name'), (value->>'teacher_id'), 
    (value->>'schedule'), (value->>'level')
  from jsonb_array_elements(p_classes);

  -- 4. Sync Enrollments
  delete from public.enrollments;
  insert into public.enrollments (id, student_id, class_id, academic_year)
  select 
    (value->>'id'), (value->>'student_id'), (value->>'class_id'), (value->>'academic_year')
  from jsonb_array_elements(p_enrollments);

  -- 5. Sync Grades
  delete from public.grades;
  insert into public.grades (id, student_id, subject, score, term)
  select 
    (value->>'id'), (value->>'student_id'), (value->>'subject'), 
    (value->>'score')::numeric, (value->>'term')
  from jsonb_array_elements(p_grades);

  -- 6. Sync Attendance
  delete from public.attendance;
  insert into public.attendance (id, student_id, date, status)
  select 
    (value->>'id'), (value->>'student_id'), (value->>'date')::date, (value->>'status')
  from jsonb_array_elements(p_attendance);

  -- 7. Sync Events
  delete from public.school_events;
  insert into public.school_events (id, title, date, description, type)
  select 
    (value->>'id'), (value->>'title'), (value->>'date')::date, 
    (value->>'description'), (value->>'type')
  from jsonb_array_elements(p_events);

  -- 8. Sync Settings
  delete from public.settings;
  insert into public.settings (id, data)
  select (value->>'key'), (value->'value')
  from jsonb_array_elements(p_config);

end;
$$ language plpgsql security definer;`
        },
        {
            title: 'Audit Logging & RLS Security',
            date: '2026-03-02',
            description: 'Enables Row Level Security and automatic change tracking.',
            sql: `-- Audit Function
create or replace function public.process_audit_log() returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.audit_log (table_name, record_id, action, old_data)
    values (tg_table_name, old.id, 'DELETE', row_to_json(old)::jsonb);
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_log (table_name, record_id, action, old_data, new_data)
    values (tg_table_name, new.id, 'UPDATE', row_to_json(old)::jsonb, row_to_json(new)::jsonb);
    return new;
  elsif (tg_op = 'INSERT') then
    insert into public.audit_log (table_name, record_id, action, new_data)
    values (tg_table_name, new.id, 'INSERT', row_to_json(new)::jsonb);
    return new;
  end if;
  return null;
end;
$$ language plpgsql;

-- Enable RLS
alter table public.students enable row level security;
alter table public.staff enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.school_events enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

-- Policies
create policy "Enable all access for authenticated users" on public.students for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.staff for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.classes for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.enrollments for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.grades for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.attendance for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.school_events for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.settings for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.audit_log for all to authenticated using (true) with check (true);`
        },
        {
            title: 'Staff Permissions & Leave Management',
            date: '2026-03-02',
            description: 'Adds support for tracking staff leave and permissions.',
            sql: `-- 10. Staff Permissions Table
create table if not exists public.staff_permissions (
  id text primary key,
  staff_id text not null references public.staff(id) on delete cascade,
  type text not null check (type in ('Annual Leave', 'Personal Leave', 'Non-Personal Leave')),
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.staff_permissions enable row level security;
create policy "Enable all access for authenticated users" on public.staff_permissions for all to authenticated using (true) with check (true);

-- Add Audit Trigger
create trigger on_staff_permissions_change
after insert or update or delete on public.staff_permissions
for each row execute function public.process_audit_log();`
        },
        {
            title: 'Role-Specific Features (Guard, Cleaner, Office)',
            date: '2026-03-02',
            description: 'Adds tables for daily logs, incident reports, and room statuses.',
            sql: `-- 11. Daily Logs (Guard)
create table if not exists public.daily_logs (
  id text primary key,
  staff_id text not null references public.staff(id) on delete cascade,
  type text not null check (type in ('Entry', 'Exit')),
  person_name text not null,
  purpose text,
  timestamp timestamp with time zone default now()
);

-- 12. Incident Reports (Guard)
create table if not exists public.incident_reports (
  id text primary key,
  staff_id text not null references public.staff(id) on delete cascade,
  title text not null,
  description text,
  severity text check (severity in ('Low', 'Medium', 'High')),
  timestamp timestamp with time zone default now()
);

-- 13. Room Statuses (Cleaner)
create table if not exists public.room_statuses (
  id text primary key,
  room_name text not null,
  status text check (status in ('Cleaned', 'Needs Attention')),
  last_updated_by text references public.staff(id),
  timestamp timestamp with time zone default now()
);

-- Enable RLS
alter table public.daily_logs enable row level security;
alter table public.incident_reports enable row level security;
alter table public.room_statuses enable row level security;

create policy "Enable all access for authenticated users" on public.daily_logs for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.incident_reports for all to authenticated using (true) with check (true);
create policy "Enable all access for authenticated users" on public.room_statuses for all to authenticated using (true) with check (true);

-- Audit Triggers
create trigger on_daily_logs_change after insert or update or delete on public.daily_logs for each row execute function public.process_audit_log();
create trigger on_incident_reports_change after insert or update or delete on public.incident_reports for each row execute function public.process_audit_log();
create trigger on_room_statuses_change after insert or update or delete on public.room_statuses for each row execute function public.process_audit_log();`
        }
    ];

    /**
     * Copies the provided SQL text to the user's clipboard.
     */
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('SQL copied to clipboard!');
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">New Script (Database Setup)</h2>
                <p className="text-sm text-slate-500">Copy and run these scripts in your Supabase SQL Editor to keep your database in sync with the app's latest features.</p>
            </div>

            <div className="space-y-6">
                {scripts.map((script, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-bottom border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700">{script.title}</h3>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{script.date}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(script.sql)}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 8h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                Copy SQL
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-slate-600 mb-3">{script.description}</p>
                            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                                {script.sql}
                            </pre>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface SettingsPageProps {
    onLogout: () => void;
    userRole: UserRole;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout, userRole }) => {
    const { adminPassword, setAdminPassword, triggerSync, lastSyncedAt, isSyncing } = useData();
    const isAdmin = userRole === UserRole.Admin;
    // Read sub-tab from URL on mount (e.g. /settings/levels → 'levels')
    const getInitialSettingsTab = () => {
        const parts = window.location.pathname.split('/');
        const sub = parts[2]?.toLowerCase();
        const valid = ['account', 'levels', 'sessions', 'subjects', 'data', 'sync', 'offline'];
        return (valid.includes(sub) ? sub : 'account') as 'account' | 'levels' | 'sessions' | 'subjects' | 'data' | 'sync' | 'offline';
    };
    const [activeTab, setActiveTab] = useState<'account' | 'levels' | 'sessions' | 'subjects' | 'data' | 'sync' | 'offline'>(getInitialSettingsTab);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    /**
     * Handles the submission of the admin password change form.
     */
    const handleSubmitPassword = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (currentPassword !== adminPassword) {
            setError('Current password is not correct.');
            return;
        }

        if (newPassword.length < 4) {
            setError('New password must be at least 4 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setAdminPassword(newPassword);
        setSuccess('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const allTabs = [
        { id: 'account', label: 'Account', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7h14a7 7 0 00-7-7z" /></svg>, adminOnly: true },
        { id: 'levels', label: 'Levels', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>, adminOnly: true },
        { id: 'sessions', label: 'Sessions', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, adminOnly: true },
        { id: 'subjects', label: 'Subjects', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>, adminOnly: true },
        { id: 'data', label: 'Database', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zM4 7l8 4 8-4" /></svg>, adminOnly: true },
        { id: 'sync', label: 'Cloud Sync', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>, adminOnly: true },
        { id: 'offline', label: 'Offline Help', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, adminOnly: false },
    ] as const;

    const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin);

    useEffect(() => {
        if (!isAdmin && activeTab !== 'offline') {
            setActiveTab('offline');
        }
    }, [isAdmin]);


    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 tracking-tight">Settings</h1>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-64 shrink-0 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                window.history.replaceState({}, '', `/settings/${tab.id}`);
                                document.title = `Settings / ${tab.label} | SchoolAdmin`;
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 translate-x-1'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-transparent border-b-slate-100'
                                }`}
                        >
                            {tab.icon}
                            <span className="font-semibold">{tab.label}</span>
                        </button>
                    ))}

                    <div className="pt-4 mt-2 border-t border-slate-100">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-semibold">Sign Out</span>
                        </button>
                    </div>
                </div>

                <div className="flex-grow w-full">
                    {activeTab === 'account' && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-2 duration-300">
                            <h2 className="text-xl font-semibold text-gray-700 mb-6">Security Settings</h2>
                            <form onSubmit={handleSubmitPassword} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="current-password">
                                        Current Admin Password
                                    </label>
                                    <input
                                        type="password"
                                        id="current-password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                                        required
                                    />
                                </div>

                                <div className="pt-2 border-t border-gray-50">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="new-password">
                                        New Admin Password
                                    </label>
                                    <input
                                        type="password"
                                        id="new-password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="confirm-password">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-center space-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.283a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                        <span>{error}</span>
                                    </div>
                                )}
                                {success && (
                                    <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm flex items-center space-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        <span>{success}</span>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        className="bg-primary-600 text-white px-8 py-3 rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 font-bold active:scale-95"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'levels' && <div className="animate-in fade-in slide-in-from-right-2 duration-300"><LevelManager /></div>}
                    {activeTab === 'sessions' && <div className="animate-in fade-in slide-in-from-right-2 duration-300"><SessionManager /></div>}
                    {activeTab === 'subjects' && <div className="animate-in fade-in slide-in-from-right-2 duration-300"><SubjectManager /></div>}
                    {activeTab === 'data' && <div className="animate-in fade-in slide-in-from-right-2 duration-300"><DataManager /></div>}
                    {activeTab === 'sync' && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-2 duration-300 space-y-6">
                            <h2 className="text-xl font-semibold text-gray-700">Cloud Sync Status</h2>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Supabase Endpoint</p>
                                    <p className="text-sm font-mono text-slate-600 break-all">
                                        {process.env.SUPABASE_URL || 'https://okhkcrolpvnxokujcans.supabase.co'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Last Synced</p>
                                        <p className="text-sm font-bold text-slate-600">
                                            {lastSyncedAt ? lastSyncedAt.toLocaleString() : 'Never'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sync Status</p>
                                        <p className={`text-sm font-bold ${isSyncing ? 'text-blue-600 animate-pulse' : 'text-slate-600'}`}>
                                            {isSyncing ? 'Syncing...' : 'Idle'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Connection Status</p>
                                        <p className={`text-sm font-bold ${navigator.onLine ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {navigator.onLine ? 'Connected (Online)' : 'Disconnected (Offline)'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-xs text-primary-600 font-bold hover:underline"
                                    >
                                        Refresh Connection
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50">
                                    <h3 className="font-bold text-blue-900 mb-2">Force Cloud Sync</h3>
                                    <p className="text-xs text-blue-700 mb-4">Manually push all local changes to Supabase right now.</p>
                                    <button
                                        onClick={() => triggerSync()}
                                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-all"
                                    >
                                        Sync Now
                                    </button>
                                </div>

                                <div className="p-6 rounded-2xl border border-red-100 bg-red-50/50">
                                    <h3 className="font-bold text-red-900 mb-2">Reset Local Cache</h3>
                                    <p className="text-xs text-red-700 mb-4">Wipe local data and re-fetch everything from Supabase. Use this if sync is stuck.</p>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('This will reload the app and clear local data. Any unsynced changes will be lost. Continue?')) {
                                                apiService.clearLocalCache();
                                            }
                                        }}
                                        className="w-full bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-all"
                                    >
                                        Reset Cache
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'offline' && <div className="animate-in fade-in slide-in-from-right-2 duration-300"><OfflineGuide /></div>}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
