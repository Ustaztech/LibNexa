import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import api from '../services/api';
import { Reservation } from '../types';

export const MyReservationsScreen: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = useCallback(async () => {
    try {
      const res = await api.getMyReservations();
      if (res.success && res.data) {
        setReservations(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load reservations:', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const handleCancelReservation = (item: Reservation) => {
    Alert.alert(
      'Cancel Reservation',
      `Are you sure you want to leave the waitlist queue for "${item.book?.title}"?`,
      [
        { text: 'Keep in Queue', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelReservation(item.id);
              Alert.alert('Cancelled', 'Your reservation was cancelled.');
              fetchReservations();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel reservation.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1268B3" />
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1268B3']} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>No Active Reservations</Text>
              <Text style={styles.emptySubtitle}>
                When all copies of a desired book are on loan, reserve it from the catalogue to secure the next available turn in queue.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isReady = item.status === 'READY_FOR_COLLECTION';

            return (
              <View style={[styles.card, isReady && styles.cardReady]}>
                <View style={styles.cardHeader}>
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueText}>Queue Position #{item.queuePosition || 1}</Text>
                  </View>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>

                <Text style={styles.bookTitle} numberOfLines={2}>{item.book?.title}</Text>
                <Text style={styles.dateText}>
                  Reserved: {new Date(item.reservedAt).toLocaleDateString()}
                </Text>

                {isReady && (
                  <View style={styles.readyAlert}>
                    <Text style={styles.readyTitle}>Copy Returned & Held For You!</Text>
                    <Text style={styles.readyText}>
                      Accession {item.assignedCopy?.accessionNumber || 'Available Copy'} is being held at the circulation desk. Please collect within 48 hours.
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => handleCancelReservation(item)}
                    style={styles.cancelButton}
                  >
                    <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
                  </TouchableOpacity>
                </View>
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
  cardReady: {
    borderColor: '#34D399',
    backgroundColor: '#F7FEFA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queueBadge: {
    backgroundColor: 'rgba(215, 165, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7A53B',
  },
  queueText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B88523',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1268B3',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#082B60',
  },
  dateText: {
    fontSize: 11,
    color: '#66758A',
    marginTop: 4,
  },
  readyAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  readyTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#065F46',
  },
  readyText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    paddingTop: 10,
  },
  cancelButton: {
    paddingVertical: 4,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
