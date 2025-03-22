import pool from '../config/database.js';

export class Group {
    static async create(name, createdBy) {
        const [result] = await pool.query(
            'INSERT INTO groups (name, created_by) VALUES (?, ?)',
            [name, createdBy]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.query(
            `SELECT g.*, u.username as creator_name
             FROM groups g
             JOIN users u ON g.created_by = u.id
             WHERE g.id = ?`,
            [id]
        );
        return rows[0];
    }

    static async getUserGroups(userId) {
        const [rows] = await pool.query(
            `SELECT g.*, u.username as creator_name
             FROM groups g
             JOIN group_members gm ON g.id = gm.group_id
             JOIN users u ON g.created_by = u.id
             WHERE gm.user_id = ?`,
            [userId]
        );
        return rows;
    }

    static async getGroupMembers(groupId) {
        const [rows] = await pool.query(
            `SELECT u.id, u.username, u.email, u.avatar, gm.is_admin
             FROM users u
             JOIN group_members gm ON u.id = gm.user_id
             WHERE gm.group_id = ?`,
            [groupId]
        );
        return rows;
    }

    static async addMember(groupId, userId, isAdmin = false) {
        await pool.query(
            'INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, ?)',
            [groupId, userId, isAdmin]
        );
    }

    static async removeMember(groupId, userId) {
        await pool.query(
            'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );
    }

    static async banMember(groupId, userId, bannedBy, reason) {
        await pool.query(
            'INSERT INTO group_bans (group_id, user_id, banned_by, reason) VALUES (?, ?, ?, ?)',
            [groupId, userId, bannedBy, reason]
        );
        await this.removeMember(groupId, userId);
    }

    static async unbanMember(groupId, userId) {
        await pool.query(
            'DELETE FROM group_bans WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );
    }

    static async getBannedMembers(groupId) {
        const [rows] = await pool.query(
            `SELECT gb.*, u.username, u.email, u.avatar, bu.username as banned_by_username
             FROM group_bans gb
             JOIN users u ON gb.user_id = u.id
             JOIN users bu ON gb.banned_by = bu.id
             WHERE gb.group_id = ?`,
            [groupId]
        );
        return rows;
    }

    static async promoteToAdmin(groupId, userId) {
        await pool.query(
            'UPDATE group_members SET is_admin = true WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );
    }
}

export class User {
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, username, email, avatar FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async findByUsername(username) {
        const [rows] = await pool.query(
            'SELECT id, username, email, avatar FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async getRecentChats(userId) {
        const [rows] = await pool.query(
            `SELECT DISTINCT u.id, u.username, u.email, u.avatar
             FROM users u
             JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id)
             WHERE (m.sender_id = ? OR m.receiver_id = ?)
             AND u.id != ?
             ORDER BY m.created_at DESC
             LIMIT 10`,
            [userId, userId, userId]
        );
        return rows;
    }
}

export class Message {
    static async create(content, senderId, receiverId = null, groupId = null, replyToId = null) {
        const [result] = await pool.query(
            `INSERT INTO messages (content, sender_id, receiver_id, group_id, reply_to_id)
             VALUES (?, ?, ?, ?, ?)`,
            [content, senderId, receiverId, groupId, replyToId]
        );
        return result.insertId;
    }

    static async getChatMessages(userId, otherUserId) {
        const [rows] = await pool.query(
            `SELECT m.*, u.username, u.email, u.avatar
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE (m.sender_id = ? AND m.receiver_id = ?)
             OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.created_at ASC`,
            [userId, otherUserId, otherUserId, userId]
        );
        return rows;
    }

    static async getGroupMessages(groupId) {
        const [rows] = await pool.query(
            `SELECT m.*, u.username, u.email, u.avatar
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.group_id = ?
             ORDER BY m.created_at ASC`,
            [groupId]
        );
        return rows;
    }

    static async delete(messageId, userId) {
        await pool.query(
            'UPDATE messages SET is_deleted = true WHERE id = ? AND sender_id = ?',
            [messageId, userId]
        );
    }

    static async getUnreadCounts(userId) {
        const [rows] = await pool.query(
            `SELECT sender_id, COUNT(*) as count
             FROM messages
             WHERE receiver_id = ? AND is_read = false
             GROUP BY sender_id`,
            [userId]
        );
        return rows;
    }

    static async markAsRead(messageId, userId) {
        await pool.query(
            'UPDATE messages SET is_read = true WHERE id = ? AND receiver_id = ?',
            [messageId, userId]
        );
    }
} 