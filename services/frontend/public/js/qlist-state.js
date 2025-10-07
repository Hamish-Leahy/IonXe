// Q List State Management
// Handles state updates, tracking, and synchronization

class QListStateManager {
  constructor(qListManager) {
    this.qListManager = qListManager;
    this.stateHistory = [];
    this.maxHistorySize = 100;
    this.stateListeners = new Set();
    this.syncInterval = null;
    this.isOnline = true;
    
    // State tracking
    this.lastSyncTime = null;
    this.pendingChanges = new Set();
    this.conflictResolution = 'server'; // 'server', 'client', 'manual'
    
    this.initializeStateTracking();
  }

  // State Tracking
  initializeStateTracking() {
    // Track cue changes
    this.qListManager.onCueChanged = (cue) => {
      this.trackStateChange('cue_changed', { cueId: cue.id, cueNumber: cue.number });
    };

    this.qListManager.onPlaybackStateChanged = (state) => {
      this.trackStateChange('playback_changed', state);
    };

    this.qListManager.onCueListUpdated = (cues) => {
      this.trackStateChange('cue_list_updated', { cueCount: cues.length });
    };

    // Start periodic sync
    this.startPeriodicSync();
  }

  trackStateChange(type, data) {
    const stateChange = {
      id: this.generateStateId(),
      type,
      data,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    this.stateHistory.push(stateChange);
    this.pendingChanges.add(stateChange.id);

    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    // Notify listeners
    this.notifyStateListeners(stateChange);

    // Auto-sync if online
    if (this.isOnline) {
      this.syncStateChange(stateChange);
    }
  }

  // State Synchronization
  startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.pendingChanges.size > 0) {
        this.syncPendingChanges();
      }
    }, 5000); // Sync every 5 seconds
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncStateChange(stateChange) {
    try {
      const response = await apiFetch('/api/v1/qlist/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(stateChange)
      });

      if (response.ok) {
        this.pendingChanges.delete(stateChange.id);
        this.lastSyncTime = Date.now();
      }
    } catch (error) {
      console.error('Failed to sync state change:', error);
      this.isOnline = false;
    }
  }

  async syncPendingChanges() {
    const changes = Array.from(this.pendingChanges).map(id => 
      this.stateHistory.find(change => change.id === id)
    ).filter(Boolean);

    if (changes.length === 0) return;

    try {
      const response = await apiFetch('/api/v1/qlist/state/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ changes })
      });

      if (response.ok) {
        changes.forEach(change => this.pendingChanges.delete(change.id));
        this.lastSyncTime = Date.now();
        this.isOnline = true;
      }
    } catch (error) {
      console.error('Failed to sync pending changes:', error);
      this.isOnline = false;
    }
  }

  // State Recovery
  async loadStateFromServer() {
    try {
      const response = await apiFetch('/api/v1/qlist/state');
      const serverState = await response.json();
      
      if (serverState && serverState.cues) {
        this.qListManager.cues = serverState.cues;
        this.qListManager.currentCueIndex = serverState.currentCueIndex || -1;
        this.qListManager.isPlaying = serverState.isPlaying || false;
        this.qListManager.isPaused = serverState.isPaused || false;
        
        this.qListManager.notifyCueListUpdated();
        this.qListManager.notifyPlaybackStateChanged();
        
        return true;
      }
    } catch (error) {
      console.error('Failed to load state from server:', error);
    }
    return false;
  }

  async saveStateToServer() {
    try {
      const state = {
        cues: this.qListManager.cues,
        currentCueIndex: this.qListManager.currentCueIndex,
        isPlaying: this.qListManager.isPlaying,
        isPaused: this.qListManager.isPaused,
        cueListName: this.qListManager.cueListName,
        lastSaved: new Date().toISOString()
      };

      const response = await apiFetch('/api/v1/qlist/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state)
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to save state to server:', error);
      return false;
    }
  }

  // Conflict Resolution
  resolveConflict(localChange, serverChange) {
    switch (this.conflictResolution) {
      case 'server':
        return serverChange;
      case 'client':
        return localChange;
      case 'manual':
        return this.promptConflictResolution(localChange, serverChange);
      default:
        return serverChange;
    }
  }

  promptConflictResolution(localChange, serverChange) {
    // In a real implementation, this would show a UI dialog
    console.log('Conflict detected:', { localChange, serverChange });
    return serverChange; // Default to server for now
  }

  // State Listeners
  addStateListener(callback) {
    this.stateListeners.add(callback);
  }

  removeStateListener(callback) {
    this.stateListeners.delete(callback);
  }

  notifyStateListeners(stateChange) {
    this.stateListeners.forEach(callback => {
      try {
        callback(stateChange);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  // State Queries
  getStateHistory(type = null, limit = 50) {
    let history = this.stateHistory;
    
    if (type) {
      history = history.filter(change => change.type === type);
    }
    
    return history.slice(-limit);
  }

  getCueState(cueId) {
    const cue = this.qListManager.cues.find(c => c.id === cueId);
    return cue ? cue.state : null;
  }

  getPlaybackState() {
    return {
      isPlaying: this.qListManager.isPlaying,
      isPaused: this.qListManager.isPaused,
      currentCueIndex: this.qListManager.currentCueIndex,
      currentCue: this.qListManager.getCurrentCue(),
      totalCues: this.qListManager.cues.length
    };
  }

  getSystemState() {
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: this.pendingChanges.size,
      stateHistorySize: this.stateHistory.length,
      conflictResolution: this.conflictResolution
    };
  }

  // State Validation
  validateCueState(cue) {
    const errors = [];
    
    if (!cue.id) errors.push('Missing cue ID');
    if (!cue.number || cue.number < 1) errors.push('Invalid cue number');
    if (!cue.levels || cue.levels.length !== 512) errors.push('Invalid levels array');
    if (cue.timing.fadeIn < 0) errors.push('Invalid fade in time');
    if (cue.timing.fadeOut < 0) errors.push('Invalid fade out time');
    if (cue.timing.delay < 0) errors.push('Invalid delay time');
    if (cue.timing.follow < 0) errors.push('Invalid follow time');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateCueList() {
    const errors = [];
    const warnings = [];
    
    // Check for duplicate cue numbers
    const cueNumbers = this.qListManager.cues.map(c => c.number);
    const duplicates = cueNumbers.filter((num, index) => cueNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate cue numbers: ${duplicates.join(', ')}`);
    }
    
    // Check for gaps in cue numbers
    const sortedNumbers = [...cueNumbers].sort((a, b) => a - b);
    for (let i = 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] - sortedNumbers[i-1] > 1) {
        warnings.push(`Gap in cue numbers: ${sortedNumbers[i-1]} to ${sortedNumbers[i]}`);
      }
    }
    
    // Validate each cue
    this.qListManager.cues.forEach(cue => {
      const validation = this.validateCueState(cue);
      if (!validation.isValid) {
        errors.push(`Cue ${cue.number}: ${validation.errors.join(', ')}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Utility Functions
  generateStateId() {
    return 'state_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getCurrentUserId() {
    // In a real implementation, this would get the current user ID
    return 'user_' + (localStorage.getItem('user_id') || 'anonymous');
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('qlist_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('qlist_session_id', sessionId);
    }
    return sessionId;
  }

  // Cleanup
  destroy() {
    this.stopPeriodicSync();
    this.stateListeners.clear();
    this.stateHistory = [];
    this.pendingChanges.clear();
  }
}

// Global State Manager Instance
const qListStateManager = new QListStateManager(qListManager);
