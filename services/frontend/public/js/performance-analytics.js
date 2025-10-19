// Performance Analytics System
// Comprehensive performance monitoring and analytics

class PerformanceAnalyticsSystem {
  constructor(qListManager, effectsEngine, midiSystem) {
    this.qListManager = qListManager;
    this.effectsEngine = effectsEngine;
    this.midiSystem = midiSystem;
    this.metrics = new Map();
    this.sessions = new Map();
    this.currentSession = null;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.performanceThresholds = new Map();
    this.alerts = new Map();
    this.reports = new Map();
    
    this.initializeAnalyticsSystem();
  }

  // System Initialization
  initializeAnalyticsSystem() {
    this.setupPerformanceThresholds();
    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }

  setupPerformanceThresholds() {
    this.performanceThresholds.set('cpu_usage', { warning: 70, critical: 90 });
    this.performanceThresholds.set('memory_usage', { warning: 80, critical: 95 });
    this.performanceThresholds.set('frame_rate', { warning: 30, critical: 15 });
    this.performanceThresholds.set('network_latency', { warning: 100, critical: 500 });
    this.performanceThresholds.set('dmx_packet_loss', { warning: 1, critical: 5 });
    this.performanceThresholds.set('cue_execution_time', { warning: 100, critical: 500 });
  }

  setupEventListeners() {
    // Monitor Q List events
    this.qListManager.onCueChanged = (cue) => {
      this.recordCueEvent('cue_changed', cue);
    };

    this.qListManager.onPlaybackStateChanged = (state) => {
      this.recordPlaybackEvent('playback_state_changed', state);
    };

    // Monitor system events
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Monitor performance events
    window.addEventListener('load', () => {
      this.recordSystemEvent('page_load', { timestamp: Date.now() });
    });
  }

  // Session Management
  startSession(sessionData = {}) {
    const session = {
      id: this.generateSessionId(),
      name: sessionData.name || 'Untitled Session',
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      metrics: new Map(),
      events: [],
      cues: new Map(),
      effects: new Map(),
      midiEvents: [],
      performanceData: [],
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;
    this.isMonitoring = true;
    
    this.notifyAnalyticsEvent('session_started', session);
    return session;
  }

  endSession() {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.currentSession.isActive = false;
    this.isMonitoring = false;

    this.generateSessionReport(this.currentSession);
    this.notifyAnalyticsEvent('session_ended', this.currentSession);
    
    const endedSession = this.currentSession;
    this.currentSession = null;
    return endedSession;
  }

  // Performance Monitoring
  startPerformanceMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (this.isMonitoring) {
        this.collectPerformanceMetrics();
      }
    }, 1000); // Collect metrics every second
  }

  collectPerformanceMetrics() {
    const metrics = {
      timestamp: Date.now(),
      cpu: this.getCPUUsage(),
      memory: this.getMemoryUsage(),
      frameRate: this.getFrameRate(),
      network: this.getNetworkMetrics(),
      dmx: this.getDMXMetrics(),
      system: this.getSystemMetrics()
    };

    if (this.currentSession) {
      this.currentSession.performanceData.push(metrics);
    }

    this.checkPerformanceThresholds(metrics);
    this.notifyAnalyticsEvent('metrics_collected', metrics);
  }

  getCPUUsage() {
    // Estimate CPU usage based on performance timing
    const start = performance.now();
    let iterations = 0;
    const maxIterations = 1000000;
    
    while (iterations < maxIterations && (performance.now() - start) < 1) {
      iterations++;
    }
    
    const actualTime = performance.now() - start;
    const expectedTime = 1; // 1ms
    const cpuUsage = Math.min(100, (actualTime / expectedTime) * 100);
    
    return {
      usage: cpuUsage,
      load: this.getSystemLoad()
    };
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };
    }
    
    return {
      used: 0,
      total: 0,
      limit: 0,
      usage: 0
    };
  }

  getFrameRate() {
    // Calculate frame rate based on requestAnimationFrame timing
    const now = performance.now();
    if (!this.lastFrameTime) {
      this.lastFrameTime = now;
      return 60;
    }
    
    const deltaTime = now - this.lastFrameTime;
    const frameRate = 1000 / deltaTime;
    this.lastFrameTime = now;
    
    return Math.min(60, Math.max(0, frameRate));
  }

  getNetworkMetrics() {
    return {
      latency: this.getNetworkLatency(),
      bandwidth: this.getBandwidth(),
      packetLoss: this.getPacketLoss()
    };
  }

  getDMXMetrics() {
    return {
      packetsSent: this.getDMXPacketsSent(),
      packetsLost: this.getDMXPacketsLost(),
      averageLatency: this.getDMXLatency(),
      throughput: this.getDMXThroughput()
    };
  }

  getSystemMetrics() {
    return {
      uptime: Date.now() - this.getSystemStartTime(),
      activeConnections: this.getActiveConnections(),
      errorCount: this.getErrorCount(),
      warningCount: this.getWarningCount()
    };
  }

  // Event Recording
  recordCueEvent(eventType, cueData) {
    if (!this.currentSession) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      cueId: cueData.id,
      cueNumber: cueData.number,
      data: cueData
    };

    this.currentSession.events.push(event);
    
    // Update cue metrics
    if (!this.currentSession.cues.has(cueData.id)) {
      this.currentSession.cues.set(cueData.id, {
        id: cueData.id,
        number: cueData.number,
        executions: 0,
        totalTime: 0,
        averageExecutionTime: 0,
        lastExecuted: null
      });
    }

    const cueMetrics = this.currentSession.cues.get(cueData.id);
    cueMetrics.executions++;
    cueMetrics.lastExecuted = Date.now();
    
    this.notifyAnalyticsEvent('cue_event_recorded', event);
  }

  recordPlaybackEvent(eventType, playbackData) {
    if (!this.currentSession) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: playbackData
    };

    this.currentSession.events.push(event);
    this.notifyAnalyticsEvent('playback_event_recorded', event);
  }

  recordEffectEvent(eventType, effectData) {
    if (!this.currentSession) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      effectId: effectData.id,
      data: effectData
    };

    this.currentSession.events.push(event);
    
    // Update effect metrics
    if (!this.currentSession.effects.has(effectData.id)) {
      this.currentSession.effects.set(effectData.id, {
        id: effectData.id,
        name: effectData.name,
        activations: 0,
        totalDuration: 0,
        averageDuration: 0,
        lastActivated: null
      });
    }

    const effectMetrics = this.currentSession.effects.get(effectData.id);
    effectMetrics.activations++;
    effectMetrics.lastActivated = Date.now();
    
    this.notifyAnalyticsEvent('effect_event_recorded', event);
  }

  recordMIDIEvent(eventType, midiData) {
    if (!this.currentSession) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: midiData
    };

    this.currentSession.midiEvents.push(event);
    this.notifyAnalyticsEvent('midi_event_recorded', event);
  }

  recordSystemEvent(eventType, eventData) {
    if (!this.currentSession) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData
    };

    this.currentSession.events.push(event);
    this.notifyAnalyticsEvent('system_event_recorded', event);
  }

  // Performance Threshold Monitoring
  checkPerformanceThresholds(metrics) {
    for (const [metricName, thresholds] of this.performanceThresholds) {
      const value = this.getMetricValue(metrics, metricName);
      
      if (value >= thresholds.critical) {
        this.createAlert(metricName, 'critical', value, thresholds.critical);
      } else if (value >= thresholds.warning) {
        this.createAlert(metricName, 'warning', value, thresholds.warning);
      }
    }
  }

  getMetricValue(metrics, metricName) {
    switch (metricName) {
      case 'cpu_usage':
        return metrics.cpu.usage;
      case 'memory_usage':
        return metrics.memory.usage;
      case 'frame_rate':
        return metrics.frameRate;
      case 'network_latency':
        return metrics.network.latency;
      case 'dmx_packet_loss':
        return metrics.dmx.packetsLost;
      case 'cue_execution_time':
        return this.getAverageCueExecutionTime();
      default:
        return 0;
    }
  }

  createAlert(metricName, severity, currentValue, threshold) {
    const alert = {
      id: this.generateAlertId(),
      metricName,
      severity,
      currentValue,
      threshold,
      timestamp: Date.now(),
      message: `${metricName} is ${severity}: ${currentValue} (threshold: ${threshold})`,
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);
    this.notifyAnalyticsEvent('alert_created', alert);
  }

  // Report Generation
  generateSessionReport(session) {
    const report = {
      id: this.generateReportId(),
      sessionId: session.id,
      sessionName: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      summary: this.generateSessionSummary(session),
      performance: this.generatePerformanceReport(session),
      cues: this.generateCueReport(session),
      effects: this.generateEffectReport(session),
      midi: this.generateMIDIReport(session),
      alerts: this.generateAlertReport(session),
      recommendations: this.generateRecommendations(session),
      createdAt: new Date().toISOString()
    };

    this.reports.set(report.id, report);
    this.notifyAnalyticsEvent('report_generated', report);
    return report;
  }

  generateSessionSummary(session) {
    const totalCues = session.cues.size;
    const totalEffects = session.effects.size;
    const totalEvents = session.events.length;
    const averagePerformance = this.calculateAveragePerformance(session);

    return {
      totalCues,
      totalEffects,
      totalEvents,
      averagePerformance,
      duration: session.duration,
      efficiency: this.calculateEfficiency(session)
    };
  }

  generatePerformanceReport(session) {
    const performanceData = session.performanceData;
    if (performanceData.length === 0) return null;

    const cpuData = performanceData.map(m => m.cpu.usage);
    const memoryData = performanceData.map(m => m.memory.usage);
    const frameRateData = performanceData.map(m => m.frameRate);

    return {
      cpu: {
        average: this.calculateAverage(cpuData),
        min: Math.min(...cpuData),
        max: Math.max(...cpuData),
        trend: this.calculateTrend(cpuData)
      },
      memory: {
        average: this.calculateAverage(memoryData),
        min: Math.min(...memoryData),
        max: Math.max(...memoryData),
        trend: this.calculateTrend(memoryData)
      },
      frameRate: {
        average: this.calculateAverage(frameRateData),
        min: Math.min(...frameRateData),
        max: Math.max(...frameRateData),
        trend: this.calculateTrend(frameRateData)
      }
    };
  }

  generateCueReport(session) {
    const cueMetrics = Array.from(session.cues.values());
    
    return {
      totalCues: cueMetrics.length,
      totalExecutions: cueMetrics.reduce((sum, cue) => sum + cue.executions, 0),
      mostExecuted: cueMetrics.reduce((max, cue) => 
        cue.executions > max.executions ? cue : max, cueMetrics[0] || { executions: 0 }),
      averageExecutionTime: this.calculateAverage(cueMetrics.map(cue => cue.averageExecutionTime)),
      executionDistribution: this.calculateExecutionDistribution(cueMetrics)
    };
  }

  generateEffectReport(session) {
    const effectMetrics = Array.from(session.effects.values());
    
    return {
      totalEffects: effectMetrics.length,
      totalActivations: effectMetrics.reduce((sum, effect) => sum + effect.activations, 0),
      mostUsed: effectMetrics.reduce((max, effect) => 
        effect.activations > max.activations ? effect : max, effectMetrics[0] || { activations: 0 }),
      averageDuration: this.calculateAverage(effectMetrics.map(effect => effect.averageDuration)),
      usageDistribution: this.calculateUsageDistribution(effectMetrics)
    };
  }

  generateMIDIReport(session) {
    const midiEvents = session.midiEvents;
    
    return {
      totalEvents: midiEvents.length,
      eventTypes: this.groupEventsByType(midiEvents),
      averageLatency: this.calculateAverageMIDILatency(midiEvents),
      peakActivity: this.findPeakMIDIActivity(midiEvents)
    };
  }

  generateAlertReport(session) {
    const sessionAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.timestamp >= session.startTime && alert.timestamp <= session.endTime);
    
    return {
      totalAlerts: sessionAlerts.length,
      criticalAlerts: sessionAlerts.filter(alert => alert.severity === 'critical').length,
      warningAlerts: sessionAlerts.filter(alert => alert.severity === 'warning').length,
      alertTrends: this.calculateAlertTrends(sessionAlerts),
      topIssues: this.identifyTopIssues(sessionAlerts)
    };
  }

  generateRecommendations(session) {
    const recommendations = [];
    
    // Performance recommendations
    const performanceReport = this.generatePerformanceReport(session);
    if (performanceReport) {
      if (performanceReport.cpu.average > 80) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          message: 'High CPU usage detected. Consider optimizing effects or reducing complexity.',
          action: 'optimize_performance'
        });
      }
      
      if (performanceReport.memory.average > 85) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          message: 'High memory usage detected. Consider clearing unused data.',
          action: 'optimize_memory'
        });
      }
      
      if (performanceReport.frameRate.average < 30) {
        recommendations.push({
          type: 'rendering',
          priority: 'high',
          message: 'Low frame rate detected. Consider reducing visual complexity.',
          action: 'optimize_rendering'
        });
      }
    }
    
    // Usage recommendations
    const cueReport = this.generateCueReport(session);
    if (cueReport.mostExecuted.executions > 100) {
      recommendations.push({
        type: 'usage',
        priority: 'low',
        message: `Cue ${cueReport.mostExecuted.number} was executed ${cueReport.mostExecuted.executions} times. Consider creating a macro.`,
        action: 'create_macro'
      });
    }
    
    return recommendations;
  }

  // Utility Functions
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  calculateEfficiency(session) {
    const totalTime = session.duration;
    const activeTime = session.events.length * 100; // Estimate active time
    return Math.min(100, (activeTime / totalTime) * 100);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateAlertId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateReportId() {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Event Notifications
  notifyAnalyticsEvent(eventType, data) {
    const event = new CustomEvent('analytics-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.endSession();
    this.metrics.clear();
    this.sessions.clear();
    this.performanceThresholds.clear();
    this.alerts.clear();
    this.reports.clear();
  }
}

// Global Performance Analytics System Instance
const performanceAnalyticsSystem = new PerformanceAnalyticsSystem(qListManager, effectsEngine, midiIntegrationSystem);
