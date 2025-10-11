// AI Lighting System - Frontend Interface
// Integrates with Mistral AI, music analysis, and Augment 3D

class IonXeAiLighting {
  constructor(core) {
    this.core = core;
    this.apiBase = '/api/v1/ai-lighting';
    this.currentScene = null;
    this.musicContext = null;
    this.conceptContext = null;
    this.augment3dContext = null;
    this.isGenerating = false;
    
    this.initialize();
  }

  initialize() {
    this.createAILightingTab();
    this.setupEventListeners();
    this.loadExistingScenes();
    
    // Listen for core events
    this.core.on('viewChanged', (data) => {
      if (data.viewId === 'ai-lighting') {
        this.refreshUI();
      }
    });
  }

  createAILightingTab() {
    // Check if AI Lighting tab already exists
    const existingTab = document.getElementById('tab-ai-lighting');
    if (existingTab) return;

    // Add AI Lighting tab to the existing tab system
    const tabContainer = document.querySelector('.tabs');
    if (tabContainer) {
      const aiTab = document.createElement('a');
      aiTab.id = 'tab-ai-lighting';
      aiTab.className = 'tab';
      aiTab.href = '#ai-lighting';
      aiTab.innerHTML = 'AI Lighting';
      tabContainer.appendChild(aiTab);
    }

    // Create AI Lighting view
    const viewContainer = document.querySelector('body');
    if (viewContainer) {
      const aiView = document.createElement('div');
      aiView.id = 'view-ai-lighting';
      aiView.className = 'view';
      aiView.innerHTML = this.createAILightingHTML();
      viewContainer.appendChild(aiView);
    }
  }

  createAILightingHTML() {
    return `
      <div class="ai-lighting-container">
        <div class="ai-lighting-header">
          <h2>AI Lighting System</h2>
          <div class="ai-status">
            <span id="ai-status" class="status-indicator">Ready</span>
          </div>
        </div>

        <div class="ai-lighting-content">
          <!-- Concept Input Section -->
          <div class="ai-section">
            <h3>Concept & Context</h3>
            <div class="concept-input">
              <textarea id="concept-input" placeholder="Describe your lighting concept... (e.g., 'Mysterious forest with moonlight filtering through trees')"></textarea>
              <button id="process-concept" class="ai-button">Process Concept</button>
            </div>
            <div id="concept-result" class="concept-result hidden"></div>
          </div>

          <!-- Music Analysis Section -->
          <div class="ai-section">
            <h3>Music Analysis</h3>
            <div class="music-input">
              <input type="file" id="music-file" accept=".wav,.mp3,.mid,.midi" />
              <button id="analyze-music" class="ai-button">Analyze Music</button>
            </div>
            <div id="music-result" class="music-result hidden"></div>
          </div>

          <!-- Augment 3D Integration -->
          <div class="ai-section">
            <h3>3D Venue Integration</h3>
            <div class="augment3d-input">
              <input type="file" id="venue-model" accept=".obj,.fbx,.gltf" />
              <button id="sync-augment3d" class="ai-button">Sync 3D Venue</button>
            </div>
            <div id="augment3d-result" class="augment3d-result hidden"></div>
          </div>

          <!-- AI Scene Generation -->
          <div class="ai-section">
            <h3>Generate AI Lighting Scene</h3>
            <div class="generation-controls">
              <button id="generate-scene" class="ai-button primary" disabled>Generate Scene</button>
              <button id="regenerate-scene" class="ai-button" disabled>Regenerate</button>
            </div>
            <div id="generation-progress" class="generation-progress hidden">
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <span class="progress-text">Generating lighting scene with Mistral AI...</span>
            </div>
          </div>

          <!-- Generated Scenes -->
          <div class="ai-section">
            <h3>Generated Scenes</h3>
            <div id="scenes-list" class="scenes-list">
              <!-- Scenes will be populated here -->
            </div>
          </div>

          <!-- Scene Preview and Controls -->
          <div class="ai-section">
            <h3>Scene Preview</h3>
            <div id="scene-preview" class="scene-preview">
              <div class="preview-placeholder">Select a scene to preview</div>
            </div>
            <div class="scene-controls">
              <button id="execute-scene" class="ai-button primary" disabled>Execute Scene</button>
              <button id="stop-scene" class="ai-button danger" disabled>Stop Scene</button>
              <button id="edit-scene" class="ai-button">Edit Scene</button>
            </div>
          </div>

          <!-- AI Suggestions -->
          <div class="ai-section">
            <h3>AI Suggestions</h3>
            <div id="ai-suggestions" class="ai-suggestions">
              <div class="suggestion-placeholder">Generate a scene to see AI suggestions</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Concept processing
    document.getElementById('process-concept')?.addEventListener('click', () => {
      this.processConcept();
    });

    // Music analysis
    document.getElementById('analyze-music')?.addEventListener('click', () => {
      this.analyzeMusic();
    });

    // Augment 3D sync
    document.getElementById('sync-augment3d')?.addEventListener('click', () => {
      this.syncAugment3D();
    });

    // Scene generation
    document.getElementById('generate-scene')?.addEventListener('click', () => {
      this.generateScene();
    });

    document.getElementById('regenerate-scene')?.addEventListener('click', () => {
      this.regenerateScene();
    });

    // Scene execution
    document.getElementById('execute-scene')?.addEventListener('click', () => {
      this.executeScene();
    });

    document.getElementById('stop-scene')?.addEventListener('click', () => {
      this.stopScene();
    });

    document.getElementById('edit-scene')?.addEventListener('click', () => {
      this.editScene();
    });

    // Concept input change handler
    document.getElementById('concept-input')?.addEventListener('input', () => {
      this.updateGenerateButton();
    });
  }

  async processConcept() {
    const conceptInput = document.getElementById('concept-input');
    if (!conceptInput) return;
    
    const concept = conceptInput.value.trim();
    if (!concept) {
      this.core.showError('Please enter a lighting concept');
      return;
    }

    if (concept.length < 10) {
      this.core.showError('Please provide a more detailed concept (at least 10 characters)');
      return;
    }

    this.setStatus('Processing concept...', 'working');
    this.showLoadingState('concept');

    try {
      const response = await this.core.apiFetch(`${this.apiBase}/concept/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept })
      });

      if (response.ok) {
        this.conceptContext = await response.json();
        this.displayConceptResult(this.conceptContext);
        this.updateGenerateButton();
        this.setStatus('Concept processed successfully', 'success');
        this.core.showSuccess('Concept processed successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Concept processing error:', error);
      this.setStatus('Concept processing failed', 'error');
      this.core.showError(`Concept processing failed: ${error.message}`);
    } finally {
      this.hideLoadingState('concept');
    }
  }

  async analyzeMusic() {
    const fileInput = document.getElementById('music-file');
    if (!fileInput) return;
    
    const file = fileInput.files[0];
    if (!file) {
      this.core.showError('Please select a music file');
      return;
    }

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/midi', 'audio/mid'];
    const allowedExtensions = ['.wav', '.mp3', '.mid', '.midi'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      this.core.showError('Please select a valid audio file (WAV, MP3, MID, MIDI)');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.core.showError('File too large. Please select a file smaller than 50MB');
      return;
    }

    this.setStatus('Analyzing music...', 'working');
    this.showLoadingState('music');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.core.apiFetch(`${this.apiBase}/music/analyze`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.musicContext = await response.json();
        this.displayMusicResult(this.musicContext);
        this.updateGenerateButton();
        this.setStatus('Music analyzed successfully', 'success');
        this.core.showSuccess('Music analyzed successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Music analysis error:', error);
      this.setStatus('Music analysis failed', 'error');
      this.core.showError(`Music analysis failed: ${error.message}`);
    } finally {
      this.hideLoadingState('music');
    }
  }

  async syncAugment3D() {
    const fileInput = document.getElementById('venue-model');
    if (!fileInput) return;
    
    const file = fileInput.files[0];
    if (!file) {
      this.core.showError('Please select a 3D venue model');
      return;
    }

    this.setStatus('Syncing 3D venue...', 'working');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.core.apiFetch(`${this.apiBase}/augment3d/sync`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.augment3dContext = await response.json();
        this.displayAugment3DResult(this.augment3dContext);
        this.updateGenerateButton();
        this.core.showSuccess('3D venue synced successfully');
      } else {
        throw new Error('Failed to sync 3D venue');
      }
    } catch (error) {
      console.error('Augment 3D sync error:', error);
      this.setStatus('3D venue sync failed', 'error');
      this.core.showError('3D venue sync failed');
    }
  }

  async generateScene() {
    if (this.isGenerating) return;

    const conceptInput = document.getElementById('concept-input');
    if (!conceptInput) return;
    
    const concept = conceptInput.value.trim();
    if (!concept) {
      this.core.showError('Please enter a lighting concept');
      return;
    }

    if (concept.length < 10) {
      this.core.showError('Please provide a more detailed concept (at least 10 characters)');
      return;
    }

    this.isGenerating = true;
    this.setStatus('Generating scene with Mistral AI...', 'working');
    this.showGenerationProgress();

    try {
      const requestData = {
        concept,
        music_context: this.musicContext,
        augment3d_context: this.augment3dContext
      };

      const response = await this.core.apiFetch(`${this.apiBase}/scenes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        this.currentScene = await response.json();
        this.displayScene(this.currentScene);
        this.updateSceneControls();
        this.loadExistingScenes();
        this.setStatus('Scene generated successfully', 'success');
        this.core.showSuccess('AI scene generated successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Scene generation error:', error);
      this.setStatus('Scene generation failed', 'error');
      this.core.showError(`Scene generation failed: ${error.message}`);
    } finally {
      this.isGenerating = false;
      this.hideGenerationProgress();
    }
  }

  async regenerateScene() {
    if (this.currentScene) {
      await this.generateScene();
    }
  }

  async executeScene() {
    if (!this.currentScene) return;

    this.setStatus('Executing scene...', 'working');

    try {
      const response = await this.core.apiFetch(`${this.apiBase}/execute/${this.currentScene.id}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        this.setStatus('Scene executed successfully', 'success');
        this.core.showSuccess('Scene executed successfully');
        console.log('Execution result:', result);
      } else {
        throw new Error('Failed to execute scene');
      }
    } catch (error) {
      console.error('Scene execution error:', error);
      this.setStatus('Scene execution failed', 'error');
      this.core.showError('Scene execution failed');
    }
  }

  async stopScene() {
    // Stop current scene execution
    this.setStatus('Stopping scene...', 'working');
    
    // In a real implementation, this would send a stop command to the backend
    setTimeout(() => {
      this.setStatus('Scene stopped', 'ready');
      this.core.showSuccess('Scene stopped');
    }, 1000);
  }

  editScene() {
    if (!this.currentScene) return;
    
    // Open scene editor (simplified)
    const newName = prompt('Enter new scene name:', this.currentScene.name);
    if (newName && newName !== this.currentScene.name) {
      this.currentScene.name = newName;
      this.displayScene(this.currentScene);
      this.core.showSuccess('Scene updated');
    }
  }

  displayConceptResult(context) {
    const resultDiv = document.getElementById('concept-result');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = `
      <div class="concept-analysis">
        <h4>Concept Analysis</h4>
        <p><strong>Mood:</strong> ${context.mood}</p>
        <p><strong>Color Scheme:</strong> ${context.color_scheme}</p>
        <p><strong>Intensity:</strong> ${(context.intensity_level * 100).toFixed(0)}%</p>
        <p><strong>Movement:</strong> ${context.movement_style}</p>
        <p><strong>Notes:</strong> ${context.artistic_notes}</p>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  }

  displayMusicResult(context) {
    const resultDiv = document.getElementById('music-result');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = `
      <div class="music-analysis">
        <h4>Music Analysis</h4>
        <p><strong>Tempo:</strong> ${context.tempo.toFixed(1)} BPM</p>
        <p><strong>Key:</strong> ${context.key}</p>
        <p><strong>Mood:</strong> ${context.mood}</p>
        <p><strong>Dynamics:</strong> ${(context.dynamics * 100).toFixed(0)}%</p>
        <p><strong>Rhythm:</strong> ${context.rhythm_pattern}</p>
        <p><strong>Harmony:</strong> ${context.harmonic_progression.join(', ')}</p>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  }

  displayAugment3DResult(context) {
    const resultDiv = document.getElementById('augment3d-result');
    if (!resultDiv) return;
    
    resultDiv.innerHTML = `
      <div class="augment3d-analysis">
        <h4>3D Venue Analysis</h4>
        <p><strong>Venue:</strong> ${context.venue_model}</p>
        <p><strong>Fixtures:</strong> ${context.fixture_positions.length}</p>
        <p><strong>Spatial Effects:</strong> ${context.spatial_effects.length}</p>
        <p><strong>Camera Angles:</strong> ${context.camera_angles.length}</p>
      </div>
    `;
    resultDiv.classList.remove('hidden');
  }

  displayScene(scene) {
    const previewDiv = document.getElementById('scene-preview');
    if (!previewDiv) return;
    
    previewDiv.innerHTML = `
      <div class="scene-info">
        <h4>${scene.name}</h4>
        <p>${scene.description}</p>
        <p><strong>Cues:</strong> ${scene.lighting_cues.length}</p>
        <p><strong>Tags:</strong> ${scene.concept_tags.join(', ')}</p>
      </div>
      <div class="scene-cues">
        ${scene.lighting_cues.map((cue, index) => `
          <div class="cue-item">
            <span class="cue-number">${index + 1}</span>
            <span class="cue-name">${cue.name}</span>
            <span class="cue-timing">${cue.timing.fade_in_ms}ms / ${cue.timing.hold_ms}ms / ${cue.timing.fade_out_ms}ms</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  updateGenerateButton() {
    const conceptInput = document.getElementById('concept-input');
    const generateBtn = document.getElementById('generate-scene');
    
    if (conceptInput && generateBtn) {
      const concept = conceptInput.value.trim();
      if (concept && !this.isGenerating) {
        generateBtn.disabled = false;
      } else {
        generateBtn.disabled = true;
      }
    }
  }

  updateSceneControls() {
    const executeBtn = document.getElementById('execute-scene');
    const stopBtn = document.getElementById('stop-scene');
    const editBtn = document.getElementById('edit-scene');
    
    if (executeBtn) executeBtn.disabled = !this.currentScene;
    if (stopBtn) stopBtn.disabled = !this.currentScene;
    if (editBtn) editBtn.disabled = !this.currentScene;
  }

  showGenerationProgress() {
    const progressDiv = document.getElementById('generation-progress');
    if (!progressDiv) return;
    
    progressDiv.classList.remove('hidden');
    
    // Animate progress bar
    const progressFill = progressDiv.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.animation = 'progress-animation 3s ease-in-out infinite';
    }
  }

  hideGenerationProgress() {
    const progressDiv = document.getElementById('generation-progress');
    if (!progressDiv) return;
    
    progressDiv.classList.add('hidden');
    
    const progressFill = progressDiv.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.animation = 'none';
    }
  }

  setStatus(message, type) {
    const statusEl = document.getElementById('ai-status');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `status-indicator ${type}`;
  }

  async loadExistingScenes() {
    try {
      const response = await this.core.apiFetch(`${this.apiBase}/scenes`);
      if (response.ok) {
        const scenes = await response.json();
        this.displayScenesList(scenes);
      }
    } catch (error) {
      console.error('Failed to load scenes:', error);
    }
  }

  displayScenesList(scenes) {
    const listDiv = document.getElementById('scenes-list');
    if (!listDiv) return;
    
    if (scenes.length === 0) {
      listDiv.innerHTML = '<div class="no-scenes">No AI-generated scenes yet</div>';
      return;
    }

    listDiv.innerHTML = scenes.map(scene => `
      <div class="scene-item" data-scene-id="${scene.id}">
        <div class="scene-header">
          <h4>${scene.name}</h4>
          <div class="scene-actions">
            <button class="btn-small" onclick="window.ionxe.core.getModule('ai-lighting').selectScene('${scene.id}')">Select</button>
            <button class="btn-small" onclick="window.ionxe.core.getModule('ai-lighting').deleteScene('${scene.id}')">Delete</button>
          </div>
        </div>
        <div class="scene-details">
          <p>${scene.description}</p>
          <p><strong>Cues:</strong> ${scene.lighting_cues.length} | <strong>Tags:</strong> ${scene.concept_tags.join(', ')}</p>
        </div>
      </div>
    `).join('');
  }

  selectScene(sceneId) {
    // Find and select the scene
    const scenes = document.querySelectorAll('.scene-item');
    scenes.forEach(item => {
      if (item.dataset.sceneId === sceneId) {
        item.classList.add('selected');
        // Load scene details
        this.loadSceneDetails(sceneId);
      } else {
        item.classList.remove('selected');
      }
    });
  }

  async loadSceneDetails(sceneId) {
    try {
      const response = await this.core.apiFetch(`${this.apiBase}/scenes/${sceneId}`);
      if (response.ok) {
        this.currentScene = await response.json();
        this.displayScene(this.currentScene);
        this.updateSceneControls();
      }
    } catch (error) {
      console.error('Failed to load scene details:', error);
    }
  }

  async deleteScene(sceneId) {
    if (!confirm('Are you sure you want to delete this scene?')) return;

    try {
      const response = await this.core.apiFetch(`${this.apiBase}/scenes/${sceneId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.loadExistingScenes();
        if (this.currentScene && this.currentScene.id === sceneId) {
          this.currentScene = null;
          this.updateSceneControls();
        }
        this.core.showSuccess('Scene deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete scene:', error);
      this.core.showError('Failed to delete scene');
    }
  }

  refreshUI() {
    this.updateGenerateButton();
    this.updateSceneControls();
    this.loadExistingScenes();
  }

  showLoadingState(section) {
    const button = document.getElementById(`process-${section}`) || 
                  document.getElementById(`analyze-${section}`) || 
                  document.getElementById(`sync-${section}`);
    
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="loading-spinner"></span> Processing...`;
    }
  }

  hideLoadingState(section) {
    const button = document.getElementById(`process-${section}`) || 
                  document.getElementById(`analyze-${section}`) || 
                  document.getElementById(`sync-${section}`);
    
    if (button) {
      button.disabled = false;
      const originalText = section === 'concept' ? 'Process Concept' : 
                          section === 'music' ? 'Analyze Music' : 
                          'Sync 3D Venue';
      button.innerHTML = originalText;
    }
  }

  validateConcept(concept) {
    if (!concept || concept.trim().length < 10) {
      return 'Please provide a more detailed concept (at least 10 characters)';
    }
    if (concept.length > 500) {
      return 'Concept too long. Please keep it under 500 characters';
    }
    return null;
  }

  validateFile(file, allowedTypes, maxSize) {
    if (!file) {
      return 'Please select a file';
    }
    
    if (file.size > maxSize) {
      return `File too large. Please select a file smaller than ${Math.round(maxSize / (1024 * 1024))}MB`;
    }
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(file.type) && !allowedTypes.includes(fileExtension)) {
      return 'Please select a valid file type';
    }
    
    return null;
  }

  showRetryOption(operation, retryFunction) {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'ai-button';
    retryBtn.textContent = 'Retry';
    retryBtn.onclick = retryFunction;
    
    const errorDiv = document.getElementById(`${operation}-result`);
    if (errorDiv) {
      errorDiv.appendChild(retryBtn);
    }
  }
}

// Register the module
window.IonXeAiLighting = IonXeAiLighting;