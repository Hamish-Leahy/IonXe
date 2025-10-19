// Advanced Cue Sequencing System
// Handles complex cue sequences, loops, and conditional execution

class CueSequencingEngine {
  constructor(qListManager, qListTimingManager) {
    this.qListManager = qListManager;
    this.timingManager = qListTimingManager;
    this.sequences = new Map();
    this.activeSequences = new Set();
    this.sequenceQueue = [];
    this.conditions = new Map();
    this.loops = new Map();
    this.triggers = new Map();
    
    this.initializeDefaultSequences();
    this.startSequenceProcessor();
  }

  // Sequence Management
  createSequence(id, config) {
    const sequence = {
      id,
      name: config.name || 'Untitled Sequence',
      description: config.description || '',
      cues: config.cues || [],
      conditions: config.conditions || [],
      loops: config.loops || [],
      triggers: config.triggers || [],
      priority: config.priority || 0,
      isActive: false,
      currentStep: 0,
      executionCount: 0,
      maxExecutions: config.maxExecutions || -1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sequences.set(id, sequence);
    return sequence;
  }

  executeSequence(sequenceId, context = {}) {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return false;

    // Check execution limits
    if (sequence.maxExecutions > 0 && sequence.executionCount >= sequence.maxExecutions) {
      return false;
    }

    // Check conditions
    if (!this.evaluateConditions(sequence.conditions, context)) {
      return false;
    }

    // Add to active sequences
    this.activeSequences.add(sequenceId);
    sequence.isActive = true;
    sequence.executionCount++;

    // Queue sequence execution
    this.sequenceQueue.push({
      sequenceId,
      context,
      startTime: Date.now(),
      priority: sequence.priority
    });

    this.sortSequenceQueue();
    return true;
  }

  // Loop Management
  createLoop(id, config) {
    const loop = {
      id,
      name: config.name || 'Untitled Loop',
      startCue: config.startCue || 1,
      endCue: config.endCue || 1,
      iterations: config.iterations || -1,
      delay: config.delay || 0,
      fadeTime: config.fadeTime || 0,
      direction: config.direction || 'forward', // forward, backward, pingpong
      isActive: false,
      currentIteration: 0,
      currentDirection: 'forward',
      createdAt: new Date().toISOString()
    };

    this.loops.set(id, loop);
    return loop;
  }

  startLoop(loopId) {
    const loop = this.loops.get(loopId);
    if (!loop) return false;

    loop.isActive = true;
    loop.currentIteration = 0;
    loop.currentDirection = loop.direction;

    this.executeLoopStep(loop);
    return true;
  }

  executeLoopStep(loop) {
    if (!loop.isActive) return;

    const cues = this.qListManager.cues.filter(cue => 
      cue.number >= loop.startCue && cue.number <= loop.endCue
    );

    if (cues.length === 0) return;

    let targetCue;
    if (loop.direction === 'forward') {
      targetCue = cues[loop.currentIteration % cues.length];
    } else if (loop.direction === 'backward') {
      const index = cues.length - 1 - (loop.currentIteration % cues.length);
      targetCue = cues[index];
    } else if (loop.direction === 'pingpong') {
      const cycleLength = cues.length * 2 - 2;
      const position = loop.currentIteration % cycleLength;
      if (position < cues.length) {
        targetCue = cues[position];
      } else {
        targetCue = cues[cues.length - 2 - (position - cues.length)];
      }
    }

    if (targetCue) {
      this.qListManager.goToCue(targetCue.number);
      
      // Schedule next iteration
      setTimeout(() => {
        loop.currentIteration++;
        if (loop.iterations > 0 && loop.currentIteration >= loop.iterations) {
          loop.isActive = false;
        } else {
          this.executeLoopStep(loop);
        }
      }, loop.delay);
    }
  }

  // Conditional Execution
  createCondition(id, config) {
    const condition = {
      id,
      name: config.name || 'Untitled Condition',
      type: config.type || 'cue_number', // cue_number, timing, external, custom
      operator: config.operator || 'equals', // equals, greater, less, contains, etc.
      value: config.value,
      target: config.target,
      isMet: false,
      lastChecked: null,
      createdAt: new Date().toISOString()
    };

    this.conditions.set(id, condition);
    return condition;
  }

  evaluateConditions(conditionIds, context) {
    for (const conditionId of conditionIds) {
      const condition = this.conditions.get(conditionId);
      if (!condition) continue;

      const isMet = this.evaluateCondition(condition, context);
      condition.isMet = isMet;
      condition.lastChecked = Date.now();

      if (!isMet) return false;
    }
    return true;
  }

  evaluateCondition(condition, context) {
    let currentValue;

    switch (condition.type) {
      case 'cue_number':
        currentValue = this.qListManager.currentCueIndex + 1;
        break;
      case 'timing':
        currentValue = Date.now();
        break;
      case 'external':
        currentValue = context[condition.target] || 0;
        break;
      case 'custom':
        if (condition.customEvaluator) {
          return condition.customEvaluator(context);
        }
        return true;
      default:
        return true;
    }

    return this.compareValues(currentValue, condition.value, condition.operator);
  }

  compareValues(current, target, operator) {
    switch (operator) {
      case 'equals':
        return current === target;
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
      case 'not_equals':
        return current !== target;
      default:
        return true;
    }
  }

  // Trigger System
  createTrigger(id, config) {
    const trigger = {
      id,
      name: config.name || 'Untitled Trigger',
      type: config.type || 'manual', // manual, timing, external, cue_change
      action: config.action || 'execute_sequence',
      target: config.target,
      parameters: config.parameters || {},
      isActive: false,
      lastTriggered: null,
      triggerCount: 0,
      createdAt: new Date().toISOString()
    };

    this.triggers.set(id, trigger);
    this.setupTriggerListener(trigger);
    return trigger;
  }

  setupTriggerListener(trigger) {
    switch (trigger.type) {
      case 'cue_change':
        this.qListManager.onCueChanged = (cue) => {
          if (trigger.parameters.cueNumber && cue.number === trigger.parameters.cueNumber) {
            this.executeTrigger(trigger);
          }
        };
        break;
      case 'timing':
        if (trigger.parameters.interval) {
          setInterval(() => {
            this.executeTrigger(trigger);
          }, trigger.parameters.interval);
        }
        break;
      case 'external':
        // External triggers would be set up via API
        break;
    }
  }

  executeTrigger(trigger) {
    if (!trigger.isActive) return;

    trigger.lastTriggered = Date.now();
    trigger.triggerCount++;

    switch (trigger.action) {
      case 'execute_sequence':
        this.executeSequence(trigger.target);
        break;
      case 'start_loop':
        this.startLoop(trigger.target);
        break;
      case 'stop_loop':
        this.stopLoop(trigger.target);
        break;
      case 'go_to_cue':
        this.qListManager.goToCue(trigger.parameters.cueNumber);
        break;
      case 'custom':
        if (trigger.parameters.callback) {
          trigger.parameters.callback(trigger);
        }
        break;
    }
  }

  // Sequence Processing
  startSequenceProcessor() {
    const processSequences = () => {
      this.processSequenceQueue();
      requestAnimationFrame(processSequences);
    };
    processSequences();
  }

  processSequenceQueue() {
    if (this.sequenceQueue.length === 0) return;

    const now = Date.now();
    const readySequences = this.sequenceQueue.filter(item => 
      now >= item.startTime
    );

    for (const item of readySequences) {
      this.executeSequenceStep(item);
      this.sequenceQueue = this.sequenceQueue.filter(q => q !== item);
    }
  }

  executeSequenceStep(item) {
    const sequence = this.sequences.get(item.sequenceId);
    if (!sequence || !sequence.isActive) return;

    const step = sequence.cues[sequence.currentStep];
    if (!step) {
      // Sequence complete
      sequence.isActive = false;
      this.activeSequences.delete(item.sequenceId);
      return;
    }

    // Execute step
    if (step.type === 'cue') {
      this.qListManager.goToCue(step.cueNumber);
    } else if (step.type === 'wait') {
      setTimeout(() => {
        sequence.currentStep++;
        this.executeSequenceStep(item);
      }, step.duration);
      return;
    } else if (step.type === 'condition') {
      if (this.evaluateConditions([step.conditionId], item.context)) {
        sequence.currentStep++;
      } else {
        // Condition not met, skip or stop
        if (step.skipOnFail) {
          sequence.currentStep++;
        } else {
          sequence.isActive = false;
          this.activeSequences.delete(item.sequenceId);
          return;
        }
      }
    }

    sequence.currentStep++;
  }

  sortSequenceQueue() {
    this.sequenceQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.startTime - b.startTime; // Earlier time first
    });
  }

  // Utility Functions
  stopSequence(sequenceId) {
    const sequence = this.sequences.get(sequenceId);
    if (sequence) {
      sequence.isActive = false;
      this.activeSequences.delete(sequenceId);
    }
  }

  stopLoop(loopId) {
    const loop = this.loops.get(loopId);
    if (loop) {
      loop.isActive = false;
    }
  }

  stopTrigger(triggerId) {
    const trigger = this.triggers.get(triggerId);
    if (trigger) {
      trigger.isActive = false;
    }
  }

  getSequenceStatus(sequenceId) {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return null;

    return {
      id: sequence.id,
      name: sequence.name,
      isActive: sequence.isActive,
      currentStep: sequence.currentStep,
      totalSteps: sequence.cues.length,
      executionCount: sequence.executionCount,
      progress: sequence.cues.length > 0 ? (sequence.currentStep / sequence.cues.length) * 100 : 0
    };
  }

  getAllSequences() {
    return Array.from(this.sequences.values());
  }

  getAllLoops() {
    return Array.from(this.loops.values());
  }

  getAllTriggers() {
    return Array.from(this.triggers.values());
  }

  // Cleanup
  destroy() {
    this.sequences.clear();
    this.activeSequences.clear();
    this.sequenceQueue = [];
    this.conditions.clear();
    this.loops.clear();
    this.triggers.clear();
  }
}

// Global Sequencing Engine Instance
const cueSequencingEngine = new CueSequencingEngine(qListManager, qListTimingManager);
