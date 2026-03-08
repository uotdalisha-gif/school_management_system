import { Student, Staff, Class, Grade, Attendance, Enrollment } from '../types';
import * as XLSX from 'xlsx';

// Function to escape CSV fields if they contain commas or quotes
/**
 * Escapes a CSV field if it contains special characters like commas, quotes, or newlines.
 */
const escapeCsvField = (field: string | number | undefined): string => {
    const stringField = String(field || '');
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

/**
 * Calculates the age of a person based on their date of birth string.
 */
const calculateAge = (dobString: string): number => {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

/**
 * Converts a 10-point score to a letter grade.
 */
const getLetterGrade = (score: number): string => {
    if (score >= 9.0) return 'A';
    if (score >= 8.0) return 'B';
    if (score >= 7.0) return 'C';
    if (score >= 6.0) return 'D';
    return 'F';
};

export interface ExportColumnConfig {
    key: keyof Student | 'age' | 'avgScore' | 'attendanceRate';
    label: string;
    enabled: boolean;
}

/**
 * Generates a CSV string representing student progress, including average scores and attendance rates.
 */
export const generateStudentProgressCSV = (
    students: Student[],
    allGrades: Grade[],
    allAttendance: Attendance[],
    config?: ExportColumnConfig[]
): string => {
    // Default configuration if none provided
    const activeConfig = config ? config.filter(c => c.enabled) : [
        { key: 'id', label: 'ID', enabled: true },
        { key: 'name', label: 'Name', enabled: true },
        { key: 'dob', label: 'Date of Birth', enabled: true },
        { key: 'age', label: 'Age', enabled: true },
        { key: 'enrollmentDate', label: 'Enrollment Date', enabled: true },
        { key: 'phone', label: 'Phone', enabled: true },
        { key: 'avgScore', label: 'Average Score', enabled: true },
        { key: 'attendanceRate', label: 'Attendance Rate (%)', enabled: true },
    ] as ExportColumnConfig[];

    const headers = activeConfig.map(c => c.label);

    const rows = students.map(student => {
        const studentGrades = allGrades.filter(g => g.studentId === student.id);
        const studentAttendance = allAttendance.filter(a => a.studentId === student.id);

        return activeConfig.map(col => {
            let value: any = '';

            switch (col.key) {
                case 'age':
                    value = calculateAge(student.dob);
                    break;
                case 'avgScore':
                    const totalScore = studentGrades.reduce((sum, grade) => sum + grade.score, 0);
                    value = studentGrades.length > 0 ? (totalScore / studentGrades.length).toFixed(2) : 'N/A';
                    break;
                case 'attendanceRate':
                    const totalDays = studentAttendance.length;
                    const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
                    value = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(0) : 'N/A';
                    break;
                default:
                    // @ts-ignore - indexing student by key
                    value = student[col.key];
            }

            return escapeCsvField(value);
        }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};

/**
 * Generates structured data for a specific class or level export, ready for Excel conversion.
 */
export const generateClassProgressData = (
    className: string,
    students: Student[],
    allGrades: Grade[],
    allAttendance: Attendance[]
): any[] => {
    return students.map(student => {
        const studentGrades = allGrades.filter(g => g.studentId === student.id);
        const studentAttendance = allAttendance.filter(a => a.studentId === student.id);

        // Calculate Attendance
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === 'Present').length;
        const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(0) + '%' : 'N/A';

        // Calculate Average Grade Letter
        const totalScore = studentGrades.reduce((sum, grade) => sum + grade.score, 0);
        const avgScore = studentGrades.length > 0 ? totalScore / studentGrades.length : null;
        const letterGrade = avgScore !== null ? getLetterGrade(avgScore) : 'N/A';

        return {
            'Student ID': student.id,
            'Student Name': student.name,
            'Date of Birth': student.dob,
            'Contact Phone': student.phone || 'N/A',
            'Attendance %': attendanceRate,
            'Average Grade Level': letterGrade,
        };
    });
};

/**
 * Generates a simple CSV list of students with basic information.
 */
export const generateStudentListCSV = (students: Student[]): string => {
    const headers = ['name', 'sex', 'dob', 'phone', 'enrollmentDate', 'status'];
    const rows = students.map(s => [
        escapeCsvField(s.name),
        escapeCsvField(s.sex),
        escapeCsvField(s.dob),
        escapeCsvField(s.phone),
        escapeCsvField(s.enrollmentDate),
        escapeCsvField(s.status)
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
};

/**
 * Generates a CSV list of staff members.
 */
export const generateStaffCSV = (staff: Staff[]): string => {
    // Removed ID, Subject, and Hire Date as requested
    const headers = [
        'Name',
        'Role',
        'Contact',
    ];

    const rows = staff.map(staffMember => {
        return [
            escapeCsvField(staffMember.name),
            escapeCsvField(staffMember.role),
            escapeCsvField(staffMember.contact),
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};

// Generates a class roster in the specific "Report Card" format requested
/**
 * Generates a detailed CSV roster for a single class, including metadata like teacher and schedule.
 */
export const generateSingleClassCSV = (cls: Class, allStaff: Staff[], allStudents: Student[], allEnrollments: Enrollment[]): string => {
    const teacher = allStaff.find(s => s.id === cls.teacherId);

    const classEnrollments = allEnrollments.filter(e => e.classId === cls.id);
    const studentIds = classEnrollments.map(e => e.studentId);

    // Sort students by name for the roster
    const classStudents = allStudents
        .filter(s => studentIds.includes(s.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Header Metadata Block
    const metaLines = [
        `Br: C2`, // Hardcoded branch as per image requirement
        `Level: ${escapeCsvField(cls.level)}`,
        `Time: ${escapeCsvField(cls.schedule)}`,
        `Room: ${escapeCsvField(cls.name)}`,
        `Tr: ${escapeCsvField(teacher?.name || 'Unassigned')}`,
        '' // Empty line for spacing
    ];

    // Table Header
    const tableHeader = 'No,Name,Sex,Phone';

    // Student Rows
    const studentRows = classStudents.map((s, index) => {
        return [
            index + 1, // No
            escapeCsvField(s.name),
            escapeCsvField(s.sex === 'Female' ? 'F' : 'M'), // Abbreviated Sex
            escapeCsvField(s.phone)
        ].join(',');
    });

    return [...metaLines, tableHeader, ...studentRows].join('\n');
};

/**
 * Generates a bulk CSV containing rosters for multiple classes, separated by blank lines.
 */
export const generateBulkClassCSV = (selectedClasses: Class[], allStaff: Staff[], allStudents: Student[], allEnrollments: Enrollment[]): string => {
    // Join multiple class rosters with a few blank lines in between
    return selectedClasses.map(cls => generateSingleClassCSV(cls, allStaff, allStudents, allEnrollments)).join('\n\n\n');
};