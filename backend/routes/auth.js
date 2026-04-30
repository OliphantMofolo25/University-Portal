// routes/auth.js
const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');
const { protect } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, studentId, employeeId, department, phone } = req.body;
    
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      role,
      department: department || '',
      phone: phone || '',
      createdAt: new Date().toISOString(),
    };
    
    if (role === 'student') {
      userData.studentId = studentId;
    } else if (role === 'lecturer') {
      userData.employeeId = employeeId;
    } else if (role === 'prl') {
      userData.role = 'prl';
    } else if (role === 'pl') {
      userData.role = 'pl';
    }
    
    await db.collection('users').doc(userRecord.uid).set(userData);
    
    const token = await auth.createCustomToken(userRecord.uid);
    
    res.status(201).json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userRecord = await auth.getUserByEmail(email);
    
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();
    
    const token = await auth.createCustomToken(userRecord.uid);
    
    res.json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: userDoc.data() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;