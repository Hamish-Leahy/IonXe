// Real-Time Collaboration System
// Enables multiple users to work on the same show simultaneously

class CollaborationEngine {
  constructor(qListManager, showManager) {
    this.qListManager = qListManager;
    this.showManager = showManager;
    this.wsConnection = null;
    this.isConnected = false;
    this.users = new Map();
    this.currentUser = null;
    this.collaborationMode = false;
    this.locks = new Map();
    this.changeQueue = [];
    this.syncInterval = null;
    this.conflictResolver = null;
    
    this.initializeCollaboration();
  }

  // Connection Management
  async connectToCollaborationServer(serverUrl, userId, sessionId) {
    try {
      this.wsConnection = new WebSocket(`${serverUrl}/collaborate/${sessionId}`);
      
      this.wsConnection.onopen = () => {
        this.isConnected = true;
        this.currentUser = {
          id: userId,
          name: `User_${userId}`,
          color: this.generateUserColor(),
          lastSeen: Date.now(),
          isActive: true
        };
        
        this.sendMessage('user_join', {
          user: this.currentUser,
          sessionId: sessionId
        });
        
        this.startSyncInterval();
        this.notifyCollaborationStatus('connected');
      };

      this.wsConnection.onmessage = (event) => {
        this.handleCollaborationMessage(JSON.parse(event.data));
      };

      this.wsConnection.onclose = () => {
        this.isConnected = false;
        this.stopSyncInterval();
        this.notifyCollaborationStatus('disconnected');
      };

      this.wsConnection.onerror = (error) => {
        console.error('Collaboration WebSocket error:', error);
        this.notifyCollaborationStatus('error');
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      return false;
    }
  }

  // User Management
  handleUserJoin(userData) {
    this.users.set(userData.id, {
      ...userData,
      lastSeen: Date.now(),
      isActive: true
    });
    
    this.notifyUserEvent('user_joined', userData);
    this.updateUserList();
  }

  handleUserLeave(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.isActive = false;
      user.lastSeen = Date.now();
      
      // Release any locks held by this user
      this.releaseUserLocks(userId);
      
      this.notifyUserEvent('user_left', user);
      this.updateUserList();
    }
  }

  handleUserActivity(userId, activity) {
    const user = this.users.get(userId);
    if (user) {
      user.lastSeen = Date.now();
      user.currentActivity = activity;
      
      this.notifyUserEvent('user_activity', { user, activity });
    }
  }

  // Lock Management
  requestLock(resourceType, resourceId, userId = this.currentUser.id) {
    const lockKey = `${resourceType}:${resourceId}`;
    
    if (this.locks.has(lockKey)) {
      const existingLock = this.locks.get(lockKey);
      if (existingLock.userId !== userId) {
        return {
          success: false,
          reason: 'already_locked',
          lockedBy: existingLock.user
        };
      }
    }

    const lock = {
      id: this.generateLockId(),
      resourceType,
      resourceId,
      userId,
      user: this.users.get(userId),
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };

    this.locks.set(lockKey, lock);
    
    this.sendMessage('lock_request', lock);
    this.notifyLockEvent('lock_acquired', lock);
    
    return { success: true, lock };
  }

  releaseLock(resourceType, resourceId, userId = this.currentUser.id) {
    const lockKey = `${resourceType}:${resourceId}`;
    const lock = this.locks.get(lockKey);
    
    if (lock && lock.userId === userId) {
      this.locks.delete(lockKey);
      this.sendMessage('lock_release', { resourceType, resourceId, userId });
      this.notifyLockEvent('lock_released', lock);
      return true;
    }
    
    return false;
  }

  releaseUserLocks(userId) {
    for (const [lockKey, lock] of this.locks) {
      if (lock.userId === userId) {
        this.locks.delete(lockKey);
      }
    }
  }

  // Change Synchronization
  queueChange(change) {
    const changeData = {
      id: this.generateChangeId(),
      userId: this.currentUser.id,
      user: this.currentUser,
      timestamp: Date.now(),
      ...change
    };

    this.changeQueue.push(changeData);
    
    // Send immediately for real-time sync
    this.sendMessage('change', changeData);
    
    return changeData.id;
  }

  applyChange(changeData) {
    // Skip changes from current user to avoid loops
    if (changeData.userId === this.currentUser.id) {
      return;
    }

    try {
      switch (changeData.type) {
        case 'cue_add':
          this.qListManager.addCue(changeData.cueData);
          break;
        case 'cue_update':
          this.qListManager.updateCue(changeData.cueId, changeData.updates);
          break;
        case 'cue_delete':
          this.qListManager.deleteCue(changeData.cueId);
          break;
        case 'cue_reorder':
          this.reorderCues(changeData.cueIds);
          break;
        case 'timing_update':
          this.updateCueTiming(changeData.cueId, changeData.timing);
          break;
        case 'show_save':
          this.showManager.saveShow(changeData.showData);
          break;
        default:
          console.warn('Unknown change type:', changeData.type);
      }

      this.notifyChangeEvent('change_applied', changeData);
    } catch (error) {
      console.error('Failed to apply change:', error);
      this.handleChangeConflict(changeData, error);
    }
  }

  // Conflict Resolution
  handleChangeConflict(changeData, error) {
    if (this.conflictResolver) {
      this.conflictResolver.resolveConflict(changeData, error);
    } else {
      // Default conflict resolution
      this.queueChange({
        type: 'conflict_notification',
        originalChange: changeData,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  setConflictResolver(resolver) {
    this.conflictResolver = resolver;
  }

  // Cursor and Selection Sharing
  shareCursor(position, element) {
    this.sendMessage('cursor_update', {
      userId: this.currentUser.id,
      position,
      element,
      timestamp: Date.now()
    });
  }

  shareSelection(selection) {
    this.sendMessage('selection_update', {
      userId: this.currentUser.id,
      selection,
      timestamp: Date.now()
    });
  }

  // Voice Chat Integration
  initializeVoiceChat() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Voice chat not supported');
      return false;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.audioStream = stream;
        this.sendMessage('voice_chat_ready', {
          userId: this.currentUser.id
        });
      })
      .catch(error => {
        console.error('Failed to initialize voice chat:', error);
      });
  }

  // Screen Sharing
  async startScreenShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      this.screenStream = stream;
      
      this.sendMessage('screen_share_start', {
        userId: this.currentUser.id,
        streamId: this.generateStreamId()
      });

      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return null;
    }
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      
      this.sendMessage('screen_share_stop', {
        userId: this.currentUser.id
      });
    }
  }

  // Message Handling
  handleCollaborationMessage(message) {
    switch (message.type) {
      case 'user_join':
        this.handleUserJoin(message.user);
        break;
      case 'user_leave':
        this.handleUserLeave(message.userId);
        break;
      case 'user_activity':
        this.handleUserActivity(message.userId, message.activity);
        break;
      case 'lock_request':
        this.handleLockRequest(message.lock);
        break;
      case 'lock_release':
        this.handleLockRelease(message);
        break;
      case 'change':
        this.applyChange(message);
        break;
      case 'cursor_update':
        this.handleCursorUpdate(message);
        break;
      case 'selection_update':
        this.handleSelectionUpdate(message);
        break;
      case 'voice_chat_ready':
        this.handleVoiceChatReady(message);
        break;
      case 'screen_share_start':
        this.handleScreenShareStart(message);
        break;
      case 'screen_share_stop':
        this.handleScreenShareStop(message);
        break;
      case 'sync_request':
        this.handleSyncRequest(message);
        break;
      case 'sync_response':
        this.handleSyncResponse(message);
        break;
      default:
        console.warn('Unknown collaboration message type:', message.type);
    }
  }

  // Sync Management
  startSyncInterval() {
    this.syncInterval = setInterval(() => {
      this.sendSyncData();
    }, 5000); // Sync every 5 seconds
  }

  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  sendSyncData() {
    if (!this.isConnected) return;

    const syncData = {
      userId: this.currentUser.id,
      timestamp: Date.now(),
      qListState: this.qListManager.exportCueList(),
      showState: this.showManager.getCurrentShowState(),
      userActivity: this.getCurrentUserActivity()
    };

    this.sendMessage('sync_data', syncData);
  }

  // Utility Functions
  sendMessage(type, data) {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      }));
    }
  }

  generateUserColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  generateLockId() {
    return 'lock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateChangeId() {
    return 'change_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateStreamId() {
    return 'stream_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getCurrentUserActivity() {
    return {
      currentCue: this.qListManager.currentCueIndex,
      isPlaying: this.qListManager.isPlaying,
      activeTab: this.getActiveTab(),
      cursorPosition: this.getCursorPosition()
    };
  }

  getActiveTab() {
    const activeTab = document.querySelector('.tab.active');
    return activeTab ? activeTab.id : null;
  }

  getCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        container: range.startContainer.nodeName
      };
    }
    return null;
  }

  // Event Notifications
  notifyCollaborationStatus(status) {
    const event = new CustomEvent('collaboration-status', {
      detail: { status, isConnected: this.isConnected }
    });
    document.dispatchEvent(event);
  }

  notifyUserEvent(eventType, userData) {
    const event = new CustomEvent('collaboration-user', {
      detail: { eventType, userData }
    });
    document.dispatchEvent(event);
  }

  notifyLockEvent(eventType, lockData) {
    const event = new CustomEvent('collaboration-lock', {
      detail: { eventType, lockData }
    });
    document.dispatchEvent(event);
  }

  notifyChangeEvent(eventType, changeData) {
    const event = new CustomEvent('collaboration-change', {
      detail: { eventType, changeData }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
    }
    
    this.stopSyncInterval();
    this.releaseUserLocks(this.currentUser?.id);
    this.users.clear();
    this.locks.clear();
    this.changeQueue = [];
  }

  destroy() {
    this.disconnect();
    this.currentUser = null;
    this.collaborationMode = false;
  }
}

// Global Collaboration Engine Instance
const collaborationEngine = new CollaborationEngine(qListManager, showManager);
