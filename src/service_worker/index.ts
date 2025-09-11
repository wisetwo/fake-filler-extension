import { CreateContextMenus, GetFakeFillerOptions, GetMessage } from "src/common/helpers";
// , SaveFakeFillerOptions

import { IProfile, IFakeFillerOptions } from "src/types";

async function getCurrentTabId() {
  const queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab?.id ?? -1;
}

function NotifyTabsOfNewOptions(options: IFakeFillerOptions) {
  chrome.tabs.query({}, (tabs: any[]) => {
    tabs.forEach((tab: { id: any }) => {
      if (tab && tab.id && tab.id !== chrome.tabs.TAB_ID_NONE) {
        chrome.tabs.sendMessage(tab.id, { type: "receiveNewOptions", data: { options } }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(`Failed to notify tab ${tab.id}:`, chrome.runtime.lastError.message);
          } else {
            console.log(`Successfully notified tab ${tab.id}`, response);
          }
        });
      }
    });
  });
}

async function handleMessage(message: any): Promise<any> {
  console.log("Received message:", message.type, message);

  try {
    switch (message.type) {
      case "getOptions": {
        const options = await GetFakeFillerOptions();
        return { options };
      }
      case "setProfileBadge": {
        const profile = message.data as IProfile;
        await chrome.action.setBadgeText({ text: "★", tabId: message.sender?.tab?.id });
        await chrome.action.setBadgeBackgroundColor({ color: "#D4AF37", tabId: message.sender?.tab?.id });
        await chrome.action.setTitle({
          title: `${GetMessage("actionTitle")}\n${GetMessage("matchedProfile")}: ${profile.name}`,
          tabId: message.sender?.tab?.id,
        });
        return { success: true };
      }
      case "setBlockedBadge": {
        const urlToBlock = message.data as string;
        await chrome.action.setBadgeText({ text: "X", tabId: message.sender?.tab?.id });
        await chrome.action.setBadgeBackgroundColor({ color: "#880000", tabId: message.sender?.tab?.id });
        await chrome.action.setTitle({
          title: `${GetMessage("actionTitle")}\n${GetMessage("matchedBlockedURL")}: ${urlToBlock}`,
          tabId: message.sender?.tab?.id,
        });
        return { success: true };
      }
      case "clearProfileBadge": {
        await chrome.action.setBadgeText({ text: "", tabId: message.sender?.tab?.id });
        return { success: true };
      }
      case "optionsUpdated": {
        const options = await GetFakeFillerOptions();
        await NotifyTabsOfNewOptions(options);
        return { success: true };
      }
      case "GET_TAB_LIST": {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        return { tabs };
      }
      case "GET_ACTIVE_TAB": {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0 && tabs[0].id) {
          console.log("Found active tab:", tabs[0].id);
          return { tabId: tabs[0].id };
        }
        console.error("No active tab found");
        throw new Error("No active tab found");
      }
      case "SET_ACTIVE_TAB": {
        await chrome.tabs.update(message.tabId, { active: true });
        return { success: true };
      }
      case "GET_TAB_URL": {
        const tab = await chrome.tabs.get(message.tabId);
        return { url: tab.url };
      }
      case "GET_EXTENSION_RESOURCE": {
        const { resourcePath } = message;
        console.log("Getting extension resource:", resourcePath);
        try {
          const resourceUrl = chrome.runtime.getURL(resourcePath);
          const response = await fetch(resourceUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
          }
          const content = await response.text();
          console.log("Resource loaded successfully, length:", content.length);
          return { content };
        } catch (error) {
          console.error("Failed to get extension resource:", error);
          throw error;
        }
      }
      case "ATTACH_DEBUGGER": {
        const { tabId } = message;
        console.log("Attaching debugger to tab:", tabId);
        try {
          await chrome.debugger.attach({ tabId }, "1.3");
          console.log("Successfully attached debugger to tab:", tabId);
          return { success: true };
        } catch (error) {
          console.error("Failed to attach debugger:", error);
          throw error;
        }
      }
      case "DETACH_DEBUGGER": {
        const { tabId } = message;
        console.log("Detaching debugger from tab:", tabId);
        try {
          await chrome.debugger.detach({ tabId });
          console.log("Successfully detached debugger from tab:", tabId);
          return { success: true };
        } catch (error) {
          // maybe tab is closed ?
          console.warn("Failed to detach debugger:", error);
          return { success: true }; // 即使失败也返回成功，因为可能是tab已经关闭
        }
      }
      case "SEND_DEBUGGER_COMMAND": {
        const { tabId, command, params } = message;
        console.log("Sending debugger command:", command, "to tab:", tabId, "with params:", params);
        try {
          const response = await chrome.debugger.sendCommand({ tabId }, command, params);
          console.log("Successfully sent debugger command:", command, "response:", response);
          return { success: true, response };
        } catch (error) {
          console.error("Failed to send debugger command:", error);
          throw error;
        }
      }
      case "FILL_ALL_INPUTS": {
        console.log("Filling all inputs from side panel");
        try {
          const tabId = await getCurrentTabId();
          console.log("Current tab ID:", tabId);

          if (tabId === -1) {
            throw new Error("No active tab found");
          }

          // 发送消息到content script并等待响应
          const response = await chrome.tabs.sendMessage(tabId, { type: "FILL_ALL_INPUTS" });
          console.log("Content script response:", response);

          if (response && response.success) {
            console.log("Successfully filled all inputs");
            return { success: true };
          }
          throw new Error(response?.error || "Content script returned failure");
        } catch (error) {
          console.error("Failed to fill all inputs:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      }
      case "HIGHLIGHT_FORM_ELEMENTS": {
        console.log("Highlighting form elements from side panel");
        try {
          const tabId = await getCurrentTabId();
          console.log("Current tab ID:", tabId);

          if (tabId === -1) {
            throw new Error("No active tab found");
          }

          // 发送消息到content script并等待响应
          const response = await chrome.tabs.sendMessage(tabId, { type: "HIGHLIGHT_FORM_ELEMENTS" });
          console.log("Content script response:", response);

          if (response && response.success) {
            console.log("Successfully highlighted form elements");
            return { success: true };
          }
          throw new Error(response?.error || "Content script returned failure");
        } catch (error) {
          console.error("Failed to highlight form elements:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      }
      case "CLEAR_FORM_HIGHLIGHT": {
        console.log("Clearing form highlight from side panel");
        try {
          const tabId = await getCurrentTabId();
          console.log("Current tab ID:", tabId);

          if (tabId === -1) {
            throw new Error("No active tab found");
          }

          // 发送消息到content script并等待响应
          const response = await chrome.tabs.sendMessage(tabId, { type: "CLEAR_FORM_HIGHLIGHT" });
          console.log("Content script response:", response);

          if (response && response.success) {
            console.log("Successfully cleared form highlight");
            return { success: true };
          }
          throw new Error(response?.error || "Content script returned failure");
        } catch (error) {
          console.error("Failed to clear form highlight:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      }
      case "STOP_FILLING": {
        console.log("Stopping filling from side panel");
        try {
          const tabId = await getCurrentTabId();
          console.log("Current tab ID:", tabId);

          if (tabId === -1) {
            throw new Error("No active tab found");
          }

          // 发送消息到content script停止填充
          const response = await chrome.tabs.sendMessage(tabId, { type: "STOP_FILLING" });
          console.log("Content script response:", response);

          if (response && response.success) {
            console.log("Successfully stopped filling");
            return { success: true };
          }
          throw new Error(response?.error || "Content script returned failure");
        } catch (error) {
          console.error("Failed to stop filling:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          };
        }
      }
      default: {
        throw new Error(`Unknown message type: ${message.type}`);
      }
    }
  } catch (error: unknown) {
    console.error("Error handling message:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred");
  }
}

// 统一的消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 将 sender 信息添加到消息中，因为某些处理需要用到
  const messageWithSender = { ...message, sender };

  handleMessage(messageWithSender)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: Error) => {
      console.error("Error in message handler:", error);
      sendResponse({ error: error.message });
    });
  return true; // 保持消息通道开放以进行异步响应
});

if (chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener((_details) => {
    // if (details.reason === "update") {
    //   try {
    //     if (details.previousVersion && details.previousVersion.startsWith("3.2")) {
    //       GetFakeFillerOptions().then((options) => {
    //         options.fieldMatchSettings.matchAriaLabelledBy = true;
    //         SaveFakeFillerOptions(options);
    //       });
    //     }
    //   } catch (ex: any) {
    //     // eslint-disable-next-line no-alert
    //     window.alert(GetMessage("bgPage_errorMigratingOptions", [ex.message]));
    //   }
    // }
  });
}

function fillAllInputs() {
  if (window.fakeFiller) {
    window.fakeFiller.fillAllInputs();
  }
}

function fillThisForm() {
  window.fakeFiller.fillThisForm();
}

function fillThisInput() {
  window.fakeFiller.fillThisInput();
}

// https://developer.chrome.com/docs/extensions/reference/api/sidePanel?hl=zh-cn
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// chrome.action.onClicked.addListener(async () => {
//   await chrome.scripting.executeScript({
//     func: fillAllInputs,
//     target: {
//       allFrames: true,
//       tabId: await getCurrentTabId(),
//     },
//   });
// });

GetFakeFillerOptions().then((options) => {
  CreateContextMenus(options.enableContextMenu);
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "fake-filler-all") {
    await chrome.scripting.executeScript({
      func: fillAllInputs,
      target: {
        allFrames: true,
        tabId: await getCurrentTabId(),
      },
    });
  }
  if (info.menuItemId === "fake-filler-form") {
    await chrome.scripting.executeScript({
      func: fillThisForm,
      target: {
        allFrames: true,
        tabId: await getCurrentTabId(),
      },
    });
  }
  if (info.menuItemId === "fake-filler-input") {
    await chrome.scripting.executeScript({
      func: fillThisInput,
      target: {
        allFrames: true,
        tabId: await getCurrentTabId(),
      },
    });
  }
});

chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === "fill_all_inputs") {
    await chrome.scripting.executeScript({
      func: fillAllInputs,
      target: {
        allFrames: true,
        tabId: await getCurrentTabId(),
      },
    });
  }
  if (command === "fill_this_form") {
    await chrome.scripting.executeScript({
      func: fillThisForm,
      target: {
        allFrames: true,
        tabId: await getCurrentTabId(),
      },
    });
  }
  if (command === "fill_this_input") {
    await chrome.scripting.executeScript({
      func: fillThisInput,
      target: {
        allFrames: true,
        tabId: await getCurrentTabId(),
      },
    });
  }
});
