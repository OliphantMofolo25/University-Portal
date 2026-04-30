// src/screens/student/StudentCourses.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const StudentCourses = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [addingCourse, setAddingCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get user's enrolled courses
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      const enrolledCourseIds = userData.courseIds || [];
      setMyCourses(enrolledCourseIds);

      // Get all available courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList = [];
      coursesSnapshot.forEach(doc => {
        const course = { id: doc.id, ...doc.data() };
        const isEnrolled = enrolledCourseIds.includes(course.id);
        coursesList.push({ ...course, isEnrolled });
      });
      setAllCourses(coursesList);
    } catch (error) {
      console.error('Error loading courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEnrollCourse = async (course) => {
    if (course.isEnrolled) {
      Alert.alert('Info', 'You are already enrolled in this course');
      return;
    }

    setSelectedCourse(course);
    Alert.alert(
      'Enroll in Course',
      `Are you sure you want to enroll in ${course.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enroll',
          onPress: async () => {
            setAddingCourse(true);
            try {
              const currentUser = auth.currentUser;
              const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
              const userData = userDoc.data();
              
              const currentCourseIds = userData.courseIds || [];
              const currentAssignedCourses = userData.assignedCourses || [];
              
              // Add new course
              const updatedCourseIds = [...currentCourseIds, course.id];
              const updatedAssignedCourses = [...currentAssignedCourses, {
                id: course.id,
                name: course.name,
                code: course.code,
                department: course.department,
                credits: course.credits
              }];
              
              await updateDoc(doc(db, 'users', currentUser.uid), {
                courseIds: updatedCourseIds,
                assignedCourses: updatedAssignedCourses
              });
              
              Alert.alert('Success', `Successfully enrolled in ${course.name}`);
              loadData(); // Refresh the list
            } catch (error) {
              console.error('Enrollment error:', error);
              Alert.alert('Error', 'Failed to enroll in course');
            } finally {
              setAddingCourse(false);
              setSelectedCourse(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Browse Courses" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Available Courses</Text>
        <Text style={styles.subtitle}>Browse and enroll in courses</Text>

        {allCourses.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="book" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No courses available</Text>
          </RoundContainer>
        ) : (
          allCourses.map((course, index) => (
            <RoundContainer key={index} glow style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseCode}>{course.code}</Text>
                </View>
                {course.isEnrolled ? (
                  <View style={styles.enrolledBadge}>
                    <Icon name="check-circle" size={16} color={COLORS.success} />
                    <Text style={styles.enrolledText}>Enrolled</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.enrollButton}
                    onPress={() => handleEnrollCourse(course)}
                    disabled={addingCourse && selectedCourse?.id === course.id}
                  >
                    {addingCourse && selectedCourse?.id === course.id ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Icon name="plus" size={16} color={COLORS.white} />
                        <Text style={styles.enrollButtonText}>Enroll</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.courseDept}>{course.department}</Text>
              <Text style={styles.courseCredits}>Credits: {course.credits || 'N/A'}</Text>
              {course.description && (
                <Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text>
              )}
            </RoundContainer>
          ))
        )}
        
        {/* My Courses Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Your Enrollment</Text>
          <Text style={styles.summaryText}>
            You are currently enrolled in {myCourses.length} course{myCourses.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity style={styles.viewMyCoursesButton} onPress={() => navigation.goBack()}>
            <Text style={styles.viewMyCoursesText}>View My Courses</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: 16,
  },
  courseCard: {
    marginBottom: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
  courseCode: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  enrolledText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  enrollButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.white,
  },
  courseDept: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  courseCredits: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 12,
    color: COLORS.textDark,
    marginTop: 4,
  },
  summarySection: {
    marginTop: 24,
    marginBottom: 30,
    padding: 16,
    backgroundColor: COLORS.navy + '08',
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  viewMyCoursesButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  viewMyCoursesText: {
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: '500',
  },
});

export default StudentCourses;