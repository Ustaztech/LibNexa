import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import api from '../services/api';
import { Book, Category } from '../types';

export const CatalogueScreen: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modal
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await api.getBooks({
        search: searchQuery || undefined,
        categoryId: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      if (res.success && res.data) {
        setBooks(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load books:', err.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCatalog();
  }, [fetchCatalog]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCatalog();
  };

  const handleRequestBorrow = async (book: Book) => {
    setIsSubmittingAction(true);
    try {
      await api.createBorrowRequest(book.id);
      Alert.alert(
        'Request Submitted',
        `Your request for "${book.title}" is queued for librarian approval.`
      );
      setSelectedBook(null);
      fetchCatalog();
    } catch (err: any) {
      Alert.alert('Borrow Request Failed', err.message || 'Maximum concurrent request quota exceeded.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReserveBook = async (book: Book) => {
    setIsSubmittingAction(true);
    try {
      await api.createReservation(book.id);
      Alert.alert(
        'Book Reserved',
        `You have been added to the waitlist queue for "${book.title}". You will be notified when a copy is returned!`
      );
      setSelectedBook(null);
      fetchCatalog();
    } catch (err: any) {
      Alert.alert('Reservation Failed', err.message || 'Could not place reservation.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search catalog by title, author, ISBN..."
          placeholderTextColor="#8A9BB3"
        />
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <TouchableOpacity
            onPress={() => setSelectedCategory('ALL')}
            style={[styles.categoryPill, selectedCategory === 'ALL' && styles.categoryPillActive]}
          >
            <Text style={[styles.categoryText, selectedCategory === 'ALL' && styles.categoryTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const isSelected = selectedCategory === c.id || selectedCategory === c.name;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCategory(c.id)}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Books List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1268B3" />
          <Text style={styles.loadingText}>Fetching University Library Catalog...</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#1268B3']} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyTitle}>No Books Found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another title, author, or category.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAvailable = item.availableCopies > 0;
            const authorNames = Array.isArray(item.authors)
              ? item.authors.map((a) => (typeof a === 'string' ? a : a.name)).join(', ')
              : 'University Author';

            return (
              <TouchableOpacity
                onPress={() => setSelectedBook(item)}
                style={styles.bookCard}
                activeOpacity={0.8}
              >
                <View style={styles.bookCardHeader}>
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>by {authorNames}</Text>
                  </View>

                  <View style={[styles.statusBadge, isAvailable ? styles.statusAvailable : styles.statusOnLoan]}>
                    <Text style={[styles.statusText, isAvailable ? styles.statusTextAvailable : styles.statusTextOnLoan]}>
                      {isAvailable ? `${item.availableCopies} On Shelf` : 'On Loan'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bookDescription} numberOfLines={2}>{item.description}</Text>

                <View style={styles.bookFooter}>
                  <Text style={styles.shelfText}>📍 {item.shelfLocation || 'Stack Central'}</Text>
                  <Text style={styles.actionPrompt}>{isAvailable ? 'Borrow →' : 'Reserve Waitlist →'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Book Details Modal */}
      <Modal visible={!!selectedBook} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selectedBook?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedBook(null)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.detailAuthor}>
                Author(s):{' '}
                {selectedBook && Array.isArray(selectedBook.authors)
                  ? selectedBook.authors.map((a) => (typeof a === 'string' ? a : a.name)).join(', ')
                  : 'N/A'}
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ISBN:</Text>
                <Text style={styles.detailValue}>{selectedBook?.isbn}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Shelf Location:</Text>
                <Text style={styles.detailValueShelf}>{selectedBook?.shelfLocation || 'Stack Central'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Availability:</Text>
                <Text style={styles.detailValue}>
                  {selectedBook?.availableCopies} available of {selectedBook?.totalCopies} copies
                </Text>
              </View>

              <Text style={styles.sectionHeader}>Synopsis & Course Relevance</Text>
              <Text style={styles.detailDescription}>{selectedBook?.description}</Text>

              <View style={styles.rulesCallout}>
                <Text style={styles.rulesTitle}>NSUK Loan Rules</Text>
                <Text style={styles.rulesText}>
                  Standard loan duration is 14 days. Books can be renewed once for an extra 7 days if no other student has placed a reservation.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedBook && selectedBook.availableCopies > 0 ? (
                <TouchableOpacity
                  onPress={() => handleRequestBorrow(selectedBook)}
                  disabled={isSubmittingAction}
                  style={styles.borrowButton}
                >
                  {isSubmittingAction ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.borrowButtonText}>Submit Borrow Request (14 Days)</Text>
                  )}
                </TouchableOpacity>
              ) : selectedBook ? (
                <TouchableOpacity
                  onPress={() => handleReserveBook(selectedBook)}
                  disabled={isSubmittingAction}
                  style={styles.reserveButton}
                >
                  {isSubmittingAction ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.reserveButtonText}>Join Waitlist Queue (Reserve)</Text>
                  )}
                </TouchableOpacity>
              ) : null}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#082B60',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    color: '#FFFFFF',
  },
  categoryBar: {
    backgroundColor: '#082B60',
    paddingBottom: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryPillActive: {
    backgroundColor: '#079BA9',
  },
  categoryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#66758A',
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
  bookCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#082B60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bookCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#082B60',
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#66758A',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusAvailable: {
    backgroundColor: '#E6F9F0',
  },
  statusOnLoan: {
    backgroundColor: '#FFF4E5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextAvailable: {
    color: '#0D8A52',
  },
  statusTextOnLoan: {
    color: '#C06800',
  },
  bookDescription: {
    fontSize: 12,
    color: '#4B5565',
    lineHeight: 18,
    marginTop: 8,
  },
  bookFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  shelfText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#1268B3',
    fontWeight: '600',
  },
  actionPrompt: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#079BA9',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#082B60',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#66758A',
    fontWeight: 'bold',
  },
  modalBody: {
    marginVertical: 8,
  },
  detailAuthor: {
    fontSize: 13,
    color: '#66758A',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#66758A',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#172438',
  },
  detailValueShelf: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#1268B3',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#082B60',
    marginTop: 14,
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 12,
    color: '#4B5565',
    lineHeight: 18,
  },
  rulesCallout: {
    backgroundColor: '#F0F6FD',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D4E5F9',
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1268B3',
    marginBottom: 2,
  },
  rulesText: {
    fontSize: 11,
    color: '#4B5565',
    lineHeight: 16,
  },
  modalFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  borrowButton: {
    backgroundColor: '#1268B3',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  borrowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reserveButton: {
    backgroundColor: '#D7A53B',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#172438',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
