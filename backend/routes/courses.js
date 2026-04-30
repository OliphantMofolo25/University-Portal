// routes/courses.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('courses').get();
    const courses = [];
    snapshot.forEach(doc => {
      courses.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, authorize('pl'), async (req, res) => {
  try {
    const { name, code, credits, department, description } = req.body;
    const courseData = {
      name,
      code,
      credits: parseInt(credits),
      department,
      description,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('courses').add(courseData);
    res.status(201).json({ success: true, id: docRef.id, course: courseData });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, authorize('pl'), async (req, res) => {
  try {
    await db.collection('courses').doc(req.params.id).update(req.body);
    res.json({ success: true, message: 'Course updated successfully' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, authorize('pl'), async (req, res) => {
  try {
    await db.collection('courses').doc(req.params.id).delete();
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;