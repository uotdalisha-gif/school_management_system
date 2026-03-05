import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { Message, MessageType, UserRole } from '../types';
import {
    fetchMessages, sendMessage, markAsRead,
    updateLeaveStatus, subscribeToMessages
} from '../services/messageService';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const typeBadge: Record<MessageType, { label: string; color: string }> = {
    text: { label: 'Message', color: 'bg-slate-100 text-slate-600' },
    leave_request: { label: 'Leave Request', color: 'bg-amber-100 text-amber-700' },
    sick_report: { label: 'Sick Report', color: 'bg-rose-100 text-rose-700' },
    incident: { label: 'Incident', color: 'bg-red-100 text-red-700' },
    announcement: { label: 'Announcement', color: 'bg-blue-100 text-blue-700' },
};

const statusBadge: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};

// ─────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────
const MessageBubble: React.FC<{
    msg: Message;
    isMine: boolean;
    isAdmin: boolean;
    onStatusChange: (id: string, status: 'approved' | 'rejected') => void;
}> = ({ msg, isMine, isAdmin, onStatusChange }) => {
    const badge = typeBadge[msg.type];
    const isPending = msg.metadata?.status === 'pending';

    return (
        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3 group`}>
            {!isMine && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold mr-2 shrink-0 mt-1">
                    {msg.senderName.charAt(0).toUpperCase()}
                </div>
            )}
            <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMine && (
                    <span className="text-xs text-slate-400 font-medium mb-1 ml-1">{msg.senderName}</span>
                )}
                <div className={`rounded-2xl px-4 py-3 shadow-sm ${isMine
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                    }`}>
                    {/* Type badge */}
                    {msg.type !== 'text' && (
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${isMine ? 'bg-white/20 text-white' : badge.color
                            }`}>
                            {badge.label}
                        </span>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Leave/sick metadata */}
                    {msg.metadata?.startDate && (
                        <div className={`mt-2 pt-2 border-t ${isMine ? 'border-white/20' : 'border-slate-100'} text-xs space-y-0.5`}>
                            <div className={isMine ? 'text-white/80' : 'text-slate-500'}>
                                📅 {msg.metadata.startDate}{msg.metadata.endDate && msg.metadata.endDate !== msg.metadata.startDate ? ` → ${msg.metadata.endDate}` : ''}
                            </div>
                            {msg.metadata.leaveType && (
                                <div className={isMine ? 'text-white/80' : 'text-slate-500'}>
                                    🏷 {msg.metadata.leaveType}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status badge */}
                    {msg.metadata?.status && (
                        <div className="mt-2">
                            <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isMine ? 'bg-white/20 text-white' : statusBadge[msg.metadata.status]
                                }`}>
                                {msg.metadata.status}
                            </span>
                        </div>
                    )}
                </div>

                {/* Admin approve/reject buttons for pending requests */}
                {isAdmin && !isMine && (msg.type === 'leave_request' || msg.type === 'sick_report') && isPending && (
                    <div className="flex gap-2 mt-1.5 ml-1">
                        <button
                            onClick={() => onStatusChange(msg.id, 'approved')}
                            className="px-3 py-1 text-xs font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            ✓ Approve
                        </button>
                        <button
                            onClick={() => onStatusChange(msg.id, 'rejected')}
                            className="px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            ✗ Reject
                        </button>
                    </div>
                )}

                <span className={`text-[10px] text-slate-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                    {formatTime(msg.createdAt)}
                    {isMine && <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>}
                </span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Quick Action Modal (Leave / Sick / Incident)
// ─────────────────────────────────────────────
const QuickActionModal: React.FC<{
    type: 'leave_request' | 'sick_report' | 'incident';
    onSend: (content: string, metadata: object) => void;
    onClose: () => void;
}> = ({ type, onSend, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [leaveType, setLeaveType] = useState('Annual Leave');
    const [reason, setReason] = useState('');
    const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High'>('Low');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) return;

        let content = '';
        let metadata: any = { status: 'pending' };

        if (type === 'leave_request') {
            content = `Leave Request: ${leaveType}\nDate: ${startDate}${endDate !== startDate ? ' to ' + endDate : ''}\nReason: ${reason}`;
            metadata = { ...metadata, startDate, endDate, leaveType };
        } else if (type === 'sick_report') {
            content = `Sick Report – unable to attend on ${startDate}.\nReason: ${reason}`;
            metadata = { ...metadata, startDate, endDate: startDate };
        } else {
            content = `Incident Report [${severity} Severity]\n${reason}`;
            metadata = { severity };
        }
        onSend(content, metadata);
        onClose();
    };

    const titles = {
        leave_request: '📅 Request Leave',
        sick_report: '🤒 Report Sick Day',
        incident: '⚠️ File Incident Report',
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">{titles[type]}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {type === 'leave_request' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Leave Type</label>
                                <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                    <option>Annual Leave</option>
                                    <option>Personal Leave</option>
                                    <option>Non-Personal Leave</option>
                                    <option>Emergency Leave</option>
                                    <option>Maternity / Paternity Leave</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
                                    <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                                </div>
                            </div>
                        </>
                    )}
                    {type === 'sick_report' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Absent Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
                        </div>
                    )}
                    {type === 'incident' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Severity</label>
                            <select value={severity} onChange={e => setSeverity(e.target.value as any)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            {type === 'incident' ? 'Incident Description' : 'Reason / Details'}
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Provide details..."
                            rows={3}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-5 py-2 text-sm font-bold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200">
                            Send Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Main MessagesPage
// ─────────────────────────────────────────────
const MessagesPage: React.FC = () => {
    const { currentUser, staff } = useData();
    const isAdmin = currentUser?.role === UserRole.Admin;
    const myId = currentUser?.id || 'admin';
    const myName = currentUser?.name || 'Administrator';

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeConversation, setActiveConversation] = useState<string>(''); // staff ID or 'all'
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [modal, setModal] = useState<null | 'leave_request' | 'sick_report' | 'incident'>(null);
    const [announcementMode, setAnnouncementMode] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Load messages
    const load = useCallback(async () => {
        const data = await fetchMessages(myId, isAdmin);
        setMessages(data);
        if (!activeConversation) {
            if (isAdmin) {
                // Default to first staff member
                const ids = [...new Set(data.filter(m => m.senderId !== 'admin' || m.recipientId !== 'admin').map(m => m.senderId === 'admin' ? m.recipientId : m.senderId))];
                setActiveConversation(ids[0] || staff[0]?.id || '');
            } else {
                setActiveConversation('admin');
            }
        }
        setLoading(false);
    }, [myId, isAdmin, staff, activeConversation]);

    useEffect(() => {
        load();
        // Poll every 8 seconds + real-time subscription
        const interval = setInterval(load, 8000);
        const channel = subscribeToMessages(myId, isAdmin, (newMsg) => {
            setMessages(prev => {
                const exists = prev.find(m => m.id === newMsg.id);
                if (exists) return prev.map(m => m.id === newMsg.id ? newMsg : m);
                return [...prev, newMsg];
            });
        });
        return () => {
            clearInterval(interval);
            channel?.unsubscribe();
        };
    }, [myId, isAdmin]);

    // Scroll to bottom when active conversation changes or new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeConversation]);

    // Mark conversation messages as read
    useEffect(() => {
        if (!activeConversation) return;
        const unread = conversationMessages.filter(m => !m.isRead && m.recipientId === myId).map(m => m.id);
        if (unread.length > 0) markAsRead(unread);
    }, [activeConversation, messages]);

    // ── Conversation list for admin sidebar
    const staffConversations = isAdmin
        ? staff.map(s => {
            const msgs = messages.filter(m =>
                m.senderId === s.id || m.recipientId === s.id
            );
            const lastMsg = msgs[msgs.length - 1];
            const unread = msgs.filter(m => !m.isRead && m.senderId === s.id).length;
            return { id: s.id, name: s.name, role: s.role, lastMsg, unread };
        }).sort((a, b) => {
            if (!a.lastMsg && !b.lastMsg) return 0;
            if (!a.lastMsg) return 1;
            if (!b.lastMsg) return -1;
            return new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime();
        })
        : [];

    // ── Filter messages for active conversation
    const conversationMessages = messages.filter(m => {
        if (isAdmin) {
            if (activeConversation === 'all') return m.type === 'announcement';
            return (m.senderId === activeConversation || m.recipientId === activeConversation);
        } else {
            return (
                (m.senderId === myId && m.recipientId === 'admin') ||
                (m.senderId === 'admin' && (m.recipientId === myId || m.recipientId === 'all'))
            );
        }
    });

    const totalUnread = messages.filter(m => !m.isRead && m.recipientId === myId).length;

    // ── Send message handler
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        const recipient = announcementMode ? 'all' : (isAdmin ? activeConversation : 'admin');
        const newMsg = await sendMessage({
            senderId: myId,
            senderName: myName,
            recipientId: recipient,
            type: announcementMode ? 'announcement' : 'text',
            content: text.trim(),
        });
        if (newMsg) {
            setMessages(prev => [...prev, newMsg]);
            setText('');
        }
        setSending(false);
    };

    const handleQuickSend = async (content: string, metadata: object, type: MessageType) => {
        const newMsg = await sendMessage({
            senderId: myId,
            senderName: myName,
            recipientId: 'admin',
            type,
            content,
            metadata,
        });
        if (newMsg) setMessages(prev => [...prev, newMsg]);
    };

    const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
        await updateLeaveStatus(id, status);
        setMessages(prev => prev.map(m => m.id === id
            ? { ...m, metadata: { ...m.metadata, status } }
            : m
        ));
    };

    const activeStaff = isAdmin ? staff.find(s => s.id === activeConversation) : null;

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">

            {/* ── Left: Conversation List (Admin) or Quick Actions (Staff) ── */}
            <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">
                        {isAdmin ? 'Messages' : 'Staff Inbox'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {isAdmin ? `${totalUnread} unread` : 'Your conversation with admin'}
                    </p>
                </div>

                {isAdmin ? (
                    // Admin: List of staff to chat with
                    <div className="flex-1 overflow-y-auto">
                        {/* Announcement broadcast button */}
                        <button
                            onClick={() => { setActiveConversation('all'); setAnnouncementMode(true); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-colors ${activeConversation === 'all' ? 'bg-blue-50' : 'hover:bg-white'}`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-700">Announce to All</p>
                                <p className="text-xs text-slate-400">Broadcast to all staff</p>
                            </div>
                        </button>

                        {staffConversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => { setActiveConversation(conv.id); setAnnouncementMode(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-colors ${activeConversation === conv.id ? 'bg-primary-50 border-l-2 border-l-primary-500' : 'hover:bg-white'}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    {conv.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{conv.name}</p>
                                        {conv.unread > 0 && (
                                            <span className="ml-1 min-w-[18px] h-[18px] bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                                {conv.unread}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">
                                        {conv.lastMsg ? conv.lastMsg.content.slice(0, 35) + (conv.lastMsg.content.length > 35 ? '…' : '') : 'No messages yet'}
                                    </p>
                                </div>
                            </button>
                        ))}

                        {staffConversations.length === 0 && (
                            <div className="p-6 text-center text-slate-400 text-sm">No staff found</div>
                        )}
                    </div>
                ) : (
                    // Staff: Quick action buttons
                    <div className="flex-1 p-4 space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</p>

                        <button
                            onClick={() => setModal('leave_request')}
                            className="w-full flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left"
                        >
                            <span className="text-xl">📅</span>
                            <div>
                                <p className="text-sm font-bold text-amber-800">Request Leave</p>
                                <p className="text-xs text-amber-600">Annual, personal, etc.</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setModal('sick_report')}
                            className="w-full flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors text-left"
                        >
                            <span className="text-xl">🤒</span>
                            <div>
                                <p className="text-sm font-bold text-rose-800">Report Sick Day</p>
                                <p className="text-xs text-rose-600">Can't come in today</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setModal('incident')}
                            className="w-full flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-left"
                        >
                            <span className="text-xl">⚠️</span>
                            <div>
                                <p className="text-sm font-bold text-red-800">File Incident Report</p>
                                <p className="text-xs text-red-600">Safety or serious issues</p>
                            </div>
                        </button>

                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-400 text-center">Or type a message below to contact admin directly</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Right: Chat Window ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
                    {activeConversation === 'all' ? (
                        <>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">All Staff Announcement</p>
                                <p className="text-xs text-slate-400">Visible to all {staff.length} staff members</p>
                            </div>
                        </>
                    ) : isAdmin && activeStaff ? (
                        <>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold">
                                {activeStaff.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{activeStaff.name}</p>
                                <p className="text-xs text-slate-400 capitalize">{activeStaff.role}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">A</div>
                            <div>
                                <p className="font-bold text-slate-800">Administrator</p>
                                <p className="text-xs text-emerald-500 font-medium">● School Admin</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 bg-slate-50/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : conversationMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-500">No messages yet</p>
                                <p className="text-xs text-slate-400 mt-1">Start the conversation below</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {conversationMessages.map(msg => (
                                <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isMine={msg.senderId === myId}
                                    isAdmin={isAdmin}
                                    onStatusChange={handleStatusChange}
                                />
                            ))}
                            <div ref={bottomRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="px-4 py-4 border-t border-slate-200 bg-white">
                    {announcementMode && (
                        <div className="mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-xs font-medium text-blue-700">Announcement mode — this message will be sent to all staff</span>
                        </div>
                    )}
                    <div className="flex items-end gap-3">
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={announcementMode ? 'Type your announcement...' : 'Type a message... (Enter to send, Shift+Enter for newline)'}
                            rows={1}
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none max-h-32"
                            style={{ height: 'auto' }}
                        />
                        <button
                            type="submit"
                            disabled={!text.trim() || sending}
                            className="w-11 h-11 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-40 shadow-lg shadow-primary-200 shrink-0"
                        >
                            {sending
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* Quick Action Modal */}
            {modal && (
                <QuickActionModal
                    type={modal}
                    onClose={() => setModal(null)}
                    onSend={(content, metadata) => handleQuickSend(content, metadata, modal)}
                />
            )}
        </div>
    );
};

export default MessagesPage;
