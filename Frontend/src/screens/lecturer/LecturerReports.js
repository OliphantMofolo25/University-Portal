// src/screens/lecturer/LecturerReports.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  addDoc,
  orderBy 
} from 'firebase/firestore';

const LecturerReports = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lecturerName, setLecturerName] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [myReports, setMyReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [myCourses, setMyCourses] = useState([]);
  
  const [formData, setFormData] = useState({
    facultyName: 'Faculty of Information Communication Technology',
    className: '',
    courseName: '',
    courseCode: '',
    totalRegisteredStudents: '',
    topicTaught: '',
  });

  // Predefined course lists (no dependency on coursesData)
  const fictCourses = [
    { id: 'C001', name: 'Programming 1', code: 'DIPL1112' },
    { id: 'C002', name: 'Web Development', code: 'WEB201' },
    { id: 'C003', name: 'Database Systems', code: 'DB201' },
  ];

  const famdCourses = [
    { id: 'C004', name: 'Business Management', code: 'BMGT101' },
    { id: 'C005', name: 'Business Communication', code: 'COMM101' },
    { id: 'C006', name: 'Entrepreneurship', code: 'ENT101' },
  ];

  useEffect(() => {
    loadData();
    loadLecturerCourses();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      setLecturerId(currentUser.uid);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setLecturerName(userData.name || 'Lecturer');
      }

      // Get reports from Firestore
      const reportsQuery = query(
        collection(db, 'reports'), 
        where('lecturerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      const reportsList = [];
      reportsSnapshot.forEach(doc => {
        reportsList.push({ id: doc.id, ...doc.data() });
      });
      setMyReports(reportsList);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const loadLecturerCourses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const courseIds = userData.courseIds || [];
        
        // Map course IDs to predefined courses based on faculty
        const userFaculty = userData.faculty || '';
        let availableCourses = [];
        
        if (userFaculty.includes('Information Communication Technology') || userFaculty === 'Faculty of Information Communication Technology') {
          availableCourses = fictCourses.filter(c => courseIds.includes(c.id));
        } else if (userFaculty.includes('Business') || userFaculty === 'Faculty of Business and Entrepreneurship') {
          availableCourses = famdCourses.filter(c => courseIds.includes(c.id));
        } else {
          // Fallback to all courses
          availableCourses = [...fictCourses, ...famdCourses].filter(c => courseIds.includes(c.id));
        }
        
        setMyCourses(availableCourses);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleCourseSelect = (course) => {
    setFormData(prev => ({
      ...prev,
      courseName: course.name,
      courseCode: course.code,
    }));
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.className || !formData.courseName || !formData.topicTaught) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!formData.totalRegisteredStudents || parseInt(formData.totalRegisteredStudents) <= 0) {
      Alert.alert('Error', 'Please enter valid number of registered students');
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Get user data for lecturer name
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const lecturerNameValue = userDoc.exists() ? userDoc.data().name : 'Lecturer';

      // Save report to Firestore
      await addDoc(collection(db, 'reports'), {
        facultyName: formData.facultyName,
        className: formData.className,
        courseName: formData.courseName,
        courseCode: formData.courseCode,
        totalRegisteredStudents: parseInt(formData.totalRegisteredStudents),
        topicTaught: formData.topicTaught,
        lecturerId: currentUser.uid,
        lecturerName: lecturerNameValue,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      
      Alert.alert('Success', 'Report submitted successfully!');
      resetForm();
      setShowForm(false);
      loadData(); // Refresh the reports list
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      facultyName: 'Faculty of Information Communication Technology',
      className: '',
      courseName: '',
      courseCode: '',
      totalRegisteredStudents: '',
      topicTaught: '',
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return COLORS.success;
      case 'reviewed': return COLORS.navy;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.danger;
      default: return COLORS.textLight;
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return 'check-circle';
      case 'reviewed': return 'check-circle';
      case 'pending': return 'clock';
      case 'rejected': return 'x-circle';
      default: return 'file-text';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadLecturerCourses()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Lecture Reports" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* New Report Button */}
        <TouchableOpacity 
          style={styles.newReportButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Icon name={showForm ? 'chevron-up' : 'plus'} size={20} color={COLORS.white} />
          <Text style={styles.newReportButtonText}>
            {showForm ? 'Hide Report Form' : 'Submit New Report'}
          </Text>
        </TouchableOpacity>

        {/* Report Form */}
        {showForm && (
          <RoundContainer glow style={styles.formContainer}>
            <Text style={styles.formTitle}>Lecture Report Form</Text>
            
            {/* Faculty Name */}
            <Text style={styles.label}>Faculty Name *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="home" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                value={formData.facultyName}
                editable={false}
              />
            </View>

            {/* Class Name */}
            <Text style={styles.label}>Class Name *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="calendar" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter class name"
                placeholderTextColor={COLORS.textLight}
                value={formData.className}
                onChangeText={(text) => updateField('className', text)}
              />
            </View>

            {/* Course Name - Dropdown from assigned courses */}
            <Text style={styles.label}>Course Name *</Text>
            <View style={styles.courseSelector}>
              {myCourses.length === 0 ? (
                <Text style={styles.noCoursesText}>No courses assigned. Contact Program Leader.</Text>
              ) : (
                myCourses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[
                      styles.courseChip,
                      formData.courseName === course.name && styles.courseChipSelected
                    ]}
                    onPress={() => handleCourseSelect(course)}
                  >
                    <Text style={[
                      styles.courseChipText,
                      formData.courseName === course.name && styles.courseChipTextSelected
                    ]}>
                      {course.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Course Code (auto-filled) */}
            {formData.courseCode ? (
              <View style={styles.inputWrapper}>
                <Icon name="hash" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  value={formData.courseCode}
                  editable={false}
                />
              </View>
            ) : null}

            {/* Total Registered Students */}
            <Text style={styles.label}>Total Registered Students *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="users" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter total number of registered students"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                value={formData.totalRegisteredStudents}
                onChangeText={(text) => updateField('totalRegisteredStudents', text)}
              />
            </View>

            {/* Topic Taught */}
            <Text style={styles.label}>Topic Taught *</Text>
            <View style={styles.inputWrapper}>
              <Icon name="file-text" size={20} color={COLORS.textLight} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter the topic taught in this lecture"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
                value={formData.topicTaught}
                onChangeText={(text) => updateField('topicTaught', text)}
              />
            </View>

            <ActionButton
              title="Submit Report"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submitButton}
            />
          </RoundContainer>
        )}

        {/* Reports List */}
        <Text style={styles.title}>Previous Reports</Text>
        <Text style={styles.subtitle}>View all your submitted lecture reports</Text>

        {loading ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="loader" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Loading reports...</Text>
          </RoundContainer>
        ) : myReports.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="file-text" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No reports submitted yet</Text>
            <Text style={styles.emptySubtext}>Tap "Submit New Report" to create one</Text>
          </RoundContainer>
        ) : (
          myReports.map((report, index) => (
            <RoundContainer key={index} glow style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportTitleContainer}>
                  <Icon name={getStatusIcon(report.status)} size={20} color={getStatusColor(report.status)} />
                  <Text style={styles.reportTitle}>{report.courseName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                    {report.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.reportCode}>Course Code: {report.courseCode || 'N/A'}</Text>
              <Text style={styles.reportClass}>Class: {report.className}</Text>
              <Text style={styles.reportTopic}>Topic: {report.topicTaught}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Icon name="users" size={12} color={COLORS.textLight} />
                  <Text style={styles.statChipText}>Total Students: {report.totalRegisteredStudents || 0}</Text>
                </View>
              </View>

              {report.feedback && (
                <View style={styles.feedbackContainer}>
                  <Icon name="message-circle" size={14} color={COLORS.success} />
                  <Text style={styles.feedbackLabel}>PRL Feedback:</Text>
                  <Text style={styles.feedbackText}>{report.feedback}</Text>
                </View>
              )}

              <View style={styles.reportFooter}>
                <Icon name="calendar" size={12} color={COLORS.textLight} />
                <Text style={styles.reportFooterText}>Submitted: {report.createdAt?.split('T')[0]}</Text>
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
  newReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.navy,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  newReportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  formContainer: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  courseSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  courseChip: {
    backgroundColor: COLORS.navy + '10',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  courseChipSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  courseChipText: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  courseChipTextSelected: {
    color: COLORS.white,
  },
  noCoursesText: {
    fontSize: 13,
    color: COLORS.danger,
    fontStyle: 'italic',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 8,
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
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  reportCard: {
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.navy,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportCode: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  reportClass: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  reportTopic: {
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navy + '08',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statChipText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  feedbackContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success + '10',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  feedbackText: {
    fontSize: 12,
    color: COLORS.textDark,
    flex: 1,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reportFooterText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
});

export default LecturerReports;