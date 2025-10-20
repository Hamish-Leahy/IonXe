// Show File Manager
// Comprehensive show file management and organization

class ShowFileManager {
  constructor(qListManager, fixtureManager, effectsEngine) {
    this.qListManager = qListManager;
    this.fixtureManager = fixtureManager;
    this.effectsEngine = effectsEngine;
    this.shows = new Map();
    this.currentShow = null;
    this.showTemplates = new Map();
    this.showHistory = [];
    this.autoSaveInterval = null;
    this.isAutoSaving = false;
    this.showVersion = '1.0.0';
    this.compressionEnabled = true;
    
    this.initializeShowManager();
  }

  // Manager Initialization
  initializeShowManager() {
    this.setupAutoSave();
    this.setupEventListeners();
    this.loadShowTemplates();
    this.loadRecentShows();
  }

  setupAutoSave() {
    // Auto save every 2 minutes
    this.autoSaveInterval = setInterval(() => {
      if (this.currentShow && !this.isAutoSaving) {
        this.autoSaveShow();
      }
    }, 2 * 60 * 1000);
  }

  setupEventListeners() {
    // Listen for changes to trigger auto-save
    this.qListManager.onCueListUpdated = () => {
      if (this.currentShow) {
        this.currentShow.lastModified = Date.now();
        this.currentShow.hasUnsavedChanges = true;
      }
    };

    // Save before page unload
    window.addEventListener('beforeunload', () => {
      if (this.currentShow && this.currentShow.hasUnsavedChanges) {
        this.saveShow(this.currentShow.id);
      }
    });
  }

  // Show Management
  createShow(showData) {
    const show = {
      id: showData.id || this.generateShowId(),
      name: showData.name || 'Untitled Show',
      description: showData.description || '',
      version: showData.version || this.showVersion,
      createdAt: new Date().toISOString(),
      lastModified: Date.now(),
      lastSaved: null,
      hasUnsavedChanges: false,
      author: showData.author || 'Unknown',
      venue: showData.venue || null,
      date: showData.date || null,
      notes: showData.notes || '',
      tags: showData.tags || [],
      thumbnail: showData.thumbnail || null,
      size: 0,
      compressed: this.compressionEnabled,
      data: {
        qListData: null,
        fixtureData: null,
        patchData: null,
        sceneData: null,
        macroData: null,
        effectData: null,
        automationData: null,
        settingsData: null,
        metadata: {
          createdWith: 'IonXe',
          createdVersion: this.showVersion,
          lastBackup: null,
          checksum: null
        }
      }
    };

    this.shows.set(show.id, show);
    this.notifyShowEvent('show_created', show);
    return show;
  }

  async saveShow(showId, options = {}) {
    const show = this.shows.get(showId);
    if (!show) return false;

    this.isAutoSaving = true;
    
    try {
      // Collect current show data
      show.data.qListData = this.qListManager.exportCueList();
      show.data.fixtureData = this.fixtureManager.getAllFixtures();
      show.data.patchData = this.getPatchData();
      show.data.sceneData = this.getSceneData();
      show.data.macroData = this.getMacroData();
      show.data.effectData = this.effectsEngine.getAllEffects();
      show.data.automationData = this.getAutomationData();
      show.data.settingsData = this.getSettingsData();

      // Calculate checksum
      const showString = JSON.stringify(show.data);
      show.data.metadata.checksum = await this.calculateChecksum(showString);

      // Compress if enabled
      if (this.compressionEnabled) {
        show.data = await this.compressShowData(show.data);
        show.compressed = true;
      }

      // Calculate size
      show.size = JSON.stringify(show.data).length;
      show.lastSaved = Date.now();
      show.hasUnsavedChanges = false;

      // Store show
      await this.storeShow(show);
      
      // Add to history
      this.addToHistory(show);
      
      this.notifyShowEvent('show_saved', show);
      return true;
    } catch (error) {
      console.error('Failed to save show:', error);
      return false;
    } finally {
      this.isAutoSaving = false;
    }
  }

  async loadShow(showId, options = {}) {
    const show = this.shows.get(showId);
    if (!show) return false;

    try {
      // Decompress if needed
      let showData = show.data;
      if (show.compressed) {
        showData = await this.decompressShowData(show.data);
      }

      // Verify checksum
      const showString = JSON.stringify(showData);
      const currentChecksum = await this.calculateChecksum(showString);
      if (currentChecksum !== show.data.metadata.checksum) {
        console.warn('Show data checksum mismatch');
      }

      // Load data based on options
      if (options.loadQList !== false && showData.qListData) {
        this.qListManager.importCueList(showData.qListData);
      }

      if (options.loadFixtures !== false && showData.fixtureData) {
        this.loadFixtureData(showData.fixtureData);
      }

      if (options.loadPatch !== false && showData.patchData) {
        this.loadPatchData(showData.patchData);
      }

      if (options.loadScenes !== false && showData.sceneData) {
        this.loadSceneData(showData.sceneData);
      }

      if (options.loadMacros !== false && showData.macroData) {
        this.loadMacroData(showData.macroData);
      }

      if (options.loadEffects !== false && showData.effectData) {
        this.loadEffectData(showData.effectData);
      }

      if (options.loadAutomation !== false && showData.automationData) {
        this.loadAutomationData(showData.automationData);
      }

      if (options.loadSettings !== false && showData.settingsData) {
        this.loadSettingsData(showData.settingsData);
      }

      this.currentShow = show;
      this.notifyShowEvent('show_loaded', show);
      return true;
    } catch (error) {
      console.error('Failed to load show:', error);
      return false;
    }
  }

  async autoSaveShow() {
    if (this.currentShow) {
      await this.saveShow(this.currentShow.id, { isAutoSave: true });
    }
  }

  // Show Templates
  createShowTemplate(templateData) {
    const template = {
      id: templateData.id || this.generateTemplateId(),
      name: templateData.name,
      description: templateData.description || '',
      category: templateData.category || 'general',
      data: templateData.data,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    this.showTemplates.set(template.id, template);
    return template;
  }

  createShowFromTemplate(templateId, showData) {
    const template = this.showTemplates.get(templateId);
    if (!template) return null;

    template.usageCount++;

    const show = this.createShow({
      ...showData,
      name: showData.name || `${template.name} - ${new Date().toLocaleDateString()}`
    });

    // Apply template data
    if (template.data) {
      Object.assign(show.data, template.data);
    }

    return show;
  }

  // Show Organization
  organizeShowsByCategory() {
    const categories = new Map();
    
    for (const show of this.shows.values()) {
      const category = show.category || 'uncategorized';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category).push(show);
    }
    
    return categories;
  }

  searchShows(query, filters = {}) {
    const results = [];
    
    for (const show of this.shows.values()) {
      if (this.matchesShowQuery(show, query) && this.matchesShowFilters(show, filters)) {
        results.push(show);
      }
    }
    
    return results.sort((a, b) => b.lastModified - a.lastModified);
  }

  matchesShowQuery(show, query) {
    if (!query) return true;
    
    const searchText = query.toLowerCase();
    return show.name.toLowerCase().includes(searchText) ||
           show.description.toLowerCase().includes(searchText) ||
           show.author.toLowerCase().includes(searchText) ||
           show.venue?.toLowerCase().includes(searchText) ||
           show.tags.some(tag => tag.toLowerCase().includes(searchText));
  }

  matchesShowFilters(show, filters) {
    if (filters.category && show.category !== filters.category) return false;
    if (filters.author && show.author !== filters.author) return false;
    if (filters.venue && show.venue !== filters.venue) return false;
    if (filters.dateFrom && new Date(show.date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(show.date) > new Date(filters.dateTo)) return false;
    if (filters.hasUnsavedChanges && !show.hasUnsavedChanges) return false;
    if (filters.tags && !filters.tags.every(tag => show.tags.includes(tag))) return false;
    
    return true;
  }

  // Show History
  addToHistory(show) {
    const historyEntry = {
      showId: show.id,
      action: 'saved',
      timestamp: Date.now(),
      size: show.size
    };

    this.showHistory.unshift(historyEntry);
    
    // Keep only last 50 entries
    if (this.showHistory.length > 50) {
      this.showHistory = this.showHistory.slice(0, 50);
    }
  }

  getShowHistory(showId = null) {
    if (showId) {
      return this.showHistory.filter(entry => entry.showId === showId);
    }
    return this.showHistory;
  }

  // Show Backup and Restore
  async createShowBackup(showId) {
    const show = this.shows.get(showId);
    if (!show) return null;

    const backup = {
      id: this.generateBackupId(),
      showId: showId,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(show.data)), // Deep copy
      size: show.size,
      description: `Backup of ${show.name}`
    };

    await this.storeBackup(backup);
    return backup;
  }

  async restoreShowFromBackup(backupId, showId = null) {
    const backup = await this.getBackup(backupId);
    if (!backup) return false;

    const targetShowId = showId || backup.showId;
    const show = this.shows.get(targetShowId);
    if (!show) return false;

    // Create backup of current show
    await this.createShowBackup(targetShowId);

    // Restore from backup
    show.data = JSON.parse(JSON.stringify(backup.data));
    show.lastModified = Date.now();
    show.hasUnsavedChanges = true;

    this.notifyShowEvent('show_restored', { show, backup });
    return true;
  }

  // Show Import/Export
  async exportShow(showId, format = 'json') {
    const show = this.shows.get(showId);
    if (!show) return null;

    switch (format) {
      case 'json':
        return JSON.stringify(show, null, 2);
      case 'compressed':
        return await this.compressShowData(show);
      case 'legacy':
        return this.convertToLegacyFormat(show);
      default:
        return JSON.stringify(show, null, 2);
    }
  }

  async importShow(showData, format = 'json') {
    try {
      let show;
      
      switch (format) {
        case 'json':
          show = JSON.parse(showData);
          break;
        case 'compressed':
          show = await this.decompressShowData(showData);
          break;
        case 'legacy':
          show = this.convertFromLegacyFormat(showData);
          break;
        default:
          show = JSON.parse(showData);
      }

      // Validate show data
      if (!this.validateShowData(show)) {
        throw new Error('Invalid show data');
      }

      // Create new show
      const newShow = this.createShow(show);
      await this.saveShow(newShow.id);
      
      return newShow;
    } catch (error) {
      console.error('Failed to import show:', error);
      return null;
    }
  }

  // Show Validation
  validateShowData(showData) {
    const requiredFields = ['name', 'data'];
    
    for (const field of requiredFields) {
      if (!showData.hasOwnProperty(field)) {
        return false;
      }
    }

    // Validate data structure
    if (!showData.data || typeof showData.data !== 'object') {
      return false;
    }

    return true;
  }

  // Data Compression
  async compressShowData(data) {
    if (!this.compressionEnabled) return data;

    try {
      const jsonString = JSON.stringify(data);
      const compressed = await this.compressString(jsonString);
      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  async decompressShowData(compressedData) {
    try {
      const jsonString = await this.decompressString(compressedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decompression failed:', error);
      throw error;
    }
  }

  async compressString(str) {
    // Simple compression using built-in compression
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    // This would use actual compression in a real implementation
    return btoa(String.fromCharCode(...data));
  }

  async decompressString(compressedStr) {
    // Simple decompression
    const binaryString = atob(compressedStr);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  // Utility Functions
  generateShowId() {
    return 'show_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateTemplateId() {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateBackupId() {
    return 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async calculateChecksum(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  getCurrentShow() {
    return this.currentShow;
  }

  getAllShows() {
    return Array.from(this.shows.values());
  }

  getShowStats() {
    const shows = this.getAllShows();
    const totalSize = shows.reduce((sum, show) => sum + show.size, 0);
    const unsavedCount = shows.filter(show => show.hasUnsavedChanges).length;
    
    return {
      totalShows: shows.length,
      totalSize,
      unsavedCount,
      lastModified: Math.max(...shows.map(show => show.lastModified)),
      averageSize: shows.length > 0 ? totalSize / shows.length : 0
    };
  }

  // Event Notifications
  notifyShowEvent(eventType, data) {
    const event = new CustomEvent('show-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.shows.clear();
    this.showTemplates.clear();
    this.showHistory = [];
    this.currentShow = null;
  }
}

// Global Show File Manager Instance
const showFileManager = new ShowFileManager(qListManager, fixtureManager, effectsEngine);
