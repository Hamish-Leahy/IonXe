# IonXE Frontend - Modular Architecture

This directory contains the modular JavaScript files for the IonXE lighting control system frontend.

## File Structure

### Core Modules
- **`core.js`** - Core functionality, state management, API utilities, and global variables
- **`faders.js`** - Fader rendering, bank management, and page navigation
- **`buttons.js`** - Virtual desk buttons, keypad, intensity controls, and channel selection

### Feature Modules
- **`macros.js`** - Macro recording, playback, and management system
- **`scenes.js`** - Scene management, save/recall, import/export functionality
- **`controls.js`** - Color and intensity control utilities
- **`files.js`** - File system management and operations
- **`auth.js`** - Authentication and user management
- **`magic.js`** - Magic sheet canvas and drawing functionality
- **`console.js`** - Console-specific utilities and command center

## Dependencies

The modules must be loaded in the following order:
1. `core.js` - Must be loaded first as it provides global state and utilities
2. `faders.js` - Depends on core functionality
3. `buttons.js` - Depends on core functionality
4. All other modules can be loaded in any order

## Global State

The following global variables are shared across modules:
- `faderValues` - Uint8Array of 512 channel levels
- `buttonStates` - Object containing button states and selections
- `page`, `currentBank` - Navigation state
- `authToken` - Authentication token
- `macros` - Map of saved macros
- `macroRecording`, `macroSteps` - Macro recording state

## API Integration

All modules use the `apiFetch()` function from `core.js` for HTTP requests to the backend services.

## Styling

CSS classes are defined in `app.css` with the following naming conventions:
- `.fader-*` - Fader-related styles
- `.bank-*` - Bank view styles
- `.macro-*` - Macro panel styles
- `.softkey-*` - Button styles

## Future Improvements

- Convert to ES6 modules with proper import/export
- Add TypeScript support
- Implement proper module bundling with webpack/vite
- Add unit tests for each module
- Implement proper error handling and logging
