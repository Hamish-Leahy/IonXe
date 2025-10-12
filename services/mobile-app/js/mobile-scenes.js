// IonXe Mobile Scenes - Scene management for mobile
class MobileScenes {
  constructor(core) {
    this.core = core;
    this.scenes = [];
    this.currentScene = null;
    this.isLoading = false;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadScenes();
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-scenes')?.addEventListener('click', () => {
      this.loadScenes();
    });

    // Scene controls
    document.getElementById('save-scene')?.addEventListener('click', () => {
      this.showSaveSceneDialog();
    });

    document.getElementById('clear-scene')?.addEventListener('click', () => {
      this.clearCurrentScene();
    });

    // Core events
    this.core.on('sceneUpdate', (data) => {
      this.handleSceneUpdate(data);
    });

    this.core.on('connected', () => {
      this.loadScenes();
    });
  }

  async loadScenes() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.updateLoadingState(true);

    try {
      const data = await this.core.apiRequest('/api/scenes');
      this.scenes = data.scenes || [];
      this.renderScenes();
    } catch (error) {
      console.error('Failed to load scenes:', error);
      this.core.showToast('Failed to load scenes', 'error');
    } finally {
      this.isLoading = false;
      this.updateLoadingState(false);
    }
  }

  renderScenes() {
    const container = document.getElementById('scenes-list');
    if (!container) return;

    if (this.scenes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎬</div>
          <h3>No Scenes Found</h3>
          <p>Create your first scene by saving the current fader state</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';

    this.scenes.forEach(scene => {
      const sceneElement = this.createSceneElement(scene);
      container.appendChild(sceneElement);
    });
  }

  createSceneElement(scene) {
    const sceneDiv = document.createElement('div');
    sceneDiv.className = 'scene-item';
    sceneDiv.dataset.sceneId = scene.id;

    const createdDate = new Date(scene.createdAt).toLocaleDateString();
    const modifiedDate = new Date(scene.updatedAt).toLocaleDateString();

    sceneDiv.innerHTML = `
      <div class="scene-name">${this.escapeHtml(scene.name)}</div>
      <div class="scene-description">${this.escapeHtml(scene.description || 'No description')}</div>
      <div class="scene-meta">
        <span>Created: ${createdDate}</span>
        <span>Modified: ${modifiedDate}</span>
      </div>
      <div class="scene-actions">
        <button class="action-btn primary" onclick="mobileScenes.executeScene('${scene.id}')">
          Execute
        </button>
        <button class="action-btn" onclick="mobileScenes.editScene('${scene.id}')">
          Edit
        </button>
        <button class="action-btn danger" onclick="mobileScenes.deleteScene('${scene.id}')">
          Delete
        </button>
      </div>
    `;

    // Add click handler for scene selection
    sceneDiv.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        this.selectScene(scene.id);
      }
    });

    return sceneDiv;
  }

  selectScene(sceneId) {
    // Remove previous selection
    document.querySelectorAll('.scene-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add selection to clicked scene
    const sceneElement = document.querySelector(`[data-scene-id="${sceneId}"]`);
    if (sceneElement) {
      sceneElement.classList.add('active');
    }

    this.currentScene = this.scenes.find(s => s.id === sceneId);
  }

  async executeScene(sceneId) {
    try {
      await this.core.apiRequest(`/api/scenes/${sceneId}/execute`, {
        method: 'POST'
      });

      this.core.showToast('Scene executed successfully', 'success');
      
      // Haptic feedback
      if (this.core.settings.hapticFeedback && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.error('Failed to execute scene:', error);
      this.core.showToast('Failed to execute scene', 'error');
    }
  }

  async editScene(sceneId) {
    const scene = this.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    this.showEditSceneDialog(scene);
  }

  async deleteScene(sceneId) {
    const scene = this.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    if (confirm(`Are you sure you want to delete "${scene.name}"?`)) {
      try {
        await this.core.apiRequest(`/api/scenes/${sceneId}`, {
          method: 'DELETE'
        });

        this.scenes = this.scenes.filter(s => s.id !== sceneId);
        this.renderScenes();
        this.core.showToast('Scene deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete scene:', error);
        this.core.showToast('Failed to delete scene', 'error');
      }
    }
  }

  showSaveSceneDialog() {
    const dialog = this.createDialog('Save Scene', `
      <div class="dialog-content">
        <div class="form-group">
          <label for="scene-name">Scene Name</label>
          <input type="text" id="scene-name" placeholder="Enter scene name" required>
        </div>
        <div class="form-group">
          <label for="scene-description">Description (Optional)</label>
          <textarea id="scene-description" placeholder="Enter scene description"></textarea>
        </div>
      </div>
    `, [
      {
        text: 'Cancel',
        class: 'secondary',
        action: () => this.closeDialog()
      },
      {
        text: 'Save',
        class: 'primary',
        action: () => this.saveCurrentScene()
      }
    ]);

    document.body.appendChild(dialog);
  }

  async saveCurrentScene() {
    const name = document.getElementById('scene-name').value.trim();
    const description = document.getElementById('scene-description').value.trim();

    if (!name) {
      this.core.showToast('Please enter a scene name', 'error');
      return;
    }

    try {
      // Get current fader values from mobile faders
      const faderValues = window.mobileFaders ? window.mobileFaders.getCurrentValues() : [];

      const sceneData = {
        name: name,
        description: description,
        faderValues: faderValues,
        metadata: {
          createdOn: 'mobile',
          version: '1.0.0'
        }
      };

      const response = await this.core.apiRequest('/api/scenes', {
        method: 'POST',
        body: JSON.stringify(sceneData)
      });

      this.scenes.push(response.scene);
      this.renderScenes();
      this.closeDialog();
      this.core.showToast('Scene saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save scene:', error);
      this.core.showToast('Failed to save scene', 'error');
    }
  }

  showEditSceneDialog(scene) {
    const dialog = this.createDialog('Edit Scene', `
      <div class="dialog-content">
        <div class="form-group">
          <label for="edit-scene-name">Scene Name</label>
          <input type="text" id="edit-scene-name" value="${this.escapeHtml(scene.name)}" required>
        </div>
        <div class="form-group">
          <label for="edit-scene-description">Description</label>
          <textarea id="edit-scene-description">${this.escapeHtml(scene.description || '')}</textarea>
        </div>
      </div>
    `, [
      {
        text: 'Cancel',
        class: 'secondary',
        action: () => this.closeDialog()
      },
      {
        text: 'Save',
        class: 'primary',
        action: () => this.updateScene(scene.id)
      }
    ]);

    document.body.appendChild(dialog);
  }

  async updateScene(sceneId) {
    const name = document.getElementById('edit-scene-name').value.trim();
    const description = document.getElementById('edit-scene-description').value.trim();

    if (!name) {
      this.core.showToast('Please enter a scene name', 'error');
      return;
    }

    try {
      const updateData = {
        name: name,
        description: description
      };

      const response = await this.core.apiRequest(`/api/scenes/${sceneId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      // Update local scene
      const sceneIndex = this.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex !== -1) {
        this.scenes[sceneIndex] = { ...this.scenes[sceneIndex], ...response.scene };
      }

      this.renderScenes();
      this.closeDialog();
      this.core.showToast('Scene updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update scene:', error);
      this.core.showToast('Failed to update scene', 'error');
    }
  }

  async clearCurrentScene() {
    if (confirm('Are you sure you want to clear all faders?')) {
      try {
        if (window.mobileFaders) {
          window.mobileFaders.clearAllFaders();
        }
        this.core.showToast('Scene cleared', 'success');
      } catch (error) {
        console.error('Failed to clear scene:', error);
        this.core.showToast('Failed to clear scene', 'error');
      }
    }
  }

  handleSceneUpdate(data) {
    switch (data.action) {
      case 'created':
        this.scenes.push(data.scene);
        break;
      case 'updated':
        const index = this.scenes.findIndex(s => s.id === data.scene.id);
        if (index !== -1) {
          this.scenes[index] = data.scene;
        }
        break;
      case 'deleted':
        this.scenes = this.scenes.filter(s => s.id !== data.sceneId);
        break;
    }
    this.renderScenes();
  }

  // Dialog Management
  createDialog(title, content, buttons) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <h3>${title}</h3>
          <button class="dialog-close" onclick="mobileScenes.closeDialog()">×</button>
        </div>
        ${content}
        <div class="dialog-actions">
          ${buttons.map(btn => `
            <button class="action-btn ${btn.class}" onclick="mobileScenes.handleDialogAction('${btn.text}')">
              ${btn.text}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    return dialog;
  }

  handleDialogAction(buttonText) {
    // Find the button action and execute it
    const dialog = document.querySelector('.dialog-overlay');
    if (dialog) {
      const buttons = dialog.querySelectorAll('.dialog-actions .action-btn');
      buttons.forEach(btn => {
        if (btn.textContent.trim() === buttonText) {
          btn.click();
        }
      });
    }
  }

  closeDialog() {
    const dialog = document.querySelector('.dialog-overlay');
    if (dialog) {
      dialog.remove();
    }
  }

  updateLoadingState(loading) {
    const refreshBtn = document.getElementById('refresh-scenes');
    if (refreshBtn) {
      refreshBtn.disabled = loading;
      refreshBtn.textContent = loading ? '⏳' : '🔄';
    }
  }

  // Utility Methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getSceneById(sceneId) {
    return this.scenes.find(s => s.id === sceneId);
  }

  // Search and Filter
  searchScenes(query) {
    if (!query) {
      this.renderScenes();
      return;
    }

    const filtered = this.scenes.filter(scene => 
      scene.name.toLowerCase().includes(query.toLowerCase()) ||
      (scene.description && scene.description.toLowerCase().includes(query.toLowerCase()))
    );

    this.renderScenes(filtered);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.mobileCore) {
    window.mobileScenes = new MobileScenes(window.mobileCore);
  }
});

