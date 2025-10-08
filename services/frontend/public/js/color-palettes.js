// Color Palettes - Save and recall color combinations
// Professional color palette management for lighting control

class ColorPalettes {
  constructor(colorCore) {
    this.colorCore = colorCore;
    this.palettes = new Map();
    this.currentPalette = null;
    
    this.initializePalettes();
    this.loadPalettesFromStorage();
  }

  initializePalettes() {
    // Create default palettes
    this.createDefaultPalettes();
  }

  createDefaultPalettes() {
    // Basic Colors Palette
    this.addPalette('Basic Colors', [
      { name: 'White', r: 255, g: 255, b: 255 },
      { name: 'Red', r: 255, g: 0, b: 0 },
      { name: 'Green', r: 0, g: 255, b: 0 },
      { name: 'Blue', r: 0, g: 0, b: 255 },
      { name: 'Yellow', r: 255, g: 255, b: 0 },
      { name: 'Cyan', r: 0, g: 255, b: 255 },
      { name: 'Magenta', r: 255, g: 0, b: 255 },
      { name: 'Black', r: 0, g: 0, b: 0 }
    ]);

    // Warm Colors Palette
    this.addPalette('Warm Colors', [
      { name: 'Warm White', r: 255, g: 248, b: 220 },
      { name: 'Candle', r: 255, g: 147, b: 41 },
      { name: 'Sunset', r: 255, g: 94, b: 77 },
      { name: 'Fire', r: 255, g: 69, b: 0 },
      { name: 'Amber', r: 255, g: 191, b: 0 },
      { name: 'Gold', r: 255, g: 215, b: 0 },
      { name: 'Orange', r: 255, g: 165, b: 0 },
      { name: 'Coral', r: 255, g: 127, b: 80 }
    ]);

    // Cool Colors Palette
    this.addPalette('Cool Colors', [
      { name: 'Cool White', r: 248, g: 248, b: 255 },
      { name: 'Ice Blue', r: 176, g: 224, b: 230 },
      { name: 'Sky Blue', r: 135, g: 206, b: 235 },
      { name: 'Ocean', r: 0, g: 191, b: 255 },
      { name: 'Navy', r: 0, g: 0, b: 128 },
      { name: 'Purple', r: 128, g: 0, b: 128 },
      { name: 'Violet', r: 138, g: 43, b: 226 },
      { name: 'Indigo', r: 75, g: 0, b: 130 }
    ]);

    // Pastels Palette
    this.addPalette('Pastels', [
      { name: 'Pink', r: 255, g: 192, b: 203 },
      { name: 'Lavender', r: 230, g: 230, b: 250 },
      { name: 'Mint', r: 189, g: 252, b: 201 },
      { name: 'Peach', r: 255, g: 218, b: 185 },
      { name: 'Lemon', r: 255, g: 250, b: 205 },
      { name: 'Powder Blue', r: 176, g: 224, b: 230 },
      { name: 'Rose', r: 255, g: 228, b: 225 },
      { name: 'Cream', r: 255, g: 253, b: 208 }
    ]);

    // Theater Colors Palette
    this.addPalette('Theater Colors', [
      { name: 'Warm White', r: 255, g: 248, b: 220 },
      { name: 'Cool White', r: 248, g: 248, b: 255 },
      { name: 'Daylight', r: 255, g: 255, b: 255 },
      { name: 'Tungsten', r: 255, g: 197, b: 143 },
      { name: 'HMI', r: 255, g: 255, b: 240 },
      { name: 'LED Cool', r: 240, g: 248, b: 255 },
      { name: 'LED Warm', r: 255, g: 245, b: 238 },
      { name: 'UV', r: 75, g: 0, b: 130 }
    ]);
  }

  addPalette(name, colors) {
    const palette = {
      id: this.generateId(),
      name: name,
      colors: colors,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    
    this.palettes.set(palette.id, palette);
    this.savePalettesToStorage();
    return palette;
  }

  updatePalette(id, name, colors) {
    const palette = this.palettes.get(id);
    if (palette) {
      palette.name = name;
      palette.colors = colors;
      palette.modified = new Date().toISOString();
      this.savePalettesToStorage();
      return palette;
    }
    return null;
  }

  deletePalette(id) {
    if (this.palettes.has(id)) {
      this.palettes.delete(id);
      this.savePalettesToStorage();
      return true;
    }
    return false;
  }

  getPalette(id) {
    return this.palettes.get(id);
  }

  getAllPalettes() {
    return Array.from(this.palettes.values());
  }

  setCurrentPalette(id) {
    this.currentPalette = id;
    this.saveCurrentPaletteToStorage();
  }

  getCurrentPalette() {
    return this.currentPalette ? this.palettes.get(this.currentPalette) : null;
  }

  addColorToCurrentPalette(color) {
    const palette = this.getCurrentPalette();
    if (palette) {
      palette.colors.push({
        name: `Color ${palette.colors.length + 1}`,
        r: color.r,
        g: color.g,
        b: color.b
      });
      palette.modified = new Date().toISOString();
      this.savePalettesToStorage();
      return true;
    }
    return false;
  }

  removeColorFromCurrentPalette(index) {
    const palette = this.getCurrentPalette();
    if (palette && index >= 0 && index < palette.colors.length) {
      palette.colors.splice(index, 1);
      palette.modified = new Date().toISOString();
      this.savePalettesToStorage();
      return true;
    }
    return false;
  }

  applyPaletteColor(paletteId, colorIndex) {
    const palette = this.palettes.get(paletteId);
    if (palette && colorIndex >= 0 && colorIndex < palette.colors.length) {
      const color = palette.colors[colorIndex];
      this.colorCore.updateColorFromRGB(color.r, color.g, color.b);
      return true;
    }
    return false;
  }

  // Color mixing within palette
  mixPaletteColors(paletteId, colorIndex1, colorIndex2, ratio = 0.5) {
    const palette = this.palettes.get(paletteId);
    if (palette && 
        colorIndex1 >= 0 && colorIndex1 < palette.colors.length &&
        colorIndex2 >= 0 && colorIndex2 < palette.colors.length) {
      
      const color1 = palette.colors[colorIndex1];
      const color2 = palette.colors[colorIndex2];
      const mixed = this.colorCore.mixColors(color1, color2, ratio);
      
      return {
        name: `Mix of ${color1.name} & ${color2.name}`,
        r: mixed.r,
        g: mixed.g,
        b: mixed.b
      };
    }
    return null;
  }

  // Generate color variations
  generateVariations(baseColor, count = 5) {
    const variations = [];
    const hsl = this.colorCore.rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
    
    for (let i = 0; i < count; i++) {
      const variation = {
        name: `Variation ${i + 1}`,
        r: baseColor.r,
        g: baseColor.g,
        b: baseColor.b
      };
      
      // Create variations by adjusting hue, saturation, or lightness
      switch (i % 3) {
        case 0: // Hue variation
          const hueVariation = this.colorCore.hslToRgb(
            (hsl.h + (i * 30)) % 360, 
            hsl.s, 
            hsl.l
          );
          variation.r = hueVariation.r;
          variation.g = hueVariation.g;
          variation.b = hueVariation.b;
          break;
        case 1: // Saturation variation
          const satVariation = this.colorCore.hslToRgb(
            hsl.h, 
            Math.max(0, Math.min(100, hsl.s + (i * 20) - 40)), 
            hsl.l
          );
          variation.r = satVariation.r;
          variation.g = satVariation.g;
          variation.b = satVariation.b;
          break;
        case 2: // Lightness variation
          const lightVariation = this.colorCore.hslToRgb(
            hsl.h, 
            hsl.s, 
            Math.max(0, Math.min(100, hsl.l + (i * 20) - 40))
          );
          variation.r = lightVariation.r;
          variation.g = lightVariation.g;
          variation.b = lightVariation.b;
          break;
      }
      
      variations.push(variation);
    }
    
    return variations;
  }

  // Export/Import functionality
  exportPalette(id) {
    const palette = this.palettes.get(id);
    if (palette) {
      const exportData = {
        ...palette,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `palette-${palette.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      return true;
    }
    return false;
  }

  exportAllPalettes() {
    const allPalettes = this.getAllPalettes();
    const exportData = {
      palettes: allPalettes,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ionxe-color-palettes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importPalette(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.palettes) {
            // Import multiple palettes
            let imported = 0;
            data.palettes.forEach(palette => {
              if (palette.name && palette.colors) {
                this.addPalette(palette.name, palette.colors);
                imported++;
              }
            });
            resolve({ count: imported, type: 'multiple' });
          } else if (data.name && data.colors) {
            // Import single palette
            this.addPalette(data.name, data.colors);
            resolve({ count: 1, type: 'single' });
          } else {
            reject(new Error('Invalid palette file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Storage management
  savePalettesToStorage() {
    const data = {
      palettes: Array.from(this.palettes.entries()),
      currentPalette: this.currentPalette,
      version: '1.0'
    };
    localStorage.setItem('ionxe-color-palettes', JSON.stringify(data));
  }

  loadPalettesFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('ionxe-color-palettes'));
      if (data && data.palettes) {
        this.palettes = new Map(data.palettes);
        this.currentPalette = data.currentPalette || null;
      }
    } catch (error) {
      console.warn('Failed to load color palettes from storage:', error);
    }
  }

  saveCurrentPaletteToStorage() {
    localStorage.setItem('ionxe-current-palette', this.currentPalette || '');
  }

  // Utility functions
  generateId() {
    return 'palette_' + Math.random().toString(36).substr(2, 9);
  }

  searchPalettes(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    this.palettes.forEach(palette => {
      if (palette.name.toLowerCase().includes(searchTerm)) {
        results.push(palette);
      } else {
        // Search within color names
        const matchingColors = palette.colors.filter(color => 
          color.name.toLowerCase().includes(searchTerm)
        );
        if (matchingColors.length > 0) {
          results.push({
            ...palette,
            matchingColors: matchingColors
          });
        }
      }
    });
    
    return results;
  }

  // Color temperature palettes
  createTemperaturePalette(name, temperatures) {
    const colors = temperatures.map(temp => {
      const color = this.colorCore.getColorTemperature(temp);
      return {
        name: `${temp}K`,
        r: color.r,
        g: color.g,
        b: color.b,
        temperature: temp
      };
    });
    
    return this.addPalette(name, colors);
  }

  // Get color suggestions based on current color
  getColorSuggestions(color, count = 8) {
    const suggestions = [];
    const hsl = this.colorCore.rgbToHsl(color.r, color.g, color.b);
    
    // Complementary
    const complementary = this.colorCore.hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);
    suggestions.push({ name: 'Complementary', ...complementary });
    
    // Triadic
    const triadic1 = this.colorCore.hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l);
    const triadic2 = this.colorCore.hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l);
    suggestions.push({ name: 'Triadic 1', ...triadic1 });
    suggestions.push({ name: 'Triadic 2', ...triadic2 });
    
    // Analogous
    const analogous1 = this.colorCore.hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l);
    const analogous2 = this.colorCore.hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
    suggestions.push({ name: 'Analogous 1', ...analogous1 });
    suggestions.push({ name: 'Analogous 2', ...analogous2 });
    
    // Monochromatic variations
    const mono1 = this.colorCore.hslToRgb(hsl.h, Math.min(100, hsl.s + 20), hsl.l);
    const mono2 = this.colorCore.hslToRgb(hsl.h, Math.max(0, hsl.s - 20), hsl.l);
    suggestions.push({ name: 'Mono +Sat', ...mono1 });
    suggestions.push({ name: 'Mono -Sat', ...mono2 });
    
    return suggestions.slice(0, count);
  }
}

// Initialize color palettes
const colorPalettes = new ColorPalettes(colorCore);
