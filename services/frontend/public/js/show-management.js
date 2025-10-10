// Show Management - Comprehensive show file system
// Professional show file management with versioning and backup

class ShowManagement {
  constructor() {
    this.currentShow = null;
    this.showHistory = [];
    this.autoSaveInterval = null;
    this.autoSaveEnabled = true;
    this.showTemplates = new Map();
    this.showBackups = new Map();
    
    this.initializeShowSystem();
  }

  initializeShowSystem() {
    // Create default show template
    this.createDefaultTemplate();
    
    // Load show history from storage
    this.loadShowHistory();
    
    // Start auto-save
    this.startAutoSave();
  }

  createDefaultTemplate() {
    const template = {
      id: 'default-template',
      name: 'Default Show Template',
      description: 'Basic show template with standard setup',
      version: '1.0',
      created: new Date().toISOString(),
      data: {
        fixtures: [],
        scenes: [],
        qList: [],
        macros: [],
        colorPalettes: [],
        patch: {},
        settings: {
          masterBPM: 120,
          outputRate: 44,
          autoSave: true,
          networkEnabled: false
        }
      }
    };
    
    this.showTemplates.set(template.id, template);
  }

  // Show creation and management
  createNewShow(name, description = '', templateId = 'default-template') {
    const template = this.showTemplates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const show = {
      id: this.generateId(),
      name: name || 'Untitled Show',
      description,
      version: '1.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      template: templateId,
      data: this.deepClone(template.data),
      metadata: {
        author: 'IonXE User',
        venue: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      },
      fileSize: 0,
      checksum: ''
    };

    this.currentShow = show;
    this.updateShowChecksum();
    this.saveShowToStorage();
    this.addToShowHistory(show);
    
    return show;
  }

  loadShow(showId) {
    const show = this.getShowFromStorage(showId);
    if (show) {
      this.currentShow = show;
      this.currentShow.lastOpened = new Date().toISOString();
      this.updateShowChecksum();
      this.saveShowToStorage();
      this.addToShowHistory(show);
      this.loadShowData(show);
      return show;
    }
    return null;
  }

  saveCurrentShow() {
    if (!this.currentShow) return false;

    this.currentShow.modified = new Date().toISOString();
    this.currentShow.version = this.incrementVersion(this.currentShow.version);
    this.updateShowChecksum();
    this.saveShowToStorage();
    this.addToShowHistory(this.currentShow);
    
    return true;
  }

  saveShowAs(newName, newDescription = '') {
    if (!this.currentShow) return null;

    const newShow = {
      ...this.currentShow,
      id: this.generateId(),
      name: newName,
      description: newDescription,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      version: '1.0'
    };

    this.currentShow = newShow;
    this.updateShowChecksum();
    this.saveShowToStorage();
    this.addToShowHistory(newShow);
    
    return newShow;
  }

  closeCurrentShow() {
    if (this.currentShow) {
      this.saveCurrentShow();
      this.currentShow = null;
      this.clearShowData();
    }
  }

  deleteShow(showId) {
    // Remove from storage
    localStorage.removeItem(`ionxe-show-${showId}`);
    
    // Remove from history
    this.showHistory = this.showHistory.filter(show => show.id !== showId);
    this.saveShowHistory();
    
    // If it's the current show, close it
    if (this.currentShow && this.currentShow.id === showId) {
      this.closeCurrentShow();
    }
  }

  // Show data management
  loadShowData(show) {
    if (!show || !show.data) return;

    // Load fixtures
    if (show.data.fixtures && typeof fixtureCore !== 'undefined') {
      show.data.fixtures.forEach(fixture => {
        fixtureCore.addFixture(fixture);
      });
    }

    // Load scenes
    if (show.data.scenes && typeof scenes !== 'undefined') {
      show.data.scenes.forEach(scene => {
        scenes.set(scene.id, scene);
      });
    }

    // Load Q list
    if (show.data.qList && typeof qListManager !== 'undefined') {
      show.data.qList.forEach(cue => {
        qListManager.addCue(cue);
      });
    }

    // Load macros
    if (show.data.macros && typeof macros !== 'undefined') {
      show.data.macros.forEach(macro => {
        macros.set(macro.id, macro);
      });
    }

    // Load color palettes
    if (show.data.colorPalettes && typeof colorPalettes !== 'undefined') {
      show.data.colorPalettes.forEach(palette => {
        colorPalettes.addPalette(palette.name, palette.colors);
      });
    }

    // Load patch
    if (show.data.patch && typeof fixtureCore !== 'undefined') {
      Object.entries(show.data.patch).forEach(([address, data]) => {
        fixtureCore.setDMXValue(0, parseInt(address), data);
      });
    }

    // Load settings
    if (show.data.settings) {
      this.loadShowSettings(show.data.settings);
    }
  }

  saveShowData() {
    if (!this.currentShow) return;

    const showData = {
      fixtures: typeof fixtureCore !== 'undefined' ? fixtureCore.getAllFixtures() : [],
      scenes: typeof scenes !== 'undefined' ? Array.from(scenes.values()) : [],
      qList: typeof qListManager !== 'undefined' ? qListManager.cues : [],
      macros: typeof macros !== 'undefined' ? Array.from(macros.values()) : [],
      colorPalettes: typeof colorPalettes !== 'undefined' ? colorPalettes.getAllPalettes() : [],
      patch: this.getCurrentPatch(),
      settings: this.getCurrentSettings()
    };

    this.currentShow.data = showData;
  }

  getCurrentPatch() {
    const patch = {};
    if (typeof fixtureCore !== 'undefined') {
      const patchData = fixtureCore.getPatch();
      patchData.forEach(item => {
        patch[item.address] = item.value || 0;
      });
    }
    return patch;
  }

  getCurrentSettings() {
    return {
      masterBPM: typeof timingCore !== 'undefined' ? timingCore.getMasterBPM() : 120,
      outputRate: 44,
      autoSave: this.autoSaveEnabled,
      networkEnabled: typeof networkCore !== 'undefined' ? networkCore.isEnabled : false,
      artNetEnabled: typeof networkCore !== 'undefined' ? networkCore.artNet.enabled : false,
      sACNEnabled: typeof networkCore !== 'undefined' ? networkCore.sACN.enabled : false
    };
  }

  loadShowSettings(settings) {
    if (typeof timingCore !== 'undefined' && settings.masterBPM) {
      timingCore.setMasterBPM(settings.masterBPM);
    }

    if (typeof networkCore !== 'undefined') {
      if (settings.networkEnabled) {
        networkCore.enableNetworkOutput(true);
      }
      if (settings.artNetEnabled) {
        networkCore.enableArtNet(true);
      }
      if (settings.sACNEnabled) {
        networkCore.enableSACN(true);
      }
    }

    this.autoSaveEnabled = settings.autoSave !== false;
  }

  clearShowData() {
    // Clear all system data
    if (typeof fixtureCore !== 'undefined') {
      fixtureCore.fixtures.clear();
      fixtureCore.fixtureGroups.clear();
    }

    if (typeof scenes !== 'undefined') {
      scenes.clear();
    }

    if (typeof qListManager !== 'undefined') {
      qListManager.cues = [];
    }

    if (typeof macros !== 'undefined') {
      macros.clear();
    }

    if (typeof colorPalettes !== 'undefined') {
      colorPalettes.palettes.clear();
    }

    // Reset fader values
    if (typeof faderValues !== 'undefined') {
      faderValues.fill(0);
    }
  }

  // Show templates
  createTemplate(name, description, data) {
    const template = {
      id: this.generateId(),
      name,
      description,
      version: '1.0',
      created: new Date().toISOString(),
      data: this.deepClone(data)
    };

    this.showTemplates.set(template.id, template);
    this.saveTemplatesToStorage();
    return template;
  }

  getTemplate(id) {
    return this.showTemplates.get(id);
  }

  getAllTemplates() {
    return Array.from(this.showTemplates.values());
  }

  deleteTemplate(id) {
    this.showTemplates.delete(id);
    this.saveTemplatesToStorage();
  }

  // Show history and recent shows
  addToShowHistory(show) {
    // Remove if already exists
    this.showHistory = this.showHistory.filter(s => s.id !== show.id);
    
    // Add to beginning
    this.showHistory.unshift(show);
    
    // Keep only last 20 shows
    this.showHistory = this.showHistory.slice(0, 20);
    
    this.saveShowHistory();
  }

  getShowHistory() {
    return [...this.showHistory];
  }

  getRecentShows(limit = 10) {
    return this.showHistory.slice(0, limit);
  }

  // Show backup and restore
  createBackup(showId, description = '') {
    const show = this.getShowFromStorage(showId);
    if (!show) return null;

    const backup = {
      id: this.generateId(),
      showId,
      description: description || `Backup ${new Date().toLocaleString()}`,
      created: new Date().toISOString(),
      data: this.deepClone(show),
      size: JSON.stringify(show).length
    };

    this.showBackups.set(backup.id, backup);
    this.saveBackupsToStorage();
    return backup;
  }

  restoreFromBackup(backupId) {
    const backup = this.showBackups.get(backupId);
    if (!backup) return null;

    const show = backup.data;
    this.currentShow = show;
    this.saveShowToStorage();
    this.addToShowHistory(show);
    this.loadShowData(show);
    
    return show;
  }

  getBackups(showId = null) {
    if (showId) {
      return Array.from(this.showBackups.values()).filter(b => b.showId === showId);
    }
    return Array.from(this.showBackups.values());
  }

  deleteBackup(backupId) {
    this.showBackups.delete(backupId);
    this.saveBackupsToStorage();
  }

  // Auto-save functionality
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      if (this.autoSaveEnabled && this.currentShow) {
        this.saveShowData();
        this.saveCurrentShow();
      }
    }, 30000); // Auto-save every 30 seconds
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  setAutoSave(enabled) {
    this.autoSaveEnabled = enabled;
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  // Show export and import
  exportShow(showId, format = 'json') {
    const show = showId ? this.getShowFromStorage(showId) : this.currentShow;
    if (!show) return null;

    const exportData = {
      ...show,
      exportedAt: new Date().toISOString(),
      format: format,
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${show.name.replace(/\s+/g, '-').toLowerCase()}.ionxe`;
    a.click();
    URL.revokeObjectURL(url);

    return exportData;
  }

  importShow(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.format !== 'ionxe' && !data.id) {
            reject(new Error('Invalid show file format'));
            return;
          }

          const show = {
            ...data,
            id: this.generateId(),
            imported: new Date().toISOString(),
            modified: new Date().toISOString()
          };

          this.currentShow = show;
          this.saveShowToStorage();
          this.addToShowHistory(show);
          this.loadShowData(show);
          
          resolve(show);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Show validation and integrity
  validateShow(show) {
    const errors = [];
    const warnings = [];

    if (!show.id) errors.push('Show ID is missing');
    if (!show.name) errors.push('Show name is missing');
    if (!show.data) errors.push('Show data is missing');

    if (show.data) {
      if (!Array.isArray(show.data.fixtures)) warnings.push('Fixtures data is not an array');
      if (!Array.isArray(show.data.scenes)) warnings.push('Scenes data is not an array');
      if (!Array.isArray(show.data.qList)) warnings.push('Q List data is not an array');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  updateShowChecksum() {
    if (this.currentShow) {
      const dataString = JSON.stringify(this.currentShow.data);
      this.currentShow.checksum = this.calculateChecksum(dataString);
      this.currentShow.fileSize = dataString.length;
    }
  }

  calculateChecksum(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  // Storage management
  saveShowToStorage() {
    if (this.currentShow) {
      localStorage.setItem(`ionxe-show-${this.currentShow.id}`, JSON.stringify(this.currentShow));
    }
  }

  getShowFromStorage(showId) {
    const data = localStorage.getItem(`ionxe-show-${showId}`);
    return data ? JSON.parse(data) : null;
  }

  getAllShowsFromStorage() {
    const shows = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ionxe-show-')) {
        const show = JSON.parse(localStorage.getItem(key));
        shows.push(show);
      }
    }
    return shows.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }

  saveShowHistory() {
    localStorage.setItem('ionxe-show-history', JSON.stringify(this.showHistory));
  }

  loadShowHistory() {
    try {
      const data = localStorage.getItem('ionxe-show-history');
      this.showHistory = data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load show history:', error);
      this.showHistory = [];
    }
  }

  saveTemplatesToStorage() {
    const templates = Array.from(this.showTemplates.entries());
    localStorage.setItem('ionxe-show-templates', JSON.stringify(templates));
  }

  loadTemplatesFromStorage() {
    try {
      const data = localStorage.getItem('ionxe-show-templates');
      if (data) {
        const templates = JSON.parse(data);
        this.showTemplates = new Map(templates);
      }
    } catch (error) {
      console.warn('Failed to load show templates:', error);
    }
  }

  saveBackupsToStorage() {
    const backups = Array.from(this.showBackups.entries());
    localStorage.setItem('ionxe-show-backups', JSON.stringify(backups));
  }

  loadBackupsFromStorage() {
    try {
      const data = localStorage.getItem('ionxe-show-backups');
      if (data) {
        const backups = JSON.parse(data);
        this.showBackups = new Map(backups);
      }
    } catch (error) {
      console.warn('Failed to load show backups:', error);
    }
  }

  // Utility functions
  generateId() {
    return 'show_' + Math.random().toString(36).substr(2, 9);
  }

  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  incrementVersion(version) {
    const parts = version.split('.');
    const major = parseInt(parts[0]) || 0;
    const minor = parseInt(parts[1]) || 0;
    return `${major}.${minor + 1}`;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Event notifications
  notifyShowChanged() {
    if (this.onShowChanged) {
      this.onShowChanged(this.currentShow);
    }
  }

  notifyShowSaved() {
    if (this.onShowSaved) {
      this.onShowSaved(this.currentShow);
    }
  }

  notifyShowLoaded() {
    if (this.onShowLoaded) {
      this.onShowLoaded(this.currentShow);
    }
  }

  // Cleanup
  cleanup() {
    this.stopAutoSave();
    this.closeCurrentShow();
  }
}

// Initialize show management
const showManagement = new ShowManagement();
