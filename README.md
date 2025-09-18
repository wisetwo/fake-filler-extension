
This extension allows you to fill all form inputs (textboxes, textareas, radio buttons, dropdowns, etc.) with dummy data. It is a must for developers and testers who work with forms as it avoids the need for manually entering values in fields.

## Developing

1. `npm install`
1. `npm run build`
1. Follow instructions for [building your first Chrome extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
    * In Chrome, open [chrome://extensions/](chrome://extensions/)
    * Enable "Developer mode" by clicking the toggle switch next to "Developer mode"
    * Click on "Load unpacked" and then navigate to the `/dist` folder to load the extension.

### Enable extension debugging

1. In Chrome, open [chrome://extensions/](chrome://extensions/)
1. Make sure "Developer mode" is enabled (toggle switch in top-right corner)
1. Extension debugging is automatically enabled in developer mode.

### View extension console log

1. In Chrome, open [chrome://extensions/](chrome://extensions/)
1. Find your extension and click on "Inspect views" followed by the specific view you want to debug (e.g., "popup.html", "options.html", "service worker")
1. This will open Chrome DevTools for that specific part of your extension
1. For background script logs, click "Inspect views: service worker" or check the Chrome DevTools Console tab
