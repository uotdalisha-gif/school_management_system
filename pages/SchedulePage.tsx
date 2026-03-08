import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { SchoolEvent, EventType } from '../types';

// Helper to format Date to YYYY-MM-DD using local time to avoid timezone offsets
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Inlined Event CRUD Modal Component ---
const EventModal: React.FC<{ eventData: SchoolEvent | null; onClose: () => void; }> = ({ eventData, onClose }) => {
    const { addEvent, updateEvent, deleteEvent } = useData();
    const [formData, setFormData] = useState({
        title: '',
        date: formatLocalDate(new Date()),
        type: EventType.General,
        description: '',
    });
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (eventData) {
            setFormData({
                title: eventData.title,
                date: eventData.date,
                type: eventData.type,
                description: eventData.description,
            });
        }
    }, [eventData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formData.title || !formData.date || !formData.description) {
            setError('Please fill in all fields.');
            return;
        }

        if (eventData) {
            updateEvent({ ...eventData, ...formData });
        } else {
            addEvent(formData);
        }
        onClose();
    };

    const handleDelete = () => {
        if (eventData) {
            deleteEvent(eventData.id);
            onClose();
        }
    };

    const labelClasses = "block text-sm font-semibold text-primary-900 mb-1";
    const inputClasses = "w-full px-3 py-2 bg-white border border-gray-400 rounded-md text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{eventData ? 'Edit Event' : 'Add New Event'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className={labelClasses}>Event Title</label>
                        <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className={labelClasses}>Date</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-lg">
                                    🗓️
                                </span>
                                <input
                                    type="date"
                                    name="date"
                                    id="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className={`${inputClasses} pl-10`}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="type" className={labelClasses}>Event Type</label>
                            <select name="type" id="type" value={formData.type} onChange={handleChange} className={inputClasses}>
                                {Object.values(EventType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="description" className={labelClasses}>Description</label>
                        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={4} className={inputClasses} required />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <div className="flex justify-between items-center pt-4">
                        <div>
                            {eventData && (
                                isDeleting ? (
                                    <div className="flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                                        <span className="text-sm font-bold text-red-600 uppercase tracking-wider">Are you sure?</span>
                                        <button type="button" onClick={() => setIsDeleting(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-sm font-bold">Cancel</button>
                                        <button type="button" onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-bold shadow-sm shadow-red-200">Yes, Delete</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setIsDeleting(true)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold shadow-sm transition-colors">Delete Event</button>
                                )
                            )}
                        </div>
                        <div className="space-x-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Close</button>
                            {!isDeleting && (
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold">{eventData ? 'Save Changes' : 'Add Event'}</button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Schedule Page Component ---
const SchedulePage: React.FC = () => {
    const { events } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);

    const eventTypeClasses: Record<EventType, string> = {
        [EventType.Holiday]: 'bg-red-500 hover:bg-red-600',
        [EventType.Meeting]: 'bg-blue-500 hover:bg-blue-600',
        [EventType.Exam]: 'bg-yellow-500 hover:bg-yellow-600',
        [EventType.General]: 'bg-gray-500 hover:bg-gray-600',
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleOpenModal = (event: SchoolEvent | null = null) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const { calendarGrid, eventsByDate } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...

        const grid: (Date | null)[] = [];

        // Add padding for days before the 1st
        for (let i = 0; i < startDayOfWeek; i++) {
            grid.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(new Date(year, month, i));
        }

        // Group events by date for quick lookup
        const groupedEvents = new Map<string, SchoolEvent[]>();
        events.forEach(event => {
            const dateKey = event.date; // Assumes YYYY-MM-DD format
            if (!groupedEvents.has(dateKey)) {
                groupedEvents.set(dateKey, []);
            }
            groupedEvents.get(dateKey)?.push(event);
        });

        return { calendarGrid: grid, eventsByDate: groupedEvents };

    }, [currentDate, events]);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">School Schedule</h1>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200" aria-label="Previous month">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <h2 className="text-xl font-semibold text-gray-700 w-40 text-center">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200" aria-label="Next month">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 font-bold"
                    >
                        Add New Event
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-7 gap-px">
                    {weekdays.map(day => (
                        <div key={day} className="text-center font-semibold text-gray-600 py-2">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-5 gap-px border-t border-gray-200">
                    {calendarGrid.map((day, index) => {
                        const isToday = day && day.getTime() === today.getTime();
                        const dateKey = day ? formatLocalDate(day) : '';
                        const dayEvents: SchoolEvent[] = day ? (eventsByDate.get(dateKey) || []) : [];

                        return (
                            <div key={index} className="relative min-h-[120px] bg-white border-r border-b border-gray-200 p-2">
                                {day && (
                                    <>
                                        <span className={`absolute top-2 right-2 text-sm font-semibold ${isToday ? 'bg-primary-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700'}`}>
                                            {day.getDate()}
                                        </span>
                                        <div className="mt-8 space-y-1">
                                            {dayEvents.map(event => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => handleOpenModal(event)}
                                                    className={`w-full text-left text-white text-xs font-semibold p-1.5 rounded-md truncate transition-colors ${eventTypeClasses[event.type]}`}
                                                    title={event.title}
                                                >
                                                    {event.title}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && <EventModal eventData={editingEvent} onClose={handleCloseModal} />}
        </div>
    );
};

export default SchedulePage;