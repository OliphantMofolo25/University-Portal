// src/screens/lecturer/LecturerAttendance.js
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
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  getDoc,
  writeBatch
} from 'firebase/firestore';

const LecturerAttendance = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myCourses, setMyCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [todayDate, setTodayDate] = useState('');
  const [existingAttendance, setExistingAttendance] = useState({});
  const [currentDay, setCurrentDay] = useState('');

  useEffect(() => {
    const date = new Date();
    setTodayDate(date.toISOString().split('T')[0]);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setCurrentDay(days[date.getDay()]);
    loadMyCourses();
  }, []);

  const loadMyCourses = async () => {
    setLoading(true);
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        // Use assignedCourses from user document (stored during registration)
        const assignedCourses = userData?.assignedCourses || [];
        
        if (assignedCourses.length > 0) {
          setMyCourses(assignedCourses);
        } else {
          // Fallback: try using courseIds
          const courseIds = userData?.courseIds || [];
          if (courseIds.length > 0) {
            // Try to fetch course details from courses collection
            const coursesList = [];
            for (const courseId of courseIds) {
              const courseDoc = await getDoc(doc(db, 'courses', courseId));
              if (courseDoc.exists()) {
                coursesList.push({ id: courseDoc.id, ...courseDoc.data() });
              } else {
                // If course doesn't exist in courses collection, use basic info from user
                coursesList.push({ id: courseId, name: `Course ${courseId}`, code: courseId });
              }
            }
            setMyCourses(coursesList);
          }
        }
      } catch (error) {
        console.error('Error loading courses:', error);
        Alert.alert('Error', 'Failed to load your courses');
      }
    }
    setLoading(false);
  };

  const loadStudentsForCourse = async (course) => {
    setLoading(true);
    
    try {
      // Fetch students from Firebase where role is 'student' and courseIds contains this course
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        where('courseIds', 'array-contains', course.id)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const fetchedStudents = [];
      studentsSnapshot.forEach(doc => {
        const studentData = doc.data();
        fetchedStudents.push({ 
          id: doc.id, 
          name: studentData.name,
          studentId: studentData.studentId || doc.id,
          email: studentData.email || '',
          department: studentData.department || ''
        });
      });
      
      setStudents(fetchedStudents);
      
      // Check if attendance already marked for today
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('courseId', '==', course.id),
        where('date', '==', todayDate)
      );
      const snapshot = await getDocs(attendanceQuery);
      const existing = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        existing[data.studentId] = data.status;
      });
      setExistingAttendance(existing);
      
      // Initialize status (default: present for all, but override with existing)
      const initialStatus = {};
      fetchedStudents.forEach(student => {
        initialStatus[student.id] = existing[student.id] || 'present';
      });
      setAttendanceStatus(initialStatus);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students for this course');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = async (course) => {
    setSelectedCourse(course);
    await loadStudentsForCourse(course);
  };

  const toggleAttendance = (studentId) => {
    setAttendanceStatus(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedCourse) return;

    setSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const lecturerName = userDoc.exists() ? userDoc.data().name : 'Lecturer';
      
      let newCount = 0;
      let updateCount = 0;

      for (const student of students) {
        const status = attendanceStatus[student.id];
        
        // Check if record exists for today
        const q = query(
          collection(db, 'attendance'),
          where('courseId', '==', selectedCourse.id),
          where('studentId', '==', student.id),
          where('date', '==', todayDate)
        );
        const snapshot = await getDocs(q);
        
        const attendanceData = {
          courseId: selectedCourse.id,
          courseName: selectedCourse.name,
          courseCode: selectedCourse.code,
          studentId: student.id,
          studentName: student.name,
          studentNumber: student.studentId,
          studentEmail: student.email,
          date: todayDate,
          dayOfWeek: currentDay,
          status: status,
          lecturerId: currentUser?.uid,
          lecturerName: lecturerName,
          timestamp: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        if (snapshot.empty) {
          // Create new attendance record
          await addDoc(collection(db, 'attendance'), attendanceData);
          newCount++;
        } else {
          // Update existing record
          snapshot.forEach(async (docSnapshot) => {
            await updateDoc(doc(db, 'attendance', docSnapshot.id), { 
              status: status,
              updatedAt: new Date().toISOString()
            });
          });
          updateCount++;
        }
      }
      
      const presentCount = Object.values(attendanceStatus).filter(s => s === 'present').length;
      const absentCount = students.length - presentCount;
      
      Alert.alert(
        'Success', 
        `Attendance saved for ${selectedCourse.name}!\n\n📅 Date: ${todayDate}\n📆 Day: ${currentDay}\n✅ Present: ${presentCount}\n❌ Absent: ${absentCount}\n\n📝 New records: ${newCount}\n🔄 Updated: ${updateCount}`
      );
      setSelectedCourse(null);
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyCourses();
    if (selectedCourse) {
      await loadStudentsForCourse(selectedCourse);
    }
    setRefreshing(false);
  };

  if (loading && !selectedCourse) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Mark Attendance" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!selectedCourse ? (
          <>
            <Text style={styles.title}>My Courses</Text>
            <Text style={styles.subtitle}>Select a course to mark attendance for {currentDay}</Text>
            
            {myCourses.length === 0 ? (
              <RoundContainer glow style={styles.emptyContainer}>
                <Icon name="book" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No courses assigned</Text>
                <Text style={styles.emptySubtext}>Contact your program leader to assign courses</Text>
              </RoundContainer>
            ) : (
              myCourses.map((course, index) => (
                <RoundContainer key={index} glow style={styles.courseCard}>
                  <View style={styles.courseHeader}>
                    <View>
                      <Text style={styles.courseName}>{course.name}</Text>
                      <Text style={styles.courseCode}>{course.code}</Text>
                    </View>
                    <View style={styles.courseBadge}>
                      <Icon name="calendar" size={14} color={COLORS.white} />
                      <Text style={styles.courseBadgeText}>{currentDay}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => handleCourseSelect(course)}
                  >
                    <Text style={styles.selectButtonText}>Take Attendance</Text>
                    <Icon name="arrow-right" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </RoundContainer>
              ))
            )}
          </>
        ) : (
          <>
            <View style={styles.courseHeaderBar}>
              <TouchableOpacity onPress={() => setSelectedCourse(null)} style={styles.backButton}>
                <Icon name="arrow-left" size={24} color={COLORS.navy} />
              </TouchableOpacity>
              <View>
                <Text style={styles.selectedCourseName}>{selectedCourse.name}</Text>
                <Text style={styles.selectedCourseInfo}>{selectedCourse.code} | {todayDate} ({currentDay})</Text>
              </View>
            </View>

            <View style={styles.legend}>
              <TouchableOpacity 
                style={styles.legendItem} 
                onPress={() => {
                  const allPresent = {};
                  students.forEach(student => {
                    allPresent[student.id] = 'present';
                  });
                  setAttendanceStatus(allPresent);
                }}
              >
                <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                <Text style={styles.legendText}>Mark All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.legendItem}
                onPress={() => {
                  const allAbsent = {};
                  students.forEach(student => {
                    allAbsent[student.id] = 'absent';
                  });
                  setAttendanceStatus(allAbsent);
                }}
              >
                <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                <Text style={styles.legendText}>Mark All Absent</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.studentTitle}>Students ({students.length})</Text>
            
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.navy} style={styles.loader} />
            ) : students.length === 0 ? (
              <RoundContainer glow style={styles.noStudentsCard}>
                <Icon name="users" size={48} color={COLORS.textLight} />
                <Text style={styles.noStudentsText}>No students enrolled</Text>
                <Text style={styles.noStudentsSubtext}>No students are registered for this course yet</Text>
              </RoundContainer>
            ) : (
              students.map((student, index) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentCard,
                    attendanceStatus[student.id] === 'absent' && styles.studentCardAbsent
                  ]}
                  onPress={() => toggleAttendance(student.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentInitial}>{student.name?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentId}>ID: {student.studentId}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    attendanceStatus[student.id] === 'present' ? styles.presentBadge : styles.absentBadge
                  ]}>
                    <Icon 
                      name={attendanceStatus[student.id] === 'present' ? 'check-circle' : 'x-circle'} 
                      size={20} 
                      color={attendanceStatus[student.id] === 'present' ? COLORS.success : COLORS.danger} 
                    />
                    <Text style={[
                      styles.statusText,
                      attendanceStatus[student.id] === 'present' ? styles.presentText : styles.absentText
                    ]}>
                      {attendanceStatus[student.id] === 'present' ? 'PRESENT' : 'ABSENT'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {students.length > 0 && (
              <>
                <View style={styles.summaryBar}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryCount}>
                      {Object.values(attendanceStatus).filter(s => s === 'present').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Present</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: COLORS.danger }]}>
                      {Object.values(attendanceStatus).filter(s => s === 'absent').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Absent</Text>
                  </View>
                </View>

                <ActionButton
                  title="Save Attendance"
                  onPress={handleSubmitAttendance}
                  loading={submitting}
                  style={styles.saveButton}
                />
              </>
            )}
          </>
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
  loader: { marginTop: 40 },
  
  title: { fontSize: 24, fontWeight: '700', color: COLORS.navy, marginTop: 16, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 60, marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '500', color: COLORS.textLight, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  
  courseCard: { marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseName: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  courseCode: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  courseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.navy, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  courseBadgeText: { fontSize: 11, color: COLORS.white },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.navy, paddingVertical: 10, borderRadius: 12 },
  selectButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.white },
  
  courseHeaderBar: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16, marginBottom: 20 },
  backButton: { padding: 8 },
  selectedCourseName: { fontSize: 18, fontWeight: '700', color: COLORS.navy },
  selectedCourseInfo: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: COLORS.textLight },
  
  studentTitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  
  noStudentsCard: { alignItems: 'center', paddingVertical: 40 },
  noStudentsText: { fontSize: 16, fontWeight: '500', color: COLORS.textLight, marginTop: 12 },
  noStudentsSubtext: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  studentCardAbsent: { backgroundColor: COLORS.danger + '05', borderColor: COLORS.danger + '30' },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.navy + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentInitial: { fontSize: 18, fontWeight: '600', color: COLORS.navy },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '500', color: COLORS.navy },
  studentId: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  presentBadge: { backgroundColor: COLORS.success + '15' },
  absentBadge: { backgroundColor: COLORS.danger + '15' },
  statusText: { fontSize: 11, fontWeight: '600' },
  presentText: { color: COLORS.success },
  absentText: { color: COLORS.danger },
  
  summaryBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.navy + '08', borderRadius: 20, padding: 16, marginVertical: 20 },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryCount: { fontSize: 28, fontWeight: '700', color: COLORS.navy },
  summaryLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  
  saveButton: { marginBottom: 30 },
});

export default LecturerAttendance;