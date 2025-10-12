// IonXe Mobile AI - AI Lighting features for mobile
class MobileAI {
  constructor(core) {
    this.core = core;
    this.conceptContext = null;
    this.musicContext = null;
    this.augment3dContext = null;
    this.currentScene = null;
    this.isGenerating = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateAIStatus('Ready');
  }

  setupEventListeners() {
    // Concept processing
    document.getElementById('process-concept')?.addEventListener('click', () => {
      this.processConcept();
    });

    // Scene generation
    document.getElementById('generate-scene')?.addEventListener('click', () => {
      this.generateScene();
    });

    document.getElementById('execute-ai-scene')?.addEventListener('click', () => {
      this.executeAIScene();
    });

    // Core events
    this.core.on('connected', () => {
      this.updateAIStatus('Connected');
    });

    this.core.on('disconnected', () => {
      this.updateAIStatus('Disconnected');
    });
  }

  async processConcept() {
    const conceptInput = document.getElementById('mobile-concept');
    if (!conceptInput) return;

    const concept = conceptInput.value.trim();
    if (!concept) {
      this.core.showToast('Please enter a lighting concept', 'error');
      return;
    }

    if (concept.length < 10) {
      this.core.showToast('Please provide a more detailed concept (at least 10 characters)', 'error');
      return;
    }

    this.updateAIStatus('Processing concept...');
    this.showLoadingState('concept');

    try {
      const response = await this.core.apiRequest('/api/ai-lighting/concept/process', {
        method: 'POST',
        body: JSON.stringify({ concept })
      });

      this.conceptContext = response;
      this.displayConceptResult(response);
      this.updateAIStatus('Concept processed');
      this.core.showToast('Concept processed successfully', 'success');
    } catch (error) {
      console.error('Concept processing failed:', error);
      this.updateAIStatus('Error');
      this.core.showToast('Concept processing failed', 'error');
    } finally {
      this.hideLoadingState('concept');
    }
  }

  displayConceptResult(context) {
    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = `
      <div class="concept-result">
        <h4>Concept Analysis</h4>
        <div class="concept-details">
          <div class="detail-item">
            <strong>Mood:</strong> ${context.mood || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Color Scheme:</strong> ${context.color_scheme || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Intensity:</strong> ${Math.round((context.intensity_level || 0) * 100)}%
          </div>
          <div class="detail-item">
            <strong>Movement:</strong> ${context.movement_style || 'Unknown'}
          </div>
        </div>
        <div class="concept-notes">
          <strong>Artistic Notes:</strong>
          <p>${context.artistic_notes || 'No additional notes available'}</p>
        </div>
      </div>
    `;
  }

  async generateScene() {
    if (this.isGenerating) return;

    const conceptInput = document.getElementById('mobile-concept');
    if (!conceptInput) return;

    const concept = conceptInput.value.trim();
    if (!concept) {
      this.core.showToast('Please enter a lighting concept first', 'error');
      return;
    }

    this.isGenerating = true;
    this.updateAIStatus('Generating scene...');
    this.showGenerationProgress();

    try {
      const requestData = {
        concept: concept,
        music_context: this.musicContext,
        augment3d_context: this.augment3dContext
      };

      const response = await this.core.apiRequest('/api/ai-lighting/scenes/generate', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      this.currentScene = response;
      this.displayGeneratedScene(response);
      this.updateAIStatus('Scene generated');
      this.core.showToast('AI scene generated successfully', 'success');

      // Haptic feedback
      if (this.core.settings.hapticFeedback && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
    } catch (error) {
      console.error('Scene generation failed:', error);
      this.updateAIStatus('Error');
      this.core.showToast('Scene generation failed', 'error');
    } finally {
      this.isGenerating = false;
      this.hideGenerationProgress();
    }
  }

  displayGeneratedScene(scene) {
    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (!suggestionsContainer) return;

    const cuesHtml = scene.lighting_cues.map((cue, index) => `
      <div class="cue-item">
        <div class="cue-header">
          <strong>Cue ${index + 1}</strong>
          <span class="cue-time">${cue.timing || '0s'}</span>
        </div>
        <div class="cue-details">
          <div class="cue-channels">
            <strong>Channels:</strong> ${cue.channels.join(', ')}
          </div>
          <div class="cue-colors">
            <strong>Colors:</strong> ${cue.colors ? cue.colors.join(', ') : 'Default'}
          </div>
          <div class="cue-effects">
            <strong>Effects:</strong> ${cue.effects ? cue.effects.join(', ') : 'None'}
          </div>
        </div>
      </div>
    `).join('');

    suggestionsContainer.innerHTML = `
      <div class="generated-scene">
        <h4>Generated Scene: ${scene.name}</h4>
        <div class="scene-description">
          <p>${scene.description}</p>
        </div>
        <div class="scene-cues">
          <h5>Lighting Cues (${scene.lighting_cues.length})</h5>
          ${cuesHtml}
        </div>
        <div class="scene-tags">
          <strong>Tags:</strong> ${scene.concept_tags.join(', ')}
        </div>
      </div>
    `;
  }

  async executeAIScene() {
    if (!this.currentScene) {
      this.core.showToast('No scene to execute', 'error');
      return;
    }

    try {
      await this.core.apiRequest(`/api/ai-lighting/scenes/${this.currentScene.id}/execute`, {
        method: 'POST'
      });

      this.core.showToast('AI scene executed successfully', 'success');

      // Haptic feedback
      if (this.core.settings.hapticFeedback && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error('Failed to execute AI scene:', error);
      this.core.showToast('Failed to execute AI scene', 'error');
    }
  }

  // Music Analysis (simplified for mobile)
  async analyzeMusic(file) {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/midi', 'audio/mid'];
    const allowedExtensions = ['.wav', '.mp3', '.mid', '.midi'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      this.core.showToast('Please select a valid audio file', 'error');
      return;
    }

    // Validate file size (max 25MB for mobile)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      this.core.showToast('File too large. Please select a file smaller than 25MB', 'error');
      return;
    }

    this.updateAIStatus('Analyzing music...');
    this.showLoadingState('music');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://${this.core.consoleIP}:${this.core.consolePort}/api/ai-lighting/music/analyze`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.musicContext = await response.json();
        this.displayMusicResult(this.musicContext);
        this.updateAIStatus('Music analyzed');
        this.core.showToast('Music analyzed successfully', 'success');
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Music analysis failed:', error);
      this.updateAIStatus('Error');
      this.core.showToast('Music analysis failed', 'error');
    } finally {
      this.hideLoadingState('music');
    }
  }

  displayMusicResult(context) {
    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (!suggestionsContainer) return;

    const musicInfo = `
      <div class="music-result">
        <h4>Music Analysis</h4>
        <div class="music-details">
          <div class="detail-item">
            <strong>Tempo:</strong> ${context.tempo ? context.tempo.toFixed(1) : 'Unknown'} BPM
          </div>
          <div class="detail-item">
            <strong>Key:</strong> ${context.key || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Mood:</strong> ${context.mood || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Dynamics:</strong> ${context.dynamics ? Math.round(context.dynamics * 100) : 0}%
          </div>
          <div class="detail-item">
            <strong>Rhythm:</strong> ${context.rhythm_pattern || 'Unknown'}
          </div>
        </div>
      </div>
    `;

    // Append to existing suggestions
    suggestionsContainer.insertAdjacentHTML('beforeend', musicInfo);
  }

  // 3D Venue Integration (simplified for mobile)
  async syncAugment3D(file) {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.obj', '.fbx', '.gltf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      this.core.showToast('Please select a valid 3D model file', 'error');
      return;
    }

    // Validate file size (max 50MB for mobile)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.core.showToast('File too large. Please select a file smaller than 50MB', 'error');
      return;
    }

    this.updateAIStatus('Syncing 3D venue...');
    this.showLoadingState('augment3d');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://${this.core.consoleIP}:${this.core.consolePort}/api/ai-lighting/augment3d/sync`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.augment3dContext = await response.json();
        this.displayAugment3dResult(this.augment3dContext);
        this.updateAIStatus('3D venue synced');
        this.core.showToast('3D venue synced successfully', 'success');
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('3D venue sync failed:', error);
      this.updateAIStatus('Error');
      this.core.showToast('3D venue sync failed', 'error');
    } finally {
      this.hideLoadingState('augment3d');
    }
  }

  displayAugment3dResult(context) {
    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (!suggestionsContainer) return;

    const augment3dInfo = `
      <div class="augment3d-result">
        <h4>3D Venue Analysis</h4>
        <div class="venue-details">
          <div class="detail-item">
            <strong>Fixtures:</strong> ${context.fixture_count || 0}
          </div>
          <div class="detail-item">
            <strong>Coverage:</strong> ${context.coverage_area || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Height:</strong> ${context.ceiling_height || 'Unknown'}
          </div>
          <div class="detail-item">
            <strong>Effects:</strong> ${context.spatial_effects ? context.spatial_effects.join(', ') : 'None'}
          </div>
        </div>
      </div>
    `;

    // Append to existing suggestions
    suggestionsContainer.insertAdjacentHTML('beforeend', augment3dInfo);
  }

  // UI State Management
  updateAIStatus(status) {
    const statusElement = document.getElementById('ai-status');
    if (statusElement) {
      statusElement.textContent = status;
      statusElement.className = 'ai-status';
      
      if (status.includes('Error')) {
        statusElement.classList.add('error');
      } else if (status.includes('Ready') || status.includes('Connected')) {
        statusElement.classList.add('success');
      } else if (status.includes('Processing') || status.includes('Generating') || status.includes('Analyzing')) {
        statusElement.classList.add('working');
      }
    }
  }

  showLoadingState(type) {
    const button = document.getElementById(`process-${type}`) || 
                  document.getElementById(`generate-scene`) ||
                  document.getElementById(`execute-ai-scene`);
    
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="loading-spinner"></span> Processing...`;
    }
  }

  hideLoadingState(type) {
    const button = document.getElementById(`process-${type}`) || 
                  document.getElementById(`generate-scene`) ||
                  document.getElementById(`execute-ai-scene`);
    
    if (button) {
      button.disabled = false;
      const originalText = type === 'concept' ? 'Process' : 
                          type === 'music' ? 'Analyze Music' : 
                          type === 'augment3d' ? 'Sync 3D Venue' :
                          'Generate Scene';
      button.innerHTML = originalText;
    }
  }

  showGenerationProgress() {
    // Create progress indicator
    const progressHtml = `
      <div class="generation-progress">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="progress-text">Generating lighting scene with AI...</div>
      </div>
    `;

    const suggestionsContainer = document.getElementById('ai-suggestions');
    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = progressHtml;
    }
  }

  hideGenerationProgress() {
    // Progress will be replaced by generated scene
  }

  // Quick Actions
  quickGenerate(concept) {
    const conceptInput = document.getElementById('mobile-concept');
    if (conceptInput) {
      conceptInput.value = concept;
    }
    this.processConcept().then(() => {
      setTimeout(() => this.generateScene(), 1000);
    });
  }

  // Predefined Concepts
  getQuickConcepts() {
    return [
      "Mysterious forest with moonlight filtering through trees",
      "Dynamic concert lighting with pulsing colors",
      "Romantic dinner setting with warm candlelight",
      "High-energy dance floor with strobe effects",
      "Calm ocean waves with blue and green tones",
      "Sunset over mountains with warm orange and pink",
      "Neon cityscape with electric blues and purples",
      "Cozy fireplace with flickering amber light"
    ];
  }

  showQuickConcepts() {
    const concepts = this.getQuickConcepts();
    const suggestionsContainer = document.getElementById('ai-suggestions');
    
    if (suggestionsContainer) {
      const conceptsHtml = concepts.map(concept => `
        <div class="quick-concept" onclick="mobileAI.quickGenerate('${concept}')">
          ${concept}
        </div>
      `).join('');

      suggestionsContainer.innerHTML = `
        <div class="quick-concepts">
          <h4>Quick Concepts</h4>
          <p>Tap a concept to generate a scene instantly</p>
          ${conceptsHtml}
        </div>
      `;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.mobileCore) {
    window.mobileAI = new MobileAI(window.mobileCore);
  }
});

