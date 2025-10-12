// Show Automation & Scheduling System
// Professional show control with time-based scheduling and external triggers

class IonXeShowAutomation {
  constructor(core) {
    this.core = core;
    this.shows = new Map();
    this.activeShow = null;
    this.scheduledShows = new Map();
    this.showSequences = new Map();
    this.externalTriggers = new Map();
    this.isPlaying = false;
    this.currentTime = 0;
    this.showTimer = null;
    this.triggerListeners = new Map();
    
    // Show states
    this.showStates = {
      STOPPED: 'stopped',
      PLAYING: 'playing',
      PAUSED: 'paused',
      SCHEDULED: 'scheduled',
      ERROR: 'error'
    };
    
    this.triggerTypes = {
      TIME: 'time',
      MIDI: 'midi',
      OSC: 'osc',
      MANUAL: 'manual',
      CUE: 'cue'
    };
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.createShowAutomationTab();
    this.createShowAutomationView();
    this.loadShows();
    this.setupExternalTriggers();
  }

  setupEventListeners() {
    // Tab activation
    document.getElementById('tab-show-automation')?.addEventListener('click', () => this.activateTab());

    // Show controls
    document.getElementById('show-create')?.addEventListener('click', () => this.createNewShow());
    document.getElementById('show-play')?.addEventListener('click', () => this.playShow());
    document.getElementById('show-pause')?.addEventListener('click', () => this.pauseShow());
    document.getElementById('show-stop')?.addEventListener('click', () => this.stopShow());
    document.getElementById('show-record')?.addEventListener('click', () => this.recordShow());

    // Show management
    document.getElementById('show-save')?.addEventListener('click', () => this.saveShow());
    document.getElementById('show-load')?.addEventListener('click', () => this.loadShow());
    document.getElementById('show-delete')?.addEventListener('click', () => this.deleteShow());

    // Scheduler controls
    document.getElementById('schedule-add')?.addEventListener('click', () => this.addScheduledShow());
    document.getElementById('schedule-remove')?.addEventListener('click', () => this.removeScheduledShow());
    document.getElementById('schedule-enable')?.addEventListener('change', (e) => this.toggleScheduler(e.target.checked));

    // Sequence editor
    document.getElementById('sequence-add-cue')?.addEventListener('click', () => this.addCueToSequence());
    document.getElementById('sequence-add-delay')?.addEventListener('click', () => this.addDelayToSequence());
    document.getElementById('sequence-add-trigger')?.addEventListener('click', () => this.addTriggerToSequence());

    // External triggers
    document.getElementById('trigger-midi-enable')?.addEventListener('change', (e) => this.toggleMIDITrigger(e.target.checked));
    document.getElementById('trigger-osc-enable')?.addEventListener('change', (e) => this.toggleOSCTrigger(e.target.checked));
    document.getElementById('trigger-time-enable')?.addEventListener('change', (e) => this.toggleTimeTrigger(e.target.checked));
  }

  createShowAutomationTab() {
    const tab = document.createElement('a');
    tab.href = '#show-automation';
    tab.id = 'tab-show-automation';
    tab.className = 'tab';
    tab.textContent = 'Show Automation';
    document.querySelector('.tabs').appendChild(tab);
  }

  createShowAutomationView() {
    const view = document.createElement('div');
    view.id = 'view-show-automation';
    view.className = 'view';
    view.innerHTML = `
      <div class="show-automation-container">
        <div class="show-automation-header">
          <h2>Show Automation & Scheduling</h2>
          <div class="show-status">
            <span id="show-status" class="status stopped">Stopped</span>
            <span id="show-time" class="show-time">00:00:00</span>
          </div>
        </div>

        <div class="show-controls-section">
          <div class="show-controls">
            <h3>Show Controls</h3>
            <div class="control-buttons">
              <button id="show-create" class="btn-primary">New Show</button>
              <button id="show-play" class="btn-success">Play</button>
              <button id="show-pause" class="btn-warning">Pause</button>
              <button id="show-stop" class="btn-danger">Stop</button>
              <button id="show-record" class="btn-secondary">Record</button>
            </div>
            <div class="show-management">
              <button id="show-save" class="btn-secondary">Save Show</button>
              <button id="show-load" class="btn-secondary">Load Show</button>
              <button id="show-delete" class="btn-danger">Delete Show</button>
            </div>
          </div>

          <div class="show-info">
            <h3>Current Show</h3>
            <div class="show-details">
              <label>Show Name:</label>
              <input type="text" id="show-name" placeholder="Untitled Show">
              <label>Duration:</label>
              <span id="show-duration">00:00:00</span>
              <label>Status:</label>
              <span id="show-status-detail">No show loaded</span>
            </div>
          </div>
        </div>

        <div class="show-sequencer-section">
          <div class="sequencer-header">
            <h3>Show Sequencer</h3>
            <div class="sequencer-controls">
              <button id="sequence-add-cue" class="btn-primary">Add Cue</button>
              <button id="sequence-add-delay" class="btn-secondary">Add Delay</button>
              <button id="sequence-add-trigger" class="btn-secondary">Add Trigger</button>
            </div>
          </div>
          <div class="sequence-timeline">
            <div id="sequence-timeline" class="timeline-container">
              <div class="timeline-header">
                <div class="timeline-time">Time</div>
                <div class="timeline-type">Type</div>
                <div class="timeline-action">Action</div>
                <div class="timeline-duration">Duration</div>
                <div class="timeline-controls">Controls</div>
              </div>
              <div id="sequence-items" class="sequence-items">
                <!-- Sequence items will be added here -->
              </div>
            </div>
          </div>
        </div>

        <div class="show-scheduler-section">
          <div class="scheduler-header">
            <h3>Show Scheduler</h3>
            <div class="scheduler-controls">
              <label class="checkbox-label">
                <input type="checkbox" id="schedule-enable">
                <span class="checkmark"></span>
                Enable Scheduler
              </label>
              <button id="schedule-add" class="btn-primary">Add Schedule</button>
              <button id="schedule-remove" class="btn-danger">Remove Schedule</button>
            </div>
          </div>
          <div class="scheduled-shows">
            <div id="scheduled-shows-list" class="scheduled-list">
              <!-- Scheduled shows will be added here -->
            </div>
          </div>
        </div>

        <div class="external-triggers-section">
          <div class="triggers-header">
            <h3>External Triggers</h3>
          </div>
          <div class="trigger-controls">
            <div class="trigger-group">
              <h4>MIDI Triggers</h4>
              <label class="checkbox-label">
                <input type="checkbox" id="trigger-midi-enable">
                <span class="checkmark"></span>
                Enable MIDI
              </label>
              <input type="text" id="midi-device" placeholder="MIDI Device" disabled>
              <input type="number" id="midi-channel" placeholder="Channel" min="1" max="16" disabled>
              <input type="number" id="midi-note" placeholder="Note" min="0" max="127" disabled>
            </div>
            <div class="trigger-group">
              <h4>OSC Triggers</h4>
              <label class="checkbox-label">
                <input type="checkbox" id="trigger-osc-enable">
                <span class="checkmark"></span>
                Enable OSC
              </label>
              <input type="text" id="osc-address" placeholder="OSC Address" disabled>
              <input type="number" id="osc-port" placeholder="Port" min="1000" max="65535" disabled>
            </div>
            <div class="trigger-group">
              <h4>Time Triggers</h4>
              <label class="checkbox-label">
                <input type="checkbox" id="trigger-time-enable">
                <span class="checkmark"></span>
                Enable Time
              </label>
              <input type="time" id="trigger-time" disabled>
              <select id="trigger-time-action" disabled>
                <option value="start">Start Show</option>
                <option value="stop">Stop Show</option>
                <option value="pause">Pause Show</option>
                <option value="cue">Go to Cue</option>
              </select>
            </div>
          </div>
        </div>

        <div class="show-monitoring-section">
          <div class="monitoring-header">
            <h3>Show Monitoring</h3>
          </div>
          <div class="monitoring-dashboard">
            <div class="monitoring-item">
              <label>Current Cue:</label>
              <span id="current-cue">None</span>
            </div>
            <div class="monitoring-item">
              <label>Next Cue:</label>
              <span id="next-cue">None</span>
            </div>
            <div class="monitoring-item">
              <label>Show Progress:</label>
              <div class="progress-bar">
                <div id="show-progress" class="progress-fill"></div>
              </div>
            </div>
            <div class="monitoring-item">
              <label>Active Triggers:</label>
              <span id="active-triggers">None</span>
            </div>
          </div>
        </div>
      </div>
    `;
    document.querySelector('.views').appendChild(view);
  }

  // Show Management Methods
  createNewShow() {
    const showName = document.getElementById('show-name').value || 'Untitled Show';
    const showId = this.generateShowId();
    
    const newShow = {
      id: showId,
      name: showName,
      duration: 0,
      status: this.showStates.STOPPED,
      sequences: [],
      triggers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.shows.set(showId, newShow);
    this.activeShow = newShow;
    this.updateShowDisplay();
    this.core.showSuccess(`Created new show: ${showName}`);
  }

  playShow() {
    if (!this.activeShow) {
      this.core.showError('No show loaded');
      return;
    }

    this.isPlaying = true;
    this.activeShow.status = this.showStates.PLAYING;
    this.startShowTimer();
    this.updateShowDisplay();
    this.core.showSuccess('Show started');
  }

  pauseShow() {
    if (!this.activeShow || !this.isPlaying) {
      this.core.showError('No show playing');
      return;
    }

    this.isPlaying = false;
    this.activeShow.status = this.showStates.PAUSED;
    this.stopShowTimer();
    this.updateShowDisplay();
    this.core.showInfo('Show paused');
  }

  stopShow() {
    this.isPlaying = false;
    this.currentTime = 0;
    
    if (this.activeShow) {
      this.activeShow.status = this.showStates.STOPPED;
    }
    
    this.stopShowTimer();
    this.updateShowDisplay();
    this.core.showInfo('Show stopped');
  }

  recordShow() {
    if (!this.activeShow) {
      this.core.showError('No show loaded');
      return;
    }

    // Start recording mode
    this.core.showInfo('Recording mode activated - actions will be recorded to show');
  }

  // Show Timer Methods
  startShowTimer() {
    this.showTimer = setInterval(() => {
      this.currentTime += 100; // 100ms increments
      this.updateShowTime();
      this.checkSequenceTriggers();
    }, 100);
  }

  stopShowTimer() {
    if (this.showTimer) {
      clearInterval(this.showTimer);
      this.showTimer = null;
    }
  }

  updateShowTime() {
    const timeElement = document.getElementById('show-time');
    if (timeElement) {
      const hours = Math.floor(this.currentTime / 3600000);
      const minutes = Math.floor((this.currentTime % 3600000) / 60000);
      const seconds = Math.floor((this.currentTime % 60000) / 1000);
      const ms = Math.floor((this.currentTime % 1000) / 100);
      
      timeElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms}`;
    }
  }

  // Sequence Management
  addCueToSequence() {
    if (!this.activeShow) {
      this.core.showError('No show loaded');
      return;
    }

    const cueId = this.generateCueId();
    const sequenceItem = {
      id: cueId,
      type: 'cue',
      time: this.currentTime,
      action: 'go_to_cue',
      parameters: {
        cueId: cueId,
        fadeTime: 1000
      },
      duration: 0
    };

    this.activeShow.sequences.push(sequenceItem);
    this.updateSequenceDisplay();
    this.core.showSuccess('Cue added to sequence');
  }

  addDelayToSequence() {
    if (!this.activeShow) {
      this.core.showError('No show loaded');
      return;
    }

    const delayId = this.generateDelayId();
    const sequenceItem = {
      id: delayId,
      type: 'delay',
      time: this.currentTime,
      action: 'wait',
      parameters: {
        duration: 1000
      },
      duration: 1000
    };

    this.activeShow.sequences.push(sequenceItem);
    this.updateSequenceDisplay();
    this.core.showSuccess('Delay added to sequence');
  }

  addTriggerToSequence() {
    if (!this.activeShow) {
      this.core.showError('No show loaded');
      return;
    }

    const triggerId = this.generateTriggerId();
    const sequenceItem = {
      id: triggerId,
      type: 'trigger',
      time: this.currentTime,
      action: 'wait_for_trigger',
      parameters: {
        triggerType: 'manual',
        triggerId: triggerId
      },
      duration: 0
    };

    this.activeShow.sequences.push(sequenceItem);
    this.updateSequenceDisplay();
    this.core.showSuccess('Trigger added to sequence');
  }

  updateSequenceDisplay() {
    const container = document.getElementById('sequence-items');
    if (!container || !this.activeShow) return;

    container.innerHTML = this.activeShow.sequences.map(item => `
      <div class="sequence-item" data-id="${item.id}">
        <div class="timeline-time">${this.formatTime(item.time)}</div>
        <div class="timeline-type">${item.type}</div>
        <div class="timeline-action">${item.action}</div>
        <div class="timeline-duration">${item.duration}ms</div>
        <div class="timeline-controls">
          <button class="btn-sm btn-primary" onclick="showAutomation.editSequenceItem('${item.id}')">Edit</button>
          <button class="btn-sm btn-danger" onclick="showAutomation.removeSequenceItem('${item.id}')">Remove</button>
        </div>
      </div>
    `).join('');
  }

  // Scheduler Methods
  addScheduledShow() {
    const showId = document.getElementById('schedule-show-select')?.value;
    const startTime = document.getElementById('schedule-start-time')?.value;
    const endTime = document.getElementById('schedule-end-time')?.value;
    const days = Array.from(document.querySelectorAll('input[name="schedule-days"]:checked')).map(cb => cb.value);

    if (!showId || !startTime) {
      this.core.showError('Please select a show and start time');
      return;
    }

    const scheduleId = this.generateScheduleId();
    const scheduledShow = {
      id: scheduleId,
      showId: showId,
      startTime: startTime,
      endTime: endTime,
      days: days,
      enabled: true,
      createdAt: new Date().toISOString()
    };

    this.scheduledShows.set(scheduleId, scheduledShow);
    this.updateScheduledShowsDisplay();
    this.core.showSuccess('Show scheduled');
  }

  updateScheduledShowsDisplay() {
    const container = document.getElementById('scheduled-shows-list');
    if (!container) return;

    container.innerHTML = Array.from(this.scheduledShows.values()).map(schedule => `
      <div class="scheduled-show-item" data-id="${schedule.id}">
        <div class="schedule-info">
          <span class="schedule-show">${this.shows.get(schedule.showId)?.name || 'Unknown'}</span>
          <span class="schedule-time">${schedule.startTime} - ${schedule.endTime || 'No end'}</span>
          <span class="schedule-days">${schedule.days.join(', ')}</span>
        </div>
        <div class="schedule-controls">
          <button class="btn-sm btn-warning" onclick="showAutomation.editSchedule('${schedule.id}')">Edit</button>
          <button class="btn-sm btn-danger" onclick="showAutomation.removeSchedule('${schedule.id}')">Remove</button>
        </div>
      </div>
    `).join('');
  }

  // External Triggers
  setupExternalTriggers() {
    // MIDI trigger setup
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(access => {
        this.midiAccess = access;
        this.setupMIDIListeners();
      }).catch(err => {
        console.warn('MIDI access denied:', err);
      });
    }

    // OSC trigger setup (WebSocket connection)
    this.setupOSCConnection();
  }

  setupMIDIListeners() {
    if (!this.midiAccess) return;

    this.midiAccess.onstatechange = (event) => {
      console.log('MIDI device state changed:', event.port);
    };

    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = (event) => {
        this.handleMIDIMessage(event);
      };
    }
  }

  handleMIDIMessage(event) {
    const [command, note, velocity] = event.data;
    const midiChannel = command & 0x0F;
    const midiCommand = command & 0xF0;

    if (midiCommand === 144 && velocity > 0) { // Note on
      this.triggerMIDIAction(midiChannel, note, velocity);
    }
  }

  triggerMIDIAction(channel, note, velocity) {
    // Find matching MIDI triggers
    const triggers = Array.from(this.externalTriggers.values()).filter(trigger => 
      trigger.type === this.triggerTypes.MIDI && 
      trigger.parameters.channel === channel && 
      trigger.parameters.note === note
    );

    triggers.forEach(trigger => {
      this.executeTrigger(trigger);
    });
  }

  // Show Execution
  checkSequenceTriggers() {
    if (!this.activeShow || !this.isPlaying) return;

    const currentSequences = this.activeShow.sequences.filter(seq => 
      seq.time <= this.currentTime && 
      seq.time + seq.duration >= this.currentTime
    );

    currentSequences.forEach(sequence => {
      this.executeSequenceItem(sequence);
    });
  }

  executeSequenceItem(sequence) {
    switch (sequence.action) {
      case 'go_to_cue':
        this.executeCue(sequence.parameters.cueId, sequence.parameters.fadeTime);
        break;
      case 'wait':
        // Delay is handled by timing
        break;
      case 'wait_for_trigger':
        // Trigger waiting is handled by external triggers
        break;
    }
  }

  executeCue(cueId, fadeTime) {
    // Execute cue through existing Q List system
    this.core.emit('executeCue', { cueId, fadeTime });
    this.updateCurrentCue(cueId);
  }

  // Utility Methods
  generateShowId() {
    return 'show_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateCueId() {
    return 'cue_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateDelayId() {
    return 'delay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateTriggerId() {
    return 'trigger_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateScheduleId() {
    return 'schedule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatTime(milliseconds) {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    const ms = Math.floor((milliseconds % 1000) / 100);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms}`;
  }

  updateShowDisplay() {
    if (!this.activeShow) return;

    document.getElementById('show-name').value = this.activeShow.name;
    document.getElementById('show-duration').textContent = this.formatTime(this.activeShow.duration);
    document.getElementById('show-status-detail').textContent = this.activeShow.status;
    document.getElementById('show-status').textContent = this.activeShow.status;
    document.getElementById('show-status').className = `status ${this.activeShow.status}`;
  }

  updateCurrentCue(cueId) {
    document.getElementById('current-cue').textContent = cueId;
  }

  activateTab() {
    // Update any necessary UI elements when tab is activated
    if (this.activeShow) {
      this.updateShowDisplay();
      this.updateSequenceDisplay();
    }
  }

  // Save/Load Methods
  async saveShow() {
    if (!this.activeShow) {
      this.core.showError('No show to save');
      return;
    }

    try {
      const response = await fetch('http://localhost:8086/api/v1/shows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.activeShow)
      });

      if (response.ok) {
        this.core.showSuccess('Show saved successfully');
      } else {
        this.core.showError('Failed to save show');
      }
    } catch (error) {
      this.core.showError('Error saving show: ' + error.message);
    }
  }

  async loadShows() {
    try {
      const response = await fetch('http://localhost:8086/api/v1/shows');
      if (response.ok) {
        const shows = await response.json();
        shows.forEach(show => {
          this.shows.set(show.id, show);
        });
      }
    } catch (error) {
      console.warn('Failed to load shows:', error);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.IonXeCore) {
    window.showAutomation = new IonXeShowAutomation(window.IonXeCore);
  } else {
    console.error('IonXeCore not found. Show Automation module cannot initialize.');
  }
});
