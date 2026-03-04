
import React, { useState, useEffect } from 'react';
import { UserRole, Page } from '../types';
import StudentSearch from './StudentSearch';
import { useData } from '../context/DataContext';

interface NavbarProps {
    userRole: UserRole;
    onLogout: () => void;
    navigate: (page: Page) => void;
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ userRole, onLogout, navigate, onToggleSidebar, isSidebarOpen }) => {
    const { loading, isSyncing, lastSyncedAt, error, currentUser } = useData();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 lg:px-6 flex items-center justify-between transition-all">
            <div className="flex items-center space-x-4">
                {/* Sidebar Toggle Button */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d={isSidebarOpen ? "M4 6h16M4 12h10M4 18h16" : "M4 6h16M4 12h16M4 18h16"}
                        />
                    </svg>
                </button>

                <div className="flex items-center space-x-2 text-sm text-slate-500 hidden sm:flex">
                    <span className="font-medium text-slate-700">Overview</span>
                </div>
            </div>

            <div className="flex-1 max-w-xl mx-auto px-4">
                <StudentSearch navigate={navigate} />
            </div>

            <div className="flex items-center space-x-4 lg:space-x-6">
                <div className="flex items-center space-x-2 hidden md:flex">
                    <div className="relative">
                        {isOnline ? (
                            isSyncing ? (
                                <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )
                        ) : (
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                    </div>
                    <div className="flex flex-col -space-y-0.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                            {isOnline ? (isSyncing ? 'Syncing...' : 'Cloud Synced') : 'Offline Mode'}
                        </span>
                        {isOnline && lastSyncedAt && (
                            <span className="text-[8px] text-slate-400 font-medium">
                                Last: {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                <div className="flex items-center space-x-3">
                    <div className="text-right hidden xl:block">
                        <p className="text-sm font-semibold text-slate-700">{currentUser?.name || userRole}</p>
                        <p className="text-xs text-slate-400 capitalize">{userRole.toLowerCase()}</p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            onBlur={() => setTimeout(() => setIsProfileOpen(false), 200)}
                            className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200 transition-all focus:ring-2 focus:ring-primary-500 focus:outline-none focus:ring-offset-1"
                        >
                            {userRole.charAt(0)}
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="px-4 py-2 border-b border-slate-100 mb-1 xl:hidden">
                                    <p className="text-sm font-bold text-slate-800">{currentUser?.name || userRole}</p>
                                    <p className="text-xs text-slate-500 capitalize">{userRole.toLowerCase()}</p>
                                </div>
                                {userRole === UserRole.Admin && (
                                    <>
                                        <button
                                            onClick={() => { navigate('settings' as Page); setIsProfileOpen(false); }}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-3 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>Settings</span>
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                    </>
                                )}
                                <button
                                    onClick={() => { onLogout(); setIsProfileOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
