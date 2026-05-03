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
  Modal,
  FlatList,
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
  const [myClasses, setMyClasses] = useState([]);
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    facultyName: 'Faculty of Information Communication Technology',
    className: '',
    classId: '',
    courseName: '',
    courseId: '',
    courseCode: '',
    totalRegisteredStudents: '',
    topicTaught: '',
  });

  useEffect(() => {
    loadData();
    loadLecturerCourses();
    loadLecturerClasses();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      setLecturerId(currentUser.uid);
      
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setLecturerName(userData.name || 'Lecturer');
      }

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
      
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const courseIds = userData.courseIds || [];
        
        // Fetch courses from Firebase using course IDs
        const coursesList = [];
        for (const courseId of courseIds) {
          const courseDoc = await getDoc(doc(db, 'courses', courseId));
          if (courseDoc.exists()) {
            coursesList.push({ id: courseDoc.id, ...courseDoc.data() });
          }
        }
        setMyCourses(coursesList);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadLecturerClasses = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      // Fetch classes where lecturerId matches current user
      const classesQuery = query(
        collection(db, 'classes'),
        where('lecturerId', '==', currentUser.uid)
      );
      const classesSnapshot = await getDocs(classesQuery);
      const classesList = [];
      for (const doc of classesSnapshot.docs) {
        const classData = doc.data();
        // Get course info for this class
        const courseDoc = await getDoc(doc(db, 'courses', classData.courseId));
        classesList.push({ 
          id: doc.id, 
          ...classData,
          courseName: courseDoc.exists() ? courseDoc.data().name : 'Unknown Course',
          courseCode: courseDoc.exists() ? courseDoc.data().code : 'N/A'
        });
      }
      setMyClasses(classesList);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleCourseSelect = (course) => {
    setFormData(prev => ({
      ...prev,
      courseName: course.name,
      courseId: course.id,
      courseCode: course.code,
    }));
    setCourseModalVisible(false);
  };

  const handleClassSelect = (classItem) => {
    setFormData(prev => ({
      ...prev,
      className: classItem.name,
      classId: classItem.id,
    }));
    setClassModalVisible(false);
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

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const lecturerNameValue = userDoc.exists() ? userDoc.data().name : 'Lecturer';

      await addDoc(collection(db, 'reports'), {
        facultyName: formData.facultyName,
        className: formData.className,
        classId: formData.classId,
        courseName: formData.courseName,
        courseId: formData.courseId,
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
      loadData();
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      facultyName: 'Faculty of Information Communication Technology',
      className: '',
      classId: '',
      courseName: '',
      courseId: '',
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
    await Promise.all([loadData(), loadLecturerCourses(), loadLecturerClasses()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header title="Lecture Reports" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <TouchableOpacity 
          style={styles.newReportButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Icon name={showForm ? 'chevron-up' : 'plus'} size={20} color={COLORS.white} />
          <Text style={styles.newReportButtonText}>
            {showForm ? 'Hide Report Form' : 'Submit New Report'}
          </Text>
        </TouchableOpacity>

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

            {/* Class Name - Dropdown */}
            <Text style={styles.label}>Class Name *</Text>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => setClassModalVisible(true)}
            >
              <Text style={[styles.pickerButtonText, formData.className && { color: COLORS.textDark }]}>
                {formData.className || 'Select a class'}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Course Name - Dropdown */}
            <Text style={styles.label}>Course Name *</Text>
            <TouchableOpacity 
              style={styles.pickerButton}
              onPress={() => setCourseModalVisible(true)}
            >
              <Text style={[styles.pickerButtonText, formData.courseName && { color: COLORS.textDark }]}>
                {formData.courseName || 'Select a course'}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            {/* Course Code (auto-filled) */}
            {formData.courseCode ? (
              <View style={styles.inputWrapper}>
                <Icon name="hash" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  value={formData.courseCode}
                  editable={false}
                  placeholder="Course code will appear here"
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

      {/* Class Selection Modal */}
      <Modal visible={classModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Class</Text>
              <TouchableOpacity onPress={() => setClassModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            {myClasses.length === 0 ? (
              <Text style={styles.modalEmptyText}>No classes assigned</Text>
            ) : (
              <FlatList
                data={myClasses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalOption, formData.classId === item.id && styles.modalOptionSelected]}
                    onPress={() => handleClassSelect(item)}
                  >
                    <View>
                      <Text style={[styles.modalOptionText, formData.classId === item.id && styles.modalOptionTextSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        {item.schedule} | {item.room}
                      </Text>
                    </View>
                    {formData.classId === item.id && <Icon name="check" size={16} color={COLORS.navy} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Course Selection Modal */}
      <Modal visible={courseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            {myCourses.length === 0 ? (
              <Text style={styles.modalEmptyText}>No courses assigned</Text>
            ) : (
              <FlatList
                data={myCourses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.modalOption, formData.courseId === item.id && styles.modalOptionSelected]}
                    onPress={() => handleCourseSelect(item)}
                  >
                    <View>
                      <Text style={[styles.modalOptionText, formData.courseId === item.id && styles.modalOptionTextSelected]}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalOptionSubtext}>{item.code} | {item.credits} Credits</Text>
                    </View>
                    {formData.courseId === item.id && <Icon name="check" size={16} color={COLORS.navy} />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  pickerButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalEmptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.navy + '05',
  },
  modalOptionText: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  modalOptionTextSelected: {
    color: COLORS.navy,
    fontWeight: '500',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});

export default LecturerReports;