document.addEventListener('DOMContentLoaded', function () {
  const toggleExplorer = document.getElementById('toggle-switch');
  const openOptionsButton = document.getElementById('openOptions');

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
});
