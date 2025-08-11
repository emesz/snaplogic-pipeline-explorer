// SnapLogic Pipeline Explorer - Chrome Extension Content Script
// Converted from Tampermonkey userscript

(function () {
    'use strict';

    // Check if extension is enabled before doing anything
    chrome.storage.sync.get(['enabled'], function(result) {
        if (result.enabled === false) {
            // Extension is disabled, don't initialize
            return;
        }
        
        // Check if current URL matches user pattern
        chrome.storage.sync.get(['userMatchPattern'], function(patternResult) {
            const defaultPattern = "https://*.snaplogic.com/*designer*";
            const userPattern = patternResult.userMatchPattern || defaultPattern;
            
            // Convert match pattern to regex for testing
            if (matchesPattern(window.location.href, userPattern)) {
                initializePipelineExplorer();
            }
        });
    });

    function matchesPattern(url, pattern) {
        // Convert match pattern to regex
        // Replace * with .* and escape special regex characters
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '\\?')
            .replace(/\+/g, '\\+')
            .replace(/\|/g, '\\|')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}');
        
        const regex = new RegExp('^' + regexPattern + '$');
        return regex.test(url);
    }

    function initializePipelineExplorer() {

    const SIDEBAR_ID = 'pipeline-sidebar';
    const STORAGE_KEY = 'snaplogicSidebarPosition';
    const PREVIOUS_POSITION_KEY = 'snaplogicSidebarPreviousPosition';
    const PREVIOUS_STATE_KEY = 'snaplogicSidebarPreviousState';
    const TOGGLE_KEY = 'snaplogicSidebarMinimized';
    const VIEW_KEY = 'snaplogicSidebarView';
    const COLLAPSE_KEY = 'snaplogicCollapsedGroups';
    const EMOJI_KEY = 'snaplogicPipelineEmojis';
    
    // Storage helper functions for persistent data
    function getSetting(key, defaultValue = null) {
        return new Promise((resolve) => {
            try {
                chrome.storage.sync.get([key], (result) => {
                    if (chrome.runtime.lastError) {
                        // Fallback to localStorage
                        const localValue = localStorage.getItem(key);
                        resolve(localValue ? JSON.parse(localValue) : defaultValue);
                    } else {
                        resolve(result[key] !== undefined ? result[key] : defaultValue);
                    }
                });
            } catch (error) {
                // Fallback to localStorage
                const localValue = localStorage.getItem(key);
                resolve(localValue ? JSON.parse(localValue) : defaultValue);
            }
        });
    }
    
    function setSetting(key, value) {
        return new Promise((resolve) => {
            try {
                chrome.storage.sync.set({ [key]: value }, () => {
                    if (chrome.runtime.lastError) {
                        // Fallback to localStorage
                        localStorage.setItem(key, JSON.stringify(value));
                    }
                    resolve();
                });
            } catch (error) {
                // Fallback to localStorage
                localStorage.setItem(key, JSON.stringify(value));
                resolve();
            }
        });
    }
    
    // Migration function to move localStorage data to chrome.storage.sync
    async function migrateStorageData() {
        try {
            // Migrate emoji data
            const localEmojis = localStorage.getItem(EMOJI_KEY);
            const chromeEmojis = await getSetting(EMOJI_KEY, {});
            
            if (localEmojis) {
                const emojiData = JSON.parse(localEmojis);
                // Only migrate if chrome storage is empty
                if (Object.keys(chromeEmojis).length === 0 && Object.keys(emojiData).length > 0) {
                    await setSetting(EMOJI_KEY, emojiData);
                    console.log('Migrated emoji data to chrome.storage.sync');
                }
            } else if (Object.keys(chromeEmojis).length > 0) {
                // Load chrome storage data to localStorage for immediate access
                localStorage.setItem(EMOJI_KEY, JSON.stringify(chromeEmojis));
                console.log('Loaded emoji data from chrome.storage.sync to localStorage');
            }
            
            // Migrate width data
            const localWidth = localStorage.getItem('snaplogicSidebarWidth');
            const chromeWidth = await getSetting('snaplogicSidebarWidth', null);
            
            if (localWidth) {
                // Only migrate if chrome storage is empty
                if (!chromeWidth) {
                    await setSetting('snaplogicSidebarWidth', localWidth);
                    console.log('Migrated width data to chrome.storage.sync');
                }
            } else if (chromeWidth) {
                // Load chrome storage data to localStorage for immediate access
                localStorage.setItem('snaplogicSidebarWidth', chromeWidth);
                console.log('Loaded width data from chrome.storage.sync to localStorage');
            }
            
            // Migrate position data
            const localPosition = localStorage.getItem(STORAGE_KEY);
            const chromePosition = await getSetting(STORAGE_KEY, null);
            
            if (localPosition) {
                // Only migrate if chrome storage is empty
                if (!chromePosition) {
                    await setSetting(STORAGE_KEY, localPosition);
                    console.log('Migrated position data to chrome.storage.sync');
                }
            } else if (chromePosition) {
                // Load chrome storage data to localStorage for immediate access
                localStorage.setItem(STORAGE_KEY, chromePosition);
                console.log('Loaded position data from chrome.storage.sync to localStorage');
            }
            
            // Migrate dock state
            const localDockState = localStorage.getItem('snaplogicSidebarDocked');
            const chromeDockState = await getSetting('snaplogicSidebarDocked', null);
            
            if (localDockState) {
                // Only migrate if chrome storage is empty
                if (!chromeDockState) {
                    await setSetting('snaplogicSidebarDocked', localDockState);
                    console.log('Migrated dock state to chrome.storage.sync');
                }
            } else if (chromeDockState) {
                // Load chrome storage data to localStorage for immediate access
                localStorage.setItem('snaplogicSidebarDocked', chromeDockState);
                console.log('Loaded dock state from chrome.storage.sync to localStorage');
            }
        } catch (error) {
            console.log('Migration skipped:', error);
        }
    }
    
    // Memory management - store observers for cleanup
    let globalMutationObserver = null;
    let globalResizeObserver = null;
    let documentEventListeners = new Map(); // Track document-level listeners
    let isSnapLogicTransitioning = false; // Track SnapLogic state transitions
    
    // Detect SnapLogic org switching or major state changes
    function detectSnapLogicTransition() {
        const urlObserver = new MutationObserver(() => {
            const currentUrl = window.location.href;
            if (currentUrl.includes('/switch/') || currentUrl.includes('/org/')) {
                isSnapLogicTransitioning = true;
                console.log('Pipeline Explorer: SnapLogic org transition detected, temporarily disabling');
                
                // Hide sidebar during transition
                const sidebar = document.getElementById(SIDEBAR_ID);
                if (sidebar) {
                    sidebar.style.display = 'none';
                }
                
                // Re-enable after a delay
                setTimeout(() => {
                    isSnapLogicTransitioning = false;
                    console.log('Pipeline Explorer: Re-enabling after transition');
                    if (sidebar) {
                        sidebar.style.display = 'block';
                    }
                    updateSidebar();
                }, 2000);
            }
        });
        
        urlObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'toggleExtension') {
            if (request.enabled) {
                // Re-initialize the extension
                cleanup(); // Clean up first
                init();
            } else {
                // Clean up everything when disabling
                cleanup();
            }
        }
    });
    
    // Default bullet point for pipelines
    const DEFAULT_BULLET = '•';

    // Cleanup function to prevent memory leaks
    function cleanup() {
        // Disconnect observers
        if (globalMutationObserver) {
            globalMutationObserver.disconnect();
            globalMutationObserver = null;
        }
        if (globalResizeObserver) {
            globalResizeObserver.disconnect();
            globalResizeObserver = null;
        }
        
        // Remove document-level event listeners
        documentEventListeners.forEach((listener, eventType) => {
            document.removeEventListener(eventType, listener, true);
        });
        documentEventListeners.clear();
        
        // Remove sidebar and all its event listeners
        const sidebar = document.getElementById(SIDEBAR_ID);
        if (sidebar) {
            sidebar.remove();
        }
        
        // Clear any existing emoji pickers or popups
        const existingPicker = document.getElementById('emoji-picker');
        if (existingPicker) {
            existingPicker.remove();
        }
        const existingPopup = document.getElementById('pipeline-search-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
    }

    // Utility functions to reduce redundancy
    function addHoverEffects(element, hoverStyle = {}, normalStyle = {}) {
        const defaultHover = { 
            background: 'rgba(255,255,255,0.35)', 
            transform: 'scale(1.05)' 
        };
        const defaultNormal = { 
            background: 'rgba(255,255,255,0.25)', 
            transform: 'scale(1)' 
        };
        
        const hoverStyles = { ...defaultHover, ...hoverStyle };
        const normalStyles = { ...defaultNormal, ...normalStyle };
        
        element.addEventListener('mouseenter', () => {
            Object.assign(element.style, hoverStyles);
        });
        element.addEventListener('mouseleave', () => {
            Object.assign(element.style, normalStyles);
        });
    }

    function createHeaderButton(text, title, customStyle = {}) {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        
        const defaultStyle = {
            background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            borderRadius: '4px',
            padding: '2px 5px',
            transition: 'all 0.2s ease',
            minWidth: '20px',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            verticalAlign: 'middle',
            lineHeight: '1',
            height: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        };
        
        Object.assign(button.style, defaultStyle, customStyle);
        addHoverEffects(button);
        return button;
    }

    function createPipelineItem(pipeline, activeId, isProjectView = false) {
        const name = pipeline.title.split('/').pop();
        const emoji = getPipelineEmoji(pipeline.id);
        const item = document.createElement('div');
        
        // Create emoji container
        const emojiContainer = document.createElement('span');
        emojiContainer.textContent = emoji;
        emojiContainer.title = 'Click to change emoji';
        Object.assign(emojiContainer.style, {
            display: 'inline-flex',
            width: '20px',
            height: '20px',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '14px',
            marginRight: '8px',
            cursor: 'pointer',
            borderRadius: '4px',
            flexShrink: '0',
            verticalAlign: 'baseline'
        });
        
        // Create name span
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        Object.assign(nameSpan.style, {
            flex: '1',
            overflow: 'hidden',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            hyphens: 'auto',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'center'
        });
        
        // Create close button
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.title = 'Close pipeline';
        Object.assign(closeBtn.style, {
            display: 'inline-flex',
            width: '16px',
            height: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            marginLeft: '4px',
            cursor: 'pointer',
            borderRadius: '3px',
            flexShrink: '0',
            opacity: '0.7',
            color: '#dc3545',
            transition: 'all 0.2s ease'
        });
        
        // Add hover effects for close button
        closeBtn.addEventListener('mouseenter', () => {
            Object.assign(closeBtn.style, {
                opacity: '1',
                background: 'rgba(220, 53, 69, 0.15)',
                color: '#c82333'
            });
        });
        closeBtn.addEventListener('mouseleave', () => {
            Object.assign(closeBtn.style, {
                opacity: '0.7',
                background: 'transparent',
                color: '#dc3545'
            });
        });
        
        // Assemble item
        item.appendChild(emojiContainer);
        item.appendChild(nameSpan);
        item.appendChild(closeBtn);
        
        // Style the item
        const isActive = pipeline.id === activeId;
        const baseStyle = {
            marginBottom: '2px',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s ease',
            minHeight: '32px'
        };
        
        if (isProjectView) {
            baseStyle.marginLeft = '16px';
        }
        
        if (isActive) {
            Object.assign(baseStyle, {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                fontWeight: '500'
            });
        } else {
            Object.assign(baseStyle, {
                background: 'transparent',
                color: '#3c4043'
            });
        }
        
        Object.assign(item.style, baseStyle);
        
        // Add hover effects for item
        item.addEventListener('mouseenter', () => {
            if (!isActive) {
                Object.assign(item.style, {
                    background: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: '6px'
                });
            }
        });
        item.addEventListener('mouseleave', () => {
            if (!isActive) {
                item.style.background = 'transparent';
            }
        });
        
        // Add event handlers
        nameSpan.onclick = (e) => {
            e.stopPropagation();
            pipeline.element.click();
        };
        
        item.onclick = (e) => {
            if (e.target === emojiContainer || e.target === closeBtn) return;
            pipeline.element.click();
        };
        
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const closeButton = pipeline.element.querySelector('.sl-shell-x');
            if (closeButton) {
                closeButton.click();
            }
        };
        
        emojiContainer.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showEmojiPicker(pipeline.id, emoji, () => updateSidebar(), e);
        };
        
        emojiContainer.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                showEmojiPicker(pipeline.id, emoji, () => updateSidebar(), e);
            } catch (err) {
                console.log('Error showing emoji picker:', err);
            }
        };
        
        return item;
    }

    function createTabButton(text, isActive = false) {
        const tab = document.createElement('div');
        tab.textContent = text;
        
        const baseStyle = {
            flex: '1',
            padding: '8px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            borderBottom: '2px solid transparent',
            fontSize: '13px'
        };
        
        if (isActive) {
            Object.assign(baseStyle, {
                background: 'rgba(102, 126, 234, 0.1)',
                borderBottom: '2px solid #667eea',
                color: '#667eea'
            });
        } else {
            Object.assign(baseStyle, {
                background: 'transparent',
                color: '#5f6368'
            });
        }
        
        Object.assign(tab.style, baseStyle);
        return tab;
    }

    function createActionButton(text, customStyle = {}) {
        const button = document.createElement('button');
        button.textContent = text;
        
        const defaultStyle = {
            flex: '1',
            padding: '6px 12px',
            border: '1px solid #dadce0',
            borderRadius: '6px',
            background: 'white',
            color: '#5f6368',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
        };
        
        Object.assign(button.style, defaultStyle, customStyle);
        
        addHoverEffects(button, 
            { background: '#f8f9fa', borderColor: '#4285f4', color: '#4285f4' },
            { background: 'white', borderColor: '#dadce0', color: '#5f6368' }
        );
        
        return button;
    }
    
    function getPipelineEmoji(pipelineId) {
        // Use synchronous approach with fallback for immediate UI needs
        try {
            const savedEmojis = JSON.parse(localStorage.getItem(EMOJI_KEY) || '{}');
            return savedEmojis[pipelineId] || DEFAULT_BULLET;
        } catch (error) {
            return DEFAULT_BULLET;
        }
    }
    
    function setPipelineEmoji(pipelineId, emoji) {
        // Update localStorage immediately for instant UI response
        const savedEmojis = JSON.parse(localStorage.getItem(EMOJI_KEY) || '{}');
        savedEmojis[pipelineId] = emoji;
        localStorage.setItem(EMOJI_KEY, JSON.stringify(savedEmojis));
        
        // Save to chrome storage in background for persistence
        setSetting(EMOJI_KEY, savedEmojis).catch(() => {
            // Ignore errors, localStorage is already updated
        });
    }
    
    function showEmojiPicker(pipelineId, currentEmoji, callback, clickEvent) {
        // Remove any existing picker first
        const existingPicker = document.getElementById('emoji-picker');
        if (existingPicker) {
            existingPicker.remove();
        }

        const picker = document.createElement('div');
        picker.id = 'emoji-picker';
        picker.style = `
            position: fixed;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 401;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            width: 180px;
        `;
        
        // Define event handlers first, before they're used
        let closePicker, handleEscape;
        
        // Close picker when clicking outside
        closePicker = (e) => {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closePicker, true);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        // Close picker with Escape key
        handleEscape = (e) => {
            if (e.key === 'Escape') {
                picker.remove();
                document.removeEventListener('click', closePicker, true);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        // Load custom emojis from storage, fallback to default
        chrome.storage.sync.get(['customEmojis'], (result) => {
            try {
                const defaultEmojisString = "• 🔧 ⚙️ 🚧 ⚒️ 💡 ⭐ 🔥 ❄️ 🔍 ✏️ ⏲ ⌛ 💩 👽 ☠️";
                const customEmojisString = result.customEmojis || defaultEmojisString;
                const commonEmojis = customEmojisString.split(/\s+/).filter(emoji => emoji.trim().length > 0);
                
                // Add current emoji at the top if it's not in common emojis
                if (!commonEmojis.includes(currentEmoji)) {
                    commonEmojis.unshift(currentEmoji);
                }
                
                commonEmojis.forEach(emoji => {
                    const btn = document.createElement('button');
                    btn.textContent = emoji;
                    btn.style = `
                        border: none;
                        background: ${emoji === currentEmoji ? '#e0e0e0' : 'white'};
                        font-size: 18px;
                        padding: 5px;
                        cursor: pointer;
                        border-radius: 4px;
                    `;
                    btn.onmouseover = () => btn.style.background = '#f0f0f0';
                    btn.onmouseout = () => btn.style.background = emoji === currentEmoji ? '#e0e0e0' : 'white';
                    btn.onclick = (e) => {
                        // Prevent event bubbling to avoid triggering the outside click handler
                        e.stopPropagation();
                        e.preventDefault();
                        setPipelineEmoji(pipelineId, emoji);
                        callback();
                        // Clean up event listeners before removing picker
                        document.removeEventListener('click', closePicker, true);
                        document.removeEventListener('keydown', handleEscape);
                        picker.remove();
                    };
                    picker.appendChild(btn);
                });
                
                // Custom emoji input
                const customInput = document.createElement('input');
                customInput.type = 'text';
                customInput.placeholder = 'type your own...';
                customInput.style = `
                    grid-column: 1 / -1;
                    padding: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    text-align: center;
                    font-size: 16px;
                `;
                customInput.onkeypress = (e) => {
                    if (e.key === 'Enter' && customInput.value.trim()) {
                        // Prevent event bubbling
                        e.stopPropagation();
                        e.preventDefault();
                        setPipelineEmoji(pipelineId, customInput.value.trim());
                        callback();
                        // Clean up event listeners before removing picker
                        document.removeEventListener('click', closePicker, true);
                        document.removeEventListener('keydown', handleEscape);
                        picker.remove();
                    }
                };
                picker.appendChild(customInput);
            } catch (err) {
                console.log('Error setting up emoji picker:', err);
                // Create a simple fallback
                const fallbackEmojis = ['•', '🔧', '⚙️', '💡', '⭐'];
                fallbackEmojis.forEach(emoji => {
                    const btn = document.createElement('button');
                    btn.textContent = emoji;
                    btn.style = 'border: none; background: white; font-size: 18px; padding: 5px; cursor: pointer; border-radius: 4px;';
                    btn.onclick = (e) => {
                        // Prevent event bubbling
                        e.stopPropagation();
                        e.preventDefault();
                        setPipelineEmoji(pipelineId, emoji);
                        callback();
                        // Clean up event listeners before removing picker
                        document.removeEventListener('click', closePicker, true);
                        document.removeEventListener('keydown', handleEscape);
                        picker.remove();
                    };
                    picker.appendChild(btn);
                });
            }
            
            document.body.appendChild(picker);
            
            // Position picker near the clicked element
            if (clickEvent && clickEvent.target) {
                try {
                    const rect = clickEvent.target.getBoundingClientRect();
                    const pickerWidth = 180;
                    const pickerHeight = 200; // Approximate height
                    
                    let left = rect.left;
                    let top = rect.bottom + 5;
                    
                    // Adjust if picker would go off screen
                    if (left + pickerWidth > window.innerWidth) {
                        left = window.innerWidth - pickerWidth - 10;
                    }
                    if (top + pickerHeight > window.innerHeight) {
                        top = rect.top - pickerHeight - 5;
                    }
                    
                    picker.style.left = `${Math.max(10, left)}px`;
                    picker.style.top = `${Math.max(10, top)}px`;
                } catch (err) {
                    console.log('Error positioning picker, using fallback:', err);
                    // Fallback positioning in center of screen
                    picker.style.left = '50%';
                    picker.style.top = '50%';
                    picker.style.transform = 'translate(-50%, -50%)';
                }
            } else {
                // Fallback positioning in center of screen
                picker.style.left = '50%';
                picker.style.top = '50%';
                picker.style.transform = 'translate(-50%, -50%)';
            }
            
            // Add listeners with slight delay to avoid immediate closure
            setTimeout(() => {
                document.addEventListener('click', closePicker, true);
                document.addEventListener('keydown', handleEscape);
            }, 150); // Increased delay slightly
            
            const customInputs = picker.querySelectorAll('input');
            if (customInputs.length > 0) {
                // Focus the input after a small delay to ensure picker is fully rendered
                setTimeout(() => customInputs[0].focus(), 200);
            }
        });
    }

    function showInPipelineSearchPopup() {
        // Remove any existing popup first
        const existingPopup = document.getElementById('pipeline-search-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Search state
        let matches = [];
        let currentIndex = -1;
        let lastSearchQuery = '';
        let lastSearchMode = '';

        const popup = document.createElement('div');
        popup.id = 'pipeline-search-popup';
        popup.style = `
            position: fixed;
            width: 380px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: none;
            border-radius: 12px;
            z-index: 402;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            overflow: hidden;
        `;

        // Position relative to sidebar
        const sidebar = document.getElementById(SIDEBAR_ID);
        if (sidebar) {
            const sidebarRect = sidebar.getBoundingClientRect();
            const popupWidth = 380;
            
            // Try to position to the right of sidebar first
            let left = sidebarRect.right + 10;
            let top = sidebarRect.top;
            
            // If popup would go off right edge of screen, position to the left of sidebar
            if (left + popupWidth > window.innerWidth) {
                left = sidebarRect.left - popupWidth - 10;
            }
            
            // If popup would still go off left edge, position below sidebar
            if (left < 0) {
                left = sidebarRect.left;
                top = sidebarRect.bottom + 10;
            }
            
            // Ensure popup doesn't go off bottom of screen
            if (top + 200 > window.innerHeight) { // 200px approximate popup height
                top = Math.max(10, window.innerHeight - 200);
            }
            
            popup.style.left = `${Math.max(10, left)}px`;
            popup.style.top = `${Math.max(10, top)}px`;
        } else {
            // Fallback to center if sidebar not found
            popup.style.top = '50%';
            popup.style.left = '50%';
            popup.style.transform = 'translate(-50%, -50%)';
        }

        const header = document.createElement('div');
        header.style = `
            font-weight: 600;
            padding: 8px 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 12px 12px 0 0;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            font-size: 14px;
            cursor: move;
        `;

        const title = document.createElement('span');
        title.textContent = 'Search in Pipeline';

        const buttonContainer = document.createElement('div');
        buttonContainer.style = 'display: flex; gap: 4px; align-items: center;';

        const optionsBtn = createHeaderButton('⚙', 'Highlighting Options');
        const closeBtn = createHeaderButton('×', 'Close');

        closeBtn.onclick = () => {
            clearSearchHighlights();
            popup.remove();
        };

        optionsBtn.onclick = () => {
            // Send message to background script to open options page with highlighting settings focus
            try {
                chrome.runtime.sendMessage({ action: 'openOptions', focusSection: 'highlighting' }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Fallback: try to open options page directly
                        try {
                            chrome.runtime.openOptionsPage();
                        } catch (err) {
                            // Silent fallback failure
                        }
                    }
                });
            } catch (err) {
                // Direct fallback
                try {
                    chrome.runtime.openOptionsPage();
                } catch (fallbackErr) {
                    // Silent fallback failure
                }
            }
        };

        buttonContainer.appendChild(optionsBtn);
        buttonContainer.appendChild(closeBtn);

        header.appendChild(title);
        header.appendChild(buttonContainer);
        popup.appendChild(header);

        const content = document.createElement('div');
        content.style = 'padding: 12px;';

        // Search input row - reorganized with dropdown on left
        const searchRow = document.createElement('div');
        searchRow.style = 'display: flex; gap: 6px; margin-bottom: 8px; align-items: center;';

        const modeSelect = document.createElement('select');
        modeSelect.style = `
            padding: 6px 8px;
            border: 2px solid #e8eaed;
            border-radius: 6px;
            font-size: 12px;
            outline: none;
            background: white;
            cursor: pointer;
            min-width: 90px;
        `;
        modeSelect.appendChild(new Option('Starts with', 'starts'));
        modeSelect.appendChild(new Option('Contains', 'contains'));
        modeSelect.value = 'starts'; // Set default to "starts with"

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search snap name...';
        searchInput.style = `
            flex: 1;
            padding: 6px 10px;
            border: 2px solid #e8eaed;
            border-radius: 6px;
            font-size: 12px;
            outline: none;
            transition: all 0.2s ease;
        `;

        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.style = `
            padding: 6px 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        searchButton.addEventListener('mouseenter', () => {
            searchButton.style.transform = 'translateY(-1px)';
            searchButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        });
        searchButton.addEventListener('mouseleave', () => {
            searchButton.style.transform = 'translateY(0)';
            searchButton.style.boxShadow = 'none';
        });

        searchRow.appendChild(modeSelect);
        searchRow.appendChild(searchInput);
        searchRow.appendChild(searchButton);

        // Results and navigation row - more compact
        const navRow = document.createElement('div');
        navRow.style = 'display: flex; justify-content: space-between; align-items: center;';

        const resultLabel = document.createElement('span');
        resultLabel.style = 'font-weight: 500; color: #5f6368; font-size: 12px;';

        const navButtons = document.createElement('div');
        navButtons.style = 'display: flex; gap: 3px;';

        const prevButton = document.createElement('button');
        prevButton.textContent = '◀';
        prevButton.style = `
            padding: 4px 8px;
            background: #f8f9fa;
            border: 1px solid #dadce0;
            border-radius: 4px;
            color: #5f6368;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        const nextButton = document.createElement('button');
        nextButton.textContent = '▶';
        nextButton.style = `
            padding: 4px 8px;
            background: #f8f9fa;
            border: 1px solid #dadce0;
            border-radius: 4px;
            color: #5f6368;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style = `
            padding: 4px 10px;
            background: #f8f9fa;
            border: 1px solid #dadce0;
            border-radius: 4px;
            color: #5f6368;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: 6px;
        `;

        [prevButton, nextButton, clearButton].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#f1f3f4';
                btn.style.borderColor = '#667eea';
                btn.style.color = '#667eea';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#f8f9fa';
                btn.style.borderColor = '#dadce0';
                btn.style.color = '#5f6368';
            });
        });

        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);
        navButtons.appendChild(clearButton);

        navRow.appendChild(resultLabel);
        navRow.appendChild(navButtons);

        content.appendChild(searchRow);
        content.appendChild(navRow);
        popup.appendChild(content);

        // Search functionality
        function clearSearchHighlights() {
            document.querySelectorAll('.snap-highlight-rect').forEach(el => el.remove());
            document.querySelectorAll('.fallback-highlight').forEach(el => el.remove());
            // Also clear the highlight container if it exists
            const highlightContainer = document.querySelector('#search-highlights-container');
            if (highlightContainer) {
                highlightContainer.innerHTML = '';
            }
        }

        function clearAll() {
            clearSearchHighlights();
            matches = [];
            currentIndex = -1;
            lastSearchQuery = '';
            lastSearchMode = '';
            resultLabel.textContent = '';
        }

        function getZoomLevel() {
            const zoomGroup = document.getElementById('sl-wb-main');
            const transform = zoomGroup?.getAttribute('transform') || '';
            const match = transform.match(/scale\(([\d.]+)\)/);
            return match ? parseFloat(match[1]) : 1;
        }

        function getSnapPosition(snapGroup) {
            const transform = snapGroup.getAttribute('transform');
            const match = transform.match(/translate\(([\d.]+),\s*([\d.]+)\)/);
            if (match) {
                return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
            }
            return { x: 0, y: 0 };
        }

        function scrollToSnap(x, y) {
            const zoom = getZoomLevel();
            const container = document.getElementById('sl-shell-wb');
            if (container) {
                const scrollX = x * zoom - container.clientWidth / 2;
                const scrollY = y * zoom - container.clientHeight / 2;
                container.scrollTo({ left: scrollX, top: scrollY, behavior: 'smooth' });
            }
        }

        function highlightSnaps(query, mode) {
            clearSearchHighlights();
            matches = [];
            currentIndex = -1;
            resultLabel.textContent = '';
            
            const texts = document.querySelectorAll('text.sl-wb-svg-label.sl-wb-svg-label-main');

            // Find the main SVG container to ensure highlights are on top - try multiple selectors
            let mainSvg = document.querySelector('svg#sl-wb-svg');
            if (!mainSvg) {
                mainSvg = document.querySelector('svg');
            }
            if (!mainSvg) {
                return;
            }

            // Get highlighting settings from storage - with proper error handling
            try {
                chrome.storage.sync.get(['highlightingSettings'], (result) => {
                    // Check for chrome runtime errors
                    if (chrome.runtime.lastError) {
                        performHighlighting(getDefaultSettings());
                        return;
                    }
                    
                    const settings = result.highlightingSettings || getDefaultSettings();
                    performHighlighting(settings);
                });
            } catch (error) {
                const defaultSettings = getDefaultSettings();
                performHighlighting(defaultSettings);
            }

            function getDefaultSettings() {
                return {
                    colorScheme: 'yellow',
                    customMatchColor: '#FFD700',
                    customFocusColor: '#FF4444',
                    shape: 'circle',
                    size: 'normal',
                    animation: 'none'
                };
            }

            function performHighlighting(settings) {
                // Define color schemes - updated to match the actual settings structure
                const colorSchemes = {
                    'yellow-orange': { match: '#FFD700', focus: '#FF4444', stroke: '#FFA500', focusStroke: '#CC0000' },
                    'blue-cyan': { match: '#87CEEB', focus: '#4169E1', stroke: '#4682B4', focusStroke: '#191970' },
                    'green-lime': { match: '#90EE90', focus: '#32CD32', stroke: '#228B22', focusStroke: '#006400' },
                    'purple-magenta': { match: '#DDA0DD', focus: '#BA55D3', stroke: '#9370DB', focusStroke: '#4B0082' },
                    'red-pink': { match: '#FFB6C1', focus: '#FF1493', stroke: '#DC143C', focusStroke: '#8B0000' },
                    'yellow': { match: '#FFD700', focus: '#FF4444', stroke: '#FFA500', focusStroke: '#CC0000' },
                    'blue': { match: '#87CEEB', focus: '#4169E1', stroke: '#4682B4', focusStroke: '#191970' },
                    'green': { match: '#90EE90', focus: '#32CD32', stroke: '#228B22', focusStroke: '#006400' },
                    'purple': { match: '#DDA0DD', focus: '#BA55D3', stroke: '#9370DB', focusStroke: '#4B0082' },
                    'red': { match: '#FFB6C1', focus: '#FF1493', stroke: '#DC143C', focusStroke: '#8B0000' },
                    'custom': { 
                        match: settings.fillColor || settings.customMatchColor || '#FFD700', 
                        focus: settings.activeFillColor || settings.customFocusColor || '#FF4444',
                        stroke: settings.strokeColor || settings.customMatchColor || '#FFA500',
                        focusStroke: settings.activeStrokeColor || settings.customFocusColor || '#CC0000'
                    }
                };

                // Use the actual settings values directly if they exist
                let colors;
                if (settings.fillColor && settings.activeFillColor) {
                    // Use direct color values from settings
                    colors = {
                        match: settings.fillColor,
                        focus: settings.activeFillColor,
                        stroke: settings.strokeColor || settings.fillColor,
                        focusStroke: settings.activeStrokeColor || settings.activeFillColor
                    };
                } else {
                    // Use color scheme
                    colors = colorSchemes[settings.colorScheme] || colorSchemes['yellow'];
                }

                // Size settings - handle both property name formats and value formats
                const sizeSettings = {
                    'small': { padding: 4, strokeWidth: 1, focusStrokeWidth: 2 },
                    'tight': { padding: 4, strokeWidth: 1, focusStrokeWidth: 2 },
                    'normal': { padding: 8, strokeWidth: 2, focusStrokeWidth: 3 },
                    'large': { padding: 12, strokeWidth: 3, focusStrokeWidth: 4 },
                    'loose': { padding: 12, strokeWidth: 3, focusStrokeWidth: 4 }
                };

                const sizeKey = settings.highlightSize || settings.size || 'normal';
                const size = sizeSettings[sizeKey] || sizeSettings['normal'];

                // Shape settings - handle both property name formats
                const shape = settings.highlightShape || settings.shape || 'circle';
                const animation = settings.animationType || settings.animation || 'none';

                texts.forEach(el => {
                    const text = el.textContent.toLowerCase();
                    const q = query.toLowerCase();
                    const match = mode === 'starts' ? text.startsWith(q) : text.includes(q);

                    if (match) {
                        const bbox = el.getBBox();
                        const parentGroup = el.parentNode;
                        
                        if (!parentGroup) {
                            return;
                        }

                        let highlightEl;
                        
                        // Create highlight based on shape
                        if (shape === 'circle') {
                            const radius = Math.max(bbox.width, bbox.height) / 2 + size.padding;
                            const centerX = bbox.x + bbox.width / 2;
                            const centerY = bbox.y + bbox.height / 2;
                            
                            highlightEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                            highlightEl.setAttribute('cx', centerX);
                            highlightEl.setAttribute('cy', centerY);
                            highlightEl.setAttribute('r', radius);
                            
                            // Apply animation for circles
                            if (animation === 'pulse') {
                                highlightEl.innerHTML = '<animate attributeName="r" values="' + radius + ';' + (radius * 1.1) + ';' + radius + '" dur="1s" repeatCount="indefinite"/>';
                            } else if (animation === 'glow') {
                                highlightEl.innerHTML = '<animate attributeName="fill-opacity" values="0.4;0.7;0.4" dur="1.5s" repeatCount="indefinite"/>';
                            } else if (animation === 'blink') {
                                highlightEl.innerHTML = '<animate attributeName="fill-opacity" values="0.4;0;0.4" dur="0.8s" repeatCount="indefinite"/>';
                            }
                        } else {
                            // Rectangle-based shapes
                            highlightEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                            
                            if (shape === 'square') {
                                // Square: make width and height equal, centered on the text
                                const maxDimension = Math.max(bbox.width, bbox.height) + (size.padding * 2);
                                const centerX = bbox.x + bbox.width / 2;
                                const centerY = bbox.y + bbox.height / 2;
                                highlightEl.setAttribute('x', centerX - maxDimension / 2);
                                highlightEl.setAttribute('y', centerY - maxDimension / 2);
                                highlightEl.setAttribute('width', maxDimension);
                                highlightEl.setAttribute('height', maxDimension);
                                // No rx/ry for sharp square corners
                            } else {
                                // Regular rectangle or rounded rectangle
                                highlightEl.setAttribute('x', bbox.x - size.padding);
                                highlightEl.setAttribute('y', bbox.y - size.padding);
                                highlightEl.setAttribute('width', bbox.width + (size.padding * 2));
                                highlightEl.setAttribute('height', bbox.height + (size.padding * 2));
                                
                                if (shape === 'rounded-rectangle') {
                                    highlightEl.setAttribute('rx', '4');
                                    highlightEl.setAttribute('ry', '4');
                                }
                            }
                            
                            // Apply animation for rectangles
                            if (animation === 'pulse') {
                                highlightEl.innerHTML = '<animateTransform attributeName="transform" type="scale" values="1;1.05;1" dur="1s" repeatCount="indefinite"/>';
                            } else if (animation === 'glow') {
                                highlightEl.innerHTML = '<animate attributeName="fill-opacity" values="0.4;0.7;0.4" dur="1.5s" repeatCount="indefinite"/>';
                            } else if (animation === 'blink') {
                                highlightEl.innerHTML = '<animate attributeName="fill-opacity" values="0.4;0;0.4" dur="0.8s" repeatCount="indefinite"/>';
                            }
                        }
                        
                        // Set common attributes
                        highlightEl.setAttribute('fill', colors.match);
                        highlightEl.setAttribute('fill-opacity', '0.4');
                        highlightEl.setAttribute('stroke', colors.stroke);
                        highlightEl.setAttribute('stroke-width', size.strokeWidth);
                        highlightEl.classList.add('snap-highlight-rect');
                        highlightEl.setAttribute('pointer-events', 'none');
                        
                        // Add to parent group (this is what works!)
                        parentGroup.appendChild(highlightEl);

                        const snapGroup = el.closest('g.sl-wb-svg-snap');
                        if (snapGroup) {
                            matches.push({ textEl: el, rectEl: highlightEl, snapGroup, colors, size });
                        }
                    }
                });

                resultLabel.textContent = matches.length ? `${matches.length} match${matches.length === 1 ? '' : 'es'} found` : 'No matches found';

                if (matches.length > 0) {
                    currentIndex = 0;
                    focusMatch(currentIndex);
                }
            }
        }

        function focusMatch(index) {
            matches.forEach((m, i) => {
                if (i === index) {
                    // Active/focused match - use focus colors from settings
                    m.rectEl.setAttribute('fill', m.colors.focus);
                    m.rectEl.setAttribute('fill-opacity', '0.6');
                    m.rectEl.setAttribute('stroke', m.colors.focusStroke);
                    m.rectEl.setAttribute('stroke-width', m.size.focusStrokeWidth);
                } else {
                    // Other matches - use regular match colors from settings
                    m.rectEl.setAttribute('fill', m.colors.match);
                    m.rectEl.setAttribute('fill-opacity', '0.4');
                    m.rectEl.setAttribute('stroke', m.colors.stroke);
                    m.rectEl.setAttribute('stroke-width', m.size.strokeWidth);
                }
            });

            const pos = getSnapPosition(matches[index].snapGroup);
            scrollToSnap(pos.x, pos.y);
            
            resultLabel.textContent = `${index + 1} of ${matches.length} match${matches.length === 1 ? '' : 'es'}`;
        }

        // Event handlers
        searchButton.onclick = () => {
            const query = searchInput.value.trim();
            const mode = modeSelect.value;
            if (query) {
                lastSearchQuery = query;
                lastSearchMode = mode;
                highlightSnaps(query, mode);
            }
        };

        clearButton.onclick = () => clearAll();

        prevButton.onclick = () => {
            if (matches.length > 0) {
                currentIndex = (currentIndex - 1 + matches.length) % matches.length;
                focusMatch(currentIndex);
            }
        };

        nextButton.onclick = () => {
            if (matches.length > 0) {
                currentIndex = (currentIndex + 1) % matches.length;
                focusMatch(currentIndex);
            }
        };

        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const currentQuery = searchInput.value.trim();
                const currentMode = modeSelect.value;
                
                // Check if search parameters have changed or if we have no results
                if (matches.length > 0 && 
                    currentQuery === lastSearchQuery && 
                    currentMode === lastSearchMode) {
                    // Search parameters haven't changed and we have results - cycle to next match
                    currentIndex = (currentIndex + 1) % matches.length;
                    focusMatch(currentIndex);
                } else {
                    // Search parameters changed or no results yet - start new search
                    if (currentQuery) {
                        searchButton.click();
                    }
                }
            }
            // Remove Escape key handler - popup should only close via close button
        });

        // Focus enhancement
        searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#667eea';
            searchInput.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        });
        searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = '#e8eaed';
            searchInput.style.boxShadow = 'none';
        });

        modeSelect.addEventListener('focus', () => {
            modeSelect.style.borderColor = '#667eea';
            modeSelect.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        });
        modeSelect.addEventListener('blur', () => {
            modeSelect.style.borderColor = '#e8eaed';
            modeSelect.style.boxShadow = 'none';
        });

        document.body.appendChild(popup);

        // Make the popup draggable
        makeDraggablePopup(popup, header);

        // Auto-focus the search input
        setTimeout(() => searchInput.focus(), 100);

        // Remove all event listeners that would close the popup
        // Popup can only be closed via the close button
    }

    function makeDraggablePopup(element, handle) {
        let offsetX = 0, offsetY = 0, isDragging = false;
        let mouseMoveHandler, mouseUpHandler;

        const handleMouseDown = (e) => {
            // Only start dragging if clicking on the header area, not buttons
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            document.body.style.userSelect = 'none';
            element.style.cursor = 'grabbing';
            handle.style.cursor = 'grabbing';
        };

        mouseMoveHandler = (e) => {
            if (isDragging) {
                const newLeft = e.clientX - offsetX;
                const newTop = e.clientY - offsetY;
                
                // Keep popup within viewport bounds
                const maxLeft = window.innerWidth - element.offsetWidth;
                const maxTop = window.innerHeight - element.offsetHeight;
                
                element.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
                element.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
                element.style.transform = 'none'; // Remove centering transform when dragging
            }
        };

        mouseUpHandler = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
                element.style.cursor = '';
                handle.style.cursor = 'move';
            }
        };

        handle.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        
        // Modern cleanup using MutationObserver for when element is removed
        if (window.MutationObserver) {
            const cleanupObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node === element) {
                            document.removeEventListener('mousemove', mouseMoveHandler);
                            document.removeEventListener('mouseup', mouseUpHandler);
                            cleanupObserver.disconnect();
                        }
                    });
                });
            });
            cleanupObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    function createSidebar(pipelines, activeId) {
        // Clean up any existing sidebar and its associated resources
        const existingSidebar = document.getElementById(SIDEBAR_ID);
        if (existingSidebar) {
            // Disconnect any observers before removing
            if (globalResizeObserver) {
                globalResizeObserver.disconnect();
                globalResizeObserver = null;
            }
            existingSidebar.remove();
        }
        
        let sidebar = document.getElementById(SIDEBAR_ID);
        let currentWidth = '400px';
        
        // Use localStorage first for immediate access, chrome storage in background
        const savedWidth = localStorage.getItem('snaplogicSidebarWidth');
        if (savedWidth) {
            currentWidth = savedWidth;
        } else if (sidebar && sidebar.style.width) {
            currentWidth = sidebar.style.width;
        } else {
            currentWidth = '400px';
        }
        
        // Load from chrome storage in background and sync to localStorage
        getSetting('snaplogicSidebarWidth', null).then(chromeWidth => {
            if (chromeWidth && chromeWidth !== savedWidth) {
                localStorage.setItem('snaplogicSidebarWidth', chromeWidth);
                // Update current sidebar if it exists
                const currentSidebar = document.getElementById(SIDEBAR_ID);
                if (currentSidebar) {
                    currentSidebar.style.width = chromeWidth;
                }
            }
        }).catch(() => {
            // Ignore errors, localStorage fallback is already in place
        });
        
        // Remove existing sidebar if it exists
        if (sidebar) {
            sidebar.remove();
        }

        sidebar = document.createElement('div');
        sidebar.id = SIDEBAR_ID;
        sidebar.style = `
            position: fixed;
            width: ${currentWidth};
            min-width: 300px;
            max-width: 800px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: none;
            border-radius: 12px;
            z-index: 400;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08);
            backdrop-filter: blur(10px);
            overflow: hidden;
        `;

        const savedPos = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (savedPos) {
            sidebar.style.left = savedPos.left;
            sidebar.style.top = savedPos.top;
        } else {
            // Position on the right side by default
            const sidebarWidth = parseInt(currentWidth) || 400;
            const rightPosition = window.innerWidth - sidebarWidth - 20; // 20px margin from edge
            sidebar.style.left = `${Math.max(20, rightPosition)}px`; // Ensure minimum 20px from left edge
            sidebar.style.top = '100px';
        }
        
        // Load from chrome storage in background and sync to localStorage (like width handling)
        getSetting(STORAGE_KEY, null).then(chromePosition => {
            if (chromePosition && chromePosition !== localStorage.getItem(STORAGE_KEY)) {
                localStorage.setItem(STORAGE_KEY, chromePosition);
                // Update current sidebar position if it exists and differs
                const currentSidebar = document.getElementById(SIDEBAR_ID);
                if (currentSidebar && !savedPos) {
                    // Only update if we didn't have a local position (avoids overriding user's current session position)
                    const posData = JSON.parse(chromePosition);
                    currentSidebar.style.left = posData.left;
                    currentSidebar.style.top = posData.top;
                }
            }
        }).catch(() => {
            // Ignore errors, localStorage fallback is already in place
        });
        
        // Load dock state from chrome storage in background and sync to localStorage
        getSetting('snaplogicSidebarDocked', null).then(chromeDockState => {
            if (chromeDockState && chromeDockState !== localStorage.getItem('snaplogicSidebarDocked')) {
                localStorage.setItem('snaplogicSidebarDocked', chromeDockState);
                // Note: We don't update the dock button state here as it would require re-rendering
                // The dock state will be correctly applied on next page load
                console.log('Synced dock state from chrome.storage to localStorage');
            }
        }).catch(() => {
            // Ignore errors, localStorage fallback is already in place
        });

        // Load minimized state from chrome storage in background and sync to localStorage
        getSetting(TOGGLE_KEY, null).then(chromeMinimizedState => {
            if (chromeMinimizedState && chromeMinimizedState !== localStorage.getItem(TOGGLE_KEY)) {
                localStorage.setItem(TOGGLE_KEY, chromeMinimizedState);
                // Update current sidebar minimized state if it exists
                const currentSidebar = document.getElementById(SIDEBAR_ID);
                if (currentSidebar) {
                    const content = document.getElementById('pipeline-sidebar-content');
                    const tabSwitcher = currentSidebar.querySelector('[style*="display: flex; background: #f1f3f4"]');
                    const expandCollapseContainer = currentSidebar.querySelector('[style*="background: #f8f9fa"]');
                    const searchBox = currentSidebar.querySelector('input[type="text"]');
                    const toggleBtn = currentSidebar.querySelector('[title*="Minimize"], [title*="Expand"]');
                    
                    if (content && tabSwitcher && searchBox && toggleBtn) {
                        const shouldBeMinimized = chromeMinimizedState === 'true';
                        if (shouldBeMinimized) {
                            tabSwitcher.style.display = 'none';
                            if (expandCollapseContainer) expandCollapseContainer.style.display = 'none';
                            searchBox.style.display = 'none';
                            content.style.display = 'none';
                            toggleBtn.textContent = '+';
                            toggleBtn.title = 'Expand';
                        } else {
                            tabSwitcher.style.display = 'flex';
                            if (expandCollapseContainer) {
                                const currentView = localStorage.getItem(VIEW_KEY) || 'flat';
                                expandCollapseContainer.style.display = currentView === 'project' ? 'flex' : 'none';
                            }
                            searchBox.style.display = 'block';
                            content.style.display = 'block';
                            toggleBtn.textContent = '–';
                            toggleBtn.title = 'Minimize';
                        }
                        console.log('Synced minimized state from chrome.storage to localStorage and updated UI');
                    }
                }
            }
        }).catch(() => {
            // Ignore errors, localStorage fallback is already in place
        });

        const header = document.createElement('div');
        header.style = `
            font-weight: 600;
            padding: 8px 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 12px 12px 0 0;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            font-size: 14px;
        `;

        const title = document.createElement('span');
        title.textContent = 'Pipeline Explorer';

        const buttonContainer = document.createElement('div');
        buttonContainer.style = 'display: flex; gap: 4px; align-items: center;';

        // Create header buttons using utility function
        const searchBtn = createHeaderButton('⌕', 'Search in Pipeline');
        const optionsBtn = createHeaderButton('⚙', 'Open Options');
        
        // Check if currently docked for dock button using reliable flag
        const isDocked = localStorage.getItem('snaplogicSidebarDocked') === 'true';
        
        const dockBtn = createHeaderButton(isDocked ? '⇈' : '⇊', isDocked ? 'Restore Position' : 'Dock');
        
        // Set initial tooltip based on user's dock preference
        if (!isDocked) {
            chrome.storage.sync.get(['dockPosition'], (result) => {
                const dockPosition = result.dockPosition || 'bottom-right';
                dockBtn.title = dockPosition === 'bottom-left' ? 'Dock to Bottom Left' : 'Dock to Bottom Right';
            });
        }
        
        const toggleBtn = createHeaderButton(
            localStorage.getItem(TOGGLE_KEY) === 'true' ? '+' : '–', 
            localStorage.getItem(TOGGLE_KEY) === 'true' ? 'Expand' : 'Minimize'
        );

        buttonContainer.appendChild(searchBtn);
        buttonContainer.appendChild(optionsBtn);
        buttonContainer.appendChild(dockBtn);
        buttonContainer.appendChild(toggleBtn);

        header.appendChild(title);
        header.appendChild(buttonContainer);
        sidebar.appendChild(header);

        const tabSwitcher = document.createElement('div');
        tabSwitcher.style = 'display: flex; background: #f1f3f4; margin: 0;';

        const currentView = localStorage.getItem(VIEW_KEY) || 'flat';
        
        // Create tabs using utility function
        const flatTab = createTabButton('Flat View', currentView === 'flat');
        const projectTab = createTabButton('By Project', currentView === 'project');

        flatTab.onclick = () => {
            localStorage.setItem(VIEW_KEY, 'flat');
            expandCollapseContainer.style.display = 'none';
            updateSidebar();
        };
        projectTab.onclick = () => {
            localStorage.setItem(VIEW_KEY, 'project');
            expandCollapseContainer.style.display = 'flex';
            updateSidebar();
        };

        tabSwitcher.appendChild(flatTab);
        tabSwitcher.appendChild(projectTab);
        sidebar.appendChild(tabSwitcher);

        // Add expand/collapse all buttons for project view
        const expandCollapseContainer = document.createElement('div');
        expandCollapseContainer.style = `
            display: ${currentView === 'project' ? 'flex' : 'none'};
            padding: 8px 16px;
            gap: 8px;
            background: #f8f9fa;
            border-bottom: 1px solid #e8eaed;
        `;

        // Create action buttons using utility function
        const expandAllBtn = createActionButton('📂 Expand All');
        const collapseAllBtn = createActionButton('📁 Collapse All');

        expandAllBtn.onclick = () => {
            const collapsedGroups = {};
            localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedGroups));
            renderContent(searchBox ? searchBox.value : '');
        };

        collapseAllBtn.onclick = () => {
            const grouped = {};
            pipelines.forEach(p => {
                const parts = p.title?.split('/');
                if (!parts || parts.length < 3) return;
                const key = `${parts[0]}/${parts[1]}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(p);
            });

            const collapsedGroups = {};
            Object.keys(grouped).forEach(group => {
                collapsedGroups[group] = true;
            });
            localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedGroups));
            renderContent(searchBox ? searchBox.value : '');
        };

        expandCollapseContainer.appendChild(expandAllBtn);
        expandCollapseContainer.appendChild(collapseAllBtn);
        sidebar.appendChild(expandCollapseContainer);

        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search pipelines...';
        searchBox.style = `
            width: calc(100% - 24px);
            margin: 12px;
            padding: 8px 12px;
            border: 2px solid #e8eaed;
            border-radius: 20px;
            font-size: 13px;
            outline: none;
            transition: all 0.2s ease;
            background: white;
        `;
        sidebar.appendChild(searchBox);
        
        // Add search box focus effects
        searchBox.addEventListener('focus', () => {
            searchBox.style.borderColor = '#667eea';
            searchBox.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
        });
        searchBox.addEventListener('blur', () => {
            searchBox.style.borderColor = '#e8eaed';
            searchBox.style.boxShadow = 'none';
        });
        
        searchBtn.onclick = () => {
            showInPipelineSearchPopup();
        };

        dockBtn.onclick = () => {
            // Use the reliable dock state flag instead of position-based detection
            const isDocked = localStorage.getItem('snaplogicSidebarDocked') === 'true';
            console.log('Dock button clicked - isDocked:', isDocked);
            
            if (isDocked) {
                // UNDOCKING: Clear the docked state flag
                console.log('Undocking - Clearing docked state');
                localStorage.removeItem('snaplogicSidebarDocked');
                // Remove from chrome storage as well
                setSetting('snaplogicSidebarDocked', null).catch(() => {});
                
                // Restore to previous position
                const previousPos = JSON.parse(localStorage.getItem(PREVIOUS_POSITION_KEY));
                console.log('Undocking - Previous position:', previousPos);
                if (previousPos) {
                    sidebar.style.left = previousPos.left;
                    sidebar.style.top = previousPos.top;
                    const positionData = JSON.stringify(previousPos);
                    localStorage.setItem(STORAGE_KEY, positionData);
                    // Save to chrome storage for persistence
                    setSetting(STORAGE_KEY, positionData).catch(() => {});
                } else {
                    // Fallback to center-right if no previous position
                    const sidebarWidth = parseInt(sidebar.style.width) || 400;
                    const rightPosition = window.innerWidth - sidebarWidth - 20;
                    sidebar.style.left = `${Math.max(20, rightPosition)}px`;
                    sidebar.style.top = '100px';
                    const newPosition = {
                        left: sidebar.style.left,
                        top: sidebar.style.top
                    };
                    const positionData = JSON.stringify(newPosition);
                    localStorage.setItem(STORAGE_KEY, positionData);
                    // Save to chrome storage for persistence
                    setSetting(STORAGE_KEY, positionData).catch(() => {});
                }
                
                // Handle undock behavior setting
                chrome.storage.sync.get(['undockBehavior'], (result) => {
                    const undockBehavior = result.undockBehavior || 'remember';
                    
                    if (undockBehavior === 'expanded') {
                        // Always expand when undocking
                        tabSwitcher.style.display = 'flex';
                        expandCollapseContainer.style.display = currentView === 'project' ? 'flex' : 'none';
                        searchBox.style.display = 'block';
                        content.style.display = 'block';
                        toggleBtn.textContent = '−';
                        toggleBtn.title = 'Minimize';
                        localStorage.setItem(TOGGLE_KEY, 'false');
                        // Sync to chrome.storage
                        setSetting(TOGGLE_KEY, 'false').catch(() => {});
                    } else if (undockBehavior === 'minimized') {
                        // Always minimize when undocking
                        tabSwitcher.style.display = 'none';
                        expandCollapseContainer.style.display = 'none';
                        searchBox.style.display = 'none';
                        content.style.display = 'none';
                        toggleBtn.textContent = '+';
                        toggleBtn.title = 'Expand';
                        localStorage.setItem(TOGGLE_KEY, 'true');
                        // Sync to chrome.storage
                        setSetting(TOGGLE_KEY, 'true').catch(() => {});
                    } else if (undockBehavior === 'remember') {
                        // Restore pre-dock state
                        const previousState = JSON.parse(localStorage.getItem(PREVIOUS_STATE_KEY) || '{}');
                        const wasMinimized = previousState.minimized !== undefined ? previousState.minimized : false;
                        
                        if (wasMinimized) {
                            tabSwitcher.style.display = 'none';
                            expandCollapseContainer.style.display = 'none';
                            searchBox.style.display = 'none';
                            content.style.display = 'none';
                            toggleBtn.textContent = '+';
                            toggleBtn.title = 'Expand';
                            localStorage.setItem(TOGGLE_KEY, 'true');
                            // Sync to chrome.storage
                            setSetting(TOGGLE_KEY, 'true').catch(() => {});
                        } else {
                            tabSwitcher.style.display = 'flex';
                            expandCollapseContainer.style.display = currentView === 'project' ? 'flex' : 'none';
                            searchBox.style.display = 'block';
                            content.style.display = 'block';
                            toggleBtn.textContent = '−';
                            toggleBtn.title = 'Minimize';
                            localStorage.setItem(TOGGLE_KEY, 'false');
                            // Sync to chrome.storage
                            setSetting(TOGGLE_KEY, 'false').catch(() => {});
                        }
                    }
                });
                
                // Update button appearance
                dockBtn.textContent = '⇊';
                // Set tooltip based on user's dock preference
                chrome.storage.sync.get(['dockPosition'], (result) => {
                    const dockPosition = result.dockPosition || 'bottom-right';
                    dockBtn.title = dockPosition === 'bottom-left' ? 'Dock to Bottom Left' : 'Dock to Bottom Right';
                });
            } else {
                // DOCKING: Set the docked state flag
                console.log('Docking - Setting docked state');
                localStorage.setItem('snaplogicSidebarDocked', 'true');
                // Save to chrome storage for persistence
                setSetting('snaplogicSidebarDocked', 'true').catch(() => {});
                
                // Save current position and state before docking
                const currentPosition = {
                    left: sidebar.style.left,
                    top: sidebar.style.top
                };
                console.log('Docking - Saving as previous position:', currentPosition);
                localStorage.setItem(PREVIOUS_POSITION_KEY, JSON.stringify(currentPosition));
                
                // Save current minimized state for "remember" option
                const currentlyMinimized = toggleBtn.textContent === '+';
                const previousState = {
                    minimized: currentlyMinimized
                };
                localStorage.setItem(PREVIOUS_STATE_KEY, JSON.stringify(previousState));
                
                // Minimize the sidebar
                tabSwitcher.style.display = 'none';
                expandCollapseContainer.style.display = 'none';
                searchBox.style.display = 'none';
                content.style.display = 'none';
                toggleBtn.textContent = '+';
                toggleBtn.title = 'Expand';
                localStorage.setItem(TOGGLE_KEY, 'true');
                // Sync to chrome.storage
                setSetting(TOGGLE_KEY, 'true').catch(() => {});
                
                // Get dock position preference from chrome storage
                chrome.storage.sync.get(['dockPosition'], (result) => {
                    const dockPosition = result.dockPosition || 'bottom-right';
                    const sidebarWidth = parseInt(sidebar.style.width) || 400;
                    const bottomPosition = window.innerHeight - 60; // 60px from bottom (just showing header)
                    
                    let leftPosition;
                    if (dockPosition === 'bottom-left') {
                        leftPosition = 20; // 20px margin from left edge
                        dockBtn.title = 'Restore Position';
                    } else {
                        leftPosition = window.innerWidth - sidebarWidth - 20; // 20px margin from right edge
                        dockBtn.title = 'Restore Position';
                    }
                    
                    sidebar.style.left = `${Math.max(20, leftPosition)}px`;
                    sidebar.style.top = `${Math.max(10, bottomPosition)}px`;
                    
                    // Save the new docked position
                    const newPosition = {
                        left: sidebar.style.left,
                        top: sidebar.style.top
                    };
                    const positionData = JSON.stringify(newPosition);
                    localStorage.setItem(STORAGE_KEY, positionData);
                    // Save to chrome storage for persistence
                    setSetting(STORAGE_KEY, positionData).catch(() => {});
                    
                    // Update button appearance
                    dockBtn.textContent = '⇈';
                    dockBtn.title = 'Restore Position';
                });
            }
        };

        optionsBtn.onclick = () => {
            // Send message to background script to open options page
            try {
                chrome.runtime.sendMessage({ action: 'openOptions' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Error opening options:', chrome.runtime.lastError);
                        // Fallback: try to open options page directly
                        try {
                            chrome.runtime.openOptionsPage();
                        } catch (err) {
                            console.log('Fallback failed:', err);
                        }
                    }
                });
            } catch (err) {
                console.log('Error sending message:', err);
                // Direct fallback
                try {
                    chrome.runtime.openOptionsPage();
                } catch (fallbackErr) {
                    console.log('Direct fallback failed:', fallbackErr);
                }
            }
        };

        const content = document.createElement('div');
        content.id = 'pipeline-sidebar-content';
        content.style = 'padding: 6px 12px 12px 12px; max-height: 60vh; overflow-y: auto;';
        sidebar.appendChild(content);

        const isMinimized = localStorage.getItem(TOGGLE_KEY) === 'true';
        
        // Hide tabs and search when minimized
        if (isMinimized) {
            tabSwitcher.style.display = 'none';
            expandCollapseContainer.style.display = 'none';
            searchBox.style.display = 'none';
            content.style.display = 'none';
        } else {
            tabSwitcher.style.display = 'flex';
            expandCollapseContainer.style.display = currentView === 'project' ? 'flex' : 'none';
            searchBox.style.display = 'block';
            content.style.display = 'block';
        }

        toggleBtn.onclick = () => {
            const minimized = content.style.display === 'none';
            
            if (minimized) {
                // Expanding
                tabSwitcher.style.display = 'flex';
                expandCollapseContainer.style.display = currentView === 'project' ? 'flex' : 'none';
                searchBox.style.display = 'block';
                content.style.display = 'block';
                toggleBtn.textContent = '–';
                toggleBtn.title = 'Minimize';
            } else {
                // Minimizing
                tabSwitcher.style.display = 'none';
                expandCollapseContainer.style.display = 'none';
                searchBox.style.display = 'none';
                content.style.display = 'none';
                toggleBtn.textContent = '+';
                toggleBtn.title = 'Expand';
            }
            
            const newMinimizedState = (!minimized).toString();
            localStorage.setItem(TOGGLE_KEY, newMinimizedState);
            
            // Sync to chrome.storage for persistence across sessions
            setSetting(TOGGLE_KEY, newMinimizedState).catch(() => {
                // Ignore errors, localStorage is already updated
            });
        };

        const collapsedGroups = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');

        function renderContent(filter = '') {
            content.innerHTML = '';
            if (currentView === 'flat') {
                pipelines
                    .filter(p => {
                        const name = p.title?.split('/').pop();
                        return name && name.toLowerCase().includes(filter.toLowerCase());
                    })
                    .forEach(p => {
                        const item = createPipelineItem(p, activeId, false);
                        content.appendChild(item);
                    });
            } else {
                const grouped = {};
                pipelines.forEach(p => {
                    const parts = p.title?.split('/');
                    if (!parts || parts.length < 3) return;
                    const key = `${parts[0]}/${parts[1]}`;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(p);
                });

                Object.keys(grouped).sort().forEach(group => {
                    const items = grouped[group];
                    
                    // Filter items that match the search
                    const matchingItems = items.filter(p => {
                        const name = p.title?.split('/').pop();
                        return name && name.toLowerCase().includes(filter.toLowerCase());
                    });
                    
                    // Skip groups with no matching items when filtering
                    if (filter.trim() && matchingItems.length === 0) {
                        return;
                    }
                    
                    const groupHeader = document.createElement('div');
                    // Get current collapsed state from localStorage
                    const currentCollapsedGroups = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
                    let isCollapsed = currentCollapsedGroups[group];
                    
                    // Auto-expand groups when searching if they have matches
                    const shouldAutoExpand = filter.trim() && matchingItems.length > 0;
                    if (shouldAutoExpand) {
                        isCollapsed = false;
                    }
                    
                    groupHeader.innerHTML = `<span style="cursor:pointer;">${isCollapsed ? '▶' : '▼'} ${group}${filter.trim() && matchingItems.length > 0 ? ` (${matchingItems.length} match${matchingItems.length === 1 ? '' : 'es'})` : ''}</span>`;
                    groupHeader.style = 'font-weight: bold; margin-top: 8px; margin-bottom: 3px; font-size: 13px;';
                    groupHeader.onclick = () => {
                        const updatedCollapsedGroups = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
                        updatedCollapsedGroups[group] = !updatedCollapsedGroups[group];
                        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(updatedCollapsedGroups));
                        renderContent(searchBox.value);
                    };
                    content.appendChild(groupHeader);

                    if (!isCollapsed) {
                        const itemsToShow = filter.trim() ? matchingItems : items;
                        itemsToShow.forEach(p => {
                            const item = createPipelineItem(p, activeId, true);
                            content.appendChild(item);
                        });
                    }
                });
            }
        }

        searchBox.addEventListener('input', () => {
            renderContent(searchBox.value);
        });

        renderContent();

        document.body.appendChild(sidebar);
        makeDraggable(sidebar, header);
        makeResizable(sidebar);
    }

    function makeResizable(element) {
        // Create resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.style = `
            position: absolute;
            right: -4px;
            top: 0;
            width: 8px;
            height: 100%;
            cursor: ew-resize;
            background: rgba(102, 126, 234, 0.1);
            border-right: 2px solid rgba(102, 126, 234, 0.3);
            z-index: 10001;
            transition: all 0.2s ease;
        `;
        
        // Add hover effect to make it more visible
        resizeHandle.addEventListener('mouseenter', () => {
            resizeHandle.style.background = 'rgba(102, 126, 234, 0.2)';
            resizeHandle.style.borderRight = '2px solid rgba(102, 126, 234, 0.5)';
        });
        
        resizeHandle.addEventListener('mouseleave', () => {
            if (!isResizing) {
                resizeHandle.style.background = 'rgba(102, 126, 234, 0.1)';
                resizeHandle.style.borderRight = '2px solid rgba(102, 126, 234, 0.3)';
            }
        });
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let mouseMoveHandler, mouseUpHandler;
        
        const handleMouseDown = (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
            resizeHandle.style.background = 'rgba(102, 126, 234, 0.3)';
            resizeHandle.style.borderRight = '2px solid rgba(102, 126, 234, 0.7)';
        };
        
        mouseMoveHandler = (e) => {
            if (!isResizing) return;
            
            const width = startWidth + e.clientX - startX;
            const minWidth = 300;
            const maxWidth = 800;
            
            if (width >= minWidth && width <= maxWidth) {
                const newWidth = width + 'px';
                element.style.width = newWidth;
                // Don't save on every mousemove for better performance
            }
        };
        
        mouseUpHandler = () => {
            if (isResizing) {
                // Save width when user finishes resizing
                const finalWidth = element.style.width;
                if (finalWidth) {
                    // Save to both chrome storage and localStorage
                    setSetting('snaplogicSidebarWidth', finalWidth);
                    localStorage.setItem('snaplogicSidebarWidth', finalWidth);
                }
                isResizing = false;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                // Reset resize handle styling
                resizeHandle.style.background = 'rgba(102, 126, 234, 0.1)';
                resizeHandle.style.borderRight = '2px solid rgba(102, 126, 234, 0.3)';
            }
        };
        
        resizeHandle.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        
        // Track these document listeners for cleanup
        documentEventListeners.set('resize-move', mouseMoveHandler);
        documentEventListeners.set('resize-up', mouseUpHandler);
        
        // Add ResizeObserver as backup to catch any other resize changes
        if (window.ResizeObserver) {
            // Disconnect existing observer if any
            if (globalResizeObserver) {
                globalResizeObserver.disconnect();
            }
            
            globalResizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const width = entry.target.style.width;
                    if (width && !isResizing) {
                        // Only save if not currently being resized by our handle
                        // Save to both chrome storage and localStorage
                        setSetting('snaplogicSidebarWidth', width);
                        localStorage.setItem('snaplogicSidebarWidth', width);
                    }
                }
            });
            globalResizeObserver.observe(element);
        }
        
        element.appendChild(resizeHandle);
    }

    function makeDraggable(element, handle) {
        let offsetX = 0, offsetY = 0, isDragging = false;
        let mouseMoveHandler, mouseUpHandler;

        const handleMouseDown = (e) => {
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            document.body.style.userSelect = 'none';
        };

        mouseMoveHandler = (e) => {
            if (isDragging) {
                const left = `${e.clientX - offsetX}px`;
                const top = `${e.clientY - offsetY}px`;
                element.style.left = left;
                element.style.top = top;
                
                // Only save position if not currently in docked state
                // Check if there's a docked state flag in localStorage
                const dockedState = localStorage.getItem('snaplogicSidebarDocked');
                if (dockedState !== 'true') {
                    const positionData = JSON.stringify({ left, top });
                    localStorage.setItem(STORAGE_KEY, positionData);
                    // Save to chrome storage in background for persistence
                    setSetting(STORAGE_KEY, positionData).catch(() => {
                        // Ignore errors, localStorage is the primary store for immediate access
                    });
                }
            }
        };

        mouseUpHandler = () => {
            isDragging = false;
            document.body.style.userSelect = '';
        };

        handle.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        
        // Track these document listeners for cleanup
        documentEventListeners.set('sidebar-drag-move', mouseMoveHandler);
        documentEventListeners.set('sidebar-drag-up', mouseUpHandler);
    }

    function updateSidebar() {
        // Skip updates during SnapLogic transitions
        if (isSnapLogicTransitioning) {
            console.log('Pipeline Explorer: Skipping update during SnapLogic transition');
            return;
        }
        
        // Add defensive checks to prevent interfering with SnapLogic operations
        try {
            const tabs = document.querySelectorAll('.sl-pipeline-tabs .sl-tab-body');
            const activeTab = document.querySelector('.sl-tab-body.sl-x-select');
            const activeId = activeTab?.getAttribute('data-snode-id');

            // Don't update if SnapLogic is in an inconsistent state (like during org switching)
            if (!tabs || tabs.length === 0) {
                console.log('Pipeline Explorer: No tabs found, skipping sidebar update');
                return;
            }

            const pipelines = Array.from(tabs)
                .filter(tab => {
                    // Only include tabs that have valid title and id attributes
                    const title = tab.getAttribute('title');
                    const id = tab.getAttribute('data-snode-id');
                    return title && id && typeof title === 'string' && title.trim().length > 0;
                })
                .map(tab => ({
                    id: tab.getAttribute('data-snode-id'),
                    title: tab.getAttribute('title'),
                    element: tab
                }));

            // Only create sidebar if we have valid pipelines
            if (pipelines.length > 0) {
                createSidebar(pipelines, activeId);
            } else {
                console.log('Pipeline Explorer: No valid pipelines found, skipping sidebar creation');
            }
        } catch (error) {
            console.error('Pipeline Explorer: Error in updateSidebar, likely during SnapLogic state transition:', error);
            // Don't throw the error to avoid interfering with SnapLogic
        }
    }

    function observeTabChanges() {
        const tabContainer = document.querySelector('.sl-pipeline-tabs');
        if (!tabContainer) return;

        // Disconnect existing observer if any
        if (globalMutationObserver) {
            globalMutationObserver.disconnect();
        }

        globalMutationObserver = new MutationObserver((mutations) => {
            // Differentiate between immediate updates (tab changes) and debounced updates (bulk structural changes)
            let needsImmediateUpdate = false;
            let needsDebounceUpdate = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && 
                    mutation.target.classList?.contains('sl-tab-body') &&
                    mutation.attributeName === 'class') {
                    // Tab selection changes - update immediately for responsive UI
                    needsImmediateUpdate = true;
                    break; // Exit early for immediate updates
                } else if (mutation.type === 'childList') {
                    // Check for tab-related structural changes (adding/removing tabs)
                    let hasTabChanges = false;
                    
                    // Check added nodes
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE && 
                                (node.classList?.contains('sl-tab-body') || 
                                 node.querySelector?.('.sl-tab-body'))) {
                                hasTabChanges = true;
                                break;
                            }
                        }
                    }
                    
                    // Check removed nodes - this is what was missing for tab closing!
                    if (!hasTabChanges && mutation.removedNodes.length > 0) {
                        for (const node of mutation.removedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE && 
                                (node.classList?.contains('sl-tab-body') || 
                                 node.querySelector?.('.sl-tab-body'))) {
                                hasTabChanges = true;
                                break;
                            }
                        }
                    }
                    
                    if (hasTabChanges) {
                        // Individual tab additions/removals - update immediately for responsive UI
                        needsImmediateUpdate = true;
                        break; // Exit early for immediate updates
                    } else if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                        // Other structural changes - debounce to prevent excessive updates
                        needsDebounceUpdate = true;
                    }
                }
            }
            
            if (needsImmediateUpdate) {
                // Update immediately for tab selection changes and individual tab add/remove
                updateSidebar();
            } else if (needsDebounceUpdate) {
                // Debounce other structural changes to prevent excessive updates during SnapLogic state changes
                clearTimeout(globalMutationObserver._updateTimeout);
                globalMutationObserver._updateTimeout = setTimeout(() => {
                    updateSidebar();
                }, 50);
            }
        });

        globalMutationObserver.observe(tabContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    async function init() {
        // Migrate existing localStorage data to chrome.storage.sync
        await migrateStorageData();
        
        // Start monitoring for SnapLogic transitions
        detectSnapLogicTransition();
        
        // Wait for SnapLogic to load with more robust checking
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        const interval = setInterval(() => {
            attempts++;
            const tabContainer = document.querySelector('.sl-pipeline-tabs');
            
            if (tabContainer) {
                clearInterval(interval);
                console.log('Pipeline Explorer: SnapLogic loaded, initializing extension');
                updateSidebar();
                observeTabChanges();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.log('Pipeline Explorer: Timeout waiting for SnapLogic to load');
            }
        }, 1000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    } // End of initializePipelineExplorer function
})();
