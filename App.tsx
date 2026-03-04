/**
 * App.tsx
 * The core application component. Manages authentication state (userRole),
 * navigation (currentPage), and the overall shell layout (Sidebar + Navbar).
 */
import React, { useState, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import ClassesPage from './pages/ClassesPage';
import ReportsPage from './pages/ReportsPage';
import SchedulePage from './pages/SchedulePage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { Page, UserRole } from './types';
import { useData } from './context/DataContext';

function App() {
  const { currentUser, setCurrentUser } = useData();
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const handleLogin = (role: UserRole) => {
    setCurrentPage(Page.Dashboard);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Navigation Handler: Closes sidebar on mobile after navigating
  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Simple Router Switch
  const renderPage = () => {
    switch (currentPage) {
      case Page.Dashboard: return <DashboardPage navigate={navigate} />;
      case Page.Students: return <StudentsPage />;
      case Page.Staff: return <TeachersPage />;
      case Page.Classes: return <ClassesPage />;
      case Page.Reports: return <ReportsPage />;
      case Page.Schedule: return <SchedulePage />;
      case Page.Settings: return <SettingsPage onLogout={handleLogout} userRole={currentUser.role} />;
      default: return <DashboardPage navigate={navigate} />;
    }
  };

  // Guard: Redirect to Login if no role set
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar
        navigate={navigate}
        currentPage={currentPage}
        userRole={currentUser.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:pl-64' : 'pl-0'}`}>
        <Navbar
          userRole={currentUser.role}
          onLogout={handleLogout}
          navigate={navigate}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 relative">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
