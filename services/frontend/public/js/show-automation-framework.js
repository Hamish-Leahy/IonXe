// Show Automation Framework
// Automated show control with triggers, schedules, and external inputs

class ShowAutomationFramework {
  constructor(qListManager, timingManager, effectsEngine) {
    this.qListManager = qListManager;
    this.timingManager = timingManager;
    this.effectsEngine = effectsEngine;
    this.automations = new Map();
    this.schedules = new Map();
    this.triggers = new Map();
    this.externalInputs = new Map();
    this.isRunning = false;
    this.automationQueue = [];
    this.scheduler = null;
    this.inputListeners = new Map();
    
    this.initializeAutomationSystem();
  }

  // Automation Management
  createAutomation(id, config) {
    const automation = {
      id,
      name: config.name || 'Untitled Automation',
      description: config.description || '',
      type: config.type || 'sequence', // sequence, trigger, schedule, external
      enabled: config.enabled !== false,
      priority: config.priority || 0,
      conditions: config.conditions || [],
      actions: config.actions || [],
      parameters: config.parameters || {},
      executionCount: 0,
      maxExecutions: config.maxExecutions || -1,
      lastExecuted: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.automations.set(id, automation);
    this.setupAutomationListeners(automation);
    return automation;
  }

  // Sequence Automation
  createSequenceAutomation(id, config) {
    const automation = this.createAutomation(id, {
      ...config,
      type: 'sequence'
    });

    automation.sequence = {
      steps: config.steps || [],
      currentStep: 0,
      isRunning: false,
      loop: config.loop || false,
      loopCount: 0,
      maxLoops: config.maxLoops || -1
    };

    return automation;
  }

  executeSequenceAutomation(automationId) {
    const automation = this.automations.get(automationId);
    if (!automation || !automation.enabled) return false;

    // Check execution limits
    if (automation.maxExecutions > 0 && automation.executionCount >= automation.maxExecutions) {
      return false;
    }

    // Check conditions
    if (!this.evaluateConditions(automation.conditions)) {
      return false;
    }

    automation.sequence.isRunning = true;
    automation.executionCount++;
    automation.lastExecuted = Date.now();

    this.executeSequenceStep(automation);
    return true;
  }

  executeSequenceStep(automation) {
    if (!automation.sequence.isRunning) return;

    const step = automation.sequence.steps[automation.sequence.currentStep];
    if (!step) {
      // Sequence complete
      if (automation.sequence.loop && 
          (automation.sequence.maxLoops === -1 || 
           automation.sequence.loopCount < automation.sequence.maxLoops)) {
        automation.sequence.currentStep = 0;
        automation.sequence.loopCount++;
        this.executeSequenceStep(automation);
      } else {
        automation.sequence.isRunning = false;
      }
      return;
    }

    this.executeAutomationAction(step.action, step.parameters);

    // Schedule next step
    setTimeout(() => {
      automation.sequence.currentStep++;
      this.executeSequenceStep(automation);
    }, step.delay || 0);
  }

  // Trigger Automation
  createTriggerAutomation(id, config) {
    const automation = this.createAutomation(id, {
      ...config,
      type: 'trigger'
    });

    automation.trigger = {
      type: config.triggerType || 'manual', // manual, timing, external, cue_change
      parameters: config.triggerParameters || {},
      isActive: false,
      lastTriggered: null,
      triggerCount: 0
    };

    this.setupTriggerListener(automation);
    return automation;
  }

  setupTriggerListener(automation) {
    const trigger = automation.trigger;
    
    switch (trigger.type) {
      case 'cue_change':
        this.qListManager.onCueChanged = (cue) => {
          if (trigger.parameters.cueNumber && cue.number === trigger.parameters.cueNumber) {
            this.executeTriggerAutomation(automation.id);
          }
        };
        break;
      case 'timing':
        if (trigger.parameters.interval) {
          const intervalId = setInterval(() => {
            this.executeTriggerAutomation(automation.id);
          }, trigger.parameters.interval);
          this.inputListeners.set(automation.id, intervalId);
        }
        break;
      case 'external':
        // External triggers handled by external input system
        break;
    }
  }

  executeTriggerAutomation(automationId) {
    const automation = this.automations.get(automationId);
    if (!automation || !automation.enabled) return false;

    // Check execution limits
    if (automation.maxExecutions > 0 && automation.executionCount >= automation.maxExecutions) {
      return false;
    }

    // Check conditions
    if (!this.evaluateConditions(automation.conditions)) {
      return false;
    }

    automation.executionCount++;
    automation.lastExecuted = Date.now();
    automation.trigger.triggerCount++;
    automation.trigger.lastTriggered = Date.now();

    // Execute all actions
    for (const action of automation.actions) {
      this.executeAutomationAction(action.type, action.parameters);
    }

    return true;
  }

  // Schedule Automation
  createScheduleAutomation(id, config) {
    const automation = this.createAutomation(id, {
      ...config,
      type: 'schedule'
    });

    automation.schedule = {
      startTime: config.startTime || null,
      endTime: config.endTime || null,
      days: config.days || [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday
      interval: config.interval || null, // milliseconds
      lastExecuted: null,
      nextExecution: null
    };

    this.schedules.set(id, automation);
    this.scheduleAutomation(automation);
    return automation;
  }

  scheduleAutomation(automation) {
    const schedule = automation.schedule;
    
    if (schedule.startTime && schedule.endTime) {
      // Time-based schedule
      this.scheduleTimeBasedAutomation(automation);
    } else if (schedule.interval) {
      // Interval-based schedule
      this.scheduleIntervalAutomation(automation);
    }
  }

  scheduleTimeBasedAutomation(automation) {
    const schedule = automation.schedule;
    const now = new Date();
    const today = now.getDay();
    
    if (!schedule.days.includes(today)) return;

    const startTime = new Date(now);
    startTime.setHours(schedule.startTime.hour, schedule.startTime.minute, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(schedule.endTime.hour, schedule.endTime.minute, 0, 0);

    if (now >= startTime && now <= endTime) {
      this.executeScheduleAutomation(automation.id);
    }
  }

  scheduleIntervalAutomation(automation) {
    const intervalId = setInterval(() => {
      this.executeScheduleAutomation(automation.id);
    }, automation.schedule.interval);
    
    this.inputListeners.set(automation.id, intervalId);
  }

  executeScheduleAutomation(automationId) {
    const automation = this.automations.get(automationId);
    if (!automation || !automation.enabled) return false;

    // Check execution limits
    if (automation.maxExecutions > 0 && automation.executionCount >= automation.maxExecutions) {
      return false;
    }

    // Check conditions
    if (!this.evaluateConditions(automation.conditions)) {
      return false;
    }

    automation.executionCount++;
    automation.lastExecuted = Date.now();

    // Execute all actions
    for (const action of automation.actions) {
      this.executeAutomationAction(action.type, action.parameters);
    }

    return true;
  }

  // External Input Automation
  createExternalInputAutomation(id, config) {
    const automation = this.createAutomation(id, {
      ...config,
      type: 'external'
    });

    automation.externalInput = {
      inputId: config.inputId,
      inputType: config.inputType, // midi, osc, dmx, audio, custom
      parameters: config.inputParameters || {},
      isActive: false,
      lastValue: null,
      threshold: config.threshold || 0.5
    };

    this.setupExternalInputListener(automation);
    return automation;
  }

  setupExternalInputListener(automation) {
    const externalInput = automation.externalInput;
    
    switch (externalInput.inputType) {
      case 'midi':
        this.setupMIDIInputListener(automation);
        break;
      case 'osc':
        this.setupOSCInputListener(automation);
        break;
      case 'dmx':
        this.setupDMXInputListener(automation);
        break;
      case 'audio':
        this.setupAudioInputListener(automation);
        break;
      case 'custom':
        this.setupCustomInputListener(automation);
        break;
    }
  }

  setupMIDIInputListener(automation) {
    // MIDI input handling would be implemented here
    console.log('MIDI input listener setup for automation:', automation.id);
  }

  setupOSCInputListener(automation) {
    // OSC input handling would be implemented here
    console.log('OSC input listener setup for automation:', automation.id);
  }

  setupDMXInputListener(automation) {
    // DMX input handling would be implemented here
    console.log('DMX input listener setup for automation:', automation.id);
  }

  setupAudioInputListener(automation) {
    // Audio input handling would be implemented here
    console.log('Audio input listener setup for automation:', automation.id);
  }

  setupCustomInputListener(automation) {
    // Custom input handling would be implemented here
    console.log('Custom input listener setup for automation:', automation.id);
  }

  // Action Execution
  executeAutomationAction(actionType, parameters) {
    switch (actionType) {
      case 'go_to_cue':
        this.qListManager.goToCue(parameters.cueNumber);
        break;
      case 'next_cue':
        this.qListManager.nextCue();
        break;
      case 'previous_cue':
        this.qListManager.previousCue();
        break;
      case 'play':
        this.qListManager.play();
        break;
      case 'pause':
        this.qListManager.pause();
        break;
      case 'stop':
        this.qListManager.stop();
        break;
      case 'set_levels':
        this.qListManager.setLevels(new Uint8Array(parameters.levels));
        break;
      case 'fade_to_levels':
        this.qListManager.fadeToLevels(new Uint8Array(parameters.levels), parameters.fadeTime);
        break;
      case 'start_effect':
        this.effectsEngine.startEffect(parameters.effectId, parameters.channels, parameters.parameters);
        break;
      case 'stop_effect':
        this.effectsEngine.stopEffect(parameters.effectId);
        break;
      case 'set_timing':
        this.timingManager.applyTimingPreset(parameters.cueId, parameters.presetId);
        break;
      case 'wait':
        // Wait is handled by sequence automation
        break;
      case 'conditional':
        if (this.evaluateConditions(parameters.conditions)) {
          this.executeAutomationAction(parameters.action, parameters.parameters);
        }
        break;
      case 'loop':
        // Loop is handled by sequence automation
        break;
      case 'custom':
        if (parameters.callback) {
          parameters.callback(parameters.data);
        }
        break;
      default:
        console.warn('Unknown automation action type:', actionType);
    }
  }

  // Condition Evaluation
  evaluateConditions(conditions) {
    for (const condition of conditions) {
      if (!this.evaluateCondition(condition)) {
        return false;
      }
    }
    return true;
  }

  evaluateCondition(condition) {
    switch (condition.type) {
      case 'cue_number':
        return this.compareValues(
          this.qListManager.currentCueIndex + 1,
          condition.value,
          condition.operator
        );
      case 'timing':
        return this.compareValues(
          Date.now(),
          condition.value,
          condition.operator
        );
      case 'external_input':
        const input = this.externalInputs.get(condition.inputId);
        return input ? this.compareValues(input.value, condition.value, condition.operator) : false;
      case 'automation_state':
        const automation = this.automations.get(condition.automationId);
        return automation ? automation.enabled === condition.value : false;
      case 'custom':
        if (condition.evaluator) {
          return condition.evaluator();
        }
        return true;
      default:
        return true;
    }
  }

  compareValues(current, target, operator) {
    switch (operator) {
      case 'equals':
        return current === target;
      case 'not_equals':
        return current !== target;
      case 'greater':
        return current > target;
      case 'less':
        return current < target;
      case 'greater_equal':
        return current >= target;
      case 'less_equal':
        return current <= target;
      case 'contains':
        return String(current).includes(String(target));
      case 'not_contains':
        return !String(current).includes(String(target));
      default:
        return true;
    }
  }

  // Automation Control
  startAutomation(automationId) {
    const automation = this.automations.get(automationId);
    if (!automation) return false;

    automation.enabled = true;
    
    switch (automation.type) {
      case 'sequence':
        this.executeSequenceAutomation(automationId);
        break;
      case 'trigger':
        automation.trigger.isActive = true;
        break;
      case 'schedule':
        this.scheduleAutomation(automation);
        break;
      case 'external':
        automation.externalInput.isActive = true;
        break;
    }

    this.notifyAutomationEvent('automation_started', automation);
    return true;
  }

  stopAutomation(automationId) {
    const automation = this.automations.get(automationId);
    if (!automation) return false;

    automation.enabled = false;
    
    switch (automation.type) {
      case 'sequence':
        automation.sequence.isRunning = false;
        break;
      case 'trigger':
        automation.trigger.isActive = false;
        break;
      case 'schedule':
        // Stop scheduled automation
        break;
      case 'external':
        automation.externalInput.isActive = false;
        break;
    }

    // Clear any listeners
    if (this.inputListeners.has(automationId)) {
      clearInterval(this.inputListeners.get(automationId));
      this.inputListeners.delete(automationId);
    }

    this.notifyAutomationEvent('automation_stopped', automation);
    return true;
  }

  // System Control
  startAutomationSystem() {
    this.isRunning = true;
    this.notifyAutomationEvent('system_started', null);
  }

  stopAutomationSystem() {
    this.isRunning = false;
    
    // Stop all automations
    for (const automationId of this.automations.keys()) {
      this.stopAutomation(automationId);
    }
    
    this.notifyAutomationEvent('system_stopped', null);
  }

  // Event Notifications
  notifyAutomationEvent(eventType, automationData) {
    const event = new CustomEvent('automation-event', {
      detail: { eventType, automationData }
    });
    document.dispatchEvent(event);
  }

  // Utility Functions
  getAllAutomations() {
    return Array.from(this.automations.values());
  }

  getAutomationStatus(automationId) {
    const automation = this.automations.get(automationId);
    if (!automation) return null;

    return {
      id: automation.id,
      name: automation.name,
      type: automation.type,
      enabled: automation.enabled,
      executionCount: automation.executionCount,
      lastExecuted: automation.lastExecuted,
      isRunning: this.isAutomationRunning(automation)
    };
  }

  isAutomationRunning(automation) {
    switch (automation.type) {
      case 'sequence':
        return automation.sequence.isRunning;
      case 'trigger':
        return automation.trigger.isActive;
      case 'schedule':
        return automation.enabled;
      case 'external':
        return automation.externalInput.isActive;
      default:
        return false;
    }
  }

  // Cleanup
  destroy() {
    this.stopAutomationSystem();
    
    // Clear all listeners
    for (const intervalId of this.inputListeners.values()) {
      clearInterval(intervalId);
    }
    
    this.automations.clear();
    this.schedules.clear();
    this.triggers.clear();
    this.externalInputs.clear();
    this.inputListeners.clear();
    this.automationQueue = [];
  }
}

// Global Show Automation Framework Instance
const showAutomationFramework = new ShowAutomationFramework(qListManager, qListTimingManager, effectsEngine);
