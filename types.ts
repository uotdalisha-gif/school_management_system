
/**
 * types.ts
 * Global interface and enum definitions for domain models
 * and application state.
 */

export enum UserRole {
    Admin = 'Admin',
    Teacher = 'Teacher',
    OfficeWorker = 'Office Worker',
    Guard = 'Guard',
    Cleaner = 'Cleaner',
}

export enum StaffRole {
    Teacher = 'Teacher',
    AssistantTeacher = 'Assistant Teacher',
    Cleaner = 'Cleaner',
    Guard = 'Guard',
    OfficeWorker = 'Office Worker',
}

export enum Page {
    Dashboard = 'Dashboard',
    Students = 'Students',
    Staff = 'Staff',
    Classes = 'Classes',
    Reports = 'Reports',
    Schedule = 'Schedule',
    Settings = 'Settings',
    Messages = 'Messages',
}

export enum StudentStatus {
    Active = 'Active',
    Suspended = 'Suspended',
    Dropout = 'Dropout',
}

export enum AttendanceStatus {
    Present = 'Present',
    Absent = 'Absent',
    Late = 'Late',
}

export enum LeaveType {
    Annual = 'Annual Leave',
    Personal = 'Personal Leave',
    NonPersonal = 'Non-Personal Leave'
}

export type StudentLevel = string;

export interface Grade {
    id: string;
    studentId: string;
    subject: string;
    score: number; // 0.0 - 10.0 scale
    term: string;
}

export interface Attendance {
    id: string;
    studentId: string;
    date: string; // ISO format: YYYY-MM-DD
    status: AttendanceStatus;
}

export interface Enrollment {
    id: string;
    studentId: string;
    classId: string;
    academicYear: string;
}

/**
 * Domain Entities
 */
export interface Student {
    id: string;
    name: string;
    sex: 'Male' | 'Female';
    dob: string;
    phone: string;
    enrollmentDate: string;
    status: StudentStatus;
    statusChangeDate?: string;
    tuition: {
        total: number;
        paid: number;
    };
}

export interface Staff {
    id: string;
    name: string;
    role: StaffRole;
    subject?: string;
    contact: string;
    hireDate: string;
    password?: string;
}

export interface StaffPermission {
    id: string;
    staffId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    createdAt: string;
}

export interface Class {
    id: string;
    name: string;
    teacherId: string;
    schedule: string;
    level: StudentLevel;
}

export interface AuditLog {
    id: string;
    tableName: string;
    recordId: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    oldData?: any;
    newData?: any;
    timestamp: string;
}

export enum EventType {
    Holiday = 'Holiday',
    Meeting = 'Meeting',
    Exam = 'Exam',
    General = 'General',
}

export interface SchoolEvent {
    id: string;
    title: string;
    date: string;
    description: string;
    type: EventType;
}

export interface DailyLog {
    id: string;
    staffId: string;
    type: 'Entry' | 'Exit';
    personName: string;
    purpose: string;
    timestamp: string;
}

export interface IncidentReport {
    id: string;
    staffId: string;
    title: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High';
    timestamp: string;
}

export interface RoomStatus {
    id: string;
    roomName: string;
    status: 'Cleaned' | 'Needs Attention';
    lastUpdatedBy: string;
    timestamp: string;
}

export type MessageType = 'text' | 'leave_request' | 'sick_report' | 'incident' | 'announcement';
export type MessageStatus = 'pending' | 'approved' | 'rejected';

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    recipientId: string;    // staff ID, 'admin', or 'all'
    type: MessageType;
    content: string;
    metadata?: {
        startDate?: string;
        endDate?: string;
        leaveType?: string;
        status?: MessageStatus;
        severity?: 'Low' | 'Medium' | 'High';
    };
    isRead: boolean;
    createdAt: string;
}
