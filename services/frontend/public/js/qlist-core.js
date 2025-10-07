// Q List Core Functionality
// Manages cue lists, cue execution, and basic operations

class QListManager {
  constructor() {
    this.cues = [];
    this.currentCueIndex = -1;
    this.isPlaying = false;
    this.isPaused = false;
    this.playbackSpeed = 1.0;
    this.loopMode = false;
    this.cueListName = 'Untitled Cue List';
    this.lastUpdateTime = 0;
    
    // Event callbacks
    this.onCueChanged = null;
    this.onPlaybackStateChanged = null;
    this.onCueListUpdated = null;
  }

  // Cue Management
  addCue(cueData) {
    const cue = {
      id: this.generateCueId(),
      number: this.getNextCueNumber(),
      label: cueData.label || '',
      description: cueData.description || '',
      levels: cueData.levels || new Uint8Array(512),
      timing: {
        fadeIn: cueData.fadeIn || 0,
        fadeOut: cueData.fadeOut || 0,
        delay: cueData.delay || 0,
        follow: cueData.follow || 0
      },
      state: {
        isActive: false,
        isExecuted: false,
        executionTime: null,
        progress: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.cues.push(cue);
    this.sortCuesByNumber();
    this.notifyCueListUpdated();
    return cue;
  }

  updateCue(cueId, updates) {
    const cue = this.cues.find(c => c.id === cueId);
    if (!cue) return false;
    
    Object.assign(cue, updates);
    cue.updatedAt = new Date().toISOString();
    this.notifyCueListUpdated();
    return true;
  }

  deleteCue(cueId) {
    const index = this.cues.findIndex(c => c.id === cueId);
    if (index === -1) return false;
    
    this.cues.splice(index, 1);
    
    // Adjust current cue index if needed
    if (this.currentCueIndex >= index) {
      this.currentCueIndex = Math.max(0, this.currentCueIndex - 1);
    }
    
    this.notifyCueListUpdated();
    return true;
  }

  duplicateCue(cueId) {
    const originalCue = this.cues.find(c => c.id === cueId);
    if (!originalCue) return null;
    
    const duplicatedCue = {
      ...originalCue,
      id: this.generateCueId(),
      number: this.getNextCueNumber(),
      label: originalCue.label + ' (Copy)',
      state: {
        isActive: false,
        isExecuted: false,
        executionTime: null,
        progress: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.cues.push(duplicatedCue);
    this.sortCuesByNumber();
    this.notifyCueListUpdated();
    return duplicatedCue;
  }

  // Cue Execution
  goToCue(cueNumber) {
    const cue = this.cues.find(c => c.number === cueNumber);
    if (!cue) return false;
    
    const index = this.cues.indexOf(cue);
    this.currentCueIndex = index;
    this.executeCue(cue);
    return true;
  }

  nextCue() {
    if (this.currentCueIndex < this.cues.length - 1) {
      this.currentCueIndex++;
      this.executeCue(this.cues[this.currentCueIndex]);
      return true;
    }
    return false;
  }

  previousCue() {
    if (this.currentCueIndex > 0) {
      this.currentCueIndex--;
      this.executeCue(this.cues[this.currentCueIndex]);
      return true;
    }
    return false;
  }

  async executeCue(cue) {
    if (!cue) return;
    
    // Update cue state
    cue.state.isActive = true;
    cue.state.executionTime = Date.now();
    cue.state.progress = 0;
    
    this.notifyCueChanged(cue);
    
    // Apply levels with timing
    if (cue.timing.fadeIn > 0) {
      await this.fadeToLevels(cue.levels, cue.timing.fadeIn);
    } else {
      await this.setLevels(cue.levels);
    }
    
    // Handle follow timing
    if (cue.timing.follow > 0) {
      setTimeout(() => {
        this.nextCue();
      }, cue.timing.follow);
    }
    
    // Mark as executed
    cue.state.isExecuted = true;
    cue.state.progress = 100;
    this.notifyCueChanged(cue);
  }

  // Playback Control
  play() {
    if (this.isPaused) {
      this.isPaused = false;
      this.isPlaying = true;
    } else if (this.currentCueIndex === -1) {
      this.nextCue();
      this.isPlaying = true;
    }
    this.notifyPlaybackStateChanged();
  }

  pause() {
    this.isPaused = true;
    this.isPlaying = false;
    this.notifyPlaybackStateChanged();
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentCueIndex = -1;
    this.notifyPlaybackStateChanged();
  }

  // Level Control
  async setLevels(levels) {
    try {
      await apiFetch('/api/v1/dimmers/levels', {
        method: 'PUT',
        body: levels
      });
    } catch (error) {
      console.error('Failed to set levels:', error);
    }
  }

  async fadeToLevels(targetLevels, fadeTime) {
    const startTime = Date.now();
    const startLevels = new Uint8Array(512);
    
    // Get current levels
    try {
      const response = await apiFetch('/api/v1/dimmers/frame');
      const currentLevels = new Uint8Array(await response.arrayBuffer());
      startLevels.set(currentLevels);
    } catch (error) {
      console.error('Failed to get current levels:', error);
      return;
    }
    
    return new Promise((resolve) => {
      const fadeStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fadeTime, 1);
        
        const levels = new Uint8Array(512);
        for (let i = 0; i < 512; i++) {
          const start = startLevels[i];
          const target = targetLevels[i];
          levels[i] = Math.round(start + (target - start) * progress);
        }
        
        this.setLevels(levels);
        
        if (progress < 1) {
          requestAnimationFrame(fadeStep);
        } else {
          resolve();
        }
      };
      
      fadeStep();
    });
  }

  // Utility Functions
  generateCueId() {
    return 'cue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getNextCueNumber() {
    if (this.cues.length === 0) return 1;
    const maxNumber = Math.max(...this.cues.map(c => c.number));
    return maxNumber + 1;
  }

  sortCuesByNumber() {
    this.cues.sort((a, b) => a.number - b.number);
  }

  getCurrentCue() {
    return this.cues[this.currentCueIndex] || null;
  }

  getCueByNumber(number) {
    return this.cues.find(c => c.number === number);
  }

  // Event Notifications
  notifyCueChanged(cue) {
    if (this.onCueChanged) {
      this.onCueChanged(cue);
    }
  }

  notifyPlaybackStateChanged() {
    if (this.onPlaybackStateChanged) {
      this.onPlaybackStateChanged({
        isPlaying: this.isPlaying,
        isPaused: this.isPaused,
        currentCueIndex: this.currentCueIndex,
        currentCue: this.getCurrentCue()
      });
    }
  }

  notifyCueListUpdated() {
    if (this.onCueListUpdated) {
      this.onCueListUpdated(this.cues);
    }
  }

  // Import/Export
  exportCueList() {
    return {
      name: this.cueListName,
      cues: this.cues,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  importCueList(data) {
    if (data.cues && Array.isArray(data.cues)) {
      this.cues = data.cues;
      this.cueListName = data.name || 'Imported Cue List';
      this.currentCueIndex = -1;
      this.notifyCueListUpdated();
      return true;
    }
    return false;
  }
}

// Global Q List Manager Instance
const qListManager = new QListManager();
