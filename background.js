// Background script for SnapLogic Pipeline Explorer
// Handles opening options page from content script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openOptions') {
        if (request.focusSection) {
            // Open options page with focus parameter
            chrome.tabs.create({
                url: chrome.runtime.getURL(`options.html?focus=${request.focusSection}`)
            });
        } else {
            chrome.runtime.openOptionsPage();
        }
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});
