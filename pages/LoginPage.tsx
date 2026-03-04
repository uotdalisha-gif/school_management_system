
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useData } from '../context/DataContext';

interface LoginPageProps {
    onLogin: (role: UserRole) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const { adminPassword, staff, setCurrentUser } = useData();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Admin);
    const [error, setError] = useState('');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsInstalled(true);
        });

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRole === UserRole.Admin) {
            if (password === adminPassword) {
                setCurrentUser({ id: 'admin_1', name: 'Administrator', role: UserRole.Admin });
                onLogin(UserRole.Admin);
            } else {
                setError('Incorrect admin password.');
            }
        } else {
            // Check if staff exists with this identifier (case-insensitive name OR contact) and password
            const searchId = identifier.trim().toLowerCase();
            const foundStaff = staff.find(s =>
                (s.name.toLowerCase() === searchId || s.contact.toLowerCase() === searchId)
                && s.role === selectedRole
            );

            if (foundStaff) {
                if (foundStaff.password) {
                    if (foundStaff.password === password) {
                        setCurrentUser({ id: foundStaff.id, name: foundStaff.name, role: selectedRole });
                        onLogin(selectedRole);
                    } else {
                        setError('Incorrect password for this staff account.');
                    }
                } else {
                    // If no password set, allow demo login (or we could require setting one)
                    setCurrentUser({ id: foundStaff.id, name: foundStaff.name, role: selectedRole });
                    onLogin(selectedRole);
                }
            } else {
                // If no staff found with that identifier, but role matches, show error
                if (staff.some(s => s.role === selectedRole)) {
                    setError(`No account found for "${identifier}" under the role: ${selectedRole}. Please check spelling or contact number.`);
                } else {
                    // Demo fallback for roles without staff data
                    setCurrentUser({ id: 'demo_1', name: `Demo ${selectedRole}`, role: selectedRole });
                    onLogin(selectedRole);
                }
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary-50 rounded-full opacity-50"></div>

                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-9.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        </svg>
                    </div>
                    <h1 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">School Admin</h1>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Management Information System</p>
                </div>

                {!isInstalled && deferredPrompt && (
                    <div className="relative z-10 bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-xl">
                                💻
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Desktop App Available</p>
                                <p className="text-[11px] text-emerald-700 font-medium">Install for a standalone experience</p>
                            </div>
                        </div>
                        <button
                            onClick={handleInstall}
                            className="text-[11px] font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                        >
                            INSTALL
                        </button>
                    </div>
                )}

                <form onSubmit={handleAdminLogin} className="relative z-10 mt-8 space-y-6">
                    <div className="space-y-1">
                        <label htmlFor="role" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select Role</label>
                        <select
                            id="role"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        >
                            {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    {selectedRole !== UserRole.Admin && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                            <label htmlFor="identifier" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Staff Name or Contact</label>
                            <input
                                id="identifier"
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                    )}

                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                        <label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                            {selectedRole === UserRole.Admin ? 'Admin Password' : 'Staff Password'}
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required={selectedRole === UserRole.Admin || staff.some(s => (s.name.toLowerCase() === identifier.trim().toLowerCase() || s.contact.toLowerCase() === identifier.trim().toLowerCase()) && s.password)}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            className="w-full px-4 py-3 text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs font-semibold text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full px-4 py-3 font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all active:scale-95"
                        >
                            Log in to Dashboard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
