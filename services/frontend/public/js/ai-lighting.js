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
    const processConceptBtn = document.getElementById('process-concept');
    if (processConceptBtn) {
      processConceptBtn.addEventListener('click', () => {
        this.processConcept();
      });
    }

    // Music analysis
    const analyzeMusicBtn = document.getElementById('analyze-music');
    if (analyzeMusicBtn) {
      analyzeMusicBtn.addEventListener('click', () => {
        this.analyzeMusic();
      });
    }

    // Augment 3D sync
    const syncAugment3dBtn = document.getElementById('sync-augment3d');
    if (syncAugment3dBtn) {
      syncAugment3dBtn.addEventListener('click', () => {
        this.syncAugment3D();
      });
    }

    // Scene generation
    const generateSceneBtn = document.getElementById('generate-scene');
    if (generateSceneBtn) {
      generateSceneBtn.addEventListener('click', () => {
        this.generateScene();
      });
    }

    const regenerateSceneBtn = document.getElementById('regenerate-scene');
    if (regenerateSceneBtn) {
      regenerateSceneBtn.addEventListener('click', () => {
        this.regenerateScene();
      });
    }

    // Scene execution
    const executeSceneBtn = document.getElementById('execute-scene');
    if (executeSceneBtn) {
      executeSceneBtn.addEventListener('click', () => {
        this.executeScene();
      });
    }

    const stopSceneBtn = document.getElementById('stop-scene');
    if (stopSceneBtn) {
      stopSceneBtn.addEventListener('click', () => {
        this.stopScene();
      });
    }

    const editSceneBtn = document.getElementById('edit-scene');
    if (editSceneBtn) {
      editSceneBtn.addEventListener('click', () => {
        this.editScene();
      });
    }
  }

  async processConcept() {
    const conceptInput = document.getElementById('concept-input');
    if (!conceptInput) return;
    
    const concept = conceptInput.value.trim();
    if (!concept) {
      this.core.showError('Please enter a lighting concept');
      return;
    }

    this.setStatus('Processing concept...', 'working');

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
        this.core.showSuccess('Concept processed successfully');
      } else {
        throw new Error('Failed to process concept');
      }
    } catch (error) {
      console.error('Concept processing error:', error);
      this.setStatus('Concept processing failed', 'error');
      this.core.showError('Concept processing failed');
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

    this.setStatus('Analyzing music...', 'working');

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
        this.core.showSuccess('Music analyzed successfully');
      } else {
        throw new Error('Failed to analyze music');
      }
    } catch (error) {
      console.error('Music analysis error:', error);
      this.setStatus('Music analysis failed', 'error');
      this.core.showError('Music analysis failed');
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
        throw new Error('Failed to generate scene');
      }
    } catch (error) {
      console.error('Scene generation error:', error);
      this.setStatus('Scene generation failed', 'error');
      this.core.showError('Scene generation failed');
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
}

// Register the module
window.IonXeAiLighting = IonXeAiLighting;

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
  }

  async processConcept() {
    const concept = document.getElementById('concept-input').value.trim();
    if (!concept) {
      alert('Please enter a lighting concept');
      return;
    }

    this.setStatus('Processing concept...', 'working');

    try {
      const response = await fetch(`${this.apiBase}/concept/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept })
      });

      if (response.ok) {
        this.conceptContext = await response.json();
        this.displayConceptResult(this.conceptContext);
        this.updateGenerateButton();
      } else {
        throw new Error('Failed to process concept');
      }
    } catch (error) {
      console.error('Concept processing error:', error);
      this.setStatus('Concept processing failed', 'error');
    }
  }

  async analyzeMusic() {
    const fileInput = document.getElementById('music-file');
    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a music file');
      return;
    }

    this.setStatus('Analyzing music...', 'working');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.apiBase}/music/analyze`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.musicContext = await response.json();
        this.displayMusicResult(this.musicContext);
        this.updateGenerateButton();
      } else {
        throw new Error('Failed to analyze music');
      }
    } catch (error) {
      console.error('Music analysis error:', error);
      this.setStatus('Music analysis failed', 'error');
    }
  }

  async syncAugment3D() {
    const fileInput = document.getElementById('venue-model');
    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a 3D venue model');
      return;
    }

    this.setStatus('Syncing 3D venue...', 'working');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.apiBase}/augment3d/sync`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.augment3dContext = await response.json();
        this.displayAugment3DResult(this.augment3dContext);
        this.updateGenerateButton();
      } else {
        throw new Error('Failed to sync 3D venue');
      }
    } catch (error) {
      console.error('Augment 3D sync error:', error);
      this.setStatus('3D venue sync failed', 'error');
    }
  }

  async generateScene() {
    if (this.isGenerating) return;

    const concept = document.getElementById('concept-input').value.trim();
    if (!concept) {
      alert('Please enter a lighting concept');
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

      const response = await fetch(`${this.apiBase}/scenes/generate`, {
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
      } else {
        throw new Error('Failed to generate scene');
      }
    } catch (error) {
      console.error('Scene generation error:', error);
      this.setStatus('Scene generation failed', 'error');
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
      const response = await fetch(`${this.apiBase}/execute/${this.currentScene.id}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        this.setStatus('Scene executed successfully', 'success');
        console.log('Execution result:', result);
      } else {
        throw new Error('Failed to execute scene');
      }
    } catch (error) {
      console.error('Scene execution error:', error);
      this.setStatus('Scene execution failed', 'error');
    }
  }

  async stopScene() {
    // Stop current scene execution
    this.setStatus('Stopping scene...', 'working');
    
    // In a real implementation, this would send a stop command to the backend
    setTimeout(() => {
      this.setStatus('Scene stopped', 'ready');
    }, 1000);
  }

  editScene() {
    if (!this.currentScene) return;
    
    // Open scene editor (simplified)
    const newName = prompt('Enter new scene name:', this.currentScene.name);
    if (newName && newName !== this.currentScene.name) {
      this.currentScene.name = newName;
      this.displayScene(this.currentScene);
    }
  }

  displayConceptResult(context) {
    const resultDiv = document.getElementById('concept-result');
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
    const concept = document.getElementById('concept-input').value.trim();
    const generateBtn = document.getElementById('generate-scene');
    
    if (concept && !this.isGenerating) {
      generateBtn.disabled = false;
    } else {
      generateBtn.disabled = true;
    }
  }

  updateSceneControls() {
    const executeBtn = document.getElementById('execute-scene');
    const stopBtn = document.getElementById('stop-scene');
    const editBtn = document.getElementById('edit-scene');
    
    if (this.currentScene) {
      executeBtn.disabled = false;
      stopBtn.disabled = false;
      editBtn.disabled = false;
    } else {
      executeBtn.disabled = true;
      stopBtn.disabled = true;
      editBtn.disabled = true;
    }
  }

  showGenerationProgress() {
    const progressDiv = document.getElementById('generation-progress');
    progressDiv.classList.remove('hidden');
    
    // Animate progress bar
    const progressFill = progressDiv.querySelector('.progress-fill');
    progressFill.style.animation = 'progress-animation 3s ease-in-out infinite';
  }

  hideGenerationProgress() {
    const progressDiv = document.getElementById('generation-progress');
    progressDiv.classList.add('hidden');
    
    const progressFill = progressDiv.querySelector('.progress-fill');
    progressFill.style.animation = 'none';
  }

  setStatus(message, type) {
    const statusEl = document.getElementById('ai-status');
    statusEl.textContent = message;
    statusEl.className = `status-indicator ${type}`;
  }

  async loadExistingScenes() {
    try {
      const response = await fetch(`${this.apiBase}/scenes`);
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
    if (scenes.length === 0) {
      listDiv.innerHTML = '<div class="no-scenes">No AI-generated scenes yet</div>';
      return;
    }

    listDiv.innerHTML = scenes.map(scene => `
      <div class="scene-item" data-scene-id="${scene.id}">
        <div class="scene-header">
          <h4>${scene.name}</h4>
          <div class="scene-actions">
            <button class="btn-small" onclick="aiLighting.selectScene('${scene.id}')">Select</button>
            <button class="btn-small" onclick="aiLighting.deleteScene('${scene.id}')">Delete</button>
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
      const response = await fetch(`${this.apiBase}/scenes/${sceneId}`);
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
      const response = await fetch(`${this.apiBase}/scenes/${sceneId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.loadExistingScenes();
        if (this.currentScene && this.currentScene.id === sceneId) {
          this.currentScene = null;
          this.updateSceneControls();
        }
      }
    } catch (error) {
      console.error('Failed to delete scene:', error);
    }
  }
}

// Initialize AI Lighting System when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.aiLighting = new AILightingSystem();
});

// Add CSS for AI Lighting interface
const aiLightingCSS = `
  .ai-lighting-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .ai-lighting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #333;
  }

  .status-indicator {
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 12px;
  }

  .status-indicator.ready { background: #4CAF50; color: white; }
  .status-indicator.working { background: #FF9800; color: white; }
  .status-indicator.success { background: #4CAF50; color: white; }
  .status-indicator.error { background: #F44336; color: white; }

  .ai-section {
    margin-bottom: 30px;
    padding: 20px;
    background: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #333;
  }

  .ai-section h3 {
    margin-top: 0;
    color: #fff;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
  }

  .concept-input textarea {
    width: 100%;
    height: 100px;
    padding: 10px;
    border: 1px solid #555;
    border-radius: 4px;
    background: #2a2a2a;
    color: #fff;
    resize: vertical;
    font-family: inherit;
  }

  .ai-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    margin: 5px;
    font-weight: bold;
  }

  .ai-button:hover { background: #0056b3; }
  .ai-button:disabled { background: #666; cursor: not-allowed; }
  .ai-button.primary { background: #28a745; }
  .ai-button.primary:hover { background: #1e7e34; }
  .ai-button.danger { background: #dc3545; }
  .ai-button.danger:hover { background: #c82333; }

  .concept-result, .music-result, .augment3d-result {
    margin-top: 15px;
    padding: 15px;
    background: #2a2a2a;
    border-radius: 4px;
    border-left: 4px solid #007bff;
  }

  .generation-progress {
    margin-top: 15px;
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background: #333;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #28a745);
    width: 0%;
  }

  @keyframes progress-animation {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
  }

  .progress-text {
    display: block;
    margin-top: 10px;
    color: #ccc;
    text-align: center;
  }

  .scenes-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .scene-item {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    margin-bottom: 10px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .scene-item:hover { background: #333; }
  .scene-item.selected { border-color: #007bff; background: #1e3a5f; }

  .scene-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .scene-header h4 {
    margin: 0;
    color: #fff;
  }

  .scene-actions {
    display: flex;
    gap: 5px;
  }

  .btn-small {
    background: #555;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }

  .btn-small:hover { background: #666; }

  .scene-details p {
    margin: 5px 0;
    color: #ccc;
    font-size: 14px;
  }

  .scene-preview {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 20px;
    min-height: 200px;
  }

  .preview-placeholder {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 50px;
  }

  .scene-cues {
    margin-top: 15px;
  }

  .cue-item {
    display: flex;
    align-items: center;
    padding: 8px;
    background: #333;
    border-radius: 4px;
    margin-bottom: 5px;
  }

  .cue-number {
    background: #007bff;
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 15px;
  }

  .cue-name {
    flex: 1;
    color: #fff;
    font-weight: bold;
  }

  .cue-timing {
    color: #ccc;
    font-size: 12px;
  }

  .ai-suggestions {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 15px;
  }

  .suggestion-placeholder {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
  }

  .hidden { display: none !important; }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = aiLightingCSS;
document.head.appendChild(style);
