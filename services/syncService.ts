import { Student, Staff, StaffPermission, Class, SchoolEvent, Grade, Attendance, Enrollment, DailyLog, IncidentReport, RoomStatus } from '../types';
import { getSupabase, localStore } from './core';
import { mapStudent, mapStaff, mapStaffPermission, mapDailyLog, mapIncidentReport, mapRoomStatus, mapClass, mapEnrollment, mapGrade, mapAttendance } from './mappers';
import { studentService } from './studentService';
import { staffService } from './staffService';
import { classService } from './classService';
import { logService } from './logService';
import { configService } from './configService';

export const syncService = {
    async importAllData(data: any) {
        const tasks = [];
        if (data.students && Array.isArray(data.students) && data.students.length > 0) tasks.push(studentService.saveStudents(data.students));
        if (data.staff && Array.isArray(data.staff) && data.staff.length > 0) tasks.push(staffService.saveStaff(data.staff));
        if (data.classes && Array.isArray(data.classes) && data.classes.length > 0) tasks.push(classService.saveClasses(data.classes));
        if (data.events && Array.isArray(data.events) && data.events.length > 0) tasks.push(logService.saveEvents(data.events));
        if (data.subjects && Array.isArray(data.subjects)) tasks.push(configService.saveSubjects(data.subjects));
        if (data.levels && Array.isArray(data.levels)) tasks.push(configService.saveLevels(data.levels));
        if (data.timeSlots && Array.isArray(data.timeSlots)) tasks.push(configService.saveTimeSlots(data.timeSlots));
        if (data.adminPassword) tasks.push(configService.saveAdminPassword(data.adminPassword));

        if (tasks.length > 0) {
            await Promise.all(tasks);
        }
    },

    async syncAll(payload: {
        students?: Student[],
        staff?: Staff[],
        staffPermissions?: StaffPermission[],
        classes?: Class[],
        events?: SchoolEvent[],
        grades?: Grade[],
        attendance?: Attendance[],
        enrollments?: Enrollment[],
        dailyLogs?: DailyLog[],
        incidentReports?: IncidentReport[],
        roomStatuses?: RoomStatus[],
        config?: { key: string, value: any }[]
    }): Promise<void> {
        const client = getSupabase();
        if (!client || !navigator.onLine) return;

        try {
            console.log('Performing batch sync via direct API calls...');

            // 1. Process deletions first
            const deletedQueue = localStore.get<{ table: string, id: string }[]>('deleted_queue', []);
            if (deletedQueue.length > 0) {
                console.log(`Processing ${deletedQueue.length} queued deletions...`);
                await Promise.all(
                    deletedQueue.map(item => client.from(item.table).delete().eq('id', item.id))
                );
                localStore.set('deleted_queue', []);
            }

            // 2. Process upserts
            const configToSync: { key: string, value: any }[] = [];
            if (payload.config) {
                for (const c of payload.config) {
                    configToSync.push(c);
                }
            }

            const rpcPayload = [
                { table: 'students', data: payload.students?.map(mapStudent.toDb) || [] },
                { table: 'staff', data: payload.staff?.map(mapStaff.toDb) || [] },
                { table: 'staff_permissions', data: payload.staffPermissions?.map(mapStaffPermission.toDb) || [] },
                { table: 'daily_logs', data: payload.dailyLogs?.map(mapDailyLog.toDb) || [] },
                { table: 'incident_reports', data: payload.incidentReports?.map(mapIncidentReport.toDb) || [] },
                { table: 'room_statuses', data: payload.roomStatuses?.map(mapRoomStatus.toDb) || [] },
                { table: 'classes', data: payload.classes?.map(mapClass.toDb) || [] },
                { table: 'enrollments', data: payload.enrollments?.map(mapEnrollment.toDb) || [] },
                { table: 'grades', data: payload.grades?.map(mapGrade.toDb) || [] },
                { table: 'attendance', data: payload.attendance?.map(mapAttendance.toDb) || [] },
                { table: 'events', data: payload.events || [] },
                { table: 'config', data: configToSync }
            ];

            // Perform direct upserts
            for (const item of rpcPayload) {
                if (item.data && item.data.length > 0) {
                    const { error } = await client.from(item.table).upsert(item.data);
                    if (error) {
                        console.error(`Direct Sync failed for ${item.table}:`, error);
                        throw error;
                    }
                }
            }

            // Clear all dirty flags on success
            const tables = ['students', 'staff', 'staff_permissions', 'classes', 'events', 'grades', 'attendance', 'enrollments', 'daily_logs', 'incident_reports', 'room_statuses', 'subjects', 'levels', 'time_slots', 'admin_password'];
            tables.forEach(t => localStore.setDirty(t, false));

            console.log('Batch sync successful.');
        } catch (err) {
            console.error('Batch sync error:', err);
            throw err;
        }
    }
};
