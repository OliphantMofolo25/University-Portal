// routes/users.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'pl'), async (req, res) => {
  try {
    const { role } = req.query;
    let query = db.collection('users');
    
    if (role) {
      query = query.where('role', '==', role);
    }
    
    const snapshot = await query.get();
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: { id: userDoc.id, ...userDoc.data() } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { name, department, phone, role } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (phone) updateData.phone = phone;
    if (role && (req.user.role === 'admin' || req.user.role === 'pl')) updateData.role = role;
    
    await db.collection('users').doc(req.params.id).update(updateData);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, authorize('admin', 'pl'), async (req, res) => {
  try {
    await db.collection('users').doc(req.params.id).delete();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;