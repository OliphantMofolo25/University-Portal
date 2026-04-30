// routes/reports.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('reports').orderBy('createdAt', 'desc').get();
    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, authorize('lecturer', 'prl'), async (req, res) => {
  try {
    const { title, content, type } = req.body;
    const reportData = {
      title,
      content,
      type,
      status: 'pending',
      createdBy: req.user.uid,
      createdByName: req.user.name,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('reports').add(reportData);
    res.status(201).json({ success: true, id: docRef.id, report: reportData });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id/feedback', protect, authorize('prl', 'pl'), async (req, res) => {
  try {
    const { feedback, status } = req.body;
    await db.collection('reports').doc(req.params.id).update({
      feedback,
      status: status || 'reviewed',
      reviewedBy: req.user.uid,
      reviewedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Feedback added successfully' });
  } catch (error) {
    console.error('Add feedback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;