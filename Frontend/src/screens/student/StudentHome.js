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
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const StudentHome = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    present: 0,
    absent: 0,
    late: 0,
    attendancePercentage: 0,
  });

  useEffect(() => {
    loadData();
    loadTodayClasses();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
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

  const loadTodayClasses = async () => {
    try {
      const today = new Date().getDay();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = days[today];
      const currentDay = todayName.charAt(0).toUpperCase() + todayName.slice(1);
      
      // Fetch schedule from Firebase for today
      const scheduleQuery = query(
        collection(db, 'schedule'),
        where('day', '==', currentDay)
      );
      const scheduleSnapshot = await getDocs(scheduleQuery);
      const scheduleList = [];
      scheduleSnapshot.forEach(doc => {
        scheduleList.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by time
      scheduleList.sort((a, b) => a.time.localeCompare(b.time));
      setTodayClasses(scheduleList);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setTodayClasses([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadTodayClasses()]);
    setRefreshing(false);
  };

  const menuItems = [
    { icon: 'calendar', label: 'Timetable', color: '#4CAF50', onPress: () => navigation.navigate('Timetable') },
    { icon: 'book', label: 'My Courses', color: '#2196F3', onPress: () => {} },
    { icon: 'star', label: 'Rate Lecturers', color: '#FF9800', onPress: () => navigation.navigate('Ratings') },
  ];

  const getTodayName = () => {
    const today = new Date().getDay();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[today];
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

        {/* Today's Schedule Section */}
        <View style={styles.todaySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Text style={styles.todayDate}>{getTodayName()}</Text>
          </View>
          {todayClasses.length > 0 ? (
            todayClasses.map((item, index) => (
              <RoundContainer key={index} glow style={styles.todayCard}>
                <View style={styles.timeContainer}>
                  <Icon name="clock" size={14} color={COLORS.navy} />
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
                <Text style={styles.courseName}>{item.courseName}</Text>
                <View style={styles.classDetails}>
                  <View style={styles.detailItem}>
                    <Icon name="user" size={12} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{item.lecturerName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Icon name="map-pin" size={12} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{item.room}</Text>
                  </View>
                </View>
              </RoundContainer>
            ))
          ) : (
            <RoundContainer glow style={styles.noClassCard}>
              <Icon name="sun" size={32} color={COLORS.textLight} />
              <Text style={styles.noClassText}>No classes scheduled for today</Text>
              <Text style={styles.noClassSubtext}>Enjoy your free time!</Text>
            </RoundContainer>
          )}
        </View>

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
  todaySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
  },
  todayDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  todayCard: {
    marginBottom: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.navy,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  classDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  noClassCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noClassText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textDark,
    marginTop: 12,
  },
  noClassSubtext: {
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
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
  },
});

export default StudentHome;