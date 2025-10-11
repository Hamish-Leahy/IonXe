// IonXe Mobile App - Main application controller
class MobileApp {
  constructor() {
    this.currentView = 'faders';
    this.sideMenuOpen = false;
    this.isInitialized = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeApp();
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.navigateToView(view);
      });
    });

    // Menu toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      this.toggleSideMenu();
    });

    document.getElementById('menu-close')?.addEventListener('click', () => {
      this.closeSideMenu();
    });

    // Settings
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.toggleSideMenu();
    });

    // Connection settings
    document.getElementById('connect-btn')?.addEventListener('click', () => {
      this.updateConnectionSettings();
    });

    // Settings changes
    document.getElementById('haptic-feedback')?.addEventListener('change', (e) => {
      window.mobileCore?.updateSetting('hapticFeedback', e.target.checked);
    });

    document.getElementById('auto-reconnect')?.addEventListener('change', (e) => {
      window.mobileCore?.updateSetting('autoReconnect', e.target.checked);
    });

    document.getElementById('brightness')?.addEventListener('input', (e) => {
      window.mobileCore?.updateSetting('brightness', parseInt(e.target.value));
    });

    // Console IP/Port changes
    document.getElementById('console-ip')?.addEventListener('change', (e) => {
      window.mobileCore?.updateSetting('consoleIP', e.target.value);
    });

    document.getElementById('console-port')?.addEventListener('change', (e) => {
      window.mobileCore?.updateSetting('consolePort', parseInt(e.target.value));
    });

    // Core events
    if (window.mobileCore) {
      window.mobileCore.on('connected', () => {
        this.updateConnectionUI(true);
      });

      window.mobileCore.on('disconnected', () => {
        this.updateConnectionUI(false);
      });

      window.mobileCore.on('connectionError', (error) => {
        this.showConnectionError(error);
      });
    }

    // Touch gestures
    this.setupTouchGestures();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();

    // App lifecycle
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  initializeApp() {
    // Show loading screen
    this.showLoadingScreen();

    // Initialize core systems
    this.initializeCoreSystems();

    // Load initial data
    this.loadInitialData();

    // Hide loading screen after initialization
    setTimeout(() => {
      this.hideLoadingScreen();
      this.isInitialized = true;
    }, 2000);
  }

  initializeCoreSystems() {
    // Core is already initialized in mobile-core.js
    // Initialize other modules
    if (window.mobileCore) {
      // Modules are initialized in their respective files
      console.log('Mobile app initialized');
    }
  }

  async loadInitialData() {
    try {
      // Load initial data from console
      if (window.mobileCore && window.mobileCore.isConnected) {
        // Data will be loaded by individual modules
        console.log('Initial data loaded');
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  // Navigation
  navigateToView(viewName) {
    // Update navigation state
    this.currentView = viewName;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    const activeItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    // Update view visibility
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
      targetView.classList.add('active');
    }

    // Emit navigation event
    this.emit('navigate', { view: viewName });

    // Haptic feedback
    if (window.mobileCore?.settings.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }

  // Side Menu
  toggleSideMenu() {
    this.sideMenuOpen = !this.sideMenuOpen;
    this.updateSideMenu();
  }

  closeSideMenu() {
    this.sideMenuOpen = false;
    this.updateSideMenu();
  }

  updateSideMenu() {
    const sideMenu = document.getElementById('side-menu');
    if (sideMenu) {
      sideMenu.classList.toggle('open', this.sideMenuOpen);
    }

    // Update menu toggle button
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.classList.toggle('active', this.sideMenuOpen);
    }
  }

  // Connection Management
  updateConnectionSettings() {
    const consoleIP = document.getElementById('console-ip').value;
    const consolePort = parseInt(document.getElementById('console-port').value);

    if (window.mobileCore) {
      window.mobileCore.updateSetting('consoleIP', consoleIP);
      window.mobileCore.updateSetting('consolePort', consolePort);
      window.mobileCore.connectToConsole();
    }

    this.closeSideMenu();
  }

  updateConnectionUI(connected) {
    const connectedConsole = document.getElementById('connected-console');
    if (connectedConsole) {
      if (connected) {
        connectedConsole.textContent = `${window.mobileCore?.consoleIP}:${window.mobileCore?.consolePort}`;
      } else {
        connectedConsole.textContent = 'Not connected';
      }
    }
  }

  showConnectionError(error) {
    console.error('Connection error:', error);
    
    // Show error in side menu
    const connectionSettings = document.querySelector('.connection-settings');
    if (connectionSettings) {
      let errorDiv = connectionSettings.querySelector('.connection-error');
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'connection-error';
        connectionSettings.appendChild(errorDiv);
      }
      errorDiv.textContent = `Error: ${error.message}`;
    }
  }

  // Touch Gestures
  setupTouchGestures() {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;

      // Swipe detection
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100 && deltaTime < 300) {
        if (deltaX > 0) {
          this.handleSwipeRight();
        } else {
          this.handleSwipeLeft();
        }
      }

      // Vertical swipe for navigation
      if (Math.abs(deltaY) > 50 && Math.abs(deltaX) < 100 && deltaTime < 300) {
        if (deltaY > 0) {
          this.handleSwipeUp();
        } else {
          this.handleSwipeDown();
        }
      }
    });
  }

  handleSwipeLeft() {
    // Navigate to next view
    const views = ['faders', 'scenes', 'ai', 'monitor'];
    const currentIndex = views.indexOf(this.currentView);
    if (currentIndex < views.length - 1) {
      this.navigateToView(views[currentIndex + 1]);
    }
  }

  handleSwipeRight() {
    // Navigate to previous view
    const views = ['faders', 'scenes', 'ai', 'monitor'];
    const currentIndex = views.indexOf(this.currentView);
    if (currentIndex > 0) {
      this.navigateToView(views[currentIndex - 1]);
    }
  }

  handleSwipeUp() {
    // Open side menu
    if (!this.sideMenuOpen) {
      this.toggleSideMenu();
    }
  }

  handleSwipeDown() {
    // Close side menu
    if (this.sideMenuOpen) {
      this.closeSideMenu();
    }
  }

  // Keyboard Shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when not in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case '1':
          this.navigateToView('faders');
          break;
        case '2':
          this.navigateToView('scenes');
          break;
        case '3':
          this.navigateToView('ai');
          break;
        case '4':
          this.navigateToView('monitor');
          break;
        case 'Escape':
          this.closeSideMenu();
          break;
        case 'm':
        case 'M':
          this.toggleSideMenu();
          break;
      }
    });
  }

  // App Lifecycle
  handleVisibilityChange() {
    if (document.hidden) {
      this.onAppBackgrounded();
    } else {
      this.onAppForegrounded();
    }
  }

  onAppBackgrounded() {
    console.log('App backgrounded');
    // Pause non-essential operations
    if (window.mobileMonitor) {
      window.mobileMonitor.stopMonitoring();
    }
  }

  onAppForegrounded() {
    console.log('App foregrounded');
    // Resume operations
    if (window.mobileMonitor) {
      window.mobileMonitor.startMonitoring();
    }
    
    // Refresh data
    this.refreshCurrentView();
  }

  refreshCurrentView() {
    switch (this.currentView) {
      case 'faders':
        if (window.mobileFaders) {
          window.mobileFaders.loadFaderValues();
        }
        break;
      case 'scenes':
        if (window.mobileScenes) {
          window.mobileScenes.loadScenes();
        }
        break;
      case 'monitor':
        if (window.mobileMonitor) {
          window.mobileMonitor.refreshAllData();
        }
        break;
    }
  }

  // Loading Screen
  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }
    
    if (app) {
      app.classList.add('hidden');
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
    
    if (app) {
      app.classList.remove('hidden');
    }
  }

  // Error Handling
  handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly error message
    const message = context ? `${context}: ${error.message}` : error.message;
    if (window.mobileCore) {
      window.mobileCore.showToast(message, 'error');
    }
  }

  // Event System
  emit(event, data) {
    // Emit custom events
    const customEvent = new CustomEvent(`mobileApp:${event}`, { detail: data });
    document.dispatchEvent(customEvent);
  }

  // Utility Methods
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  // Cleanup
  cleanup() {
    console.log('Cleaning up mobile app');
    
    // Cleanup modules
    if (window.mobileCore) {
      window.mobileCore.destroy();
    }
    
    if (window.mobileMonitor) {
      window.mobileMonitor.destroy();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileApp();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
