import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Ban, CheckCircle, Users, X, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ats/StatusBadge';
import { db, auth, firebaseConfig } from '../../lib/firebase';
import {
  collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';

type UserRole = 'admin' | 'recruiter' | 'hiring-manager' | 'candidate';
type UserStatus = 'active' | 'inactive';

interface FirestoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: any;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  recruiter: 'Recruiter',
  'hiring-manager': 'Hiring Manager',
  candidate: 'Candidate',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  recruiter: 'bg-green-100 text-green-800',
  'hiring-manager': 'bg-blue-100 text-blue-800',
  candidate: 'bg-gray-100 text-gray-800',
};

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function UserManagement() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'recruiter' as UserRole });

  // ── Load users from Firestore ──────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'Users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreUser)));
    } catch (e: any) {
      setError('Failed to load users: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Filter ─────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchTab = (user.status ?? 'active') === activeTab;
      const matchSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === '' || user.role === roleFilter;
      return matchTab && matchSearch && matchRole;
    });
  }, [users, activeTab, searchTerm, roleFilter]);

  // ── Create user (secondary app — never interrupts admin session) ──
  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;
    setActionLoading('create');
    setError('');
    const tempPassword = generateTempPassword();
    // Create a temporary secondary Firebase app so the admin stays logged in
    const secondaryApp = initializeApp(firebaseConfig, `UserCreation_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      // 1. Create Firebase Auth account via secondary app (won't change admin session)
      const credential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, tempPassword);
      const uid = credential.user.uid;

      // 2. Sign out of secondary app immediately
      await signOut(secondaryAuth);

      // 3. Write Firestore profile using primary db
      await setDoc(doc(db, 'Users', uid), {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 4. Send password reset email so the user sets their own password
      await sendPasswordResetEmail(auth, newUser.email);

      // 5. Show confirmation modal with temp password
      setCreatedUser({ name: newUser.name, email: newUser.email, password: tempPassword });
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', role: 'recruiter' });
      await loadUsers();
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        setError('A user with this email already exists.');
      } else {
        setError(e.message || 'Failed to create user.');
      }
    } finally {
      // Clean up the secondary app
      await deleteApp(secondaryApp);
      setActionLoading(null);
    }
  };

  // ── Toggle active / inactive ───────────────────────────────────
  const toggleUserStatus = async (user: FirestoreUser) => {
    setActionLoading(user.id);
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'Users', user.id), { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      setSuccess(`${user.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError('Failed to update user: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const copyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-500 mt-1">Manage system access and user roles</p>
        </div>
        <Button
          onClick={() => { setIsAddUserOpen(true); setError(''); }}
          className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white shadow-md"
        >
          <Plus className="size-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="size-4" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle className="size-4 shrink-0" /> {success}
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-lg">
            {(['active', 'inactive'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${
                  activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab} Users
              </button>
            ))}
          </div>

          {/* Search & Role filter */}
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[var(--pumpkin-orange)] cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="hiring-manager">Hiring Manager</option>
              <option value="recruiter">Recruiter</option>
              <option value="candidate">Candidate</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                {['User', 'Role', 'Status', 'Created', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="size-8 animate-spin text-gray-300 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 text-[var(--pumpkin-orange)] flex items-center justify-center font-bold text-sm border border-white shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={user.status === 'active' ? 'Active' : 'Inactive'} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt?.toDate
                        ? user.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          disabled={actionLoading === user.id}
                          className={`p-2 rounded-lg transition-colors ${user.status === 'active'
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {actionLoading === user.id
                            ? <Loader2 className="size-4 animate-spin" />
                            : user.status === 'active' ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Users className="size-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">No users found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />{error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                  placeholder="e.g. Jane Doe"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                  placeholder="e.g. jane@company.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--pumpkin-orange)]/20 focus:border-[var(--pumpkin-orange)]"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value="recruiter">Recruiter</option>
                  <option value="hiring-manager">Hiring Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
                A temporary password will be generated and a <strong>password reset email</strong> will be sent to the user automatically.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
              <Button
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.email || actionLoading === 'create'}
                className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white"
              >
                {actionLoading === 'create' ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Create User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Created User Confirmation Modal */}
      {createdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-green-50 flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">User Created</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                <strong>{createdUser.name}</strong> has been created. A password reset email has been sent to <strong>{createdUser.email}</strong>.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Temporary password (share securely):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded-lg">
                    {createdUser.password}
                  </code>
                  <button
                    onClick={() => copyPassword(createdUser.password)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy password"
                  >
                    {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                The user should use the reset link in their email to set a permanent password. The temporary password above is a fallback.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Button onClick={() => setCreatedUser(null)} className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
