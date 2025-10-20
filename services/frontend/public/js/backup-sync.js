// Backup and Sync System
// Comprehensive backup, restore, and synchronization functionality

class BackupSyncSystem {
  constructor(qListManager, showManager, collaborationEngine) {
    this.qListManager = qListManager;
    this.showManager = showManager;
    this.collaborationEngine = collaborationEngine;
    this.backups = new Map();
    this.syncSessions = new Map();
    this.isBackingUp = false;
    this.isSyncing = false;
    this.autoBackupInterval = null;
    this.syncInterval = null;
    this.storageQuota = 100 * 1024 * 1024; // 100MB
    this.compressionEnabled = true;
    
    this.initializeBackupSystem();
  }

  // System Initialization
  initializeBackupSystem() {
    this.setupStorageQuota();
    this.setupAutoBackup();
    this.setupEventListeners();
    this.loadExistingBackups();
  }

  setupStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        this.storageQuota = estimate.quota || this.storageQuota;
        this.notifyBackupEvent('storage_quota_updated', { quota: this.storageQuota });
      });
    }
  }

  setupAutoBackup() {
    // Auto backup every 5 minutes
    this.autoBackupInterval = setInterval(() => {
      if (!this.isBackingUp) {
        this.createAutoBackup();
      }
    }, 5 * 60 * 1000);
  }

  setupEventListeners() {
    // Backup on significant changes
    this.qListManager.onCueListUpdated = () => {
      this.scheduleBackup('cue_list_change');
    };

    this.showManager.onShowSaved = () => {
      this.scheduleBackup('show_saved');
    };

    // Backup before major operations
    window.addEventListener('beforeunload', () => {
      this.createEmergencyBackup();
    });
  }

  // Backup Management
  async createBackup(name, description = '') {
    if (this.isBackingUp) {
      throw new Error('Backup already in progress');
    }

    this.isBackingUp = true;
    const backupId = this.generateBackupId();
    
    try {
      const backup = {
        id: backupId,
        name: name || `Backup_${new Date().toISOString()}`,
        description,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        size: 0,
        compressed: this.compressionEnabled,
        data: await this.collectBackupData(),
        metadata: this.collectBackupMetadata(),
        checksum: null
      };

      // Compress if enabled
      if (this.compressionEnabled) {
        backup.data = await this.compressData(backup.data);
      }

      // Calculate checksum
      backup.checksum = await this.calculateChecksum(backup.data);
      backup.size = backup.data.length;

      // Store backup
      await this.storeBackup(backup);
      this.backups.set(backupId, backup);

      this.notifyBackupEvent('backup_created', backup);
      return backup;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    } finally {
      this.isBackingUp = false;
    }
  }

  async createAutoBackup() {
    try {
      const backup = await this.createBackup(
        `Auto_Backup_${new Date().toISOString().slice(0, 19)}`,
        'Automatic backup created by system'
      );
      
      // Clean up old auto backups (keep last 10)
      this.cleanupOldAutoBackups();
      
      return backup;
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  async createEmergencyBackup() {
    try {
      const backup = await this.createBackup(
        `Emergency_Backup_${new Date().toISOString().slice(0, 19)}`,
        'Emergency backup created before page unload'
      );
      return backup;
    } catch (error) {
      console.error('Emergency backup failed:', error);
    }
  }

  async collectBackupData() {
    const data = {
      qListData: this.qListManager.exportCueList(),
      showData: this.showManager.getCurrentShowState(),
      userSettings: this.getUserSettings(),
      patchData: this.getPatchData(),
      fixtureData: this.getFixtureData(),
      sceneData: this.getSceneData(),
      macroData: this.getMacroData(),
      timestamp: Date.now(),
      version: '1.0'
    };

    return JSON.stringify(data);
  }

  collectBackupMetadata() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio
    };
  }

  // Restore Management
  async restoreBackup(backupId, options = {}) {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    try {
      let data = backup.data;

      // Decompress if needed
      if (backup.compressed) {
        data = await this.decompressData(data);
      }

      const backupData = JSON.parse(data);

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(backup.data);
      if (currentChecksum !== backup.checksum) {
        throw new Error('Backup data corrupted');
      }

      // Restore data based on options
      if (options.restoreQList !== false) {
        this.qListManager.importCueList(backupData.qListData);
      }

      if (options.restoreShow !== false) {
        this.showManager.loadShow(backupData.showData);
      }

      if (options.restoreSettings !== false) {
        this.restoreUserSettings(backupData.userSettings);
      }

      if (options.restorePatch !== false) {
        this.restorePatchData(backupData.patchData);
      }

      if (options.restoreFixtures !== false) {
        this.restoreFixtureData(backupData.fixtureData);
      }

      if (options.restoreScenes !== false) {
        this.restoreSceneData(backupData.sceneData);
      }

      if (options.restoreMacros !== false) {
        this.restoreMacroData(backupData.macroData);
      }

      this.notifyBackupEvent('backup_restored', { backup, options });
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  // Sync Management
  async startSyncSession(remoteUrl, credentials = {}) {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const sessionId = this.generateSessionId();

    try {
      const session = {
        id: sessionId,
        remoteUrl,
        credentials,
        startTime: Date.now(),
        lastSync: null,
        status: 'connecting',
        conflicts: [],
        isActive: true
      };

      // Test connection
      await this.testConnection(remoteUrl, credentials);
      session.status = 'connected';

      this.syncSessions.set(sessionId, session);
      this.notifySyncEvent('sync_started', session);

      // Start periodic sync
      this.syncInterval = setInterval(() => {
        this.performSync(sessionId);
      }, 30000); // Sync every 30 seconds

      return session;
    } catch (error) {
      this.isSyncing = false;
      throw error;
    }
  }

  async performSync(sessionId) {
    const session = this.syncSessions.get(sessionId);
    if (!session || !session.isActive) return;

    try {
      session.status = 'syncing';

      // Get remote state
      const remoteState = await this.getRemoteState(session.remoteUrl, session.credentials);
      
      // Get local state
      const localState = await this.collectBackupData();
      
      // Compare states
      const differences = this.compareStates(localState, remoteState);
      
      if (differences.hasChanges) {
        // Resolve conflicts
        const resolvedChanges = await this.resolveConflicts(differences, session);
        
        // Apply changes
        await this.applySyncChanges(resolvedChanges, session);
        
        // Update remote
        await this.updateRemoteState(session.remoteUrl, session.credentials, localState);
      }

      session.lastSync = Date.now();
      session.status = 'idle';
      
      this.notifySyncEvent('sync_completed', session);
    } catch (error) {
      session.status = 'error';
      session.lastError = error.message;
      this.notifySyncEvent('sync_error', { session, error });
    }
  }

  async stopSyncSession(sessionId) {
    const session = this.syncSessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;
    session.status = 'stopped';

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isSyncing = false;
    this.notifySyncEvent('sync_stopped', session);
    return true;
  }

  // Conflict Resolution
  async resolveConflicts(differences, session) {
    const resolvedChanges = {
      local: [],
      remote: [],
      merged: []
    };

    for (const conflict of differences.conflicts) {
      const resolution = await this.resolveConflict(conflict, session);
      
      switch (resolution.action) {
        case 'use_local':
          resolvedChanges.local.push(conflict);
          break;
        case 'use_remote':
          resolvedChanges.remote.push(conflict);
          break;
        case 'merge':
          resolvedChanges.merged.push(resolution.merged);
          break;
        case 'skip':
          // Skip this conflict
          break;
      }
    }

    return resolvedChanges;
  }

  async resolveConflict(conflict, session) {
    // Default conflict resolution strategy
    if (conflict.type === 'cue_list') {
      // For cue lists, prefer the most recent
      if (conflict.localTimestamp > conflict.remoteTimestamp) {
        return { action: 'use_local' };
      } else {
        return { action: 'use_remote' };
      }
    } else if (conflict.type === 'settings') {
      // For settings, merge non-conflicting properties
      return {
        action: 'merge',
        merged: this.mergeSettings(conflict.local, conflict.remote)
      };
    }

    // Default to using local
    return { action: 'use_local' };
  }

  // Data Compression
  async compressData(data) {
    if (!this.compressionEnabled) return data;

    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(data));
      writer.close();

      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  async decompressData(compressedData) {
    try {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(compressedData);
      writer.close();

      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      
      for (const chunk of chunks) {
        decompressed.set(chunk, offset);
        offset += chunk.length;
      }

      return new TextDecoder().decode(decompressed);
    } catch (error) {
      console.error('Decompression failed:', error);
      throw error;
    }
  }

  // Utility Functions
  async calculateChecksum(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async storeBackup(backup) {
    const key = `backup_${backup.id}`;
    await this.setStorageItem(key, backup);
  }

  async loadExistingBackups() {
    try {
      const keys = await this.getStorageKeys();
      const backupKeys = keys.filter(key => key.startsWith('backup_'));
      
      for (const key of backupKeys) {
        const backup = await this.getStorageItem(key);
        if (backup) {
          this.backups.set(backup.id, backup);
        }
      }
    } catch (error) {
      console.error('Failed to load existing backups:', error);
    }
  }

  cleanupOldAutoBackups() {
    const autoBackups = Array.from(this.backups.values())
      .filter(backup => backup.name.startsWith('Auto_Backup_'))
      .sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the last 10 auto backups
    const toDelete = autoBackups.slice(10);
    
    for (const backup of toDelete) {
      this.deleteBackup(backup.id);
    }
  }

  async deleteBackup(backupId) {
    const backup = this.backups.get(backupId);
    if (!backup) return false;

    try {
      await this.removeStorageItem(`backup_${backupId}`);
      this.backups.delete(backupId);
      this.notifyBackupEvent('backup_deleted', backup);
      return true;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return false;
    }
  }

  generateBackupId() {
    return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Storage Helpers
  async setStorageItem(key, value) {
    if (typeof Storage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async getStorageItem(key) {
    if (typeof Storage !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    }
    return null;
  }

  async removeStorageItem(key) {
    if (typeof Storage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  async getStorageKeys() {
    if (typeof Storage !== 'undefined') {
      return Object.keys(localStorage);
    }
    return [];
  }

  // Event Notifications
  notifyBackupEvent(eventType, data) {
    const event = new CustomEvent('backup-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  notifySyncEvent(eventType, data) {
    const event = new CustomEvent('sync-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.backups.clear();
    this.syncSessions.clear();
    this.isBackingUp = false;
    this.isSyncing = false;
  }
}

// Global Backup Sync System Instance
const backupSyncSystem = new BackupSyncSystem(qListManager, showManager, collaborationEngine);
