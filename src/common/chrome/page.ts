/// <reference types="chrome" />

/*
  It is used to interact with the page tab from the chrome extension.
  The page must be active when interacting with it.
*/

import type { Protocol as CDPTypes } from "devtools-protocol";

import { CdpKeyboard } from "./cdpInput";
import { getHtmlElementScript, injectStopWaterFlowAnimation, injectWaterFlowAnimation } from "./dynamic-scripts";

import type { AbstractPage, MouseButton } from "src/common/abstract-page";
import type { WebKeyInput } from "src/common/page.d";
import { limitOpenNewTabScript } from "src/common/ui-utils";
import { treeToList } from "src/shared/extractor";
import type { ElementInfo } from "src/shared/extractor";
import type { ElementTreeNode, Point, Size } from "src/shared/types";
import { assert } from "src/shared/utils";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// declare const __VERSION__: string;

export default class ChromeExtensionProxyPage implements AbstractPage {
  pageType = "chrome-extension-proxy";

  public forceSameTabNavigation: boolean;
  // private version: string = __VERSION__;

  private viewportSize?: Size;

  private activeTabId: number | null = null;

  private tabIdOfDebuggerAttached: number | null = null;

  private attachingDebugger: Promise<void> | null = null;

  private destroyed = false;

  private isMobileEmulation: boolean | null = null;

  constructor(forceSameTabNavigation: boolean) {
    this.forceSameTabNavigation = forceSameTabNavigation;
  }

  private async sendMessage<T>(message: any): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response as T);
      });
    });
  }

  public async getBrowserTabList(): Promise<{ id: string; title: string; url: string; currentActiveTab: boolean }[]> {
    const response = await this.sendMessage<{ tabs: chrome.tabs.Tab[] }>({
      type: "GET_TAB_LIST",
    });
    return response.tabs
      .map((tab) => ({
        id: `${tab.id}`,
        title: tab.title || "",
        url: tab.url || "",
        currentActiveTab: tab.active,
      }))
      .filter((tab) => tab.id && tab.title && tab.url) as {
      id: string;
      title: string;
      url: string;
      currentActiveTab: boolean;
    }[];
  }

  public async getTabIdOrConnectToCurrentTab() {
    if (this.activeTabId) {
      // always keep on the connected tab
      return this.activeTabId;
    }
    const response = await this.sendMessage<{ tabId: number }>({
      type: "GET_ACTIVE_TAB",
    });
    this.activeTabId = response.tabId;
    return this.activeTabId;
  }

  public async setActiveTabId(tabId: number) {
    if (this.activeTabId) {
      throw new Error(`Active tab id is already set, which is ${this.activeTabId}, cannot set it to ${tabId}`);
    }
    await this.sendMessage({
      type: "SET_ACTIVE_TAB",
      tabId,
    });
    this.activeTabId = tabId;
  }

  public async getActiveTabId() {
    return this.activeTabId;
  }

  private async attachDebugger() {
    assert(!this.destroyed, "Page is destroyed");

    // If already attaching, wait for it to complete
    if (this.attachingDebugger) {
      await this.attachingDebugger;
      return;
    }

    // Create new attaching promise
    this.attachingDebugger = (async () => {
      const url = await this.url();
      let error: Error | null = null;
      if (url.startsWith("chrome://")) {
        throw new Error(
          "Cannot attach debugger to chrome:// pages, please use Midscene in a normal page with http://, https:// or file://"
        );
      }

      try {
        const currentTabId = await this.getTabIdOrConnectToCurrentTab();

        if (this.tabIdOfDebuggerAttached === currentTabId) {
          // already attached
          return;
        }
        if (this.tabIdOfDebuggerAttached && this.tabIdOfDebuggerAttached !== currentTabId) {
          // detach the previous tab
          console.log("detach the previous tab", this.tabIdOfDebuggerAttached, "->", currentTabId);
          try {
            await this.detachDebugger(this.tabIdOfDebuggerAttached);
          } catch (error) {
            console.error("Failed to detach debugger", error);
          }
        }

        // detach any debugger attached to the tab
        console.log("attaching debugger", currentTabId);
        await this.sendMessage({
          type: "ATTACH_DEBUGGER",
          tabId: currentTabId,
        });
        // wait util the debugger banner in Chrome appears
        await sleep(500);

        this.tabIdOfDebuggerAttached = currentTabId;

        await this.enableWaterFlowAnimation();
      } catch (e) {
        console.error("Failed to attach debugger", e);
        error = e as Error;
      } finally {
        this.attachingDebugger = null;
      }
      if (error) {
        throw error;
      }
    })();

    await this.attachingDebugger;
  }

  private async showMousePointer(x: number, y: number) {
    // update mouse pointer while redirecting
    const pointerScript = `(() => {
      if(typeof window.midsceneWaterFlowAnimation !== 'undefined') {
        window.midsceneWaterFlowAnimation.enable();
        window.midsceneWaterFlowAnimation.showMousePointer(${x}, ${y});
      } else {
        console.log('midsceneWaterFlowAnimation is not defined');
      }
    })()`;

    await this.sendCommandToDebugger("Runtime.evaluate", {
      expression: `${pointerScript}`,
    });
  }

  private async hideMousePointer() {
    await this.sendCommandToDebugger("Runtime.evaluate", {
      expression: `(() => {
        if(typeof window.midsceneWaterFlowAnimation !== 'undefined') {
          window.midsceneWaterFlowAnimation.hideMousePointer();
        }
      })()`,
    });
  }

  private async detachDebugger(tabId?: number) {
    const tabIdToDetach = tabId || this.tabIdOfDebuggerAttached;
    console.log("detaching debugger", tabIdToDetach);
    if (!tabIdToDetach) {
      console.warn("No tab id to detach");
      return;
    }

    try {
      await this.disableWaterFlowAnimation(tabIdToDetach);
      await sleep(200); // wait for the animation to stop
    } catch (error) {
      console.warn("Failed to disable water flow animation", error);
    }

    try {
      await this.sendMessage({
        type: "DETACH_DEBUGGER",
        tabId: tabIdToDetach,
      });
    } catch (error) {
      // maybe tab is closed ?
      console.warn("Failed to detach debugger", error);
    }
    this.tabIdOfDebuggerAttached = null;
  }

  private async enableWaterFlowAnimation() {
    // limit open page in new tab
    if (this.forceSameTabNavigation) {
      await this.sendCommandToDebugger("Runtime.evaluate", {
        expression: limitOpenNewTabScript,
      });
    }

    const script = await injectWaterFlowAnimation();
    // we will call this function in sendCommandToDebugger, so we have to use the chrome.debugger.sendCommand
    await this.sendCommandToDebugger("Runtime.evaluate", {
      expression: script,
    });
  }

  private async disableWaterFlowAnimation(tabId: number) {
    const script = await injectStopWaterFlowAnimation();
    await this.sendCommandToDebugger("Runtime.evaluate", {
      expression: script,
    });
  }

  private async sendCommandToDebugger<ResponseType = any, RequestType = any>(
    command: string,
    params: RequestType
  ): Promise<ResponseType> {
    await this.attachDebugger();

    assert(this.tabIdOfDebuggerAttached, "Debugger is not attached");

    // wo don't have to await it
    this.enableWaterFlowAnimation();
    const response = await this.sendMessage<{ success: boolean; response: ResponseType }>({
      type: "SEND_DEBUGGER_COMMAND",
      tabId: this.tabIdOfDebuggerAttached,
      command,
      params,
    });
    return response.response;
  }

  private async getPageContentByCDP() {
    const script = await getHtmlElementScript();

    // check tab url
    await this.sendCommandToDebugger<CDPTypes.Runtime.EvaluateResponse, CDPTypes.Runtime.EvaluateRequest>(
      "Runtime.evaluate",
      {
        expression: script,
      }
    );

    const expression = () => {
      (window as any).midscene_element_inspector.setNodeHashCacheListOnWindow();

      return {
        tree: (window as any).midscene_element_inspector.webExtractNodeTree(),
        size: {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          dpr: window.devicePixelRatio,
        },
      };
    };
    const returnValue = await this.sendCommandToDebugger<
      CDPTypes.Runtime.EvaluateResponse,
      CDPTypes.Runtime.EvaluateRequest
    >("Runtime.evaluate", {
      expression: `(${expression.toString()})()`,
      returnByValue: true,
    });

    if (!returnValue.result.value) {
      const errorDescription = returnValue.exceptionDetails?.exception?.description || "";
      if (!errorDescription) {
        console.error("returnValue from cdp", returnValue);
      }
      throw new Error(`Failed to get page content from page, error: ${errorDescription}`);
    }
    // console.log('returnValue', returnValue.result.value);
    return returnValue.result.value as {
      tree: ElementTreeNode<ElementInfo>;
      size: Size;
    };
  }

  public async evaluateJavaScript(script: string) {
    return this.sendCommandToDebugger("Runtime.evaluate", {
      expression: script,
    });
  }

  // current implementation is wait until domReadyState is complete
  public async waitUntilNetworkIdle() {
    const timeout = 10000;
    const startTime = Date.now();
    let lastReadyState = "";
    while (Date.now() - startTime < timeout) {
      const result = await this.sendCommandToDebugger("Runtime.evaluate", {
        expression: "document.readyState",
      });
      lastReadyState = result.result.value;
      if (lastReadyState === "complete") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Failed to wait until network idle, last readyState: ${lastReadyState}`);
  }

  // @deprecated
  async getElementsInfo() {
    const tree = await this.getElementsNodeTree();
    return treeToList(tree);
  }

  async getXpathsById(id: string) {
    const script = await getHtmlElementScript();

    // check tab url
    await this.sendCommandToDebugger<CDPTypes.Runtime.EvaluateResponse, CDPTypes.Runtime.EvaluateRequest>(
      "Runtime.evaluate",
      {
        expression: script,
      }
    );

    const result = await this.sendCommandToDebugger("Runtime.evaluate", {
      expression: `window.midscene_element_inspector.getXpathsById('${id}')`,
      returnByValue: true,
    });
    return result.result.value;
  }

  async getElementInfoByXpath(xpath: string) {
    const script = await getHtmlElementScript();

    // check tab url
    await this.sendCommandToDebugger<CDPTypes.Runtime.EvaluateResponse, CDPTypes.Runtime.EvaluateRequest>(
      "Runtime.evaluate",
      {
        expression: script,
      }
    );
    const result = await this.sendCommandToDebugger("Runtime.evaluate", {
      expression: `window.midscene_element_inspector.getElementInfoByXpath('${xpath}')`,
      returnByValue: true,
    });
    return result.result.value;
  }

  async getElementsNodeTree() {
    await this.hideMousePointer();
    const content = await this.getPageContentByCDP();
    if (content?.size) {
      this.viewportSize = content.size;
    }

    return content?.tree || { node: null, children: [] };
  }

  async size() {
    if (this.viewportSize) return this.viewportSize;
    const content = await this.getPageContentByCDP();
    return content.size;
  }

  async screenshotBase64() {
    // screenshot by cdp
    await this.hideMousePointer();
    const base64 = await this.sendCommandToDebugger("Page.captureScreenshot", {
      format: "jpeg",
      quality: 90,
    });
    return `data:image/jpeg;base64,${base64.data}`;
  }

  async url() {
    const tabId = await this.getTabIdOrConnectToCurrentTab();
    const response = await this.sendMessage<{ url: string }>({
      type: "GET_TAB_URL",
      tabId,
    });
    return response.url || "";
  }

  async scrollUntilTop(startingPoint?: Point) {
    if (startingPoint) {
      await this.mouse.move(startingPoint.left, startingPoint.top);
    }
    return this.mouse.wheel(0, -9999999);
  }

  async scrollUntilBottom(startingPoint?: Point) {
    if (startingPoint) {
      await this.mouse.move(startingPoint.left, startingPoint.top);
    }
    return this.mouse.wheel(0, 9999999);
  }

  async scrollUntilLeft(startingPoint?: Point) {
    if (startingPoint) {
      await this.mouse.move(startingPoint.left, startingPoint.top);
    }
    return this.mouse.wheel(-9999999, 0);
  }

  async scrollUntilRight(startingPoint?: Point) {
    if (startingPoint) {
      await this.mouse.move(startingPoint.left, startingPoint.top);
    }
    return this.mouse.wheel(9999999, 0);
  }

  async scrollUp(distance?: number, startingPoint?: Point) {
    const { height } = await this.size();
    const scrollDistance = distance || height * 0.7;
    return this.mouse.wheel(0, -scrollDistance, startingPoint?.left, startingPoint?.top);
  }

  async scrollDown(distance?: number, startingPoint?: Point) {
    const { height } = await this.size();
    const scrollDistance = distance || height * 0.7;
    return this.mouse.wheel(0, scrollDistance, startingPoint?.left, startingPoint?.top);
  }

  async scrollLeft(distance?: number, startingPoint?: Point) {
    const { width } = await this.size();
    const scrollDistance = distance || width * 0.7;
    return this.mouse.wheel(-scrollDistance, 0, startingPoint?.left, startingPoint?.top);
  }

  async scrollRight(distance?: number, startingPoint?: Point) {
    const { width } = await this.size();
    const scrollDistance = distance || width * 0.7;
    return this.mouse.wheel(scrollDistance, 0, startingPoint?.left, startingPoint?.top);
  }

  async clearInput(element: ElementInfo) {
    if (!element) {
      console.warn("No element to clear input");
      return;
    }

    await this.mouse.click(element.center[0], element.center[1]);

    await this.sendCommandToDebugger("Input.dispatchKeyEvent", {
      type: "keyDown",
      commands: ["selectAll"],
    });

    await this.sendCommandToDebugger("Input.dispatchKeyEvent", {
      type: "keyUp",
      commands: ["selectAll"],
    });

    await sleep(100);

    await this.keyboard.press({
      key: "Backspace",
    });
  }

  private latestMouseX = 100;
  private latestMouseY = 100;

  mouse = {
    click: async (x: number, y: number, options?: { button?: MouseButton; count?: number }) => {
      const { button = "left", count = 1 } = options || {};
      await this.mouse.move(x, y);
      // detect if the page is in mobile emulation mode
      if (this.isMobileEmulation === null) {
        const result = await this.sendCommandToDebugger("Runtime.evaluate", {
          expression: `(() => {
            return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
          })()`,
          returnByValue: true,
        });
        this.isMobileEmulation = result?.result?.value;
      }

      if (this.isMobileEmulation && button === "left") {
        // in mobile emulation mode, directly inject click event
        const touchPoints = [{ x: Math.round(x), y: Math.round(y) }];
        await this.sendCommandToDebugger("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints,
          modifiers: 0,
        });

        await this.sendCommandToDebugger("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
          modifiers: 0,
        });
      } else {
        // standard mousePressed + mouseReleased
        await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x,
          y,
          button,
          clickCount: count,
        });
        await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x,
          y,
          button,
          clickCount: count,
        });
      }
    },
    wheel: async (deltaX: number, deltaY: number, startX?: number, startY?: number) => {
      const finalX = startX || this.latestMouseX;
      const finalY = startY || this.latestMouseY;
      await this.showMousePointer(finalX, finalY);
      await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: finalX,
        y: finalY,
        deltaX,
        deltaY,
      });
      this.latestMouseX = finalX;
      this.latestMouseY = finalY;
    },
    move: async (x: number, y: number) => {
      await this.showMousePointer(x, y);
      await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
      });
      this.latestMouseX = x;
      this.latestMouseY = y;
    },
    drag: async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      await this.mouse.move(from.x, from.y);
      await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: from.x,
        y: from.y,
        button: "left",
        clickCount: 1,
      });
      await this.mouse.move(to.x, to.y);
      await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: to.x,
        y: to.y,
        button: "left",
        clickCount: 1,
      });
    },
  };

  keyboard = {
    type: async (text: string) => {
      const cdpKeyboard = new CdpKeyboard({
        send: this.sendCommandToDebugger.bind(this),
      });
      await cdpKeyboard.type(text, { delay: 0 });
    },
    press: async (action: { key: WebKeyInput; command?: string } | { key: WebKeyInput; command?: string }[]) => {
      const cdpKeyboard = new CdpKeyboard({
        send: this.sendCommandToDebugger.bind(this),
      });
      const keys = Array.isArray(action) ? action : [action];
      for (const k of keys) {
        const commands = k.command ? [k.command] : [];
        await cdpKeyboard.down(k.key, { commands });
      }
      for (const k of [...keys].reverse()) {
        await cdpKeyboard.up(k.key);
      }
    },
  };

  async destroy(): Promise<void> {
    this.activeTabId = null;
    await this.detachDebugger();
    this.destroyed = true;
  }
}
