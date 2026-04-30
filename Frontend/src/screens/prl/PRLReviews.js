// src/screens/prl/PRLReviews.js
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
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';
import Header from '../../components/Header';
import { db } from '../../services/firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const PRLReviews = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const snapshot = await getDocs(collection(db, 'reports'));
    const reportsList = [];
    snapshot.forEach(doc => reportsList.push({ id: doc.id, ...doc.data() }));
    setReports(reportsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleAddFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter feedback');
      return;
    }

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        feedback: feedback,
        status: 'reviewed',
        reviewedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Feedback added successfully');
      setModalVisible(false);
      setFeedback('');
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to add feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReport = async () => {
    if (!editFeedback.trim()) {
      Alert.alert('Error', 'Please enter feedback');
      return;
    }

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        feedback: editFeedback,
        status: editStatus,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Report updated successfully');
      setEditModalVisible(false);
      setEditFeedback('');
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to update report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (report) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the report for ${report.courseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'reports', report.id));
              Alert.alert('Success', 'Report deleted successfully');
              loadReports();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
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

  return (
    <View style={styles.container}>
      <Header title="Report Reviews" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Removed duplicate title - Header already shows "Report Reviews" */}
        
        {reports.map((report, index) => (
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
            
            <Text style={styles.reportLecturer}>Lecturer: {report.lecturerName}</Text>
            <Text style={styles.reportDate}>Date: {report.dateOfLecture || report.createdAt?.split('T')[0]}</Text>
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
                <Text style={styles.feedbackLabel}>Feedback:</Text>
                <Text style={styles.feedbackText}>{report.feedback}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              {report.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reviewButton]}
                  onPress={() => {
                    setSelectedReport(report);
                    setModalVisible(true);
                  }}
                >
                  <Icon name="edit-2" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Add Feedback</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  setSelectedReport(report);
                  setEditFeedback(report.feedback || '');
                  setEditStatus(report.status || 'pending');
                  setEditModalVisible(true);
                }}
              >
                <Icon name="edit" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteReport(report)}
              >
                <Icon name="trash-2" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </RoundContainer>
        ))}

        {/* Add Feedback Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Feedback</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="x" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>Report: {selectedReport?.courseName}</Text>
              <Text style={styles.modalSubtitle}>Lecturer: {selectedReport?.lecturerName}</Text>

              <TextInput
                style={styles.feedbackInput}
                placeholder="Enter your feedback and recommendations..."
                multiline
                numberOfLines={6}
                value={feedback}
                onChangeText={setFeedback}
              />

              <ActionButton
                title="Submit Feedback"
                onPress={handleAddFeedback}
                loading={submitting}
              />
            </View>
          </View>
        </Modal>

        {/* Edit Report Modal */}
        <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Report</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Icon name="x" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>Report: {selectedReport?.courseName}</Text>
              <Text style={styles.modalSubtitle}>Lecturer: {selectedReport?.lecturerName}</Text>

              <Text style={styles.modalLabel}>Status</Text>
              <View style={styles.statusPicker}>
                {['pending', 'reviewed', 'approved', 'rejected'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      editStatus === status && styles.statusOptionSelected,
                      { borderColor: getStatusColor(status) }
                    ]}
                    onPress={() => setEditStatus(status)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      editStatus === status && { color: getStatusColor(status) }
                    ]}>
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Feedback</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Edit feedback..."
                multiline
                numberOfLines={6}
                value={editFeedback}
                onChangeText={setEditFeedback}
              />

              <ActionButton
                title="Update Report"
                onPress={handleEditReport}
                loading={submitting}
              />
            </View>
          </View>
        </Modal>
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
  reportLecturer: {
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    backgroundColor: COLORS.navy,
  },
  reviewButton: {
    backgroundColor: COLORS.navy,
  },
  editButton: {
    backgroundColor: COLORS.navyLight || '#2A3D6B',
  },
  deleteButton: {
    backgroundColor: COLORS.navy,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.white,
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
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 8,
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  statusOptionSelected: {
    backgroundColor: COLORS.navy + '10',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    fontSize: 14,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    minHeight: 100,
    marginVertical: 10,
  },
});

export default PRLReviews;