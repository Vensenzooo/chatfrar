import express from 'express';
import multer from 'multer';
import path from 'path';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Get messages for a specific chat (direct message or group)
router.get('/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { type } = req.query; // 'dm' or 'group'
    
    let query;
    let params;
    
    if (type === 'dm') {
      query = `
        SELECT m.*, u.username, u.avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?)
        OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at DESC
        LIMIT 50
      `;
      params = [req.user.id, chatId, chatId, req.user.id];
    } else {
      query = `
        SELECT m.*, u.username, u.avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = ?
        ORDER BY m.created_at DESC
        LIMIT 50
      `;
      params = [chatId];
    }
    
    const [messages] = await pool.query(query, params);
    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a message
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { content, receiverId, groupId } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;
    
    const [result] = await pool.query(
      `INSERT INTO messages (content, image, sender_id, receiver_id, group_id)
       VALUES (?, ?, ?, ?, ?)`,
      [content, image, req.user.id, receiverId || null, groupId || null]
    );
    
    const [message] = await pool.query(
      `SELECT m.*, u.username, u.avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(message[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export { router };