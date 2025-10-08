// Color Core - RGB/HSL Color Management System
// Professional color selection and manipulation for lighting control

class ColorCore {
  constructor() {
    this.currentColor = { r: 255, g: 255, b: 255, h: 0, s: 0, l: 100 };
    this.selectedChannels = new Set();
    this.colorHistory = [];
    this.maxHistory = 20;
    
    this.initializeColorSystem();
  }

  initializeColorSystem() {
    // Initialize with white color
    this.updateColorFromRGB(255, 255, 255);
  }

  // RGB to HSL conversion
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // HSL to RGB conversion
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  // Update color from RGB values
  updateColorFromRGB(r, g, b) {
    this.currentColor.r = Math.max(0, Math.min(255, r));
    this.currentColor.g = Math.max(0, Math.min(255, g));
    this.currentColor.b = Math.max(0, Math.min(255, b));
    
    const hsl = this.rgbToHsl(this.currentColor.r, this.currentColor.g, this.currentColor.b);
    this.currentColor.h = hsl.h;
    this.currentColor.s = hsl.s;
    this.currentColor.l = hsl.l;
    
    this.addToHistory();
    this.notifyColorChanged();
  }

  // Update color from HSL values
  updateColorFromHSL(h, s, l) {
    this.currentColor.h = Math.max(0, Math.min(360, h));
    this.currentColor.s = Math.max(0, Math.min(100, s));
    this.currentColor.l = Math.max(0, Math.min(100, l));
    
    const rgb = this.hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
    this.currentColor.r = rgb.r;
    this.currentColor.g = rgb.g;
    this.currentColor.b = rgb.b;
    
    this.addToHistory();
    this.notifyColorChanged();
  }

  // Get current color in various formats
  getCurrentColor() {
    return { ...this.currentColor };
  }

  getRGB() {
    return { r: this.currentColor.r, g: this.currentColor.g, b: this.currentColor.b };
  }

  getHSL() {
    return { h: this.currentColor.h, s: this.currentColor.s, l: this.currentColor.l };
  }

  getHex() {
    const toHex = (n) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(this.currentColor.r)}${toHex(this.currentColor.g)}${toHex(this.currentColor.b)}`;
  }

  getCSS() {
    return `rgb(${this.currentColor.r}, ${this.currentColor.g}, ${this.currentColor.b})`;
  }

  // Channel selection management
  selectChannel(channel) {
    this.selectedChannels.add(channel);
    this.notifySelectionChanged();
  }

  deselectChannel(channel) {
    this.selectedChannels.delete(channel);
    this.notifySelectionChanged();
  }

  toggleChannelSelection(channel) {
    if (this.selectedChannels.has(channel)) {
      this.deselectChannel(channel);
    } else {
      this.selectChannel(channel);
    }
  }

  clearSelection() {
    this.selectedChannels.clear();
    this.notifySelectionChanged();
  }

  getSelectedChannels() {
    return Array.from(this.selectedChannels);
  }

  // Color history management
  addToHistory() {
    const color = this.getCurrentColor();
    
    // Don't add if it's the same as the last color
    if (this.colorHistory.length > 0) {
      const last = this.colorHistory[this.colorHistory.length - 1];
      if (last.r === color.r && last.g === color.g && last.b === color.b) {
        return;
      }
    }
    
    this.colorHistory.push(color);
    
    // Limit history size
    if (this.colorHistory.length > this.maxHistory) {
      this.colorHistory.shift();
    }
  }

  getColorHistory() {
    return [...this.colorHistory];
  }

  // Apply color to selected channels
  applyColorToChannels() {
    const selected = this.getSelectedChannels();
    if (selected.length === 0) return;

    // Apply RGB values to selected channels
    selected.forEach(channel => {
      if (channel >= 1 && channel <= 512) {
        // For RGB fixtures, we need to map to R, G, B channels
        // This is a simplified mapping - in reality, this would depend on fixture type
        const baseChannel = (channel - 1) * 3;
        
        if (baseChannel + 2 < 512) {
          faderValues[baseChannel] = this.currentColor.r;
          faderValues[baseChannel + 1] = this.currentColor.g;
          faderValues[baseChannel + 2] = this.currentColor.b;
        }
      }
    });

    // Update fader display
    this.updateFaderDisplay();
    this.notifyColorApplied();
  }

  // Apply color to specific RGB channels
  applyColorToRGBChannels(rChannel, gChannel, bChannel) {
    if (rChannel >= 1 && rChannel <= 512) faderValues[rChannel - 1] = this.currentColor.r;
    if (gChannel >= 1 && gChannel <= 512) faderValues[gChannel - 1] = this.currentColor.g;
    if (bChannel >= 1 && bChannel <= 512) faderValues[bChannel - 1] = this.currentColor.b;
    
    this.updateFaderDisplay();
    this.notifyColorApplied();
  }

  // Update fader display
  updateFaderDisplay() {
    const faderRanges = document.querySelectorAll('.fader input[type="range"]');
    faderRanges.forEach((range, index) => {
      if (index < 512) {
        range.value = faderValues[index];
      }
    });
  }

  // Color presets
  getColorPresets() {
    return [
      { name: 'White', r: 255, g: 255, b: 255 },
      { name: 'Red', r: 255, g: 0, b: 0 },
      { name: 'Green', r: 0, g: 255, b: 0 },
      { name: 'Blue', r: 0, g: 0, b: 255 },
      { name: 'Yellow', r: 255, g: 255, b: 0 },
      { name: 'Cyan', r: 0, g: 255, b: 255 },
      { name: 'Magenta', r: 255, g: 0, b: 255 },
      { name: 'Orange', r: 255, g: 165, b: 0 },
      { name: 'Purple', r: 128, g: 0, b: 128 },
      { name: 'Pink', r: 255, g: 192, b: 203 },
      { name: 'Lime', r: 0, g: 255, b: 0 },
      { name: 'Teal', r: 0, g: 128, b: 128 },
      { name: 'Navy', r: 0, g: 0, b: 128 },
      { name: 'Maroon', r: 128, g: 0, b: 0 },
      { name: 'Olive', r: 128, g: 128, b: 0 },
      { name: 'Black', r: 0, g: 0, b: 0 }
    ];
  }

  // Apply color preset
  applyPreset(preset) {
    this.updateColorFromRGB(preset.r, preset.g, preset.b);
  }

  // Color mixing
  mixColors(color1, color2, ratio = 0.5) {
    const r = Math.round(color1.r * (1 - ratio) + color2.r * ratio);
    const g = Math.round(color1.g * (1 - ratio) + color2.g * ratio);
    const b = Math.round(color1.b * (1 - ratio) + color2.b * ratio);
    
    return { r, g, b };
  }

  // Color temperature (simplified)
  getColorTemperature(temp) {
    // Convert temperature (K) to RGB
    // This is a simplified approximation
    const temp = Math.max(1000, Math.min(40000, temp));
    
    let r, g, b;
    
    if (temp <= 6600) {
      r = 255;
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
      b = temp <= 1900 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 60) - 305.0447927307));
    } else {
      r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      b = 255;
    }
    
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  // Event notifications
  notifyColorChanged() {
    // This will be overridden by UI components
    if (this.onColorChanged) {
      this.onColorChanged(this.getCurrentColor());
    }
  }

  notifySelectionChanged() {
    if (this.onSelectionChanged) {
      this.onSelectionChanged(this.getSelectedChannels());
    }
  }

  notifyColorApplied() {
    if (this.onColorApplied) {
      this.onColorApplied(this.getCurrentColor(), this.getSelectedChannels());
    }
  }
}

// Initialize global color system
const colorCore = new ColorCore();
