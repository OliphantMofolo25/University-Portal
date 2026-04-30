// src/screens/lecturer/LecturerHome.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const LecturerHome = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [myCourses, setMyCourses] = useState([]);
  const [courseStudentCounts, setCourseStudentCounts] = useState({});
  const [totalStudents, setTotalStudents] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [recentRatings, setRecentRatings] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const getStudentCountForCourse = async (courseId) => {
    try {
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        where('courseIds', 'array-contains', courseId)
      );
      const snapshot = await getDocs(studentsQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting student count:', error);
      return 0;
    }
  };

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) return;
      const user = userDoc.data();
      setUserData(user);

      // Get lecturer's courses from assignedCourses (stored during registration)
      // This is the key fix - use assignedCourses instead of fetching from courses collection
      const assignedCourses = user.assignedCourses || [];
      
      if (assignedCourses.length > 0) {
        setMyCourses(assignedCourses);

        // Calculate total students across all courses
        let totalStudentCount = 0;
        const counts = {};
        
        for (const course of assignedCourses) {
          const count = await getStudentCountForCourse(course.id);
          counts[course.id] = count;
          totalStudentCount += count;
        }
        setCourseStudentCounts(counts);
        setTotalStudents(totalStudentCount);
      }

      // Get ratings for this lecturer
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('lecturerId', '==', currentUser.uid)
      );
      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratings = [];
      ratingsSnapshot.forEach(doc => ratings.push(doc.data()));
      
      const avg = ratings.length > 0 
        ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
        : 0;
      setAvgRating(avg);
      
      // Get recent ratings (last 5)
      const recent = ratings.slice(-5).reverse();
      setRecentRatings(recent);
      
      // Get reports count
      const reportsQuery = query(
        collection(db, 'reports'),
        where('lecturerId', '==', currentUser.uid)
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      setReportsCount(reportsSnapshot.size);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'check-square', label: 'Mark Attendance', color: '#2196F3', onPress: () => navigation.navigate('Attendance') },
    { icon: 'file-text', label: 'My Reports', color: '#FF9800', onPress: () => navigation.navigate('Reports') },
    { icon: 'star', label: 'My Ratings', color: '#9C27B0', onPress: () => {} },
  ];

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Icon key={star} name="star" size={12} color={star <= rating ? COLORS.warning : COLORS.border} />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Lecturer Dashboard" navigation={navigation} showLogout={true} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'L'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userData?.name || 'Lecturer'}</Text>
            <Text style={styles.userDept}>{userData?.department || 'Faculty'}</Text>
            <View style={styles.employeeBadge}>
              <Icon name="briefcase" size={12} color={COLORS.navy} />
              <Text style={styles.employeeText}>ID: {userData?.employeeId}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <RoundContainer glow style={styles.statCard}>
            <Icon name="book" size={24} color={COLORS.navy} />
            <Text style={styles.statValue}>{myCourses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </RoundContainer>
          <RoundContainer glow style={styles.statCard}>
            <Icon name="users" size={24} color={COLORS.navy} />
            <Text style={styles.statValue}>{totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </RoundContainer>
          <RoundContainer glow style={styles.statCard}>
            <Icon name="star" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{avgRating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </RoundContainer>
          <RoundContainer glow style={styles.statCard}>
            <Icon name="file-text" size={24} color={COLORS.navy} />
            <Text style={styles.statValue}>{reportsCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </RoundContainer>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionCard} onPress={action.onPress}>
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Icon name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Courses Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Courses</Text>
        </View>

        {myCourses.length === 0 ? (
          <RoundContainer glow style={styles.emptyCoursesCard}>
            <Icon name="book" size={32} color={COLORS.textLight} />
            <Text style={styles.emptyCoursesText}>No courses assigned</Text>
            <Text style={styles.emptyCoursesSubtext}>Contact your program leader</Text>
          </RoundContainer>
        ) : (
          myCourses.map((course, index) => (
            <RoundContainer key={index} glow style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseCode}>{course.code}</Text>
                </View>
                <View style={styles.studentCountBadge}>
                  <Icon name="users" size={12} color={COLORS.white} />
                  <Text style={styles.studentCountText}>
                    {courseStudentCounts[course.id] || 0} students
                  </Text>
                </View>
              </View>
              <View style={styles.courseActions}>
                <TouchableOpacity style={styles.courseActionBtn} onPress={() => navigation.navigate('Attendance')}>
                  <Icon name="check-square" size={16} color={COLORS.navy} />
                  <Text style={styles.courseActionText}>Mark Attendance</Text>
                </TouchableOpacity>
              </View>
            </RoundContainer>
          ))
        )}

        {/* Recent Ratings Section */}
        <Text style={styles.sectionTitle}>Recent Ratings</Text>
        {recentRatings.length > 0 ? (
          recentRatings.map((rating, index) => (
            <RoundContainer key={index} glow style={styles.ratingCard}>
              <View style={styles.ratingHeader}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentInitial}>{rating.studentName?.charAt(0) || '?'}</Text>
                </View>
                <View style={styles.ratingInfo}>
                  <Text style={styles.studentName}>{rating.studentName || 'Anonymous'}</Text>
                  <Text style={styles.ratingDate}>{rating.date?.split('T')[0]}</Text>
                </View>
                {renderStars(rating.rating)}
              </View>
              {rating.feedback && (
                <Text style={styles.feedbackText}>"{rating.feedback}"</Text>
              )}
            </RoundContainer>
          ))
        ) : (
          <RoundContainer glow style={styles.emptyCard}>
            <Icon name="star" size={32} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No ratings yet</Text>
            <Text style={styles.emptySubtext}>Students will rate you after classes</Text>
          </RoundContainer>
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
  
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20, marginBottom: 24 },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 28, fontWeight: '600', color: COLORS.white },
  profileInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  userDept: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  employeeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  employeeText: { fontSize: 11, color: COLORS.navy },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  statCard: { width: '48%', alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 28, fontWeight: '700', color: COLORS.navy, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  
  quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  actionCard: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, color: COLORS.textDark, textAlign: 'center' },
  
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  
  emptyCoursesCard: { alignItems: 'center', paddingVertical: 30, marginBottom: 12 },
  emptyCoursesText: { fontSize: 16, fontWeight: '500', color: COLORS.textLight, marginTop: 12 },
  emptyCoursesSubtext: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  
  courseCard: { marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseName: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  courseCode: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  studentCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.navy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  studentCountText: { fontSize: 10, color: COLORS.white },
  courseActions: { flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  courseActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseActionText: { fontSize: 13, color: COLORS.navy },
  
  ratingCard: { marginBottom: 12 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.navy + '15', justifyContent: 'center', alignItems: 'center' },
  studentInitial: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  ratingInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '500', color: COLORS.navy },
  ratingDate: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  starsContainer: { flexDirection: 'row', gap: 2 },
  feedbackText: { fontSize: 12, color: COLORS.textDark, fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  
  emptyCard: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, fontWeight: '500', color: COLORS.textLight, marginTop: 12 },
  emptySubtext: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});

export default LecturerHome;