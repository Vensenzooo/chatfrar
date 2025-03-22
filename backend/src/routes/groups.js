import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Group, User, Message } from '../models/index.js';

const router = express.Router();

// Create a new group
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, memberIds } = req.body;
    
    const groupId = await Group.create(name, req.user.id);
    
    // Add members to group
    const members = [req.user.id, ...memberIds];
    await Promise.all(
      members.map((memberId) => Group.addMember(groupId, memberId, memberId === req.user.id))
    );
    
    const group = await Group.findById(groupId);
    const groupMembers = await Group.getGroupMembers(groupId);
    res.status(201).json({ ...group, members: groupMembers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await Group.getUserGroups(req.user.id);
    
    // Get members for each group
    const groupsWithMembers = await Promise.all(
      groups.map(async (group) => {
        const members = await Group.getGroupMembers(group.id);
        return { ...group, members };
      })
    );
    
    res.json(groupsWithMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to group
router.post('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is group admin
    const group = await Group.findById(groupId);
    const members = await Group.getGroupMembers(groupId);
    const currentMember = members.find(m => m.id === req.user.id);
    
    if (!currentMember?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to add members to this group' });
    }

    // Check if user is already a member
    const existingMember = members.find(m => m.id === userId);
    if (existingMember) {
      return res.status(409).json({ message: 'User is already a member of the group' });
    }

    // Add user to group
    await Group.addMember(groupId, userId);
    const updatedMembers = await Group.getGroupMembers(groupId);
    
    res.status(201).json({ message: 'Member added successfully', members: updatedMembers });
  } catch (error) {
    console.error('Error adding member to group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Ban member from group
router.post('/:groupId/ban', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, reason } = req.body;

    // Check if user is group admin
    const members = await Group.getGroupMembers(groupId);
    const currentMember = members.find(m => m.id === req.user.id);
    
    if (!currentMember?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to ban members from this group' });
    }

    await Group.banMember(groupId, userId, req.user.id, reason);
    const bannedMembers = await Group.getBannedMembers(groupId);
    
    res.json({ message: 'Member banned successfully', bannedMembers });
  } catch (error) {
    console.error('Error banning member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unban member from group
router.post('/:groupId/unban', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Check if user is group admin
    const members = await Group.getGroupMembers(groupId);
    const currentMember = members.find(m => m.id === req.user.id);
    
    if (!currentMember?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to unban members from this group' });
    }

    await Group.unbanMember(groupId, userId);
    const bannedMembers = await Group.getBannedMembers(groupId);
    
    res.json({ message: 'Member unbanned successfully', bannedMembers });
  } catch (error) {
    console.error('Error unbanning member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Promote member to admin
router.post('/:groupId/promote', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Check if user is group admin
    const members = await Group.getGroupMembers(groupId);
    const currentMember = members.find(m => m.id === req.user.id);
    
    if (!currentMember?.is_admin) {
      return res.status(403).json({ message: 'Not authorized to promote members in this group' });
    }

    await Group.promoteToAdmin(groupId, userId);
    const updatedMembers = await Group.getGroupMembers(groupId);
    
    res.json({ message: 'Member promoted successfully', members: updatedMembers });
  } catch (error) {
    console.error('Error promoting member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group messages
router.get('/:groupId/messages', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.getGroupMessages(groupId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting group messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
