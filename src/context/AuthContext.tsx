import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'candidate' | 'recruiter' | 'hiring-manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fetch user profile from Firestore using the Firebase Auth UID
async function fetchUserProfile(firebaseUser: FirebaseUser): Promise<User | null> {
  const userRef = doc(db, 'Users', firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    return {
      id: firebaseUser.uid,
      name: data.name || firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      role: data.role as UserRole,
    };
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(credential.user);
    if (!profile) {
      // User exists in Auth but not Firestore â€” edge case, sign them out
      await signOut(auth);
      throw new Error('Account setup incomplete. Please contact your administrator.');
    }
    setUser(profile);
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<void> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const name = `${firstName} ${lastName}`.trim();

    // Write the user profile to Firestore with the 'candidate' role by default
    await setDoc(doc(db, 'Users', credential.user.uid), {
      name,
      email,
      role: 'candidate' as UserRole,
      createdAt: serverTimestamp(),
    });

    setUser({
      id: credential.user.uid,
      name,
      email,
      role: 'candidate',
    });
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

