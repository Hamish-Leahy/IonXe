// User Management - User roles and permissions system
// Professional user management with role-based access control

class UserManagement {
  constructor() {
    this.currentUser = null;
    this.users = new Map();
    this.roles = new Map();
    this.permissions = new Map();
    this.sessions = new Map();
    
    this.initializeUserSystem();
  }

  initializeUserSystem() {
    // Initialize default roles
    this.initializeDefaultRoles();
    
    // Initialize default permissions
    this.initializeDefaultPermissions();
    
    // Load users from storage
    this.loadUsersFromStorage();
    
    // Check for existing session
    this.checkExistingSession();
  }

  initializeDefaultRoles() {
    // Administrator role
    this.addRole('admin', {
      name: 'Administrator',
      description: 'Full system access',
      permissions: [
        'user.create', 'user.read', 'user.update', 'user.delete',
        'show.create', 'show.read', 'show.update', 'show.delete',
        'fixture.create', 'fixture.read', 'fixture.update', 'fixture.delete',
        'scene.create', 'scene.read', 'scene.update', 'scene.delete',
        'qlist.create', 'qlist.read', 'qlist.update', 'qlist.delete',
        'macro.create', 'macro.read', 'macro.update', 'macro.delete',
        'color.create', 'color.read', 'color.update', 'color.delete',
        'effects.create', 'effects.read', 'effects.update', 'effects.delete',
        'timing.create', 'timing.read', 'timing.update', 'timing.delete',
        'audio.create', 'audio.read', 'audio.update', 'audio.delete',
        'network.create', 'network.read', 'network.update', 'network.delete',
        'system.settings', 'system.backup', 'system.restore'
      ],
      level: 100
    });

    // Operator role
    this.addRole('operator', {
      name: 'Operator',
      description: 'Show operation and control',
      permissions: [
        'show.read', 'show.update',
        'fixture.read', 'fixture.update',
        'scene.read', 'scene.update',
        'qlist.read', 'qlist.update',
        'macro.read', 'macro.update',
        'color.read', 'color.update',
        'effects.read', 'effects.update',
        'timing.read', 'timing.update',
        'audio.read', 'audio.update',
        'network.read'
      ],
      level: 50
    });

    // Programmer role
    this.addRole('programmer', {
      name: 'Programmer',
      description: 'Show programming and design',
      permissions: [
        'show.create', 'show.read', 'show.update',
        'fixture.create', 'fixture.read', 'fixture.update',
        'scene.create', 'scene.read', 'scene.update', 'scene.delete',
        'qlist.create', 'qlist.read', 'qlist.update', 'qlist.delete',
        'macro.create', 'macro.read', 'macro.update', 'macro.delete',
        'color.create', 'color.read', 'color.update', 'color.delete',
        'effects.create', 'effects.read', 'effects.update', 'effects.delete',
        'timing.create', 'timing.read', 'timing.update', 'timing.delete',
        'audio.create', 'audio.read', 'audio.update', 'audio.delete',
        'network.create', 'network.read', 'network.update'
      ],
      level: 75
    });

    // Guest role
    this.addRole('guest', {
      name: 'Guest',
      description: 'Limited read-only access',
      permissions: [
        'show.read',
        'fixture.read',
        'scene.read',
        'qlist.read',
        'macro.read',
        'color.read',
        'effects.read',
        'timing.read',
        'audio.read',
        'network.read'
      ],
      level: 10
    });
  }

  initializeDefaultPermissions() {
    const permissionGroups = {
      'user': ['create', 'read', 'update', 'delete'],
      'show': ['create', 'read', 'update', 'delete'],
      'fixture': ['create', 'read', 'update', 'delete'],
      'scene': ['create', 'read', 'update', 'delete'],
      'qlist': ['create', 'read', 'update', 'delete'],
      'macro': ['create', 'read', 'update', 'delete'],
      'color': ['create', 'read', 'update', 'delete'],
      'effects': ['create', 'read', 'update', 'delete'],
      'timing': ['create', 'read', 'update', 'delete'],
      'audio': ['create', 'read', 'update', 'delete'],
      'network': ['create', 'read', 'update', 'delete'],
      'system': ['settings', 'backup', 'restore']
    };

    Object.entries(permissionGroups).forEach(([group, actions]) => {
      actions.forEach(action => {
        const permission = `${group}.${action}`;
        this.permissions.set(permission, {
          name: permission,
          group,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${group}`
        });
      });
    });
  }

  // User management
  createUser(userData) {
    const user = {
      id: this.generateId(),
      username: userData.username,
      email: userData.email,
      password: this.hashPassword(userData.password),
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      role: userData.role || 'guest',
      active: userData.active !== false,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lastLogin: null,
      preferences: userData.preferences || {},
      metadata: userData.metadata || {}
    };

    this.users.set(user.id, user);
    this.saveUsersToStorage();
    return user;
  }

  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (!user) return null;

    // Don't allow updating password through this method
    if (updates.password) {
      delete updates.password;
    }

    Object.assign(user, updates, {
      modified: new Date().toISOString()
    });

    this.saveUsersToStorage();
    return user;
  }

  deleteUser(userId) {
    if (this.users.has(userId)) {
      this.users.delete(userId);
      this.saveUsersToStorage();
      return true;
    }
    return false;
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  // Authentication
  login(username, password) {
    const user = this.getUserByUsername(username);
    if (!user || !user.active) {
      return { success: false, message: 'Invalid username or user is inactive' };
    }

    if (!this.verifyPassword(password, user.password)) {
      return { success: false, message: 'Invalid password' };
    }

    // Create session
    const session = this.createSession(user.id);
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    this.saveUsersToStorage();

    this.currentUser = user;
    this.saveCurrentUserToStorage();
    
    return { success: true, user, session };
  }

  logout() {
    if (this.currentUser) {
      // Remove session
      this.removeSession(this.currentUser.id);
      this.currentUser = null;
      this.removeCurrentUserFromStorage();
    }
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Session management
  createSession(userId) {
    const session = {
      id: this.generateId(),
      userId,
      created: new Date().toISOString(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      ip: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.sessions.set(session.id, session);
    this.saveSessionsToStorage();
    return session;
  }

  removeSession(sessionId) {
    this.sessions.delete(sessionId);
    this.saveSessionsToStorage();
  }

  removeSessionByUserId(userId) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
    this.saveSessionsToStorage();
  }

  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (new Date() > new Date(session.expires)) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  // Role management
  addRole(id, roleData) {
    this.roles.set(id, {
      ...roleData,
      id,
      created: new Date().toISOString()
    });
  }

  getRole(id) {
    return this.roles.get(id);
  }

  getAllRoles() {
    return Array.from(this.roles.values());
  }

  updateRole(id, updates) {
    const role = this.roles.get(id);
    if (role) {
      Object.assign(role, updates);
      return role;
    }
    return null;
  }

  deleteRole(id) {
    if (this.roles.has(id)) {
      this.roles.delete(id);
      return true;
    }
    return false;
  }

  // Permission management
  hasPermission(permission) {
    if (!this.currentUser) return false;

    const role = this.getRole(this.currentUser.role);
    if (!role) return false;

    return role.permissions.includes(permission);
  }

  hasAnyPermission(permissions) {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions) {
    return permissions.every(permission => this.hasPermission(permission));
  }

  getUserPermissions() {
    if (!this.currentUser) return [];

    const role = this.getRole(this.currentUser.role);
    return role ? role.permissions : [];
  }

  // User preferences
  setUserPreference(key, value) {
    if (!this.currentUser) return false;

    this.currentUser.preferences = this.currentUser.preferences || {};
    this.currentUser.preferences[key] = value;
    this.saveUsersToStorage();
    this.saveCurrentUserToStorage();
    return true;
  }

  getUserPreference(key, defaultValue = null) {
    if (!this.currentUser || !this.currentUser.preferences) return defaultValue;
    return this.currentUser.preferences[key] !== undefined ? this.currentUser.preferences[key] : defaultValue;
  }

  // Password management
  changePassword(userId, currentPassword, newPassword) {
    const user = this.users.get(userId);
    if (!user) return false;

    if (!this.verifyPassword(currentPassword, user.password)) {
      return false;
    }

    user.password = this.hashPassword(newPassword);
    user.modified = new Date().toISOString();
    this.saveUsersToStorage();
    return true;
  }

  resetPassword(userId, newPassword) {
    const user = this.users.get(userId);
    if (!user) return false;

    user.password = this.hashPassword(newPassword);
    user.modified = new Date().toISOString();
    this.saveUsersToStorage();
    return true;
  }

  // Security functions
  hashPassword(password) {
    // Simple hash function - in production, use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  getClientIP() {
    // Simplified IP detection - in production, get from server
    return '127.0.0.1';
  }

  // Storage management
  saveUsersToStorage() {
    const users = Array.from(this.users.entries());
    localStorage.setItem('ionxe-users', JSON.stringify(users));
  }

  loadUsersFromStorage() {
    try {
      const data = localStorage.getItem('ionxe-users');
      if (data) {
        const users = JSON.parse(data);
        this.users = new Map(users);
      }
    } catch (error) {
      console.warn('Failed to load users:', error);
      this.users = new Map();
    }
  }

  saveCurrentUserToStorage() {
    if (this.currentUser) {
      localStorage.setItem('ionxe-current-user', JSON.stringify(this.currentUser));
    }
  }

  removeCurrentUserFromStorage() {
    localStorage.removeItem('ionxe-current-user');
  }

  checkExistingSession() {
    try {
      const data = localStorage.getItem('ionxe-current-user');
      if (data) {
        const user = JSON.parse(data);
        this.currentUser = user;
      }
    } catch (error) {
      console.warn('Failed to load current user:', error);
    }
  }

  saveSessionsToStorage() {
    const sessions = Array.from(this.sessions.entries());
    localStorage.setItem('ionxe-sessions', JSON.stringify(sessions));
  }

  loadSessionsFromStorage() {
    try {
      const data = localStorage.getItem('ionxe-sessions');
      if (data) {
        const sessions = JSON.parse(data);
        this.sessions = new Map(sessions);
      }
    } catch (error) {
      console.warn('Failed to load sessions:', error);
      this.sessions = new Map();
    }
  }

  // Utility functions
  generateId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  formatUserName(user) {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  }

  formatRoleName(roleId) {
    const role = this.getRole(roleId);
    return role ? role.name : roleId;
  }

  // Event notifications
  notifyUserLoggedIn(user) {
    if (this.onUserLoggedIn) {
      this.onUserLoggedIn(user);
    }
  }

  notifyUserLoggedOut(user) {
    if (this.onUserLoggedOut) {
      this.onUserLoggedOut(user);
    }
  }

  notifyPermissionChanged() {
    if (this.onPermissionChanged) {
      this.onPermissionChanged();
    }
  }

  // Cleanup
  cleanup() {
    this.logout();
    this.sessions.clear();
  }
}

// Initialize user management
const userManagement = new UserManagement();
