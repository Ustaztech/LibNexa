import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../services/api';
import { BorrowingRequest } from '../types';

export const MyRequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<BorrowingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.getMyRequests();
      if (res.success && res.data) {
        setRequests(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load requests:', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getStatusBadge = (status: BorrowingRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Under Review' };
      case 'APPROVED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Ready for Pickup' };
      case 'COLLECTED':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Collected (Loan)' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Declined' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', label: status };
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1268B3" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1268B3']} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>No Borrowing Requests</Text>
              <Text style={styles.emptySubtitle}>
                When you request books from the catalogue, your approval status will be tracked here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            const isApproved = item.status === 'APPROVED';

            return (
              <View style={[styles.card, isApproved && styles.cardApproved]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {item.book?.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  Requested: {new Date(item.requestedAt).toLocaleDateString()}
                </Text>

                {isApproved && (
                  <View style={styles.approvedAlert}>
                    <Text style={styles.approvedAlertTitle}>Collection Ready at Counter</Text>
                    <Text style={styles.approvedAlertText}>
                      Please present your Student ID to Reader Services staff within 48 hours to collect your copy.
                    </Text>
                    {item.collectionDeadline && (
                      <Text style={styles.deadlineText}>
                        Deadline: {new Date(item.collectionDeadline).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}

                {item.status === 'REJECTED' && item.rejectionReason && (
                  <View style={styles.rejectAlert}>
                    <Text style={styles.rejectText}>Reason: {item.rejectionReason}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  listContent: {
    padding: 16,
    gap: 12,
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
  cardApproved: {
    borderColor: '#34D399',
    backgroundColor: '#F7FEFA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#082B60',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 11,
    color: '#66758A',
    marginTop: 6,
  },
  approvedAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  approvedAlertTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065F46',
  },
  approvedAlertText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  deadlineText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#065F46',
    marginTop: 4,
  },
  rejectAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  rejectText: {
    fontSize: 11,
    color: '#991B1B',
  },
});
