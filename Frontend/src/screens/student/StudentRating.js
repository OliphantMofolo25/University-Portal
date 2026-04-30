// src/screens/student/StudentRating.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

const StudentRating = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lecturers, setLecturers] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Fetch only lecturers from Firebase (users with role 'lecturer')
      const lecturersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'lecturer')
      );
      const lecturersSnapshot = await getDocs(lecturersQuery);
      const lecturersList = [];
      lecturersSnapshot.forEach(doc => {
        const data = doc.data();
        lecturersList.push({ 
          id: doc.id, 
          name: data.name,
          department: data.department,
          employeeId: data.employeeId,
          faculty: data.faculty,
          // Get first assigned course name
          course: data.assignedCourses?.[0]?.name || 'General'
        });
      });
      
      // Randomly select 5 lecturers
      const shuffled = [...lecturersList];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const randomLecturers = shuffled.slice(0, 5);
      setLecturers(randomLecturers);
    } catch (error) {
      console.error('Error loading lecturers:', error);
      Alert.alert('Error', 'Failed to load lecturers');
    }

    if (auth.currentUser) {
      try {
        const ratingsQuery = query(
          collection(db, 'ratings'), 
          where('studentId', '==', auth.currentUser.uid)
        );
        const ratingsSnapshot = await getDocs(ratingsQuery);
        const ratingsList = [];
        ratingsSnapshot.forEach(doc => ratingsList.push({ id: doc.id, ...doc.data() }));
        setMyRatings(ratingsList);
      } catch (error) {
        console.error('Error loading ratings:', error);
      }
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to rate');
      return;
    }

    setSubmitting(true);
    try {
      const ratingData = {
        lecturerId: selectedLecturer.id,
        lecturerName: selectedLecturer.name,
        lecturerDepartment: selectedLecturer.department || 'Faculty',
        lecturerCourse: selectedLecturer.course || 'General',
        rating: rating,
        feedback: feedback || '',
        date: new Date().toISOString(),
        createdAt: new Date(),
        isAnonymous: isAnonymous,
      };

      if (!isAnonymous) {
        ratingData.studentId = auth.currentUser.uid;
        ratingData.studentName = auth.currentUser.displayName || 'Student';
        ratingData.studentEmail = auth.currentUser.email;
      } else {
        ratingData.studentId = null;
        ratingData.studentName = 'Anonymous Student';
        ratingData.studentEmail = null;
      }

      await addDoc(collection(db, 'ratings'), ratingData);
      
      Alert.alert('Success', isAnonymous ? 'Rating submitted anonymously!' : `You rated ${selectedLecturer.name} ${rating} stars!`);
      setModalVisible(false);
      setRating(0);
      setFeedback('');
      setIsAnonymous(false);
      loadData();
    } catch (error) {
      console.error('Submit rating error:', error);
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const hasRated = (lecturerId) => {
    return myRatings.some(r => r.lecturerId === lecturerId);
  };

  const getUserRatingForLecturer = (lecturerId) => {
    const ratingObj = myRatings.find(r => r.lecturerId === lecturerId);
    return ratingObj ? ratingObj.rating : null;
  };

  const renderStars = (ratingValue, interactive = false, size = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => interactive && setRating(star)}
            disabled={!interactive}
            activeOpacity={0.7}
          >
            <Icon
              name="star"
              size={interactive ? 32 : size}
              color={star <= ratingValue ? COLORS.warning : COLORS.border}
              style={interactive && styles.interactiveStar}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Rate Your Lecturers" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Rate Your Lecturers</Text>
        <Text style={styles.subtitle}>Tap on a lecturer to rate them</Text>
        
        {loading ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="loader" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Loading lecturers...</Text>
          </RoundContainer>
        ) : lecturers.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="users" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No lecturers available</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </RoundContainer>
        ) : (
          lecturers.map(lecturer => {
            const rated = hasRated(lecturer.id);
            const userRating = getUserRatingForLecturer(lecturer.id);
            
            return (
              <RoundContainer key={lecturer.id} glow style={styles.lecturerCard}>
                <View style={styles.lecturerHeader}>
                  <View style={styles.lecturerAvatar}>
                    <Text style={styles.lecturerInitial}>{lecturer.name?.charAt(0)}</Text>
                  </View>
                  <View style={styles.lecturerInfo}>
                    <Text style={styles.lecturerName}>{lecturer.name}</Text>
                    <Text style={styles.lecturerDept}>{lecturer.department || 'Faculty'}</Text>
                    <Text style={styles.lecturerCourse}>Teaches: {lecturer.course || 'General'}</Text>
                    {rated && (
                      <View style={styles.ratedBadge}>
                        <Icon name="check-circle" size={14} color={COLORS.success} />
                        <Text style={styles.ratedText}>Your rating: {userRating}/5</Text>
                        {renderStars(userRating, false, 12)}
                      </View>
                    )}
                  </View>
                  {!rated && (
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={() => {
                        setSelectedLecturer(lecturer);
                        setModalVisible(true);
                      }}
                    >
                      <Icon name="star" size={18} color={COLORS.white} />
                      <Text style={styles.rateButtonText}>Rate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </RoundContainer>
            );
          })
        )}

        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rate {selectedLecturer?.name}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="x" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalLecturerInfo}>
                <Text style={styles.modalLecturerDept}>{selectedLecturer?.department || 'Faculty'}</Text>
                <Text style={styles.modalLecturerCourse}>Teaches: {selectedLecturer?.course || 'General'}</Text>
              </View>

              <Text style={styles.ratingLabel}>Your Rating</Text>
              {renderStars(rating, true, 32)}

              <View style={styles.anonymousContainer}>
                <View style={styles.anonymousLeft}>
                  <Icon name="shield" size={20} color={COLORS.navy} />
                  <View style={styles.anonymousTextContainer}>
                    <Text style={styles.anonymousTitle}>Rate Anonymously</Text>
                    <Text style={styles.anonymousSubtitle}>Your identity will be hidden</Text>
                  </View>
                </View>
                <Switch
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: COLORS.border, true: COLORS.navy + '80' }}
                  thumbColor={isAnonymous ? COLORS.navy : COLORS.white}
                />
              </View>

              <Text style={styles.feedbackLabel}>Feedback (Optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Share your experience with this lecturer..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
                value={feedback}
                onChangeText={setFeedback}
              />

              <ActionButton
                title="Submit Rating"
                onPress={handleSubmitRating}
                loading={submitting}
                style={styles.submitButton}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.navy, marginTop: 16, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '500', color: COLORS.textLight, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  lecturerCard: { marginBottom: 12 },
  lecturerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lecturerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.navy + '15', justifyContent: 'center', alignItems: 'center' },
  lecturerInitial: { fontSize: 20, fontWeight: '600', color: COLORS.navy },
  lecturerInfo: { flex: 1 },
  lecturerName: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  lecturerDept: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  lecturerCourse: { fontSize: 11, color: COLORS.textLight, marginTop: 2, fontStyle: 'italic' },
  ratedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  ratedText: { fontSize: 11, color: COLORS.success, fontWeight: '500' },
  rateButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.navy, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  rateButtonText: { fontSize: 13, fontWeight: '500', color: COLORS.white },
  starsContainer: { flexDirection: 'row', gap: 4 },
  interactiveStar: { marginHorizontal: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 28, width: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  modalLecturerInfo: { marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalLecturerDept: { fontSize: 14, color: COLORS.textLight },
  modalLecturerCourse: { fontSize: 13, color: COLORS.textLight, marginTop: 2, fontStyle: 'italic' },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 12 },
  anonymousContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.navy + '08', borderRadius: 16, padding: 14, marginTop: 20, marginBottom: 8 },
  anonymousLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  anonymousTextContainer: { flex: 1 },
  anonymousTitle: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  anonymousSubtitle: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  feedbackLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textDark, marginTop: 16, marginBottom: 8 },
  feedbackInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12, fontSize: 14, color: COLORS.textDark, textAlignVertical: 'top', minHeight: 100 },
  submitButton: { marginTop: 20 },
});

export default StudentRating;