import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:8080';

// ---------- Small inline icon set (no external deps) ----------
const Icon = ({ name, size = 18 }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'dashboard': return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case 'book': return <svg {...common}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M4 4.5v15A2.5 2.5 0 0 0 6.5 22H20"/></svg>;
    case 'user': return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case 'donate': return <svg {...common}><path d="M12 21s-7.5-4.7-10-9.3C.4 8 2 4.5 5.7 4c2-.3 3.9.5 5 2 1.1-1.5 3-2.3 5-2C19.9 4.5 21.5 8 20 11.7 17.5 16.3 12 21 12 21z"/></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'edit': return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    case 'trash': return <svg {...common}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
    case 'close': return <svg {...common}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'check': return <svg {...common}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'alert': return <svg {...common}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>;
    case 'image': return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    case 'refresh': return <svg {...common}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/></svg>;
    case 'menu': return <svg {...common}><path d="M3 12h18M3 6h18M3 18h18"/></svg>;
    default: return null;
  }
};

// ---------- Toast notification system ----------
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon name={t.type === 'error' ? 'alert' : 'check'} size={16} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Confirm modal ----------
function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon"><Icon name="alert" size={22} /></div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Yes, Delete</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Reusable UI bits ----------
function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={32} />
      <p>{text}</p>
    </div>
  );
}

function Avatar({ name }) {
  const initials = (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className="avatar">{initials || '?'}</div>;
}

function formatCurrency(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '$ 0.00';
  return `$ ${n.toFixed(2)}`;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toasts, push } = useToasts();

  // Search
  const [bookSearch, setBookSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [donateSearch, setDonateSearch] = useState('');

  // Edit Tracking IDs
  const [editBookId, setEditBookId] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  const [editDonateId, setEditDonateId] = useState(null);

  // Book States
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookPrice, setBookPrice] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookImage, setBookImage] = useState(null);
  const [bookImagePreview, setBookImagePreview] = useState(null);
  const [savingBook, setSavingBook] = useState(false);

  // User States
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Donation States
  const [donorName, setDonorName] = useState('');
  const [donateAmount, setDonateAmount] = useState('');
  const [donateMessage, setDonateMessage] = useState('');
  const [savingDonate, setSavingDonate] = useState(false);

  // Delete confirmation modal state
  const [confirmState, setConfirmState] = useState({ open: false });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [bookRes, userRes, donateRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/book-service/api/v1/books`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/user-service/api/v1/users`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/donate-service/api/v1/donations`).catch(() => ({ data: [] })),
      ]);
      setBooks(bookRes.data || []);
      setUsers(userRes.data || []);
      setDonations(donateRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      push('Could not reach backend services. Is everything running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractError = (err, fallback) => {
    const data = err?.response?.data;
    if (data?.fields) {
      return Object.values(data.fields).join(', ');
    }
    if (data?.message) return data.message;
    return fallback;
  };

  // --- BOOK ACTIONS ---
  const handleSaveBook = async (e) => {
    e.preventDefault();
    setSavingBook(true);
    try {
      const formData = new FormData();
      formData.append('title', bookTitle);
      formData.append('author', bookAuthor);
      formData.append('price', bookPrice);
      formData.append('isbn', bookIsbn);
      if (bookImage) formData.append('image', bookImage);

      if (editBookId) {
        await axios.put(`${API_BASE_URL}/book-service/api/v1/books/${editBookId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        push('Book updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/book-service/api/v1/books`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        push('Book added successfully');
      }
      resetBookForm();
      fetchAllData();
    } catch (err) {
      console.error('Error saving book:', err);
      push(extractError(err, 'Could not save book'), 'error');
    } finally {
      setSavingBook(false);
    }
  };

  const editBook = (b) => {
    setEditBookId(b.id);
    setBookTitle(b.title);
    setBookAuthor(b.author);
    setBookPrice(b.price);
    setBookIsbn(b.isbn);
    setBookImagePreview(b.coverImageUrl || null);
    setActiveTab('books');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const askDeleteBook = (b) => {
    setConfirmState({
      open: true,
      title: 'Delete Book',
      message: `Remove "${b.title}" from the library permanently?`,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/book-service/api/v1/books/${b.id}`);
          push('Book deleted');
          fetchAllData();
        } catch (err) {
          push(extractError(err, 'Could not delete book'), 'error');
        } finally {
          setConfirmState({ open: false });
        }
      },
    });
  };

  const resetBookForm = () => {
    setBookTitle('');
    setBookAuthor('');
    setBookPrice('');
    setBookIsbn('');
    setBookImage(null);
    setBookImagePreview(null);
    setEditBookId(null);
  };

  const onBookImageChange = (e) => {
    const file = e.target.files[0];
    setBookImage(file || null);
    if (file) setBookImagePreview(URL.createObjectURL(file));
  };

  // --- USER ACTIONS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      if (editUserId) {
        await axios.put(`${API_BASE_URL}/user-service/api/v1/users/${editUserId}`, { name: userName, email: userEmail });
        push('User updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/user-service/api/v1/users`, { name: userName, email: userEmail });
        push('User added successfully');
      }
      setUserName('');
      setUserEmail('');
      setEditUserId(null);
      fetchAllData();
    } catch (err) {
      console.error('Error saving user:', err);
      push(extractError(err, 'Could not save user'), 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const editUser = (u) => {
    setEditUserId(u.id);
    setUserName(u.name);
    setUserEmail(u.email);
    setActiveTab('users');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const askDeleteUser = (u) => {
    setConfirmState({
      open: true,
      title: 'Delete User',
      message: `Remove "${u.name}" from the system permanently?`,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/user-service/api/v1/users/${u.id}`);
          push('User deleted');
          fetchAllData();
        } catch (err) {
          push(extractError(err, 'Could not delete user'), 'error');
        } finally {
          setConfirmState({ open: false });
        }
      },
    });
  };

  // --- DONATION ACTIONS ---
  const handleSaveDonate = async (e) => {
    e.preventDefault();
    setSavingDonate(true);
    try {
      const donateData = { donorName, amount: parseFloat(donateAmount), message: donateMessage };
      if (editDonateId) {
        await axios.put(`${API_BASE_URL}/donate-service/api/v1/donations/${editDonateId}`, donateData);
        push('Donation updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/donate-service/api/v1/donations`, donateData);
        push('Thank you! Donation recorded');
      }
      setDonorName('');
      setDonateAmount('');
      setDonateMessage('');
      setEditDonateId(null);
      fetchAllData();
    } catch (err) {
      console.error('Error saving donation:', err);
      push(extractError(err, 'Could not save donation'), 'error');
    } finally {
      setSavingDonate(false);
    }
  };

  const editDonation = (d) => {
    setEditDonateId(d.id);
    setDonorName(d.donorName);
    setDonateAmount(d.amount);
    setDonateMessage(d.message || '');
    setActiveTab('donate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const askDeleteDonation = (d) => {
    setConfirmState({
      open: true,
      title: 'Delete Donation',
      message: `Remove this donation from "${d.donorName}" permanently?`,
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/donate-service/api/v1/donations/${d.id}`);
          push('Donation deleted');
          fetchAllData();
        } catch (err) {
          push(extractError(err, 'Could not delete donation'), 'error');
        } finally {
          setConfirmState({ open: false });
        }
      },
    });
  };

  // --- Derived / filtered lists ---
  const filteredBooks = useMemo(
    () => books.filter((b) =>
      [b.title, b.author, b.isbn].some((f) => (f || '').toLowerCase().includes(bookSearch.toLowerCase()))),
    [books, bookSearch]
  );
  const filteredUsers = useMemo(
    () => users.filter((u) =>
      [u.name, u.email].some((f) => (f || '').toLowerCase().includes(userSearch.toLowerCase()))),
    [users, userSearch]
  );
  const filteredDonations = useMemo(
    () => donations.filter((d) =>
      [d.donorName, d.message].some((f) => (f || '').toLowerCase().includes(donateSearch.toLowerCase()))),
    [donations, donateSearch]
  );

  const totalDonated = useMemo(
    () => donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0),
    [donations]
  );

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'books', label: 'Books', icon: 'book' },
    { key: 'users', label: 'Users', icon: 'user' },
    { key: 'donate', label: 'Donations', icon: 'donate' },
  ];

  return (
    <div className="app-container">
      <ToastStack toasts={toasts} />
      <ConfirmModal
        open={!!confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-badge"><Icon name="book" size={18} /></span>
          Library Manager
        </div>
        <ul className="sidebar-menu">
          {navItems.map((item) => (
            <li
              key={item.key}
              className={activeTab === item.key ? 'active' : ''}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">Connected to API Gateway :8080</div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div className="header">
          <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" size={20} />
          </button>
          <span>{activeTab === 'dashboard' ? 'Dashboard Overview' : `${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)} Management`}</span>
          <button className="icon-btn refresh-btn" onClick={fetchAllData} title="Refresh data">
            <Icon name="refresh" size={16} />
          </button>
        </div>

        <div className="content-body">
          {loading && (
            <div className="loading-bar"><div className="loading-bar-fill" /></div>
          )}

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              <h2>System Analytics</h2>
              <div className="card-grid">
                <div className="stat-card books" onClick={() => setActiveTab('books')}>
                  <div className="stat-icon"><Icon name="book" size={22} /></div>
                  <h3>Total Books</h3>
                  <p>{books.length}</p>
                </div>
                <div className="stat-card users" onClick={() => setActiveTab('users')}>
                  <div className="stat-icon"><Icon name="user" size={22} /></div>
                  <h3>Total Users</h3>
                  <p>{users.length}</p>
                </div>
                <div className="stat-card donate" onClick={() => setActiveTab('donate')}>
                  <div className="stat-icon"><Icon name="donate" size={22} /></div>
                  <h3>Total Donations</h3>
                  <p>{donations.length}</p>
                </div>
                <div className="stat-card amount">
                  <div className="stat-icon"><Icon name="donate" size={22} /></div>
                  <h3>Amount Raised</h3>
                  <p>{formatCurrency(totalDonated)}</p>
                </div>
              </div>

              <div className="dashboard-lists">
                <div className="panel">
                  <h3>Recently Added Books</h3>
                  {books.length === 0 ? (
                    <EmptyState icon="book" text="No books yet — add your first one." />
                  ) : (
                    <ul className="mini-list">
                      {books.slice(-5).reverse().map((b, i) => (
                        <li key={b.id || i}>
                          <span className="mini-list-title">{b.title}</span>
                          <span className="mini-list-sub">{b.author}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="panel">
                  <h3>Recent Donations</h3>
                  {donations.length === 0 ? (
                    <EmptyState icon="donate" text="No donations recorded yet." />
                  ) : (
                    <ul className="mini-list">
                      {donations.slice(-5).reverse().map((d, i) => (
                        <li key={d.id || i}>
                          <span className="mini-list-title">{d.donorName}</span>
                          <span className="mini-list-sub">{formatCurrency(d.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BOOKS SECTION */}
          {activeTab === 'books' && (
            <div>
              <div className="section-head">
                <h2>Manage Books</h2>
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input placeholder="Search title, author, ISBN..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />
                </div>
              </div>

              <div className="form-container book-form">
                <form onSubmit={handleSaveBook} className="grid-2">
                  <input type="text" placeholder="Book Title..." value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} required />
                  <input type="text" placeholder="Author Name..." value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} required />
                  <input type="number" step="0.01" min="0.01" placeholder="Price ($)..." value={bookPrice} onChange={(e) => setBookPrice(e.target.value)} required />
                  <input type="text" placeholder="ISBN Number..." value={bookIsbn} onChange={(e) => setBookIsbn(e.target.value)} required />

                  <div className="file-row">
                    <label className="file-label">
                      <Icon name="image" size={16} /> Cover Image
                      <input type="file" accept="image/*" onChange={onBookImageChange} hidden />
                    </label>
                    {bookImagePreview && <img className="preview-thumb" src={bookImagePreview} alt="preview" />}
                  </div>

                  <div className="form-actions">
                    <button type="submit" disabled={savingBook}>
                      {savingBook ? 'Saving...' : editBookId ? 'Update Book' : (<><Icon name="plus" size={14} /> Add New Book</>)}
                    </button>
                    {editBookId && <button type="button" className="btn-secondary" onClick={resetBookForm}>Cancel</button>}
                  </div>
                </form>
              </div>

              {filteredBooks.length === 0 ? (
                <EmptyState icon="book" text={bookSearch ? 'No books match your search.' : 'No books found — add your first book above.'} />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Cover</th><th>Title</th><th>Author</th><th>Price</th><th>ISBN</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((b, idx) => (
                      <tr key={b.id || idx}>
                        <td>
                          {b.coverImageUrl ? (
                            <img src={b.coverImageUrl} alt="Cover" className="cover-thumb" />
                          ) : (
                            <div className="cover-thumb placeholder"><Icon name="book" size={16} /></div>
                          )}
                        </td>
                        <td className="cell-strong">{b.title}</td>
                        <td>{b.author}</td>
                        <td>{formatCurrency(b.price)}</td>
                        <td className="mono">{b.isbn}</td>
                        <td className="actions-cell">
                          <button className="btn-icon edit" onClick={() => editBook(b)} title="Edit"><Icon name="edit" size={15} /></button>
                          <button className="btn-icon danger" onClick={() => askDeleteBook(b)} title="Delete"><Icon name="trash" size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* USERS SECTION */}
          {activeTab === 'users' && (
            <div>
              <div className="section-head">
                <h2>Manage Users</h2>
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input placeholder="Search name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                </div>
              </div>

              <div className="form-container">
                <form onSubmit={handleSaveUser} className="grid-3">
                  <input type="text" placeholder="Enter User Name..." value={userName} onChange={(e) => setUserName(e.target.value)} required />
                  <input type="email" placeholder="Enter User Email..." value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                  <div className="form-actions inline">
                    <button type="submit" disabled={savingUser}>{savingUser ? 'Saving...' : editUserId ? 'Update User' : 'Add User'}</button>
                    {editUserId && <button type="button" className="btn-secondary" onClick={() => { setEditUserId(null); setUserName(''); setUserEmail(''); }}>Cancel</button>}
                  </div>
                </form>
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState icon="user" text={userSearch ? 'No users match your search.' : 'No users found — add your first user above.'} />
              ) : (
                <table>
                  <thead><tr><th>User</th><th>Email</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => (
                      <tr key={u.id || idx}>
                        <td className="cell-with-avatar">
                          <Avatar name={u.name} />
                          <span className="cell-strong">{u.name}</span>
                        </td>
                        <td>{u.email}</td>
                        <td className="actions-cell">
                          <button className="btn-icon edit" onClick={() => editUser(u)} title="Edit"><Icon name="edit" size={15} /></button>
                          <button className="btn-icon danger" onClick={() => askDeleteUser(u)} title="Delete"><Icon name="trash" size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* DONATIONS SECTION */}
          {activeTab === 'donate' && (
            <div>
              <div className="section-head">
                <h2>Manage Donations</h2>
                <div className="search-box">
                  <Icon name="search" size={16} />
                  <input placeholder="Search donor or message..." value={donateSearch} onChange={(e) => setDonateSearch(e.target.value)} />
                </div>
              </div>

              <div className="form-container">
                <form onSubmit={handleSaveDonate} className="grid-4">
                  <input type="text" placeholder="Donor Name..." value={donorName} onChange={(e) => setDonorName(e.target.value)} required />
                  <input type="number" step="0.01" min="0.01" placeholder="Amount ($)..." value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} required />
                  <input type="text" placeholder="Message (Optional)..." value={donateMessage} onChange={(e) => setDonateMessage(e.target.value)} />
                  <div className="form-actions inline">
                    <button type="submit" disabled={savingDonate}>{savingDonate ? 'Saving...' : editDonateId ? 'Update' : 'Donate Now'}</button>
                    {editDonateId && <button type="button" className="btn-secondary" onClick={() => { setEditDonateId(null); setDonorName(''); setDonateAmount(''); setDonateMessage(''); }}>Cancel</button>}
                  </div>
                </form>
              </div>

              {filteredDonations.length === 0 ? (
                <EmptyState icon="donate" text={donateSearch ? 'No donations match your search.' : 'No donations recorded yet.'} />
              ) : (
                <table>
                  <thead><tr><th>Donor</th><th>Amount</th><th>Message</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredDonations.map((d, idx) => (
                      <tr key={d.id || idx}>
                        <td className="cell-with-avatar">
                          <Avatar name={d.donorName} />
                          <span className="cell-strong">{d.donorName}</span>
                        </td>
                        <td className="amount-cell">{formatCurrency(d.amount)}</td>
                        <td className="muted">{d.message || 'No message'}</td>
                        <td className="actions-cell">
                          <button className="btn-icon edit" onClick={() => editDonation(d)} title="Edit"><Icon name="edit" size={15} /></button>
                          <button className="btn-icon danger" onClick={() => askDeleteDonation(d)} title="Delete"><Icon name="trash" size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
