import React, { useState } from 'react';
import { Book, BookCopy } from '../../types';
import { Plus, BookOpen, Layers, MapPin, Barcode, CheckCircle2, X, Search, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface InventoryManagerViewProps {
  books: Book[];
  onRefresh: () => void;
}

export const InventoryManagerView: React.FC<InventoryManagerViewProps> = ({ books, onRefresh }) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Add Book modal state
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthors, setNewAuthors] = useState('');
  const [newCategories, setNewCategories] = useState('Computer Science');
  const [newShelf, setNewShelf] = useState('Shelf CS-05A');
  const [newYear, setNewYear] = useState('2024');
  const [isSubmittingBook, setIsSubmittingBook] = useState(false);

  // Add Copy modal state
  const [selectedBookForCopy, setSelectedBookForCopy] = useState<Book | null>(null);
  const [newAccession, setNewAccession] = useState('');
  const [newCopyShelf, setNewCopyShelf] = useState('');
  const [newCopyCondition, setNewCopyCondition] = useState<'NEW' | 'GOOD' | 'FAIR'>('NEW');
  const [isSubmittingCopy, setIsSubmittingCopy] = useState(false);
  const [broadcastingBookId, setBroadcastingBookId] = useState<string | null>(null);

  const filteredBooks = books.filter((b) => {
    const q = searchTerm.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q);
  });

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBook(true);
    try {
      const authors = newAuthors.split(',').map((a) => a.trim()).filter(Boolean);
      const categories = newCategories.split(',').map((c) => c.trim()).filter(Boolean);

      await api.createBook({
        title: newTitle,
        isbn: newIsbn,
        description: newDescription,
        authorNames: authors.length > 0 ? authors : ['Faculty Author'],
        categoryNames: categories.length > 0 ? categories : ['General'],
        publicationYear: parseInt(newYear, 10) || 2024,
      });

      showToast({
        type: 'success',
        title: 'Book Added to Catalogue',
        message: `"${newTitle}" registered and automated email notifications dispatched to students.`,
      });
      setShowAddBookModal(false);
      setNewTitle('');
      setNewIsbn('');
      setNewDescription('');
      setNewAuthors('');
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to create book', message: err.message });
    } finally {
      setIsSubmittingBook(false);
    }
  };

  const handleBroadcastArrival = async (book: Book) => {
    setBroadcastingBookId(book.id);
    try {
      const res = await api.broadcastNewBookArrival(book.id);
      showToast({
        type: 'success',
        title: 'New Book Email Dispatched',
        message: res.message || `Automated email notification sent for "${book.title}".`,
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Broadcast Failed', message: err.message });
    } finally {
      setBroadcastingBookId(null);
    }
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForCopy) return;

    setIsSubmittingCopy(true);
    try {
      await api.createCopy({
        bookId: selectedBookForCopy.id,
        accessionNumber: newAccession,
        shelfLocation: newCopyShelf || selectedBookForCopy.shelfLocation || 'Main Stacks',
        condition: newCopyCondition,
      });

      showToast({
        type: 'success',
        title: 'Copy Registered',
        message: `Accession ${newAccession} linked to "${selectedBookForCopy.title}".`,
      });
      setSelectedBookForCopy(null);
      setNewAccession('');
      onRefresh();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Failed to register copy', message: err.message });
    } finally {
      setIsSubmittingCopy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl text-brand-dark dark:text-white">
            Library Inventory & Physical Copies
          </h2>
          <p className="text-xs text-brand-mutedText dark:text-white/60">
            Cataloguing, accession number indexing, shelf tracking, and condition audits
          </p>
        </div>

        <button
          onClick={() => setShowAddBookModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal text-white font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Book Title
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-brand-mutedText absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter catalog by title or ISBN..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
        />
      </div>

      {/* Books & Copies List */}
      <div className="space-y-4">
        {filteredBooks.map((b) => (
          <div
            key={b.id}
            className="p-5 rounded-2xl bg-white dark:bg-brand-navy/60 border border-brand-navy/10 dark:border-white/10 shadow-card space-y-4"
          >
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-heading font-bold text-base text-brand-dark dark:text-white">{b.title}</h3>
                <p className="text-xs text-brand-mutedText dark:text-white/60 mt-0.5">
                  ISBN: <span className="font-mono font-semibold">{b.isbn}</span> • Shelf:{' '}
                  <span className="font-mono font-semibold text-brand-royal dark:text-brand-cyan">
                    {b.shelfLocation || 'General Stacks'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-brand-mutedText dark:text-white/50 block">Copies:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {b.availableCopies} available / {b.totalCopies} total
                  </span>
                </div>

                <button
                  onClick={() => handleBroadcastArrival(b)}
                  disabled={broadcastingBookId === b.id}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/25 text-purple-600 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Broadcast new book arrival email to all active students"
                >
                  {broadcastingBookId === b.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                  )}
                  <span>Broadcast Email</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedBookForCopy(b);
                    setNewAccession(`NSUK-${b.isbn.substring(0, 4)}-${Math.floor(100 + Math.random() * 900)}`);
                    setNewCopyShelf(b.shelfLocation || 'Shelf CS-01');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-brand-navy/10 dark:bg-white/10 hover:bg-brand-navy/20 text-brand-dark dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-teal" />
                  Add Copy
                </button>
              </div>
            </div>

            {/* Copies Sub-table */}
            {b.copies && b.copies.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-brand-navy/5 dark:border-white/5">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-brand-bg/60 dark:bg-white/5 text-brand-mutedText font-semibold">
                    <tr>
                      <th className="p-2">Accession No.</th>
                      <th className="p-2">Shelf Location</th>
                      <th className="p-2">Condition</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-navy/5 dark:divide-white/5">
                    {b.copies.map((cp) => (
                      <tr key={cp.id} className="hover:bg-brand-bg/30">
                        <td className="p-2 font-mono font-semibold text-brand-royal dark:text-brand-cyan">
                          {cp.accessionNumber}
                        </td>
                        <td className="p-2 text-brand-mutedText">{cp.shelfLocation}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.2 rounded font-medium bg-blue-500/10 text-blue-500">
                            {cp.condition}
                          </span>
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              cp.status === 'AVAILABLE'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {cp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-brand-mutedText italic py-1">No physical copies attached to title.</div>
            )}
          </div>
        ))}
      </div>

      {/* Add Book Modal */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated p-6 text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddBookModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-brand-mutedText hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-bold text-lg">Register New Book Title</h3>
            <p className="text-xs text-brand-mutedText dark:text-white/70 mt-1">
              Add publication into the NSUK Central University Library Database
            </p>

            <form onSubmit={handleCreateBook} className="mt-4 space-y-3.5">
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>Automated email announcements will be dispatched to students upon registration.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Operating Systems"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">ISBN</label>
                  <input
                    type="text"
                    required
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                    placeholder="978-013123456"
                    className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Publication Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Authors (Comma-separated)</label>
                <input
                  type="text"
                  required
                  value={newAuthors}
                  onChange={(e) => setNewAuthors(e.target.value)}
                  placeholder="Andrew S. Tanenbaum, Maarten van Steen"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Category / Discipline</label>
                <input
                  type="text"
                  value={newCategories}
                  onChange={(e) => setNewCategories(e.target.value)}
                  placeholder="Computer Science, Software Engineering"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description / Abstract</label>
                <textarea
                  rows={2}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Comprehensive coverage of distributed principles and architectures..."
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBookModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBook}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-royal to-brand-teal text-white text-xs font-bold shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmittingBook ? 'Saving...' : 'Register Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Copy Modal */}
      {selectedBookForCopy && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-brand-navy rounded-3xl border border-brand-navy/10 dark:border-white/15 shadow-elevated p-6 text-brand-dark dark:text-white animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedBookForCopy(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-brand-mutedText hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-heading font-bold text-lg">Add Physical Copy</h3>
            <p className="text-xs text-brand-mutedText dark:text-white/70 mt-1">
              Assign accession number & shelf location for "{selectedBookForCopy.title}"
            </p>

            <form onSubmit={handleAddCopy} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Accession Number</label>
                <input
                  type="text"
                  required
                  value={newAccession}
                  onChange={(e) => setNewAccession(e.target.value)}
                  placeholder="NSUK-CS-2026-005"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Physical Shelf Location</label>
                <input
                  type="text"
                  required
                  value={newCopyShelf}
                  onChange={(e) => setNewCopyShelf(e.target.value)}
                  placeholder="Shelf CS-04B"
                  className="w-full p-2.5 rounded-xl bg-brand-bg dark:bg-white/10 border border-brand-navy/10 dark:border-white/10 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Condition</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['NEW', 'GOOD', 'FAIR'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setNewCopyCondition(cond)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        newCopyCondition === cond
                          ? 'bg-brand-royal text-white border-brand-royal'
                          : 'bg-brand-bg dark:bg-white/5 border-brand-navy/10 dark:border-white/10 text-brand-mutedText'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookForCopy(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-mutedText"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCopy}
                  className="px-5 py-2 rounded-xl bg-brand-teal text-white text-xs font-bold shadow-md hover:bg-brand-teal/90 disabled:opacity-50"
                >
                  {isSubmittingCopy ? 'Adding...' : 'Save Copy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
