// Performance Monitor - System performance monitoring and diagnostics
// Real-time performance tracking and optimization

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
    this.thresholds = new Map();
    this.isMonitoring = false;
    this.sampleRate = 1000; // ms
    this.maxSamples = 1000;
    
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Set default thresholds
    this.setThreshold('cpu', 80); // CPU usage percentage
    this.setThreshold('memory', 85); // Memory usage percentage
    this.setThreshold('fps', 30); // Minimum FPS
    this.setThreshold('latency', 100); // Maximum latency in ms
    this.setThreshold('errors', 10); // Maximum errors per minute
    
    // Initialize metrics
    this.initializeMetrics();
    
    // Start monitoring
    this.startMonitoring();
  }

  initializeMetrics() {
    this.metrics.set('cpu', {
      name: 'CPU Usage',
      unit: '%',
      current: 0,
      average: 0,
      max: 0,
      min: 100,
      samples: [],
      threshold: 80
    });

    this.metrics.set('memory', {
      name: 'Memory Usage',
      unit: 'MB',
      current: 0,
      average: 0,
      max: 0,
      min: Infinity,
      samples: [],
      threshold: 85
    });

    this.metrics.set('fps', {
      name: 'Frames Per Second',
      unit: 'fps',
      current: 0,
      average: 0,
      max: 0,
      min: Infinity,
      samples: [],
      threshold: 30
    });

    this.metrics.set('latency', {
      name: 'Response Latency',
      unit: 'ms',
      current: 0,
      average: 0,
      max: 0,
      min: Infinity,
      samples: [],
      threshold: 100
    });

    this.metrics.set('errors', {
      name: 'Error Rate',
      unit: 'errors/min',
      current: 0,
      average: 0,
      max: 0,
      min: Infinity,
      samples: [],
      threshold: 10
    });

    this.metrics.set('network', {
      name: 'Network Activity',
      unit: 'packets/sec',
      current: 0,
      average: 0,
      max: 0,
      min: Infinity,
      samples: [],
      threshold: 1000
    });
  }

  // Monitoring control
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringLoop();
  }

  stopMonitoring() {
    this.isMonitoring = false;
  }

  monitoringLoop() {
    if (!this.isMonitoring) return;

    this.collectMetrics();
    this.checkThresholds();
    this.updateAverages();
    this.cleanupOldSamples();

    setTimeout(() => this.monitoringLoop(), this.sampleRate);
  }

  // Metric collection
  collectMetrics() {
    this.collectCPUUsage();
    this.collectMemoryUsage();
    this.collectFPS();
    this.collectLatency();
    this.collectErrorRate();
    this.collectNetworkActivity();
  }

  collectCPUUsage() {
    // Simulate CPU usage based on system activity
    const cpuUsage = this.calculateCPUUsage();
    this.updateMetric('cpu', cpuUsage);
  }

  collectMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
      this.updateMetric('memory', used);
    } else {
      // Fallback estimation
      const estimated = this.estimateMemoryUsage();
      this.updateMetric('memory', estimated);
    }
  }

  collectFPS() {
    const fps = this.calculateFPS();
    this.updateMetric('fps', fps);
  }

  collectLatency() {
    const latency = this.calculateLatency();
    this.updateMetric('latency', latency);
  }

  collectErrorRate() {
    const errorRate = this.calculateErrorRate();
    this.updateMetric('errors', errorRate);
  }

  collectNetworkActivity() {
    const networkActivity = this.calculateNetworkActivity();
    this.updateMetric('network', networkActivity);
  }

  // Metric calculations
  calculateCPUUsage() {
    // Simplified CPU usage calculation
    const now = performance.now();
    const timeSinceLastCheck = now - (this.lastCPUTime || now);
    this.lastCPUTime = now;

    // Simulate CPU usage based on active operations
    let cpuUsage = 0;
    
    // Check for active effects
    if (typeof effectsCore !== 'undefined' && effectsCore.getActiveEffects().length > 0) {
      cpuUsage += 20;
    }

    // Check for active timers
    if (typeof timingCore !== 'undefined' && timingCore.timers.size > 0) {
      cpuUsage += 10;
    }

    // Check for audio processing
    if (typeof audioCore !== 'undefined' && audioCore.isListening) {
      cpuUsage += 15;
    }

    // Add some random variation
    cpuUsage += Math.random() * 10;

    return Math.min(100, Math.max(0, cpuUsage));
  }

  estimateMemoryUsage() {
    // Rough estimation based on stored data
    let estimated = 0;

    // Estimate based on fader values
    if (typeof faderValues !== 'undefined') {
      estimated += faderValues.length * 1; // 1 byte per value
    }

    // Estimate based on fixtures
    if (typeof fixtureCore !== 'undefined') {
      estimated += fixtureCore.fixtures.size * 100; // ~100 bytes per fixture
    }

    // Estimate based on scenes
    if (typeof scenes !== 'undefined') {
      estimated += scenes.size * 200; // ~200 bytes per scene
    }

    // Convert to MB
    return estimated / (1024 * 1024);
  }

  calculateFPS() {
    const now = performance.now();
    const timeSinceLastFrame = now - (this.lastFrameTime || now);
    this.lastFrameTime = now;

    if (timeSinceLastFrame > 0) {
      return Math.round(1000 / timeSinceLastFrame);
    }
    return 60; // Default FPS
  }

  calculateLatency() {
    // Measure latency by timing a simple operation
    const start = performance.now();
    
    // Perform a simple operation
    const test = Math.random() * 1000;
    const result = Math.sqrt(test);
    
    const end = performance.now();
    return Math.round(end - start);
  }

  calculateErrorRate() {
    // Count errors in the last minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // This would be populated by error tracking
    const recentErrors = this.getRecentErrors(oneMinuteAgo);
    return recentErrors.length;
  }

  calculateNetworkActivity() {
    // Estimate network activity based on DMX output
    if (typeof networkCore !== 'undefined' && networkCore.isEnabled) {
      return 44; // Art-Net standard rate
    }
    return 0;
  }

  // Metric updates
  updateMetric(name, value) {
    const metric = this.metrics.get(name);
    if (!metric) return;

    metric.current = value;
    metric.samples.push({
      value,
      timestamp: Date.now()
    });

    // Update min/max
    if (value > metric.max) metric.max = value;
    if (value < metric.min) metric.min = value;

    // Limit samples
    if (metric.samples.length > this.maxSamples) {
      metric.samples = metric.samples.slice(-this.maxSamples);
    }
  }

  updateAverages() {
    this.metrics.forEach(metric => {
      if (metric.samples.length > 0) {
        const sum = metric.samples.reduce((acc, sample) => acc + sample.value, 0);
        metric.average = sum / metric.samples.length;
      }
    });
  }

  cleanupOldSamples() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    this.metrics.forEach(metric => {
      metric.samples = metric.samples.filter(sample => 
        now - sample.timestamp < maxAge
      );
    });
  }

  // Threshold management
  setThreshold(metricName, threshold) {
    this.thresholds.set(metricName, threshold);
    
    const metric = this.metrics.get(metricName);
    if (metric) {
      metric.threshold = threshold;
    }
  }

  getThreshold(metricName) {
    return this.thresholds.get(metricName);
  }

  checkThresholds() {
    this.metrics.forEach((metric, name) => {
      const threshold = this.thresholds.get(name);
      if (threshold && metric.current > threshold) {
        this.createAlert(name, 'high', metric.current, threshold);
      }
    });
  }

  // Alert management
  createAlert(metricName, type, currentValue, threshold) {
    const alert = {
      id: this.generateId(),
      metric: metricName,
      type,
      currentValue,
      threshold,
      timestamp: Date.now(),
      message: `${metricName} is ${type}: ${currentValue} (threshold: ${threshold})`,
      acknowledged: false
    };

    this.alerts.push(alert);

    // Limit alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.notifyAlert(alert);
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  clearAlerts() {
    this.alerts = [];
  }

  getAlerts(acknowledged = null) {
    if (acknowledged === null) {
      return [...this.alerts];
    }
    return this.alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  // Performance optimization
  optimizePerformance() {
    const recommendations = [];

    // Check CPU usage
    const cpuMetric = this.metrics.get('cpu');
    if (cpuMetric && cpuMetric.average > 70) {
      recommendations.push({
        type: 'cpu',
        message: 'High CPU usage detected. Consider reducing active effects or timers.',
        severity: 'warning'
      });
    }

    // Check memory usage
    const memoryMetric = this.metrics.get('memory');
    if (memoryMetric && memoryMetric.average > 100) {
      recommendations.push({
        type: 'memory',
        message: 'High memory usage detected. Consider clearing unused data.',
        severity: 'warning'
      });
    }

    // Check FPS
    const fpsMetric = this.metrics.get('fps');
    if (fpsMetric && fpsMetric.average < 30) {
      recommendations.push({
        type: 'fps',
        message: 'Low FPS detected. Consider reducing visual complexity.',
        severity: 'error'
      });
    }

    // Check latency
    const latencyMetric = this.metrics.get('latency');
    if (latencyMetric && latencyMetric.average > 50) {
      recommendations.push({
        type: 'latency',
        message: 'High latency detected. Check network connection and system load.',
        severity: 'warning'
      });
    }

    return recommendations;
  }

  // System diagnostics
  runDiagnostics() {
    const diagnostics = {
      timestamp: Date.now(),
      system: this.getSystemInfo(),
      performance: this.getPerformanceSummary(),
      recommendations: this.optimizePerformance(),
      alerts: this.getAlerts(false)
    };

    return diagnostics;
  }

  getSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      timing: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      } : null
    };
  }

  getPerformanceSummary() {
    const summary = {};
    
    this.metrics.forEach((metric, name) => {
      summary[name] = {
        current: metric.current,
        average: metric.average,
        max: metric.max,
        min: metric.min,
        threshold: metric.threshold,
        status: metric.current > metric.threshold ? 'warning' : 'ok'
      };
    });

    return summary;
  }

  // Error tracking
  trackError(error, context = {}) {
    const errorInfo = {
      id: this.generateId(),
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.storeError(errorInfo);
    this.notifyError(errorInfo);
  }

  storeError(errorInfo) {
    const errors = this.getStoredErrors();
    errors.push(errorInfo);
    
    // Keep only last 100 errors
    if (errors.length > 100) {
      errors.splice(0, errors.length - 100);
    }
    
    localStorage.setItem('ionxe-errors', JSON.stringify(errors));
  }

  getStoredErrors() {
    try {
      const data = localStorage.getItem('ionxe-errors');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  getRecentErrors(since) {
    const errors = this.getStoredErrors();
    return errors.filter(error => error.timestamp > since);
  }

  clearErrors() {
    localStorage.removeItem('ionxe-errors');
  }

  // Utility functions
  generateId() {
    return 'perf_' + Math.random().toString(36).substr(2, 9);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTime(milliseconds) {
    if (milliseconds < 1000) {
      return Math.round(milliseconds) + 'ms';
    }
    return (milliseconds / 1000).toFixed(2) + 's';
  }

  // Event notifications
  notifyAlert(alert) {
    if (this.onAlert) {
      this.onAlert(alert);
    }
  }

  notifyError(error) {
    if (this.onError) {
      this.onError(error);
    }
  }

  notifyPerformanceUpdate(metrics) {
    if (this.onPerformanceUpdate) {
      this.onPerformanceUpdate(metrics);
    }
  }

  // Cleanup
  cleanup() {
    this.stopMonitoring();
    this.clearAlerts();
    this.clearErrors();
  }
}

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Global error handler
window.addEventListener('error', (event) => {
  performanceMonitor.trackError(event.error, {
    type: 'javascript',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  performanceMonitor.trackError(event.reason, {
    type: 'promise',
    promise: event.promise
  });
});
