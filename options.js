document.addEventListener('DOMContentLoaded', () => {
  const patternInput = document.getElementById('patternInput');
  const emojiInput = document.getElementById('emojiInput');
  const dockPositionSelect = document.getElementById('dockPosition');
  const undockBehaviorSelect = document.getElementById('undockBehavior');
  const status = document.getElementById('status');
  const emojiStatus = document.getElementById('emojiStatus');
  const dockStatus = document.getElementById('dockStatus');
  const undockStatus = document.getElementById('undockStatus');
  const highlightingStatus = document.getElementById('highlightingStatus');
  const defaultPattern = "https://*.snaplogic.com/*designer*";
  const defaultEmojis = "• 🔧 ⚙️ 🚧 ⚒️ 💡 ⭐ 🔥 ❄️ 🔍 ✏️ ⏲ ⌛ 💩 👽 ☠️";
  const defaultDockPosition = "bottom-right";
  const defaultUndockBehavior = "remember";
  
  // Default highlighting settings
  const defaultHighlighting = {
    colorScheme: 'yellow',
    fillColor: '#FFD700',
    strokeColor: '#FFA500',
    activeFillColor: '#FF4444',
    activeStrokeColor: '#CC0000',
    highlightShape: 'circle',
    highlightSize: 'normal',
    animationType: 'none'
  };

  // Load saved pattern and emojis
  chrome.storage.sync.get(['userMatchPattern', 'customEmojis', 'highlightingSettings', 'dockPosition', 'undockBehavior'], (result) => {
    const savedPattern = result.userMatchPattern || defaultPattern;
    const savedEmojis = result.customEmojis || defaultEmojis;
    const savedDockPosition = result.dockPosition || defaultDockPosition;
    const savedUndockBehavior = result.undockBehavior || defaultUndockBehavior;
    const savedHighlighting = { ...defaultHighlighting, ...result.highlightingSettings };
    
    patternInput.value = savedPattern;
    emojiInput.value = savedEmojis;
    dockPositionSelect.value = savedDockPosition;
    undockBehaviorSelect.value = savedUndockBehavior;
    patternInput.placeholder = `Default: ${defaultPattern}`;
    emojiInput.placeholder = `Default: ${defaultEmojis}`;
    
    // Load highlighting settings
    loadHighlightingSettings(savedHighlighting);
    
    // Check if we should focus on highlighting section (e.g., opened from search popup)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('focus') === 'highlighting') {
      setTimeout(() => {
        const highlightingSection = document.getElementById('highlighting-section');
        if (highlightingSection) {
          highlightingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Add a subtle highlight effect to draw attention
          highlightingSection.style.transition = 'all 0.3s ease';
          highlightingSection.style.backgroundColor = '#e7f3ff';
          highlightingSection.style.padding = '10px';
          highlightingSection.style.borderRadius = '8px';
          highlightingSection.style.marginBottom = '10px';
          setTimeout(() => {
            highlightingSection.style.backgroundColor = '';
            highlightingSection.style.padding = '';
            highlightingSection.style.borderRadius = '';
            highlightingSection.style.marginBottom = '';
          }, 2000);
        }
      }, 100);
    }
  });

  function loadHighlightingSettings(settings) {
    document.getElementById('colorScheme').value = settings.colorScheme;
    document.getElementById('fillColor').value = settings.fillColor;
    document.getElementById('strokeColor').value = settings.strokeColor;
    document.getElementById('activeFillColor').value = settings.activeFillColor;
    document.getElementById('activeStrokeColor').value = settings.activeStrokeColor;
    document.getElementById('highlightShape').value = settings.highlightShape;
    document.getElementById('highlightSize').value = settings.highlightSize;
    document.getElementById('animationType').value = settings.animationType;
    
    // Show/hide custom colors based on scheme
    toggleCustomColors(settings.colorScheme === 'custom');
  }

  function toggleCustomColors(show) {
    document.getElementById('customColors').style.display = show ? 'block' : 'none';
  }

  // Color scheme change handler
  document.getElementById('colorScheme').addEventListener('change', (e) => {
    const isCustom = e.target.value === 'custom';
    toggleCustomColors(isCustom);
    
    if (!isCustom) {
      // Update colors based on predefined schemes
      const schemes = {
        yellow: { fill: '#FFD700', stroke: '#FFA500', activeFill: '#FF4444', activeStroke: '#CC0000' },
        highContrast: { fill: '#FFFF00', stroke: '#000000', activeFill: '#FF0000', activeStroke: '#000000' },
        neon: { fill: '#00FFFF', stroke: '#FF00FF', activeFill: '#FF0080', activeStroke: '#00FF80' },
        subtle: { fill: '#E0E0E0', stroke: '#808080', activeFill: '#C0C0C0', activeStroke: '#404040' }
      };
      
      const scheme = schemes[e.target.value];
      if (scheme) {
        document.getElementById('fillColor').value = scheme.fill;
        document.getElementById('strokeColor').value = scheme.stroke;
        document.getElementById('activeFillColor').value = scheme.activeFill;
        document.getElementById('activeStrokeColor').value = scheme.activeStroke;
      }
    }
  });

  // Save pattern
  document.getElementById('savePattern').addEventListener('click', () => {
    const pattern = patternInput.value.trim() || defaultPattern;
    
    // Basic validation for match patterns
    if (!pattern.includes('*') && !pattern.startsWith('http')) {
      status.textContent = 'Invalid pattern. Please use a valid URL pattern with wildcards (*)';
      status.style.color = 'red';
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 3000);
      return;
    }

    chrome.storage.sync.set({ userMatchPattern: pattern }, () => {
      status.textContent = 'Pattern saved! Please reload the extension for changes to take effect.';
      status.style.color = 'green';
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 4000);
    });
  });

  // Save emojis
  document.getElementById('saveEmojis').addEventListener('click', () => {
    const emojis = emojiInput.value.trim() || defaultEmojis;
    
    chrome.storage.sync.set({ customEmojis: emojis }, () => {
      emojiStatus.textContent = 'Emojis saved! Changes will take effect when you open new emoji pickers.';
      emojiStatus.style.color = 'green';
      setTimeout(() => {
        emojiStatus.textContent = '';
        emojiStatus.style.color = '';
      }, 4000);
    });
  });

  // Reset emojis to default
  document.getElementById('resetEmojis').addEventListener('click', () => {
    emojiInput.value = defaultEmojis;
    chrome.storage.sync.set({ customEmojis: defaultEmojis }, () => {
      emojiStatus.textContent = 'Reset to default emojis!';
      emojiStatus.style.color = 'blue';
      setTimeout(() => {
        emojiStatus.textContent = '';
        emojiStatus.style.color = '';
      }, 2000);
    });
  });

  // Save dock position
  document.getElementById('saveDockPosition').addEventListener('click', () => {
    const dockPosition = dockPositionSelect.value || defaultDockPosition;
    
    chrome.storage.sync.set({ dockPosition: dockPosition }, () => {
      dockStatus.textContent = 'Dock position saved! Changes will take effect immediately.';
      dockStatus.style.color = 'green';
      setTimeout(() => {
        dockStatus.textContent = '';
        dockStatus.style.color = '';
      }, 4000);
    });
  });

  // Save undock behavior
  document.getElementById('saveUndockBehavior').addEventListener('click', () => {
    const undockBehavior = undockBehaviorSelect.value || defaultUndockBehavior;
    
    chrome.storage.sync.set({ undockBehavior: undockBehavior }, () => {
      undockStatus.textContent = 'Undock behavior saved! Changes will take effect immediately.';
      undockStatus.style.color = 'green';
      setTimeout(() => {
        undockStatus.textContent = '';
        undockStatus.style.color = '';
      }, 4000);
    });
  });

  // Reset to default button functionality (for URL pattern)
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset to Default';
  resetButton.style.marginLeft = '10px';
  resetButton.addEventListener('click', () => {
    patternInput.value = defaultPattern;
    chrome.storage.sync.set({ userMatchPattern: defaultPattern }, () => {
      status.textContent = 'Reset to default pattern!';
      status.style.color = 'blue';
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 2000);
    });
  });
  
  document.getElementById('savePattern').parentNode.insertBefore(resetButton, document.getElementById('savePattern').nextSibling);

  // Save highlighting settings
  document.getElementById('saveHighlighting').addEventListener('click', () => {
    const settings = {
      colorScheme: document.getElementById('colorScheme').value,
      fillColor: document.getElementById('fillColor').value,
      strokeColor: document.getElementById('strokeColor').value,
      activeFillColor: document.getElementById('activeFillColor').value,
      activeStrokeColor: document.getElementById('activeStrokeColor').value,
      highlightShape: document.getElementById('highlightShape').value,
      highlightSize: document.getElementById('highlightSize').value,
      animationType: document.getElementById('animationType').value
    };
    
    chrome.storage.sync.set({ highlightingSettings: settings }, () => {
      highlightingStatus.textContent = 'Highlighting settings saved! Changes will apply to new searches.';
      highlightingStatus.style.color = 'green';
      setTimeout(() => {
        highlightingStatus.textContent = '';
        highlightingStatus.style.color = '';
      }, 4000);
    });
  });

  // Reset highlighting to default
  document.getElementById('resetHighlighting').addEventListener('click', () => {
    loadHighlightingSettings(defaultHighlighting);
    chrome.storage.sync.set({ highlightingSettings: defaultHighlighting }, () => {
      highlightingStatus.textContent = 'Reset to default highlighting settings!';
      highlightingStatus.style.color = 'blue';
      setTimeout(() => {
        highlightingStatus.textContent = '';
        highlightingStatus.style.color = '';
      }, 2000);
    });
  });

  // Preview highlighting (opens a small demo)
  document.getElementById('previewHighlighting').addEventListener('click', () => {
    const settings = {
      colorScheme: document.getElementById('colorScheme').value,
      fillColor: document.getElementById('fillColor').value,
      strokeColor: document.getElementById('strokeColor').value,
      activeFillColor: document.getElementById('activeFillColor').value,
      activeStrokeColor: document.getElementById('activeStrokeColor').value,
      highlightShape: document.getElementById('highlightShape').value,
      highlightSize: document.getElementById('highlightSize').value,
      animationType: document.getElementById('animationType').value
    };
    
    showHighlightPreview(settings);
  });

  function showHighlightPreview(settings) {
    // Remove existing preview
    const existingPreview = document.getElementById('highlight-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Create preview container
    const preview = document.createElement('div');
    preview.id = 'highlight-preview';
    preview.style = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      text-align: center;
    `;

    // Create SVG preview
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '300');
    svg.setAttribute('height', '150');
    svg.style.border = '1px solid #eee';
    svg.style.borderRadius = '4px';
    svg.style.margin = '10px 0';

    // Sample text elements
    const texts = [
      { text: 'Sample Snap 1', x: 50, y: 40, active: false },
      { text: 'Active Match', x: 50, y: 80, active: true },
      { text: 'Another Match', x: 50, y: 120, active: false }
    ];

    texts.forEach(({ text, x, y, active }) => {
      // Create highlight rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const padding = settings.highlightSize === 'tight' ? 4 : settings.highlightSize === 'loose' ? 12 : 8;
      
      rect.setAttribute('x', x - padding);
      rect.setAttribute('y', y - 20 - padding);
      rect.setAttribute('width', text.length * 8 + padding * 2);
      rect.setAttribute('height', 20 + padding * 2);
      
      if (settings.highlightShape === 'rounded-rectangle') {
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
      } else if (settings.highlightShape === 'square') {
        // Make it a perfect square
        const maxDimension = Math.max(text.length * 8 + padding * 2, 20 + padding * 2);
        rect.setAttribute('width', maxDimension);
        rect.setAttribute('height', maxDimension);
        rect.setAttribute('x', x + (text.length * 8) / 2 - maxDimension / 2);
        rect.setAttribute('y', y - 10 - maxDimension / 2);
      } else if (settings.highlightShape === 'circle') {
        rect.setAttribute('rx', '50%');
        rect.setAttribute('ry', '50%');
      }
      
      rect.setAttribute('fill', active ? settings.activeFillColor : settings.fillColor);
      rect.setAttribute('fill-opacity', active ? '0.6' : '0.4');
      rect.setAttribute('stroke', active ? settings.activeStrokeColor : settings.strokeColor);
      rect.setAttribute('stroke-width', active ? '3' : '2');
      
      // Add animation if specified
      if (settings.animationType !== 'none') {
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        
        if (settings.animationType === 'pulse') {
          animate.setAttribute('attributeName', 'transform');
          animate.setAttribute('type', 'scale');
          animate.setAttribute('values', '1;1.05;1');
          animate.setAttribute('dur', '2s');
          animate.setAttribute('repeatCount', 'indefinite');
        } else if (settings.animationType === 'blink') {
          const animateOpacity = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animateOpacity.setAttribute('attributeName', 'fill-opacity');
          animateOpacity.setAttribute('values', active ? '0.6;0.2;0.6' : '0.4;0.1;0.4');
          animateOpacity.setAttribute('dur', '1s');
          animateOpacity.setAttribute('repeatCount', 'indefinite');
          rect.appendChild(animateOpacity);
        } else if (settings.animationType === 'glow') {
          const animateOpacity = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
          animateOpacity.setAttribute('attributeName', 'fill-opacity');
          animateOpacity.setAttribute('values', active ? '0.6;0.8;0.6' : '0.4;0.7;0.4');
          animateOpacity.setAttribute('dur', '1.5s');
          animateOpacity.setAttribute('repeatCount', 'indefinite');
          rect.appendChild(animateOpacity);
        }
        
        if (settings.animationType === 'pulse') {
          animate.setAttribute('transform-origin', `${x + text.length * 4} ${y - 10}`);
          rect.appendChild(animate);
        }
      }
      
      svg.appendChild(rect);
      
      // Create text element
      const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textEl.setAttribute('x', x);
      textEl.setAttribute('y', y);
      textEl.setAttribute('font-family', 'Arial, sans-serif');
      textEl.setAttribute('font-size', '14');
      textEl.setAttribute('fill', '#333');
      textEl.textContent = text;
      svg.appendChild(textEl);
    });

    preview.innerHTML = `
      <h3>Highlight Preview</h3>
      <p>This shows how your highlighting will look:</p>
    `;
    preview.appendChild(svg);
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close Preview';
    closeBtn.style = 'margin-top: 10px; padding: 8px 12px; cursor: pointer;';
    closeBtn.onclick = () => preview.remove();
    preview.appendChild(closeBtn);

    document.body.appendChild(preview);
  }
});
