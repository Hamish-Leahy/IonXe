// Fixture UI - User interface for fixture management
// Professional fixture library interface with patch management

class FixtureUI {
  constructor(fixtureCore) {
    this.fixtureCore = fixtureCore;
    this.currentView = 'library';
    this.selectedGroup = null;
    
    this.initializeUI();
    this.setupEventListeners();
  }

  initializeUI() {
    this.createFixtureLibraryHTML();
    this.updateDisplay();
  }

  createFixtureLibraryHTML() {
    // Create fixture library container
    const fixtureContainer = document.createElement('div');
    fixtureContainer.id = 'fixture-library-panel';
    fixtureContainer.className = 'fixture-library-panel';
    fixtureContainer.innerHTML = `
      <div class="fixture-header">
        <h3>Fixture Library</h3>
        <div class="fixture-views">
          <button id="fixture-view-library" class="view-btn active">Library</button>
          <button id="fixture-view-patch" class="view-btn">Patch</button>
          <button id="fixture-view-groups" class="view-btn">Groups</button>
        </div>
        <button id="fixture-library-close" class="close-btn">×</button>
      </div>
      
      <div class="fixture-content">
        <!-- Library View -->
        <div id="fixture-library-view" class="fixture-view active">
          <div class="fixture-controls">
            <div class="row">
              <button id="add-fixture" class="primary-btn">Add Fixture</button>
              <button id="import-fixtures" class="secondary-btn">Import</button>
              <button id="export-fixtures" class="secondary-btn">Export</button>
              <button id="create-fixture-type" class="secondary-btn">New Type</button>
            </div>
            
            <div class="row">
              <select id="fixture-type-filter" class="filter-select">
                <option value="">All Types</option>
              </select>
              <select id="fixture-category-filter" class="filter-select">
                <option value="">All Categories</option>
              </select>
              <input id="fixture-search" type="text" placeholder="Search fixtures..." class="search-input">
            </div>
          </div>
          
          <div class="fixture-list" id="fixture-list"></div>
        </div>

        <!-- Patch View -->
        <div id="fixture-patch-view" class="fixture-view">
          <div class="patch-controls">
            <div class="row">
              <button id="patch-all-fixtures" class="primary-btn">Patch All</button>
              <button id="unpatch-all" class="secondary-btn">Unpatch All</button>
              <button id="auto-patch" class="secondary-btn">Auto Patch</button>
            </div>
          </div>
          
          <div class="patch-grid" id="patch-grid"></div>
        </div>

        <!-- Groups View -->
        <div id="fixture-groups-view" class="fixture-view">
          <div class="group-controls">
            <div class="row">
              <button id="create-group" class="primary-btn">Create Group</button>
              <button id="add-to-group" class="secondary-btn">Add to Group</button>
              <button id="remove-from-group" class="secondary-btn">Remove from Group</button>
            </div>
          </div>
          
          <div class="groups-list" id="groups-list"></div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(fixtureContainer);
  }

  setupEventListeners() {
    // View switching
    document.getElementById('fixture-view-library').onclick = () => this.setView('library');
    document.getElementById('fixture-view-patch').onclick = () => this.setView('patch');
    document.getElementById('fixture-view-groups').onclick = () => this.setView('groups');
    
    // Close button
    document.getElementById('fixture-library-close').onclick = () => this.hide();

    // Library controls
    document.getElementById('add-fixture').onclick = () => this.showAddFixtureDialog();
    document.getElementById('import-fixtures').onclick = () => this.importFixtures();
    document.getElementById('export-fixtures').onclick = () => this.fixtureCore.exportFixtureLibrary();
    document.getElementById('create-fixture-type').onclick = () => this.showCreateFixtureTypeDialog();

    // Filters
    document.getElementById('fixture-type-filter').onchange = () => this.updateDisplay();
    document.getElementById('fixture-category-filter').onchange = () => this.updateDisplay();
    document.getElementById('fixture-search').oninput = () => this.updateDisplay();

    // Patch controls
    document.getElementById('patch-all-fixtures').onclick = () => this.patchAllFixtures();
    document.getElementById('unpatch-all').onclick = () => this.unpatchAllFixtures();
    document.getElementById('auto-patch').onclick = () => this.autoPatchFixtures();

    // Group controls
    document.getElementById('create-group').onclick = () => this.showCreateGroupDialog();
    document.getElementById('add-to-group').onclick = () => this.addSelectedToGroup();
    document.getElementById('remove-from-group').onclick = () => this.removeSelectedFromGroup();

    // Fixture core events
    this.fixtureCore.onSelectionChanged = (selected) => this.updateSelectionDisplay();
  }

  setView(view) {
    this.currentView = view;
    
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`fixture-view-${view}`).classList.add('active');
    
    // Show/hide views
    document.querySelectorAll('.fixture-view').forEach(view => view.classList.remove('active'));
    document.getElementById(`fixture-${view}-view`).classList.add('active');
    
    this.updateDisplay();
  }

  updateDisplay() {
    this.updateFixtureList();
    this.updatePatchGrid();
    this.updateGroupsList();
    this.updateFilters();
  }

  updateFixtureList() {
    const container = document.getElementById('fixture-list');
    const fixtures = this.getFilteredFixtures();
    
    container.innerHTML = '';
    
    fixtures.forEach(fixture => {
      const fixtureType = this.fixtureCore.getFixtureType(fixture.type);
      const isSelected = this.fixtureCore.selectedFixtures.has(fixture.id);
      
      const fixtureEl = document.createElement('div');
      fixtureEl.className = `fixture-item ${isSelected ? 'selected' : ''}`;
      fixtureEl.dataset.fixtureId = fixture.id;
      fixtureEl.innerHTML = `
        <div class="fixture-info">
          <div class="fixture-name">${fixture.name}</div>
          <div class="fixture-type">${fixtureType ? fixtureType.name : 'Unknown'}</div>
          <div class="fixture-address">Address: ${fixture.address}</div>
          <div class="fixture-group">${fixture.group ? `Group: ${this.fixtureCore.getGroup(fixture.group)?.name || 'Unknown'}` : 'No Group'}</div>
        </div>
        <div class="fixture-actions">
          <button class="action-btn edit-btn" title="Edit">✏️</button>
          <button class="action-btn delete-btn" title="Delete">🗑️</button>
        </div>
      `;
      
      // Selection
      fixtureEl.onclick = (e) => {
        if (!e.target.closest('.action-btn')) {
          this.fixtureCore.toggleFixtureSelection(fixture.id);
        }
      };
      
      // Edit button
      fixtureEl.querySelector('.edit-btn').onclick = (e) => {
        e.stopPropagation();
        this.showEditFixtureDialog(fixture);
      };
      
      // Delete button
      fixtureEl.querySelector('.delete-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Delete fixture "${fixture.name}"?`)) {
          this.fixtureCore.deleteFixture(fixture.id);
          this.updateDisplay();
        }
      };
      
      container.appendChild(fixtureEl);
    });
  }

  updatePatchGrid() {
    const container = document.getElementById('patch-grid');
    const patch = this.fixtureCore.getPatch();
    
    container.innerHTML = '';
    
    // Create 32 rows of 16 channels each (512 total)
    for (let row = 0; row < 32; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'patch-row';
      
      for (let col = 0; col < 16; col++) {
        const address = row * 16 + col + 1;
        const patchData = patch.find(p => p.address === address);
        
        const cellEl = document.createElement('div');
        cellEl.className = `patch-cell ${patchData ? 'patched' : ''}`;
        cellEl.dataset.address = address;
        cellEl.innerHTML = `
          <div class="patch-address">${address}</div>
          <div class="patch-fixture">${patchData ? this.fixtureCore.getFixture(patchData.fixture)?.name || 'Unknown' : ''}</div>
          <div class="patch-capability">${patchData ? patchData.capability || '' : ''}</div>
        `;
        
        if (patchData) {
          cellEl.onclick = () => this.showPatchDetails(address, patchData);
        }
        
        rowEl.appendChild(cellEl);
      }
      
      container.appendChild(rowEl);
    });
  }

  updateGroupsList() {
    const container = document.getElementById('groups-list');
    const groups = this.fixtureCore.getAllGroups();
    
    container.innerHTML = '';
    
    groups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'group-item';
      groupEl.dataset.groupId = group.id;
      groupEl.innerHTML = `
        <div class="group-info">
          <div class="group-name">${group.name}</div>
          <div class="group-count">${group.fixtures.length} fixtures</div>
        </div>
        <div class="group-actions">
          <button class="action-btn edit-btn" title="Edit">✏️</button>
          <button class="action-btn delete-btn" title="Delete">🗑️</button>
        </div>
      `;
      
      // Edit button
      groupEl.querySelector('.edit-btn').onclick = () => {
        this.showEditGroupDialog(group);
      };
      
      // Delete button
      groupEl.querySelector('.delete-btn').onclick = () => {
        if (confirm(`Delete group "${group.name}"?`)) {
          this.fixtureCore.deleteGroup(group.id);
          this.updateDisplay();
        }
      };
      
      container.appendChild(groupEl);
    });
  }

  updateFilters() {
    // Update type filter
    const typeFilter = document.getElementById('fixture-type-filter');
    typeFilter.innerHTML = '<option value="">All Types</option>';
    
    const types = this.fixtureCore.getAllFixtureTypes();
    const uniqueTypes = [...new Set(types.map(t => t.name))];
    uniqueTypes.forEach(typeName => {
      const option = document.createElement('option');
      option.value = typeName;
      option.textContent = typeName;
      typeFilter.appendChild(option);
    });
    
    // Update category filter
    const categoryFilter = document.getElementById('fixture-category-filter');
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    const categories = [...new Set(types.map(t => t.category))];
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  getFilteredFixtures() {
    let fixtures = this.fixtureCore.getAllFixtures();
    
    const typeFilter = document.getElementById('fixture-type-filter').value;
    const categoryFilter = document.getElementById('fixture-category-filter').value;
    const searchTerm = document.getElementById('fixture-search').value.toLowerCase();
    
    if (typeFilter) {
      fixtures = fixtures.filter(f => {
        const type = this.fixtureCore.getFixtureType(f.type);
        return type && type.name === typeFilter;
      });
    }
    
    if (categoryFilter) {
      fixtures = fixtures.filter(f => {
        const type = this.fixtureCore.getFixtureType(f.type);
        return type && type.category === categoryFilter;
      });
    }
    
    if (searchTerm) {
      fixtures = fixtures.filter(f => 
        f.name.toLowerCase().includes(searchTerm) ||
        (f.group && this.fixtureCore.getGroup(f.group)?.name.toLowerCase().includes(searchTerm))
      );
    }
    
    return fixtures;
  }

  updateSelectionDisplay() {
    // Update fixture selection in UI
    document.querySelectorAll('.fixture-item').forEach(item => {
      const fixtureId = item.dataset.fixtureId;
      const isSelected = this.fixtureCore.selectedFixtures.has(fixtureId);
      item.classList.toggle('selected', isSelected);
    });
  }

  showAddFixtureDialog() {
    const dialog = this.createDialog('Add Fixture', `
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="fixture-name" placeholder="Fixture Name">
      </div>
      <div class="form-group">
        <label>Type:</label>
        <select id="fixture-type-select">
          <option value="">Select Type</option>
        </select>
      </div>
      <div class="form-group">
        <label>Address:</label>
        <input type="number" id="fixture-address" min="1" max="512" value="1">
      </div>
      <div class="form-group">
        <label>Universe:</label>
        <input type="number" id="fixture-universe" min="1" max="4" value="1">
      </div>
    `);
    
    // Populate type select
    const typeSelect = dialog.querySelector('#fixture-type-select');
    this.fixtureCore.getAllFixtureTypes().forEach(type => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = `${type.manufacturer} ${type.name}`;
      typeSelect.appendChild(option);
    });
    
    dialog.querySelector('.dialog-ok').onclick = () => {
      const name = dialog.querySelector('#fixture-name').value;
      const type = dialog.querySelector('#fixture-type-select').value;
      const address = parseInt(dialog.querySelector('#fixture-address').value);
      const universe = parseInt(dialog.querySelector('#fixture-universe').value);
      
      if (name && type) {
        this.fixtureCore.addFixture({ name, type, address, universe });
        this.updateDisplay();
        this.closeDialog(dialog);
      }
    };
  }

  showEditFixtureDialog(fixture) {
    const dialog = this.createDialog('Edit Fixture', `
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="edit-fixture-name" value="${fixture.name}">
      </div>
      <div class="form-group">
        <label>Address:</label>
        <input type="number" id="edit-fixture-address" min="1" max="512" value="${fixture.address}">
      </div>
      <div class="form-group">
        <label>Group:</label>
        <select id="edit-fixture-group">
          <option value="">No Group</option>
        </select>
      </div>
    `);
    
    // Populate group select
    const groupSelect = dialog.querySelector('#edit-fixture-group');
    this.fixtureCore.getAllGroups().forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      if (group.id === fixture.group) option.selected = true;
      groupSelect.appendChild(option);
    });
    
    dialog.querySelector('.dialog-ok').onclick = () => {
      const name = dialog.querySelector('#edit-fixture-name').value;
      const address = parseInt(dialog.querySelector('#edit-fixture-address').value);
      const group = dialog.querySelector('#edit-fixture-group').value || null;
      
      this.fixtureCore.updateFixture(fixture.id, { name, address, group });
      this.updateDisplay();
      this.closeDialog(dialog);
    };
  }

  showCreateGroupDialog() {
    const dialog = this.createDialog('Create Group', `
      <div class="form-group">
        <label>Group Name:</label>
        <input type="text" id="group-name" placeholder="Group Name">
      </div>
    `);
    
    dialog.querySelector('.dialog-ok').onclick = () => {
      const name = dialog.querySelector('#group-name').value;
      if (name) {
        this.fixtureCore.createGroup(name);
        this.updateDisplay();
        this.closeDialog(dialog);
      }
    };
  }

  showEditGroupDialog(group) {
    const dialog = this.createDialog('Edit Group', `
      <div class="form-group">
        <label>Group Name:</label>
        <input type="text" id="edit-group-name" value="${group.name}">
      </div>
    `);
    
    dialog.querySelector('.dialog-ok').onclick = () => {
      const name = dialog.querySelector('#edit-group-name').value;
      if (name) {
        this.fixtureCore.updateGroup(group.id, { name });
        this.updateDisplay();
        this.closeDialog(dialog);
      }
    };
  }

  showCreateFixtureTypeDialog() {
    const dialog = this.createDialog('Create Fixture Type', `
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="type-name" placeholder="Fixture Name">
      </div>
      <div class="form-group">
        <label>Manufacturer:</label>
        <input type="text" id="type-manufacturer" placeholder="Manufacturer">
      </div>
      <div class="form-group">
        <label>Category:</label>
        <select id="type-category">
          <option value="LED">LED</option>
          <option value="Moving Head">Moving Head</option>
          <option value="Dimmer">Dimmer</option>
          <option value="Strobe">Strobe</option>
          <option value="Laser">Laser</option>
        </select>
      </div>
      <div class="form-group">
        <label>Channels:</label>
        <input type="number" id="type-channels" min="1" max="50" value="1">
      </div>
    `);
    
    dialog.querySelector('.dialog-ok').onclick = () => {
      const name = dialog.querySelector('#type-name').value;
      const manufacturer = dialog.querySelector('#type-manufacturer').value;
      const category = dialog.querySelector('#type-category').value;
      const channels = parseInt(dialog.querySelector('#type-channels').value);
      
      if (name && manufacturer && channels) {
        const id = `${manufacturer.toLowerCase().replace(/\s+/g, '-')}-${name.toLowerCase().replace(/\s+/g, '-')}`;
        this.fixtureCore.addFixtureType(id, {
          name,
          manufacturer,
          category,
          channels,
          capabilities: {
            intensity: { channel: 1, range: [0, 255] }
          }
        });
        this.updateDisplay();
        this.closeDialog(dialog);
      }
    };
  }

  createDialog(title, content) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <h3>${title}</h3>
          <button class="dialog-close">×</button>
        </div>
        <div class="dialog-content">
          ${content}
        </div>
        <div class="dialog-actions">
          <button class="dialog-cancel">Cancel</button>
          <button class="dialog-ok primary-btn">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.dialog-close').onclick = () => this.closeDialog(dialog);
    dialog.querySelector('.dialog-cancel').onclick = () => this.closeDialog(dialog);
    
    return dialog;
  }

  closeDialog(dialog) {
    document.body.removeChild(dialog);
  }

  addSelectedToGroup() {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }
    
    const groups = this.fixtureCore.getAllGroups();
    if (groups.length === 0) {
      alert('Please create a group first');
      return;
    }
    
    const groupId = prompt('Enter group name:');
    const group = groups.find(g => g.name === groupId);
    if (group) {
      selected.forEach(fixtureId => {
        this.fixtureCore.addFixtureToGroup(fixtureId, group.id);
      });
      this.updateDisplay();
    } else {
      alert('Group not found');
    }
  }

  removeSelectedFromGroup() {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }
    
    selected.forEach(fixtureId => {
      const fixture = this.fixtureCore.getFixture(fixtureId);
      if (fixture && fixture.group) {
        this.fixtureCore.removeFixtureFromGroup(fixtureId, fixture.group);
      }
    });
    this.updateDisplay();
  }

  patchAllFixtures() {
    // Auto-patch all fixtures starting from address 1
    const fixtures = this.fixtureCore.getAllFixtures();
    let currentAddress = 1;
    
    fixtures.forEach(fixture => {
      const fixtureType = this.fixtureCore.getFixtureType(fixture.type);
      if (fixtureType) {
        this.fixtureCore.updateFixture(fixture.id, { address: currentAddress });
        currentAddress += fixtureType.channels;
      }
    });
    
    this.updateDisplay();
  }

  unpatchAllFixtures() {
    const fixtures = this.fixtureCore.getAllFixtures();
    fixtures.forEach(fixture => {
      this.fixtureCore.updateFixture(fixture.id, { address: 1 });
    });
    this.updateDisplay();
  }

  autoPatchFixtures() {
    // Smart auto-patch avoiding conflicts
    const fixtures = this.fixtureCore.getAllFixtures();
    const usedAddresses = new Set();
    let currentAddress = 1;
    
    fixtures.forEach(fixture => {
      const fixtureType = this.fixtureCore.getFixtureType(fixture.type);
      if (fixtureType) {
        // Find next available address
        while (usedAddresses.has(currentAddress)) {
          currentAddress++;
        }
        
        this.fixtureCore.updateFixture(fixture.id, { address: currentAddress });
        
        // Mark addresses as used
        for (let i = 0; i < fixtureType.channels; i++) {
          usedAddresses.add(currentAddress + i);
        }
        
        currentAddress += fixtureType.channels;
      }
    });
    
    this.updateDisplay();
  }

  importFixtures() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      if (e.target.files[0]) {
        this.fixtureCore.importFixtureLibrary(e.target.files[0])
          .then(() => {
            this.updateDisplay();
            alert('Fixtures imported successfully');
          })
          .catch(error => {
            alert('Import failed: ' + error.message);
          });
      }
    };
    input.click();
  }

  showPatchDetails(address, patchData) {
    const fixture = this.fixtureCore.getFixture(patchData.fixture);
    const fixtureType = this.fixtureCore.getFixtureType(fixture.type);
    
    alert(`Address ${address}\nFixture: ${fixture.name}\nType: ${fixtureType.name}\nCapability: ${patchData.capability}\nChannel: ${patchData.channel}`);
  }

  show() {
    document.getElementById('fixture-library-panel').classList.add('visible');
    this.updateDisplay();
  }

  hide() {
    document.getElementById('fixture-library-panel').classList.remove('visible');
  }

  toggle() {
    if (document.getElementById('fixture-library-panel').classList.contains('visible')) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize fixture UI
const fixtureUI = new FixtureUI(fixtureCore);
