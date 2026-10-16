import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import api from '../services/api';
import { Loan } from '../types';

export const MyLoansScreen: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RETURNED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Renewal Modal
  const [renewalLoan, setRenewalLoan] = useState<Loan | null>(null);
  const [renewalReason, setRenewalReason] = useState('');
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);

  const fetchLoans = useCallback(async () => {
    try {
      const res = await api.getMyLoans();
      if (res.success && res.data) {
        setLoans(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load loans:', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLoans();
  };

  const calculateDaysLeft = (dueAtStr: string) => {
    const due = new Date(dueAtStr).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  };

  const handleRequestRenewal = async () => {
    if (!renewalLoan) return;
    setIsSubmittingRenewal(true);
    try {
      await api.requestRenewal(renewalLoan.id, renewalReason.trim() || undefined);
      Alert.alert(
        'Renewal Requested',
        'Your loan renewal application has been submitted for librarian approval (+7 days upon approval).'
      );
      setRenewalLoan(null);
      setRenewalReason('');
      fetchLoans();
    } catch (err: any) {
      Alert.alert('Renewal Failed', err.message || 'Maximum renewals reached or book has active waitlist.');
    } finally {
      setIsSubmittingRenewal(false);
    }
  };

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
  const returnedLoans = loans.filter((l) => l.status === 'RETURNED');
  const displayList = activeTab === 'ACTIVE' ? activeLoans : returnedLoans;

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('ACTIVE')}
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            Active Loans ({activeLoans.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('RETURNED')}
          style={[styles.tabButton, activeTab === 'RETURNED' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, activeTab === 'RETURNED' && styles.tabTextActive]}>
            Loan History ({returnedLoans.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1268B3" />
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1268B3']} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>
                {activeTab === 'ACTIVE' ? 'No Active Loans' : 'No Returned Loans Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ACTIVE'
                  ? 'You do not have any borrowed materials currently in your possession.'
                  : 'Past loan records and returned books will be catalogued here.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const daysLeft = calculateDaysLeft(item.dueAt);
            const isOverdue = daysLeft < 0;

            return (
              <View style={[styles.card, isOverdue && styles.cardOverdue]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.accessionTag}>
                      {item.bookCopy?.accessionNumber || 'NSUK-COPY'}
                    </Text>
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {item.bookCopy?.book?.title || 'Library Resource'}
                    </Text>
                    <Text style={styles.shelfText}>
                      Shelf: {item.bookCopy?.shelfLocation || 'Stack Central'}
                    </Text>
                  </View>

                  <View style={[styles.daysBadge, isOverdue ? styles.daysBadgeOverdue : styles.daysBadgeNormal]}>
                    <Text style={[styles.daysText, isOverdue ? styles.daysTextOverdue : styles.daysTextNormal]}>
                      {item.status === 'RETURNED'
                        ? 'Returned'
                        : isOverdue
                        ? `${Math.abs(daysLeft)}d Overdue`
                        : `${daysLeft}d Remaining`}
                    </Text>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <Text style={styles.dateLabel}>Borrowed: {new Date(item.borrowedAt).toLocaleDateString()}</Text>
                  <Text style={[styles.dateLabel, isOverdue && styles.dateDueOverdue]}>
                    Due: {new Date(item.dueAt).toLocaleDateString()}
                  </Text>
                </View>

                {item.status === 'ACTIVE' && (
                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      onPress={() => setRenewalLoan(item)}
                      style={styles.renewButton}
                    >
                      <Text style={styles.renewButtonText}>Request 7-Day Renewal</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Renewal Modal */}
      <Modal visible={!!renewalLoan} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request Loan Extension</Text>
            <Text style={styles.modalSubtitle}>
              Apply for +7 days on "{renewalLoan?.bookCopy?.book?.title}"
            </Text>

            <Text style={styles.inputLabel}>Academic Reason / Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={renewalReason}
              onChangeText={setRenewalReason}
              placeholder="e.g. Conducting final research chapter analysis..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.policyNotice}>
              <Text style={styles.policyText}>
                Students can renew a borrowed book once, provided no other student has placed a reservation on it.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setRenewalLoan(null)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRequestRenewal}
                disabled={isSubmittingRenewal}
                style={styles.modalConfirmButton}
              >
                {isSubmittingRenewal ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F0F4F8',
  },
  tabButtonActive: {
    backgroundColor: '#1268B3',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66758A',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#172438',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#66758A',
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#082B60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardOverdue: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF8F8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardInfo: {
    flex: 1,
  },
  accessionTag: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#1268B3',
    marginBottom: 2,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#082B60',
  },
  shelfText: {
    fontSize: 11,
    color: '#66758A',
    marginTop: 2,
  },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysBadgeNormal: {
    backgroundColor: '#E6F0FA',
  },
  daysBadgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  daysText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  daysTextNormal: {
    color: '#1268B3',
  },
  daysTextOverdue: {
    color: '#DC2626',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  dateLabel: {
    fontSize: 11,
    color: '#66758A',
  },
  dateDueOverdue: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  cardFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  renewButton: {
    backgroundColor: '#082B60',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  renewButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#082B60',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#66758A',
    marginTop: 2,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#172438',
    marginBottom: 4,
  },
  textArea: {
    backgroundColor: '#F5F8FC',
    borderWidth: 1,
    borderColor: '#D8E2EE',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  policyNotice: {
    backgroundColor: '#F0F6FD',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  policyText: {
    fontSize: 11,
    color: '#1268B3',
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#66758A',
    fontWeight: '600',
    fontSize: 12,
  },
  modalConfirmButton: {
    backgroundColor: '#1268B3',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
