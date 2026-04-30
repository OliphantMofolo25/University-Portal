// routes/attendance.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    let query = db.collection('attendance');
    
    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    }
    
    const snapshot = await query.get();
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, attendance: records });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, authorize('lecturer'), async (req, res) => {
  try {
    const { classId, className, date, records } = req.body;
    
    const batch = db.batch();
    
    records.forEach(record => {
      const docRef = db.collection('attendance').doc();
      batch.set(docRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        classId,
        className,
        date,
        status: record.status,
        markedBy: req.user.uid,
        createdAt: new Date().toISOString(),
      });
    });
    
    await batch.commit();
    res.status(201).json({ success: true, message: 'Attendance recorded successfully' });
  } catch (error) {
    console.error('Create attendance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats/:studentId', protect, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const snapshot = await db.collection('attendance')
      .where('studentId', '==', studentId)
      .get();
    
    const records = [];
    snapshot.forEach(doc => {
      records.push(doc.data());
    });
    
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    res.json({
      success: true,
      stats: { total, present, absent, late, percentage },
      records,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;