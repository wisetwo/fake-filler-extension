import FakeFiller from "src/common/fake-filler";
import { IFakeFillerOptions, MessageRequest } from "src/types";

declare global {
  interface Window {
    fakeFiller: FakeFiller;
  }
}

function initialize(options: IFakeFillerOptions) {
  let profileIndex = -1;
  let urlIsBlocked = false;
  const url = window.location.href;

  chrome.runtime.sendMessage({ type: "clearProfileBadge" }, () => chrome.runtime.lastError);

  if (url && options.urlMatchesToBlock && options.urlMatchesToBlock.length > 0) {
    for (let i = 0; i < options.urlMatchesToBlock.length; i += 1) {
      const currentURL = options.urlMatchesToBlock[i];

      if (url.match(new RegExp(currentURL))) {
        chrome.runtime.sendMessage({ type: "setBlockedBadge", data: currentURL }, () => chrome.runtime.lastError);
        urlIsBlocked = true;
        break;
      }
    }
  }

  if (url && !urlIsBlocked && options.profiles && options.profiles.length > 0) {
    for (let i = 0; i < options.profiles.length; i += 1) {
      const currentProfile = options.profiles[i];

      if (url.match(new RegExp(currentProfile.urlMatch))) {
        profileIndex = i;
        chrome.runtime.sendMessage({ type: "setProfileBadge", data: currentProfile }, () => chrome.runtime.lastError);
        break;
      }
    }
  }

  window.fakeFiller = new FakeFiller(options, profileIndex);
}

function handleMessage(request: MessageRequest, sender: any, sendResponse: any): boolean | null {
  switch (request.type) {
    case "receiveNewOptions": {
      const options = request.data.options as IFakeFillerOptions;
      initialize(options);
      sendResponse({ success: true });
      return true;
    }

    case "HIGHLIGHT_FORM_ELEMENTS": {
      try {
        if (window.fakeFiller) {
          window.fakeFiller.highlightFormElements();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "FakeFiller not initialized" });
        }
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return true;
    }

    case "CLEAR_FORM_HIGHLIGHT": {
      try {
        if (window.fakeFiller) {
          window.fakeFiller.clearFormHighlight();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "FakeFiller not initialized" });
        }
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return true;
    }

    case "FILL_ALL_INPUTS": {
      (async () => {
        try {
          if (window.fakeFiller) {
            await window.fakeFiller.fillAllInputs();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "FakeFiller not initialized" });
          }
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      })();
      return true;
    }

    default:
      return null;
  }
}

document.addEventListener("mousedown", (event) => {
  if (event.button === 2 && window.fakeFiller) {
    window.fakeFiller.setClickedElement(event.target as HTMLElement);
  }
});

chrome.runtime.sendMessage({ type: "getOptions" }, (response) => {
  const options = response.options as IFakeFillerOptions;
  initialize(options);
});

chrome.runtime.onMessage.addListener(handleMessage);
