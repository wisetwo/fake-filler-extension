import { sleep } from "./helpers";

class ChromeDebugger {
  private tabIdOfDebuggerAttached: number | undefined = undefined;
  private attachingDebugger: Promise<void> | null = null;
  private destroyed = false;

  constructor() {
    this.tabIdOfDebuggerAttached = undefined;
    this.attachingDebugger = null;
    this.destroyed = false;
  }

  private async getActiveTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0 || !tabs[0].id) {
      throw new Error("No active tab found");
    }
    return tabs[0].id;
  }

  public async attachDebugger(): Promise<void> {
    if (this.destroyed) {
      throw new Error("ChromeDebugger is destroyed");
    }

    // If already attaching, wait for it to complete
    if (this.attachingDebugger) {
      await this.attachingDebugger;
      return;
    }

    // Create new attaching promise
    this.attachingDebugger = (async () => {
      try {
        const currentTabId = await this.getActiveTabId();
        const tab = await chrome.tabs.get(currentTabId);
        const url = tab.url || "";

        if (url.startsWith("chrome://")) {
          throw new Error("Cannot attach debugger to chrome:// pages");
        }

        if (this.tabIdOfDebuggerAttached === currentTabId) {
          // already attached
          return;
        }

        if (this.tabIdOfDebuggerAttached && this.tabIdOfDebuggerAttached !== currentTabId) {
          // detach the previous tab
          try {
            await this.detachDebugger(this.tabIdOfDebuggerAttached);
          } catch (error) {
            console.error("Failed to detach debugger", error);
          }
        }

        // attach debugger to the current tab
        await chrome.debugger.attach({ tabId: currentTabId }, "1.3");
        // wait until the debugger banner in Chrome appears
        await sleep(500);

        this.tabIdOfDebuggerAttached = currentTabId;
      } catch (e) {
        console.error("Failed to attach debugger", e);
        throw e;
      } finally {
        this.attachingDebugger = null;
      }
    })();

    await this.attachingDebugger;
  }

  private async detachDebugger(tabId?: number): Promise<void> {
    const tabIdToDetach = tabId || this.tabIdOfDebuggerAttached;
    if (!tabIdToDetach) {
      console.warn("No tab id to detach");
      return;
    }

    try {
      await chrome.debugger.detach({ tabId: tabIdToDetach });
      if (tabIdToDetach === this.tabIdOfDebuggerAttached) {
        this.tabIdOfDebuggerAttached = undefined;
      }
    } catch (error) {
      console.error("Failed to detach debugger", error);
      throw error;
    }
  }

  public async sendCommandToDebugger<ResponseType = any, RequestType extends Record<string, any> = Record<string, any>>(
    command: string,
    params: RequestType
  ): Promise<ResponseType> {
    if (!this.tabIdOfDebuggerAttached) {
      throw new Error("Debugger is not attached");
    }

    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: this.tabIdOfDebuggerAttached }, command, params, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as ResponseType);
        }
      });
    });
  }

  public async simulateMouseEvent(
    type: "mousePressed" | "mouseReleased" | "mouseMoved",
    x: number,
    y: number,
    button: "left" | "right" | "middle" = "left",
    clickCount = 1
  ): Promise<void> {
    const buttonMap = {
      left: "left",
      right: "right",
      middle: "middle",
    };

    await this.sendCommandToDebugger("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: buttonMap[button],
      clickCount,
    });
  }

  public async click(x: number, y: number, button: "left" | "right" | "middle" = "left"): Promise<void> {
    await this.simulateMouseEvent("mousePressed", x, y, button, 1);
    await sleep(50); // Add a small delay between press and release
    await this.simulateMouseEvent("mouseReleased", x, y, button, 1);
  }

  public async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.tabIdOfDebuggerAttached) {
      await this.detachDebugger(this.tabIdOfDebuggerAttached);
    }
  }
}

export default ChromeDebugger;
