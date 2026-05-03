// src/screens/pl/PLHome.js
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

const PLHome = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalLecturers: 0,
    totalStudents: 0,
    avgRating: 0,
  });
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) return;
      const user = userDoc.data();
      setUserData(user);

      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const totalCourses = coursesSnapshot.size;

      const lecturersQuery = query(collection(db, 'users'), where('role', '==', 'lecturer'));
      const lecturersSnapshot = await getDocs(lecturersQuery);
      const lecturersList = [];
      lecturersSnapshot.forEach(doc => lecturersList.push({ id: doc.id, ...doc.data() }));
      setLecturers(lecturersList);

      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = [];
      studentsSnapshot.forEach(doc => studentsList.push({ id: doc.id, ...doc.data() }));
      setStudents(studentsList);

      const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
      const attendanceList = [];
      attendanceSnapshot.forEach(doc => attendanceList.push(doc.data()));
      setAttendance(attendanceList);

      const ratingsSnapshot = await getDocs(collection(db, 'ratings'));
      const ratingsList = [];
      ratingsSnapshot.forEach(doc => ratingsList.push(doc.data()));
      setRatings(ratingsList);
      
      const avgRating = ratingsList.length > 0
        ? (ratingsList.reduce((sum, r) => sum + r.rating, 0) / ratingsList.length).toFixed(1)
        : 0;

      const reportsSnapshot = await getDocs(collection(db, 'reports'));
      const pending = reportsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;
      setPendingReports(pending);

      setStats({
        totalCourses,
        totalLecturers: lecturersList.length,
        totalStudents: studentsList.length,
        avgRating: parseFloat(avgRating),
      });
    } catch (error) {
      console.error('Error loading PL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStudentAttendance = (studentId) => {
    const studentAttendance = attendance.filter(a => a.studentId === studentId);
    const present = studentAttendance.filter(a => a.status === 'present').length;
    const total = studentAttendance.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percentage };
  };

  const getLecturerRating = (lecturerId) => {
    const lecturerRatings = ratings.filter(r => r.lecturerId === lecturerId);
    const total = lecturerRatings.length;
    const avg = total > 0 
      ? (lecturerRatings.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
      : 0;
    return { avg: parseFloat(avg), total };
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Icon key={star} name="star" size={10} color={star <= rating ? COLORS.warning : COLORS.border} />
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
      <Header title="PL Dashboard" navigation={navigation} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'P'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userData?.name || 'Program Leader'}</Text>
            <Text style={styles.userId}>ID: {userData?.employeeId}</Text>
            <View style={styles.roleBadge}>
              <Icon name="briefcase" size={12} color={COLORS.navy} />
              <Text style={styles.roleText}>Program Leader</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('PLCourses')}>
            <RoundContainer glow>
              <Icon name="book" size={24} color={COLORS.navy} />
              <Text style={styles.statValue}>{stats.totalCourses}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </RoundContainer>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('PLLecturers')}>
            <RoundContainer glow>
              <Icon name="users" size={24} color={COLORS.navy} />
              <Text style={styles.statValue}>{stats.totalLecturers}</Text>
              <Text style={styles.statLabel}>Lecturers</Text>
            </RoundContainer>
          </TouchableOpacity>
          <RoundContainer glow style={styles.statCard}>
            <Icon name="user-check" size={24} color={COLORS.navy} />
            <Text style={styles.statValue}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </RoundContainer>
        </View>

        <RoundContainer glow style={styles.ratingSummaryCard}>
          <Text style={styles.ratingSummaryTitle}>Overall System Rating</Text>
          <View style={styles.ratingSummaryContent}>
            <Text style={styles.ratingSummaryValue}>{stats.avgRating}</Text>
            {renderStars(stats.avgRating)}
          </View>
        </RoundContainer>

        {/* FIXED: Changed from 'PLReviews' to 'Reviews' */}
        <TouchableOpacity style={styles.reportsButton} onPress={() => navigation.navigate('Reviews')}>
          <Icon name="file-text" size={20} color={COLORS.white} />
          <Text style={styles.reportsButtonText}>View Reports ({pendingReports} pending)</Text>
          <Icon name="arrow-right" size={20} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'overview' && styles.activeTab]} onPress={() => setActiveTab('overview')}>
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'monitoring' && styles.activeTab]} onPress={() => setActiveTab('monitoring')}>
            <Text style={[styles.tabText, activeTab === 'monitoring' && styles.activeTabText]}>Monitoring</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'ratings' && styles.activeTab]} onPress={() => setActiveTab('ratings')}>
            <Text style={[styles.tabText, activeTab === 'ratings' && styles.activeTabText]}>Ratings</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && (
          <View>
            <Text style={styles.sectionTitle}>Recent Lecturers</Text>
            {lecturers.slice(0, 5).map((lecturer, index) => (
              <RoundContainer key={index} glow style={styles.lecturerCard}>
                <View style={styles.lecturerHeader}>
                  <View style={styles.lecturerAvatar}><Text style={styles.lecturerInitial}>{lecturer.name?.charAt(0)}</Text></View>
                  <View style={styles.lecturerInfo}>
                    <Text style={styles.lecturerName}>{lecturer.name}</Text>
                    <Text style={styles.lecturerDept}>{lecturer.department}</Text>
                  </View>
                </View>
              </RoundContainer>
            ))}
          </View>
        )}

        {activeTab === 'monitoring' && (
          <View>
            <Text style={styles.sectionTitle}>Student Attendance</Text>
            {students.slice(0, 10).map((student, index) => {
              const stats = getStudentAttendance(student.id);
              return (
                <RoundContainer key={index} glow style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <View style={styles.studentAvatar}><Text style={styles.studentInitial}>{student.name?.charAt(0)}</Text></View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentId}>ID: {student.studentId}</Text>
                    </View>
                    <Text style={[styles.attendancePercent, { color: stats.percentage >= 75 ? COLORS.success : COLORS.danger }]}>{stats.percentage}%</Text>
                  </View>
                </RoundContainer>
              );
            })}
          </View>
        )}

        {activeTab === 'ratings' && (
          <View>
            <Text style={styles.sectionTitle}>Lecturer Ratings</Text>
            {lecturers.map((lecturer, index) => {
              const rating = getLecturerRating(lecturer.id);
              return (
                <RoundContainer key={index} glow style={styles.ratingCard}>
                  <View style={styles.ratingHeader}>
                    <View><Text style={styles.ratingLecturerName}>{lecturer.name}</Text><Text style={styles.ratingDept}>{lecturer.department}</Text></View>
                    <View style={styles.ratingValueContainer}>
                      <Text style={styles.ratingValue}>{rating.avg}</Text>
                      {renderStars(rating.avg)}
                      <Text style={styles.ratingCount}>({rating.total})</Text>
                    </View>
                  </View>
                </RoundContainer>
              );
            })}
          </View>
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
  userId: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.navy + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start', marginTop: 6 },
  roleText: { fontSize: 11, fontWeight: '500', color: COLORS.navy },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: COLORS.navy, marginTop: 8 },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  ratingSummaryCard: { alignItems: 'center', marginBottom: 16, paddingVertical: 12 },
  ratingSummaryTitle: { fontSize: 13, fontWeight: '500', color: COLORS.textLight, marginBottom: 6 },
  ratingSummaryContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingSummaryValue: { fontSize: 28, fontWeight: '700', color: COLORS.navy },
  starsContainer: { flexDirection: 'row', gap: 2 },
  reportsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 20 },
  reportsButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white, flex: 1, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.navy + '08', borderRadius: 30, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 26 },
  activeTab: { backgroundColor: COLORS.navy },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textLight },
  activeTabText: { color: COLORS.white },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  lecturerCard: { marginBottom: 10 },
  lecturerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lecturerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.navy + '15', justifyContent: 'center', alignItems: 'center' },
  lecturerInitial: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  lecturerInfo: { flex: 1 },
  lecturerName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  lecturerDept: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  studentCard: { marginBottom: 10 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.navy + '15', justifyContent: 'center', alignItems: 'center' },
  studentInitial: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '500', color: COLORS.navy },
  studentId: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  attendancePercent: { fontSize: 18, fontWeight: '700' },
  ratingCard: { marginBottom: 10 },
  ratingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLecturerName: { fontSize: 15, fontWeight: '600', color: COLORS.navy },
  ratingDept: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  ratingValueContainer: { alignItems: 'flex-end' },
  ratingValue: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  ratingCount: { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
});

export default PLHome;