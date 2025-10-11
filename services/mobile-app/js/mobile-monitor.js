// IonXe Mobile Monitor - System monitoring and diagnostics
class MobileMonitor {
  constructor(core) {
    this.core = core;
    this.monitoring = false;
    this.updateInterval = null;
    this.systemStats = {};
    this.dmxChannels = new Uint8Array(512);
    this.networkInfo = {};
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startMonitoring();
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-monitor')?.addEventListener('click', () => {
      this.refreshAllData();
    });

    // Core events
    this.core.on('connected', () => {
      this.startMonitoring();
    });

    this.core.on('disconnected', () => {
      this.stopMonitoring();
    });

    this.core.on('systemStatus', (data) => {
      this.updateSystemStats(data);
    });
  }

  startMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.updateInterval = setInterval(() => {
      this.updateAllData();
    }, 2000); // Update every 2 seconds

    this.updateAllData();
  }

  stopMonitoring() {
    this.monitoring = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateAllData() {
    try {
      await Promise.all([
        this.updateDMXChannels(),
        this.updateSystemStats(),
        this.updateNetworkInfo()
      ]);
    } catch (error) {
      console.error('Failed to update monitor data:', error);
    }
  }

  async refreshAllData() {
    this.showRefreshState(true);
    await this.updateAllData();
    this.showRefreshState(false);
  }

  async updateDMXChannels() {
    try {
      const data = await this.core.apiRequest('/api/dmx/channels');
      if (data && data.channels) {
        this.dmxChannels = new Uint8Array(data.channels);
        this.renderDMXChannels();
      }
    } catch (error) {
      console.error('Failed to update DMX channels:', error);
    }
  }

  renderDMXChannels() {
    const container = document.getElementById('dmx-channels');
    if (!container) return;

    container.innerHTML = '';

    // Show first 64 channels in a grid
    for (let i = 0; i < 64; i++) {
      const channelDiv = document.createElement('div');
      channelDiv.className = 'dmx-channel';
      channelDiv.dataset.channel = i;
      
      const value = this.dmxChannels[i] || 0;
      const percentage = Math.round((value / 255) * 100);
      
      channelDiv.innerHTML = `
        <div class="channel-number">${i + 1}</div>
        <div class="channel-value">${percentage}%</div>
      `;

      if (value > 0) {
        channelDiv.classList.add('active');
        // Color intensity based on value
        const intensity = value / 255;
        channelDiv.style.backgroundColor = `rgba(0, 123, 255, ${intensity})`;
      }

      container.appendChild(channelDiv);
    }
  }

  async updateSystemStats() {
    try {
      const data = await this.core.apiRequest('/api/system/status');
      this.systemStats = data;
      this.renderSystemStats();
    } catch (error) {
      console.error('Failed to update system stats:', error);
      this.systemStats = {
        error: 'Failed to load system statistics'
      };
      this.renderSystemStats();
    }
  }

  renderSystemStats() {
    const container = document.getElementById('system-stats');
    if (!container) return;

    if (this.systemStats.error) {
      container.innerHTML = `
        <div class="stat-item error">
          <span class="stat-label">Error</span>
          <span class="stat-value">${this.systemStats.error}</span>
        </div>
      `;
      return;
    }

    const stats = [
      {
        label: 'CPU Usage',
        value: `${this.systemStats.cpu_usage || 0}%`,
        status: this.getStatusClass(this.systemStats.cpu_usage, 80, 90)
      },
      {
        label: 'Memory Usage',
        value: `${this.systemStats.memory_usage || 0}%`,
        status: this.getStatusClass(this.systemStats.memory_usage, 80, 90)
      },
      {
        label: 'DMX Output',
        value: this.systemStats.dmx_output ? 'Active' : 'Inactive',
        status: this.systemStats.dmx_output ? 'success' : 'warning'
      },
      {
        label: 'Uptime',
        value: this.formatUptime(this.systemStats.uptime),
        status: 'info'
      },
      {
        label: 'Active Channels',
        value: this.getActiveChannelCount(),
        status: 'info'
      },
      {
        label: 'Last Update',
        value: this.core.formatTime(Date.now()),
        status: 'info'
      }
    ];

    container.innerHTML = stats.map(stat => `
      <div class="stat-item ${stat.status}">
        <span class="stat-label">${stat.label}</span>
        <span class="stat-value">${stat.value}</span>
      </div>
    `).join('');
  }

  async updateNetworkInfo() {
    try {
      const data = await this.core.apiRequest('/api/network/info');
      this.networkInfo = data;
      this.renderNetworkInfo();
    } catch (error) {
      console.error('Failed to update network info:', error);
      this.networkInfo = {
        error: 'Failed to load network information'
      };
      this.renderNetworkInfo();
    }
  }

  renderNetworkInfo() {
    const container = document.getElementById('network-info');
    if (!container) return;

    if (this.networkInfo.error) {
      container.innerHTML = `
        <div class="stat-item error">
          <span class="stat-label">Error</span>
          <span class="stat-value">${this.networkInfo.error}</span>
        </div>
      `;
      return;
    }

    const networkStats = [
      {
        label: 'Console IP',
        value: this.networkInfo.console_ip || 'Unknown'
      },
      {
        label: 'Port',
        value: this.networkInfo.port || 'Unknown'
      },
      {
        label: 'Connection',
        value: this.networkInfo.connected ? 'Connected' : 'Disconnected',
        status: this.networkInfo.connected ? 'success' : 'error'
      },
      {
        label: 'Latency',
        value: this.networkInfo.latency ? `${this.networkInfo.latency}ms` : 'Unknown'
      },
      {
        label: 'Protocol',
        value: this.networkInfo.protocol || 'HTTP'
      },
      {
        label: 'Last Ping',
        value: this.networkInfo.last_ping ? this.core.formatTime(this.networkInfo.last_ping) : 'Never'
      }
    ];

    container.innerHTML = networkStats.map(stat => `
      <div class="stat-item ${stat.status || 'info'}">
        <span class="stat-label">${stat.label}</span>
        <span class="stat-value">${stat.value}</span>
      </div>
    `).join('');
  }

  getStatusClass(value, warningThreshold, errorThreshold) {
    if (value >= errorThreshold) return 'error';
    if (value >= warningThreshold) return 'warning';
    return 'success';
  }

  getActiveChannelCount() {
    let count = 0;
    for (let i = 0; i < this.dmxChannels.length; i++) {
      if (this.dmxChannels[i] > 0) count++;
    }
    return count;
  }

  formatUptime(seconds) {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  showRefreshState(refreshing) {
    const refreshBtn = document.getElementById('refresh-monitor');
    if (refreshBtn) {
      refreshBtn.disabled = refreshing;
      refreshBtn.textContent = refreshing ? '⏳' : '🔄';
    }
  }

  // Performance Monitoring
  startPerformanceMonitoring() {
    // Monitor frame rate
    let lastTime = performance.now();
    let frameCount = 0;
    
    const monitorFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.updatePerformanceMetric('fps', fps);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      if (this.monitoring) {
        requestAnimationFrame(monitorFrame);
      }
    };
    
    requestAnimationFrame(monitorFrame);
  }

  updatePerformanceMetric(metric, value) {
    // Update performance metrics in UI
    const container = document.getElementById('system-stats');
    if (container) {
      const existingMetric = container.querySelector(`[data-metric="${metric}"]`);
      if (existingMetric) {
        existingMetric.querySelector('.stat-value').textContent = value;
      }
    }
  }

  // Alert System
  checkAlerts() {
    const alerts = [];

    // CPU usage alert
    if (this.systemStats.cpu_usage > 90) {
      alerts.push({
        type: 'error',
        message: 'High CPU usage detected',
        value: `${this.systemStats.cpu_usage}%`
      });
    }

    // Memory usage alert
    if (this.systemStats.memory_usage > 90) {
      alerts.push({
        type: 'error',
        message: 'High memory usage detected',
        value: `${this.systemStats.memory_usage}%`
      });
    }

    // DMX output alert
    if (!this.systemStats.dmx_output) {
      alerts.push({
        type: 'warning',
        message: 'DMX output is inactive'
      });
    }

    // Connection alert
    if (!this.networkInfo.connected) {
      alerts.push({
        type: 'error',
        message: 'Console connection lost'
      });
    }

    // Show alerts
    alerts.forEach(alert => {
      this.core.showToast(`${alert.message}: ${alert.value || ''}`, alert.type);
    });
  }

  // Export Data
  exportMonitorData() {
    const data = {
      timestamp: new Date().toISOString(),
      systemStats: this.systemStats,
      networkInfo: this.networkInfo,
      activeChannels: this.getActiveChannelCount(),
      dmxChannels: Array.from(this.dmxChannels)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ionxe-monitor-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // Cleanup
  destroy() {
    this.stopMonitoring();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.mobileCore) {
    window.mobileMonitor = new MobileMonitor(window.mobileCore);
  }
});
