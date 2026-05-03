// src/screens/student/StudentHome.js
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
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

const StudentHome = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendancePercentage: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const user = userDoc.data();
        setUserData(user);
        
        const enrolledCourses = user.assignedCourses || [];
        setMyCourses(enrolledCourses);
      }

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', currentUser.uid)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceList = [];
      attendanceSnapshot.forEach(doc => attendanceList.push(doc.data()));
      setAttendance(attendanceList);

      const total = attendanceList.length;
      const present = attendanceList.filter(a => a.status === 'present').length;
      const absent = attendanceList.filter(a => a.status === 'absent').length;
      const late = attendanceList.filter(a => a.status === 'late').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({ totalClasses: total, present, absent, late, attendancePercentage: percentage });
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

  const menuItems = [
    { icon: 'plus-circle', label: 'Browse Courses', color: '#4CAF50', onPress: () => navigation.navigate('StudentCourses') },
    { icon: 'star', label: 'Rate Lecturers', color: '#FF9800', onPress: () => navigation.navigate('Ratings') },
  ];

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
      <Header title="Student Dashboard" navigation={navigation} showLogout={true} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
      >
        <View style={styles.welcomeSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'S'}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{userData?.name || 'Student'}</Text>
            <Text style={styles.userId}>ID: {userData?.studentId}</Text>
            <View style={styles.programBadge}>
              <Text style={styles.programText}>BSc Software Engineering</Text>
            </View>
          </View>
        </View>

        <RoundContainer glow style={styles.statsCard}>
          <Text style={styles.statsTitle}>Attendance Summary</Text>
          <View style={styles.statsCircle}>
            <Text style={styles.statsPercentage}>{stats.attendancePercentage}%</Text>
            <Text style={styles.statsLabel}>Overall</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.warning }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
          </View>
        </RoundContainer>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuCard} onPress={item.onPress}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Icon name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>My Enrolled Courses</Text>
        {myCourses.length === 0 ? (
          <RoundContainer glow style={styles.emptyCard}>
            <Icon name="book" size={32} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No courses enrolled</Text>
            <Text style={styles.emptySubtext}>Tap "Browse Courses" to add courses</Text>
          </RoundContainer>
        ) : (
          myCourses.map((course, index) => (
            <RoundContainer key={index} glow style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseCode}>{course.code}</Text>
              </View>
              <Text style={styles.courseDept}>{course.department}</Text>
            </RoundContainer>
          ))
        )}

        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        {attendance.length > 0 ? (
          attendance.slice(0, 5).map((record, index) => (
            <RoundContainer key={index} glow style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View>
                  <Text style={styles.recordClass}>{record.className || record.courseName}</Text>
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: record.status === 'present' ? COLORS.success + '15' : 
                                  record.status === 'late' ? COLORS.warning + '15' : COLORS.danger + '15'
                }]}>
                  <Text style={[styles.statusText, { 
                    color: record.status === 'present' ? COLORS.success : 
                           record.status === 'late' ? COLORS.warning : COLORS.danger
                  }]}>{record.status.toUpperCase()}</Text>
                </View>
              </View>
            </RoundContainer>
          ))
        ) : (
          <RoundContainer glow style={styles.emptyCard}>
            <Icon name="calendar" size={32} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </RoundContainer>
        )}
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
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.white,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  userId: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  programBadge: {
    backgroundColor: COLORS.navy + '10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  programText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.navy,
  },
  statsCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 16,
  },
  statsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.navy + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsPercentage: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.navy,
  },
  statsLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuCard: {
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuLabel: {
    fontSize: 11,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 12,
  },
  courseCard: {
    marginBottom: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
  courseCode: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  courseDept: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  recordCard: {
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordClass: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.navy,
  },
  recordDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default StudentHome;