// Q List Labeling System
// Manages cue labels, descriptions, and metadata

class QListLabelManager {
  constructor(qListManager) {
    this.qListManager = qListManager;
    this.labelTemplates = new Map();
    this.labelCategories = new Map();
    this.initializeDefaultTemplates();
  }

  // Label Templates
  initializeDefaultTemplates() {
    // Default label templates for common cue types
    this.labelTemplates.set('blackout', {
      name: 'Blackout',
      description: 'All channels at 0%',
      icon: '🔴',
      color: '#ff4444'
    });

    this.labelTemplates.set('full', {
      name: 'Full Stage',
      description: 'All channels at 100%',
      icon: '⚪',
      color: '#44ff44'
    });

    this.labelTemplates.set('warm', {
      name: 'Warm Wash',
      description: 'Warm color temperature wash',
      icon: '🟡',
      color: '#ffaa44'
    });

    this.labelTemplates.set('cool', {
      name: 'Cool Wash',
      description: 'Cool color temperature wash',
      icon: '🔵',
      color: '#4444ff'
    });

    this.labelTemplates.set('special', {
      name: 'Special',
      description: 'Special effect or accent',
      icon: '✨',
      color: '#ff44ff'
    });

    this.labelTemplates.set('transition', {
      name: 'Transition',
      description: 'Scene transition or bridge',
      icon: '➡️',
      color: '#44ffff'
    });

    // Label categories
    this.labelCategories.set('lighting', {
      name: 'Lighting',
      templates: ['blackout', 'full', 'warm', 'cool', 'special']
    });

    this.labelCategories.set('effects', {
      name: 'Effects',
      templates: ['special', 'transition']
    });

    this.labelCategories.set('scenes', {
      name: 'Scenes',
      templates: ['warm', 'cool', 'full']
    });
  }

  // Cue Labeling
  setCueLabel(cueId, label, description = '') {
    const cue = this.qListManager.cues.find(c => c.id === cueId);
    if (!cue) return false;

    cue.label = label;
    cue.description = description;
    cue.updatedAt = new Date().toISOString();
    
    this.qListManager.notifyCueListUpdated();
    return true;
  }

  applyLabelTemplate(cueId, templateId) {
    const template = this.labelTemplates.get(templateId);
    if (!template) return false;

    const cue = this.qListManager.cues.find(c => c.id === cueId);
    if (!cue) return false;

    cue.label = template.name;
    cue.description = template.description;
    cue.metadata = {
      ...cue.metadata,
      template: templateId,
      icon: template.icon,
      color: template.color
    };
    cue.updatedAt = new Date().toISOString();
    
    this.qListManager.notifyCueListUpdated();
    return true;
  }

  // Label Management
  createLabelTemplate(id, template) {
    this.labelTemplates.set(id, {
      name: template.name,
      description: template.description,
      icon: template.icon || '📝',
      color: template.color || '#888888'
    });
  }

  updateLabelTemplate(id, updates) {
    const template = this.labelTemplates.get(id);
    if (!template) return false;

    Object.assign(template, updates);
    return true;
  }

  deleteLabelTemplate(id) {
    return this.labelTemplates.delete(id);
  }

  getLabelTemplate(id) {
    return this.labelTemplates.get(id);
  }

  getAllLabelTemplates() {
    return Array.from(this.labelTemplates.entries()).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  // Category Management
  createLabelCategory(id, category) {
    this.labelCategories.set(id, {
      name: category.name,
      templates: category.templates || []
    });
  }

  getLabelCategory(id) {
    return this.labelCategories.get(id);
  }

  getAllLabelCategories() {
    return Array.from(this.labelCategories.entries()).map(([id, category]) => ({
      id,
      ...category
    }));
  }

  // Smart Labeling
  suggestLabel(cue) {
    const levels = cue.levels;
    const activeChannels = Array.from(levels).filter(level => level > 0);
    const totalIntensity = activeChannels.reduce((sum, level) => sum + level, 0);
    const averageIntensity = activeChannels.length > 0 ? totalIntensity / activeChannels.length : 0;

    // Analyze lighting characteristics
    if (activeChannels.length === 0) {
      return this.labelTemplates.get('blackout');
    }

    if (averageIntensity > 200) {
      return this.labelTemplates.get('full');
    }

    // Check for color characteristics (simplified)
    const hasWarmChannels = this.hasWarmChannels(levels);
    const hasCoolChannels = this.hasCoolChannels(levels);

    if (hasWarmChannels && !hasCoolChannels) {
      return this.labelTemplates.get('warm');
    }

    if (hasCoolChannels && !hasWarmChannels) {
      return this.labelTemplates.get('cool');
    }

    // Default suggestion
    return {
      name: `Cue ${cue.number}`,
      description: `${activeChannels.length} channels active`,
      icon: '💡',
      color: '#888888'
    };
  }

  hasWarmChannels(levels) {
    // Simplified warm channel detection (channels 1-10 for example)
    for (let i = 0; i < 10; i++) {
      if (levels[i] > 100) return true;
    }
    return false;
  }

  hasCoolChannels(levels) {
    // Simplified cool channel detection (channels 11-20 for example)
    for (let i = 10; i < 20; i++) {
      if (levels[i] > 100) return true;
    }
    return false;
  }

  // Label Search and Filtering
  searchCuesByLabel(searchTerm) {
    const term = searchTerm.toLowerCase();
    return this.qListManager.cues.filter(cue => 
      cue.label.toLowerCase().includes(term) ||
      cue.description.toLowerCase().includes(term)
    );
  }

  filterCuesByTemplate(templateId) {
    return this.qListManager.cues.filter(cue => 
      cue.metadata && cue.metadata.template === templateId
    );
  }

  filterCuesByCategory(categoryId) {
    const category = this.labelCategories.get(categoryId);
    if (!category) return [];

    return this.qListManager.cues.filter(cue => 
      cue.metadata && category.templates.includes(cue.metadata.template)
    );
  }

  // Label Statistics
  getLabelStatistics() {
    const stats = {
      totalCues: this.qListManager.cues.length,
      labeledCues: this.qListManager.cues.filter(cue => cue.label && cue.label.trim() !== '').length,
      templateUsage: {},
      categoryUsage: {}
    };

    // Count template usage
    this.qListManager.cues.forEach(cue => {
      if (cue.metadata && cue.metadata.template) {
        const template = cue.metadata.template;
        stats.templateUsage[template] = (stats.templateUsage[template] || 0) + 1;
      }
    });

    // Count category usage
    this.labelCategories.forEach((category, categoryId) => {
      stats.categoryUsage[categoryId] = this.filterCuesByCategory(categoryId).length;
    });

    return stats;
  }

  // Export/Import Labels
  exportLabels() {
    return {
      templates: Object.fromEntries(this.labelTemplates),
      categories: Object.fromEntries(this.labelCategories),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  importLabels(data) {
    if (data.templates) {
      this.labelTemplates = new Map(Object.entries(data.templates));
    }
    if (data.categories) {
      this.labelCategories = new Map(Object.entries(data.categories));
    }
    return true;
  }
}

// Global Label Manager Instance
const qListLabelManager = new QListLabelManager(qListManager);
