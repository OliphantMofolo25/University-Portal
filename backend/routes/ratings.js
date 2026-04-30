// routes/ratings.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect } = require('../middleware/auth');

router.post('/', protect, async (req, res) => {
  try {
    const { lecturerId, lecturerName, rating, feedback } = req.body;
    
    const ratingData = {
      lecturerId,
      lecturerName,
      studentId: req.user.uid,
      studentName: req.user.name,
      rating: parseInt(rating),
      feedback: feedback || '',
      date: new Date().toISOString(),
    };
    
    const docRef = await db.collection('ratings').add(ratingData);
    res.status(201).json({ success: true, id: docRef.id, rating: ratingData });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/lecturer/:lecturerId', protect, async (req, res) => {
  try {
    const snapshot = await db.collection('ratings')
      .where('lecturerId', '==', req.params.lecturerId)
      .get();
    
    const ratings = [];
    snapshot.forEach(doc => {
      ratings.push({ id: doc.id, ...doc.data() });
    });
    
    const totalRatings = ratings.length;
    const avgRating = totalRatings > 0 
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
      : 0;
    
    res.json({
      success: true,
      ratings,
      stats: { totalRatings, avgRating: parseFloat(avgRating) },
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;