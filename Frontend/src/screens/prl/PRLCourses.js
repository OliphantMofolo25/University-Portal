// src/screens/prl/PRLCourses.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const PRLCourses = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError('Not logged in');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setError('User data not found');
        return;
      }
      
      const user = userDoc.data();
      const userStream = user.stream || user.faculty || 'Faculty of Information Communication Technology';
      
      console.log('User stream:', userStream);
      
      // Fetch courses - try without filter first to see if any courses exist
      let coursesQuery;
      let coursesSnapshot;
      
      try {
        coursesQuery = query(collection(db, 'courses'), where('faculty', '==', userStream));
        coursesSnapshot = await getDocs(coursesQuery);
      } catch (filterError) {
        console.log('Filter error, trying without filter:', filterError);
        // If filter fails, get all courses
        coursesSnapshot = await getDocs(collection(db, 'courses'));
      }
      
      const coursesList = [];

      for (const doc of coursesSnapshot.docs) {
        const course = { id: doc.id, ...doc.data() };
        
        // Get lecturers for this course
        try {
          const lecturersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'lecturer'),
            where('courseIds', 'array-contains', course.id)
          );
          const lecturersSnapshot = await getDocs(lecturersQuery);
          const lecturers = [];
          lecturersSnapshot.forEach(lecturerDoc => {
            lecturers.push(lecturerDoc.data());
          });
          course.lecturers = lecturers;
        } catch (lecturerError) {
          console.log('Error fetching lecturers for course:', course.id, lecturerError);
          course.lecturers = [];
        }
        
        coursesList.push(course);
      }

      console.log('Courses loaded:', coursesList.length);
      setCourses(coursesList);
    } catch (error) {
      console.error('Error loading courses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Courses & Lecturers" navigation={navigation} showBack={true} showLogout={true} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>Error loading courses</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Courses & Lecturers" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {courses.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="book" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No courses found</Text>
            <Text style={styles.emptySubtext}>No courses available under your stream</Text>
          </RoundContainer>
        ) : (
          courses.map((course, index) => (
            <RoundContainer key={index} glow style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseCode}>{course.code}</Text>
              </View>
              <Text style={styles.courseDept}>{course.department}</Text>
              
              <Text style={styles.lecturersTitle}>Assigned Lecturers ({course.lecturers?.length || 0})</Text>
              {course.lecturers && course.lecturers.length > 0 ? (
                course.lecturers.map((lecturer, idx) => (
                  <View key={idx} style={styles.lecturerItem}>
                    <Icon name="user-check" size={14} color={COLORS.navy} />
                    <Text style={styles.lecturerName}>{lecturer.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noLecturerText}>No lecturers assigned</Text>
              )}
            </RoundContainer>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textLight },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorText: { fontSize: 18, fontWeight: '600', color: COLORS.danger, marginTop: 16 },
  errorSubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: COLORS.navy, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '500', color: COLORS.textLight, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' },
  courseCard: { marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  courseName: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  courseCode: { fontSize: 12, color: COLORS.textLight },
  courseDept: { fontSize: 13, color: COLORS.textLight, marginBottom: 10 },
  lecturersTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginTop: 8, marginBottom: 6 },
  lecturerItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  lecturerName: { fontSize: 13, color: COLORS.textDark },
  noLecturerText: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic' },
});

export default PRLCourses;