import React, { useState } from 'react';
import { Staff, StaffPermission, LeaveType } from '../types';
import { useData } from '../context/DataContext';

interface StaffPermissionModalProps {
    staff: Staff;
    onClose: () => void;
}

const StaffPermissionModal: React.FC<StaffPermissionModalProps> = ({ staff, onClose }) => {
    const { staffPermissions, addStaffPermission, deleteStaffPermission } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [type, setType] = useState<LeaveType>(LeaveType.Annual);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [deletingPermissionId, setDeletingPermissionId] = useState<string | null>(null);

    const permissions = staffPermissions.filter(p => p.staffId === staff.id);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addStaffPermission({
            staffId: staff.id,
            type,
            startDate,
            endDate,
            reason,
            createdAt: new Date().toISOString()
        });
        setIsAdding(false);
        setReason('');
        setType(LeaveType.Annual);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(new Date().toISOString().split('T')[0]);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all inset-0 bg-opacity-75">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all">
                {/* Header */}
                <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center border-b border-slate-100">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Staff Leave</h2>
                        <p className="text-sm text-slate-500 mt-1">Managing permissions for <span className="font-semibold text-primary-600">{staff.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                    {!isAdding ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Permission History</h3>
                                    <p className="text-sm text-slate-500">{permissions.length} total records</p>
                                </div>
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 transition-all flex items-center space-x-2 shadow-md shadow-primary-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>New Request</span>
                                </button>
                            </div>

                            {permissions.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-2">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-700">No History Yet</h4>
                                    <p className="text-slate-500 max-w-sm text-center">This staff member hasn't requested any leave or permissions yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {permissions.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(p => (
                                        <div key={p.id} className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all flex justify-between items-start cursor-default">
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${p.type === LeaveType.Annual ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                        p.type === LeaveType.Personal ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                            'bg-purple-100 text-purple-700 border border-purple-200'
                                                        }`}>
                                                        {p.type}
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-700 flex items-center">
                                                        <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                        {new Date(p.startDate).toLocaleDateString()}
                                                        {p.startDate !== p.endDate && <span className="ml-1 text-slate-400">to {new Date(p.endDate).toLocaleDateString()}</span>}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl text-sm leading-relaxed border border-slate-100">
                                                    {p.reason || <span className="italic text-slate-400">No specific reason provided.</span>}
                                                </p>
                                            </div>

                                            {deletingPermissionId === p.id ? (
                                                <div className="flex flex-col items-end space-y-2 animate-in fade-in zoom-in duration-200">
                                                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Are you sure?</span>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => setDeletingPermissionId(null)}
                                                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                            title="Cancel"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                deleteStaffPermission(p.id);
                                                                setDeletingPermissionId(null);
                                                            }}
                                                            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-colors"
                                                            title="Confirm Delete"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeletingPermissionId(p.id)}
                                                    className="p-3 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all focus:opacity-100 flex-shrink-0 opacity-100 sm:opacity-50 sm:hover:opacity-100 sm:group-hover:opacity-100"
                                                    title="Delete Record"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="border-b border-slate-100 pb-4 mb-2">
                                    <h3 className="text-xl font-bold text-slate-800">Submit New Request</h3>
                                    <p className="text-sm text-slate-500 mt-1">Fill out the details for the upcoming leave.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Leave Type</label>
                                    <div className="relative">
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value as LeaveType)}
                                            className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-primary-500 appearance-none transition-all cursor-pointer"
                                            required
                                        >
                                            <option value={LeaveType.Annual}>Annual Leave ✈️</option>
                                            <option value={LeaveType.Personal}>Personal Leave / Sick 🤒</option>
                                            <option value={LeaveType.NonPersonal}>Non-Personal Leave 📁</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Start Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all cursor-pointer"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">End Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate}
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all cursor-pointer"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 flex justify-between">
                                        <span>Reason / Medical Note</span>
                                        <span className="text-slate-400 font-normal text-xs uppercase tracking-wider">Required</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Please provide details about this leave request..."
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-primary-500 transition-all min-h-[140px] resize-y"
                                        required
                                    />
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 py-3.5 rounded-xl font-bold bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200/50 transition-all active:scale-[0.98] text-center"
                                    >
                                        Confirm Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default StaffPermissionModal;

