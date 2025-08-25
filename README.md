# SnapLogic Pipeline Explorer

A Chrome extension that enhances SnapLogic Designer with a powerful pipeline navigation sidebar.

# Author
Mateusz Szcześniak
meteorit@mixbox.pl

# Release notes
## v1.0 
- production version - no development history in GitHub
  - Basic sidebar functionality
  - Emoji customization
  - Search and grouping
  - Resizable interface
  - Persistent settings
## v1.1
  - added fix for storing minimized state in the chrome cache

## v1.2
  - added close pipeline tab functionality in Flat View - right-click context menu 
  - added button to the extension popup to reset Pipeline Explorer position
  - hopefully added a fix to JSON parsing of corrupted patterns like '[object Object]'

# Features

- **Dockable and resizable sidebar** with explorer window for browsing opened SnapLogic pipelines
- **Smart Search**: Search through pipeline names with real-time filtering
- **Project Grouping**: View pipelines organized by project structure
- **Resizable Sidebar**: Drag to resize the sidebar to your preferred width
- **Custom Emoji Bullets**: Assign custom emojis to pipelines for easy visual identification
- **Configurable** options to fit to your prefferences
- **Persistent Settings**: All preferences are saved between sessions
- **Real-time Updates**: Sidebar automatically updates when tabs change


## Usage

### Basic Usage

1. Open any SnapLogic Designer page with pipeline tabs
2. The Pipeline Explorer sidebar will automatically appear
3. Click on any pipeline to switch to it
4. Use the search box to filter pipelines by name

### Emoji Customization

- **Click any emoji** next to a pipeline name to open the emoji picker
- **Choose from common emojis** or type your own in the text field
- **Right-click emojis** for alternative access to the picker

### View Modes

- **Flat View**: All pipelines in a simple list
- **Project View**: Pipelines grouped by project structure
  - Use "Expand All" / "Collapse All" buttons for bulk operations
  - Click project headers to toggle individual groups

### Sidebar Management

- **Resize**: Hover over the right edge and drag to resize
- **Move**: Drag the header to reposition the sidebar
- **Minimize**: Click the "–" button to collapse/expand
- **Dock**: Click the arrows down to dock to the bottom of the screen

## Development

### Project Structure

```
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js             # Main content script
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── styles.css             # Global styles (minimal)
├── icons/                 # Extension icons
└── README.md             # This file
```

### Key Components

- **Content Script**: Injected into SnapLogic pages to create the sidebar
- **Popup**: Extension icon popup with status and features
- **Manifest V3**: Modern Chrome extension format

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Reload any SnapLogic pages to see changes

### Building for Distribution

The extension is ready for distribution as-is. To create a ZIP for the Chrome Web Store:

1. Select all files in the project folder
2. Create a ZIP archive
3. Upload to Chrome Web Store Developer Dashboard

## Technical Notes

### Permissions

- `storage`: For saving user preferences
- `activeTab`: For checking current tab URL in popup
- `host_permissions`: Access to SnapLogic domains

### Storage

All settings are stored in `localStorage` and chrome storage:
- Sidebar position and size
- View mode preferences
- Collapsed group states
- Custom emoji assignments

### Compatibility

- **Chrome/Chromium**: Manifest V3 compatible
- **Edge**: Should work with Chromium-based Edge
