// src/screens/lecturer/LecturerClasses.js
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
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const LecturerClasses = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const [selectedDay, setSelectedDay] = useState('all');
  const [userData, setUserData] = useState(null);

  const days = [
    { id: 'all', label: 'All', icon: 'calendar' },
    { id: 'Monday', label: 'Mon', icon: 'sun' },
    { id: 'Tuesday', label: 'Tue', icon: 'sun' },  // Fixed: missing quote around 'Tue'
    { id: 'Wednesday', label: 'Wed', icon: 'sun' },
    { id: 'Thursday', label: 'Thu', icon: 'sun' },
    { id: 'Friday', label: 'Fri', icon: 'sun' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get user data
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }

      // Fetch classes assigned to this lecturer
      const classesQuery = query(
        collection(db, 'classes'),
        where('lecturerId', '==', currentUser.uid)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesList = [];
      
      for (const classDoc of classesSnapshot.docs) {
        const classData = classDoc.data();
        // Get course info for this class
        const courseDoc = await getDoc(doc(db, 'courses', classData.courseId));
        classesList.push({
          id: classDoc.id,
          ...classData,
          courseName: courseDoc.exists() ? courseDoc.data().name : 'Unknown Course',
          courseCode: courseDoc.exists() ? courseDoc.data().code : 'N/A',
        });
      }
      
      // Sort by day and time
      classesList.sort((a, b) => {
        const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 };
        const dayA = a.schedule?.split(' ')[0] || '';
        const dayB = b.schedule?.split(' ')[0] || '';
        if (dayA !== dayB) return (dayOrder[dayA] || 0) - (dayOrder[dayB] || 0);
        return (a.schedule || '').localeCompare(b.schedule || '');
      });
      
      setMyClasses(classesList);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredClasses = () => {
    if (selectedDay === 'all') return myClasses;
    return myClasses.filter(cls => cls.schedule?.startsWith(selectedDay));
  };

  const getDayColor = (schedule) => {
    const day = schedule?.split(' ')[0];
    switch(day) {
      case 'Monday': return '#4CAF50';
      case 'Tuesday': return '#2196F3';
      case 'Wednesday': return '#FF9800';
      case 'Thursday': return '#9C27B0';
      case 'Friday': return '#795548';
      default: return COLORS.navy;
    }
  };

  const getTimeFromSchedule = (schedule) => {
    return schedule?.split(' ')[1] || schedule || 'N/A';
  };

  const filteredClasses = getFilteredClasses();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading your classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="My Classes" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Lecturer Info */}
        <View style={styles.infoSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'L'}</Text>
          </View>
          <View>
            <Text style={styles.lecturerName}>{userData?.name || 'Lecturer'}</Text>
            <Text style={styles.lecturerId}>ID: {userData?.employeeId}</Text>
          </View>
        </View>

        {/* Day Filter */}
        <View style={styles.filterContainer}>
          {days.map(day => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.filterChip,
                selectedDay === day.id && styles.filterChipActive
              ]}
              onPress={() => setSelectedDay(day.id)}
            >
              <Icon 
                name={day.icon} 
                size={14} 
                color={selectedDay === day.id ? COLORS.white : COLORS.textLight} 
              />
              <Text style={[
                styles.filterText,
                selectedDay === day.id && styles.filterTextActive
              ]}>
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Classes Count */}
        <Text style={styles.classesCount}>
          {filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''} found
        </Text>

        {/* Classes List */}
        {filteredClasses.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="calendar" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No classes found</Text>
            <Text style={styles.emptySubtext}>
              {selectedDay === 'all' 
                ? "You don't have any assigned classes yet" 
                : `No classes scheduled on ${selectedDay}`}
            </Text>
          </RoundContainer>
        ) : (
          filteredClasses.map((classItem, index) => (
            <RoundContainer key={index} glow style={styles.classCard}>
              <View style={styles.classHeader}>
                <View>
                  <Text style={styles.className}>{classItem.name}</Text>
                  <Text style={styles.courseInfo}>
                    {classItem.courseName} ({classItem.courseCode})
                  </Text>
                </View>
                <View style={[styles.dayBadge, { backgroundColor: getDayColor(classItem.schedule) + '15' }]}>
                  <Text style={[styles.dayText, { color: getDayColor(classItem.schedule) }]}>
                    {classItem.schedule?.split(' ')[0]}
                  </Text>
                </View>
              </View>
              
              <View style={styles.classDetails}>
                <View style={styles.detailItem}>
                  <Icon name="clock" size={14} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{getTimeFromSchedule(classItem.schedule)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="map-pin" size={14} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{classItem.room}</Text>
                </View>
              </View>
              
              <View style={styles.classFooter}>
                <Icon name="users" size={12} color={COLORS.textLight} />
                <Text style={styles.classStats}>
                  {classItem.enrolledStudents || 0} students enrolled
                </Text>
                <TouchableOpacity 
                  style={styles.attendanceButton}
                  onPress={() => navigation.navigate('Attendance')}
                >
                  <Icon name="check-square" size={14} color={COLORS.navy} />
                  <Text style={styles.attendanceText}>Take Attendance</Text>
                </TouchableOpacity>
              </View>
            </RoundContainer>
          ))
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.white,
  },
  lecturerName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  lecturerId: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.navy + '08',
  },
  filterChipActive: {
    backgroundColor: COLORS.navy,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  classesCount: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
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
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  classCard: {
    marginBottom: 12,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
  },
  courseInfo: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '500',
  },
  classDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
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
  classFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  classStats: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navy + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attendanceText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.navy,
  },
});

export default LecturerClasses;