// src/screens/pl/PLReviews.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import Header from '../../components/Header';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

const PLReviews = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ all: 0, pending: 0, reviewed: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const reportsList = [];
      snapshot.forEach(doc => {
        reportsList.push({ id: doc.id, ...doc.data() });
      });
      
      const sortedReports = reportsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReports(sortedReports);
      
      // Calculate statistics
      setStats({
        all: reportsList.length,
        pending: reportsList.filter(r => r.status === 'pending').length,
        reviewed: reportsList.filter(r => r.status === 'reviewed').length,
        approved: reportsList.filter(r => r.status === 'approved').length,
        rejected: reportsList.filter(r => r.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const getFilteredReports = () => {
    if (filter === 'all') return reports;
    return reports.filter(r => r.status === filter);
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

  const filteredReports = getFilteredReports();

  const filterOptions = [
    { id: 'all', label: 'All', count: stats.all },
    { id: 'pending', label: 'Pending', count: stats.pending, color: COLORS.warning },
    { id: 'reviewed', label: 'Reviewed', count: stats.reviewed, color: COLORS.navy },
    { id: 'approved', label: 'Approved', count: stats.approved, color: COLORS.success },
    { id: 'rejected', label: 'Rejected', count: stats.rejected, color: COLORS.danger },
  ];

  return (
    <View style={styles.container}>
      <Header title="Report Reviews" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Program Reports Overview</Text>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {filterOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.filterChip,
                filter === option.id && styles.activeFilter,
                option.color && filter === option.id && { backgroundColor: option.color }
              ]}
              onPress={() => setFilter(option.id)}
            >
              <Text style={[
                styles.filterText,
                filter === option.id && styles.activeFilterText
              ]}>
                {option.label} ({option.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="file-text" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No reports found</Text>
            <Text style={styles.emptySubtext}>Reports will appear here once submitted</Text>
          </RoundContainer>
        ) : (
          filteredReports.map((report, index) => (
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
              <Text style={styles.reportClass}>Class: {report.className}</Text>
              <Text style={styles.reportDate}>Submitted: {report.createdAt?.split('T')[0]}</Text>
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
                {report.reviewedAt && (
                  <>
                    <Icon name="check-circle" size={12} color={COLORS.success} style={{ marginLeft: 12 }} />
                    <Text style={styles.reportFooterText}>Reviewed: {report.reviewedAt?.split('T')[0]}</Text>
                  </>
                )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 16,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.navy + '08',
    marginRight: 10,
  },
  activeFilter: {
    backgroundColor: COLORS.navy,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  activeFilterText: {
    color: COLORS.white,
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
    marginBottom: 12,
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
  reportClass: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  reportDate: {
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

export default PLReviews;