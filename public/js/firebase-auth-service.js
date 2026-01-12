/**
 * Firebase Authentication Service
 * Handles user login, logout, and session management
 */

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.initialized = false;
    this.firebaseReady = false;
    this.waitForFirebase();
  }

  /**
   * Wait for Firebase to be available
   */
  waitForFirebase() {
    const maxWait = 5000; // 5 seconds
    const checkInterval = 100;
    let waited = 0;

    const check = () => {
      if (window.firebase && window.firebase.auth) {
        console.log('[Auth] ✅ Firebase SDK detected and ready');
        this.firebaseReady = true;
      } else if (waited < maxWait) {
        waited += checkInterval;
        setTimeout(check, checkInterval);
      } else {
        console.warn('[Auth] Firebase SDK timeout - will use database fallback only');
      }
    };

    check();
  }

  /**
   * Initialize Firebase Auth
   */
  async initialize() {
    try {
      // Wait for Firebase if not ready yet
      if (!this.firebaseReady && window.firebase && window.firebase.auth) {
        this.firebaseReady = true;
      }

      console.log('[Auth] Firebase Auth Service ready, using ' + 
                  (this.firebaseReady ? 'Firebase' : 'Database') + ' verification');

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[Auth] Initialization error:', error);
      return false;
    }
  }

  /**
   * Login with email and password using Firebase Auth
   * Falls back to database verification if Auth fails
   */
  async login(usernameOrEmail, password) {
    try {
      console.log('[Auth] Attempting login for:', usernameOrEmail);

      // Try Firebase Authentication first (if available)
      if (this.firebaseReady && window.firebase && window.firebase.auth) {
        try {
          console.log('[Auth] Using Firebase Authentication');
          
          // If it looks like an email, use it directly
          let email = usernameOrEmail;
          
          // If it looks like a username, try to find the email in database
          if (!usernameOrEmail.includes('@')) {
            email = await this.findEmailByUsername(usernameOrEmail);
            if (!email) {
              console.log('[Auth] Username not found in database');
              // Fall through to database verification below
              throw new Error('Username not found');
            }
          }

          // Attempt Firebase Auth login
          try {
            const userCredential = await window.firebase.auth().signInWithEmailAndPassword(email, password);
            console.log('[Auth] ✅ Firebase login successful for:', email);
            
            this.currentUser = userCredential.user;
            
            // Get user additional data from database
            const userData = await this.getUserDataFromDatabase(email);
            
            // Save session
            this.saveSession({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              username: userData?.username || usernameOrEmail,
              role: userData?.role || 'tanod',
              status: userData?.status || 'active'
            });

            return {
              success: true,
              user: {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                username: userData?.username || usernameOrEmail,
                role: userData?.role || 'tanod',
                status: userData?.status || 'active'
              }
            };
          } catch (authError) {
            console.log('[Auth] Firebase Auth failed, trying database verification');
            throw authError;
          }
        } catch (error) {
          console.log('[Auth] Firebase unavailable, using database verification');
        }
      }

      // Fallback to database verification
      console.log('[Auth] Using database verification');
      const userData = await this.verifyLoginFromDatabase(usernameOrEmail, password);
      if (userData) {
        console.log('[Auth] ✅ Database verification successful');
        this.saveSession(userData);
        return { success: true, user: userData };
      } else {
        console.log('[Auth] ❌ Database verification failed');
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      
      // Always try database as final fallback
      console.log('[Auth] Attempting database fallback after error');
      try {
        const userData = await this.verifyLoginFromDatabase(usernameOrEmail, password);
        if (userData) {
          console.log('[Auth] ✅ Database fallback successful');
          this.saveSession(userData);
          return { success: true, user: userData };
        }
      } catch (fallbackError) {
        console.error('[Auth] Fallback error:', fallbackError);
      }
      
      return { success: false, error: 'Invalid credentials' };
    }
  }

  /**
   * Verify login against Firebase database
   */
  async verifyLoginFromDatabase(username, password) {
    try {
      const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';
      
      const response = await fetch(dbURL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const users = await response.json();
      if (!users || typeof users !== 'object') {
        console.log('[Auth] No users found in database');
        return null;
      }

      for (const [key, userData] of Object.entries(users)) {
        const dbUsername = userData.name || userData.username || '';
        const dbPassword = userData.password || '';
        const email = userData.email || '';

        if ((dbUsername === username || email === username) && dbPassword === password) {
          console.log('[Auth] ✅ Database login successful for:', username);
          return {
            userId: key,
            uid: key,
            username: dbUsername,
            email: email,
            role: userData.role || 'tanod',
            status: userData.status || 'active'
          };
        }
      }

      console.log('[Auth] ❌ No matching user found in database');
      return null;
    } catch (error) {
      console.error('[Auth] Database verification error:', error);
      return null;
    }
  }

  /**
   * Find email by username in database
   */
  async findEmailByUsername(username) {
    try {
      const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';
      
      const response = await fetch(dbURL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const users = await response.json();
      if (!users) return null;

      for (const userData of Object.values(users)) {
        if ((userData.name || userData.username) === username) {
          return userData.email;
        }
      }

      return null;
    } catch (error) {
      console.error('[Auth] Error finding email:', error);
      return null;
    }
  }

  /**
   * Get user data from database by email
   */
  async getUserDataFromDatabase(email) {
    try {
      const dbURL = 'https://sentinel-tanod-system-default-rtdb.asia-southeast1.firebasedatabase.app/users.json';
      
      const response = await fetch(dbURL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const users = await response.json();
      if (!users) return null;

      for (const userData of Object.values(users)) {
        if (userData.email === email) {
          return userData;
        }
      }

      return null;
    } catch (error) {
      console.error('[Auth] Error getting user data:', error);
      return null;
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      if (this.firebaseReady && window.firebase && window.firebase.auth) {
        try {
          await window.firebase.auth().signOut();
          console.log('[Auth] Firebase logout successful');
        } catch (error) {
          console.log('[Auth] Firebase logout not needed (no Firebase session)');
        }
      }

      this.currentUser = null;
      this.clearSession();
      return { success: true };
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // Clear session anyway
      this.clearSession();
      return { success: true };
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.currentUser || !!this.getSession();
  }

  /**
   * Get current session
   */
  getSession() {
    try {
      const session = localStorage.getItem('sentinel_session');
      if (session) {
        return JSON.parse(session);
      }
    } catch (error) {
      console.error('[Auth] Error reading session:', error);
    }
    return null;
  }

  /**
   * Save session to localStorage
   */
  saveSession(userData) {
    try {
      localStorage.setItem('sentinel_session', JSON.stringify(userData));
      localStorage.setItem('sentinel_logged_in', 'true');
      console.log('[Auth] Session saved for user:', userData.username || userData.email);
    } catch (error) {
      console.error('[Auth] Error saving session:', error);
    }
  }

  /**
   * Clear session from localStorage
   */
  clearSession() {
    try {
      localStorage.removeItem('sentinel_session');
      localStorage.removeItem('sentinel_logged_in');
      console.log('[Auth] Session cleared');
    } catch (error) {
      console.error('[Auth] Error clearing session:', error);
    }
  }

  /**
   * Called when user auth state changes
   */
  onUserChanged(user) {
    if (user) {
      console.log('[Auth] User state changed - logged in:', user.email);
    } else {
      console.log('[Auth] User state changed - logged out');
    }
  }
}

// Create global instance
window.firebaseAuthService = new FirebaseAuthService();

// Initialize when Firebase is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.firebaseAuthService) {
      window.firebaseAuthService.initialize();
    }
  });
} else {
  window.firebaseAuthService.initialize();
}

console.log('[Auth] Firebase Auth Service initialized');
