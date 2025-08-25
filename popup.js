document.addEventListener('DOMContentLoaded', function () {
  const toggleExplorer = document.getElementById('toggle-switch');
  const openOptionsButton = document.getElementById('openOptions');
  const resetPositionButton = document.getElementById('resetPosition');

  // Load current state from storage
  chrome.storage.sync.get(['enabled'], function(result) {
    // Default to enabled (true) if not set
    const isEnabled = result.enabled !== false;
    toggleExplorer.checked = isEnabled;
  });

  // Save explorer toggle state
  toggleExplorer.addEventListener('change', function() {
    chrome.storage.sync.set({ enabled: toggleExplorer.checked }, function() {
      console.log('Pipeline Explorer state is set to ' + toggleExplorer.checked);
      
      // Notify content scripts about the change
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleExtension', 
            enabled: toggleExplorer.checked
          }).catch(() => {
            // Ignore errors if content script is not ready
          });
        }
      });
    });
  });

  // Open options page
  openOptionsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Reset position to default
  resetPositionButton.addEventListener('click', function() {
    // Send message to content script to reset position
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'resetPosition'
        }).then((response) => {
          if (response && response.success) {
            // Provide visual feedback
            resetPositionButton.textContent = '✅ Position Reset!';
            setTimeout(() => {
              resetPositionButton.textContent = '📍 Reset Position';
            }, 2000);
          } else {
            // Show error feedback
            resetPositionButton.textContent = '❌ Error - Try Again';
            setTimeout(() => {
              resetPositionButton.textContent = '📍 Reset Position';
            }, 2000);
          }
        }).catch(() => {
          // Handle case where content script is not ready or page is not SnapLogic
          resetPositionButton.textContent = '⚠️ Open SnapLogic Page';
          setTimeout(() => {
            resetPositionButton.textContent = '📍 Reset Position';
          }, 2000);
        });
      }
    });
  });
});
