import { getSupabase } from './core';
import { Message, MessageType } from '../types';

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const fromDb = (d: any): Message => ({
    id: d.id,
    senderId: d.sender_id,
    senderName: d.sender_name,
    recipientId: d.recipient_id,
    type: d.type as MessageType,
    content: d.content,
    metadata: d.metadata || {},
    isRead: d.is_read,
    createdAt: d.created_at,
});

/** Fetch all messages relevant to a user (sent or received, including broadcasts) */
export async function fetchMessages(userId: string, isAdmin: boolean): Promise<Message[]> {
    const client = getSupabase();
    if (!client) return [];

    let query = client
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (isAdmin) {
        // Admin sees everything
        query = query.or(`sender_id.eq.admin,recipient_id.eq.admin,recipient_id.eq.all`);
    } else {
        // Staff sees their own messages + broadcasts from admin
        query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId},recipient_id.eq.all`);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Failed to fetch messages:', error);
        return [];
    }
    return (data || []).map(fromDb);
}

/** Send a new message */
export async function sendMessage(msg: {
    senderId: string;
    senderName: string;
    recipientId: string;
    type: MessageType;
    content: string;
    metadata?: object;
}): Promise<Message | null> {
    const client = getSupabase();
    if (!client) return null;

    const payload = {
        id: generateId(),
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        recipient_id: msg.recipientId,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata || {},
        is_read: false,
    };

    const { data, error } = await client.from('messages').insert(payload).select().single();
    if (error) {
        console.error('Failed to send message:', error);
        return null;
    }
    return fromDb(data);
}

/** Mark messages as read */
export async function markAsRead(messageIds: string[]): Promise<void> {
    const client = getSupabase();
    if (!client || messageIds.length === 0) return;
    await client.from('messages').update({ is_read: true }).in('id', messageIds);
}

/** Update leave request status (admin only) */
export async function updateLeaveStatus(messageId: string, status: 'approved' | 'rejected'): Promise<void> {
    const client = getSupabase();
    if (!client) return;
    await client
        .from('messages')
        .update({ metadata: { status } })
        .eq('id', messageId);
}

/** Subscribe to new messages (real-time) */
export function subscribeToMessages(
    userId: string,
    isAdmin: boolean,
    onNew: (msg: Message) => void
) {
    const client = getSupabase();
    if (!client) return null;

    const channel = client
        .channel('messages_realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload: any) => {
                const msg = fromDb(payload.new);
                // Only trigger if relevant to this user
                if (
                    isAdmin ||
                    msg.recipientId === userId ||
                    msg.recipientId === 'all' ||
                    msg.senderId === userId
                ) {
                    onNew(msg);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'messages' },
            (payload: any) => {
                const msg = fromDb(payload.new);
                if (isAdmin || msg.senderId === userId || msg.recipientId === userId) {
                    onNew(msg); // refresh on update (for status changes)
                }
            }
        )
        .subscribe();

    return channel;
}
