// Button controls and virtual desk functionality
function setupButtonControls() {
  // Number keypad
  const keypadButtons = document.querySelectorAll('.num-keypad button');
  keypadButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.textContent;
      if (value === '+') {
        // Channel up
        if (buttonStates.lastSelectedChannel !== null) {
          buttonStates.lastSelectedChannel = Math.min(511, buttonStates.lastSelectedChannel + 1);
          updateSelectedChannel();
        }
      } else if (value === '-') {
        // Channel down
        if (buttonStates.lastSelectedChannel !== null) {
          buttonStates.lastSelectedChannel = Math.max(0, buttonStates.lastSelectedChannel - 1);
          updateSelectedChannel();
        }
      } else {
        // Number input
        const num = parseInt(value);
        if (!isNaN(num)) {
          if (buttonStates.lastSelectedChannel === null) {
            buttonStates.lastSelectedChannel = num - 1;
          } else {
            buttonStates.lastSelectedChannel = buttonStates.lastSelectedChannel * 10 + num;
            if (buttonStates.lastSelectedChannel > 511) {
              buttonStates.lastSelectedChannel = num - 1;
            }
          }
          updateSelectedChannel();
        }
      }
    });
  });

  // Intensity controls
  document.getElementById('intensity-full').onclick = () => {
    if (buttonStates.selectedChannels.size > 0) {
      const channels = Array.from(buttonStates.selectedChannels);
      setChannelsIntensity(channels, 255);
    }
  };

  document.getElementById('intensity-out').onclick = () => {
    if (buttonStates.selectedChannels.size > 0) {
      const channels = Array.from(buttonStates.selectedChannels);
      setChannelsIntensity(channels, 0);
    }
  };

  document.getElementById('intensity-at').onclick = () => {
    const value = prompt('Enter intensity value (0-255):');
    const intValue = parseInt(value);
    if (!isNaN(intValue) && intValue >= 0 && intValue <= 255) {
      if (buttonStates.selectedChannels.size > 0) {
        const channels = Array.from(buttonStates.selectedChannels);
        setChannelsIntensity(channels, intValue);
      }
    }
  };

  // Softkeys
  document.getElementById('softkey-macro').onclick = () => {
    buttonStates.macroMode = !buttonStates.macroMode;
    updateButtonStates();
    if (buttonStates.macroMode) {
      showMacroPanel();
    } else {
      hideMacroPanel();
    }
  };

  document.getElementById('softkey-record').onclick = () => {
    if (macroRecording) {
      stopMacroRecording();
    } else {
      startMacroRecording();
    }
    updateButtonStates();
  };

  document.getElementById('softkey-update').onclick = () => {
    // Update selected channels with current levels
    if (buttonStates.selectedChannels.size > 0) {
      const channels = Array.from(buttonStates.selectedChannels);
      for (const ch of channels) {
        faderValues[ch] = applyGrandMaster(faderValues[ch]);
      }
      scheduleFlush();
    }
  };

  document.getElementById('softkey-clear').onclick = () => {
    if (buttonStates.selectedChannels.size > 0) {
      const channels = Array.from(buttonStates.selectedChannels);
      setChannelsIntensity(channels, 0);
    }
  };

  document.getElementById('softkey-blind').onclick = () => {
    buttonStates.blindMode = !buttonStates.blindMode;
    buttonStates.liveMode = !buttonStates.blindMode;
    updateButtonStates();
  };

  document.getElementById('softkey-live').onclick = () => {
    buttonStates.liveMode = !buttonStates.liveMode;
    buttonStates.blindMode = !buttonStates.liveMode;
    updateButtonStates();
  };
}

function updateSelectedChannel() {
  const display = document.getElementById('selected-channel');
  if (display) {
    display.textContent = buttonStates.lastSelectedChannel !== null ? 
      `Ch ${buttonStates.lastSelectedChannel + 1}` : 'No Selection';
  }
}

function updateButtonStates() {
  // Update button visual states
  document.getElementById('softkey-macro').classList.toggle('active', buttonStates.macroMode);
  document.getElementById('softkey-record').classList.toggle('active', buttonStates.recordMode);
  document.getElementById('softkey-blind').classList.toggle('active', buttonStates.blindMode);
  document.getElementById('softkey-live').classList.toggle('active', buttonStates.liveMode);
}

function setChannelsIntensity(channels, value) {
  for (const ch of channels) {
    if (ch >= 0 && ch < 512) {
      faderValues[ch] = applyGrandMaster(value);
    }
  }
  scheduleFlush();
}

// Channel selection functionality
function addChannelSelection() {
  // Add click handlers to fader labels for channel selection
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'LABEL' && e.target.parentElement.classList.contains('fader')) {
      const labelText = e.target.textContent;
      const channelNum = parseInt(labelText) - 1;
      if (!isNaN(channelNum) && channelNum >= 0 && channelNum < 512) {
        if (e.ctrlKey || e.metaKey) {
          // Multi-select
          if (buttonStates.selectedChannels.has(channelNum)) {
            buttonStates.selectedChannels.delete(channelNum);
          } else {
            buttonStates.selectedChannels.add(channelNum);
          }
        } else {
          // Single select
          buttonStates.selectedChannels.clear();
          buttonStates.selectedChannels.add(channelNum);
        }
        buttonStates.lastSelectedChannel = channelNum;
        updateSelectedChannel();
        updateChannelSelectionUI();
      }
    }
  });
}

function updateChannelSelectionUI() {
  // Update visual indication of selected channels
  document.querySelectorAll('.fader').forEach(fader => {
    const label = fader.querySelector('label');
    if (label) {
      const channelNum = parseInt(label.textContent) - 1;
      fader.classList.toggle('selected', buttonStates.selectedChannels.has(channelNum));
    }
  });
}

// Initialize button controls
setupButtonControls();
addChannelSelection();
