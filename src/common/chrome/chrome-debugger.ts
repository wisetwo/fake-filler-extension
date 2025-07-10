import { sleep } from "src/common/helpers";

class ChromeDebugger {
  private tabIdOfDebuggerAttached: number | undefined = undefined;
  private attachingDebugger: Promise<void> | null = null;
  private destroyed = false;

  constructor() {
    this.tabIdOfDebuggerAttached = undefined;
    this.attachingDebugger = null;
    this.destroyed = false;
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

  private async getTabIdOrConnectToCurrentTab(): Promise<number> {
    const response = await this.sendMessage<{ tabId: number }>({
      type: "GET_ACTIVE_TAB",
    });
    return response.tabId;
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
        const currentTabId = await this.getTabIdOrConnectToCurrentTab();

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

        // Try to detach any existing debugger from the current tab
        try {
          await this.sendMessage({
            type: "DETACH_DEBUGGER",
            tabId: currentTabId,
          });
        } catch (error) {
          // Ignore error if no debugger was attached
        }

        // attach debugger to the current tab
        console.log("attaching debugger to tab:", currentTabId);
        await this.sendMessage({
          type: "ATTACH_DEBUGGER",
          tabId: currentTabId,
        });

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
      await this.sendMessage({
        type: "DETACH_DEBUGGER",
        tabId: tabIdToDetach,
      });
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

    const response = await this.sendMessage<{ success: boolean; response: ResponseType }>({
      type: "SEND_DEBUGGER_COMMAND",
      tabId: this.tabIdOfDebuggerAttached,
      command,
      params,
    });

    return response.response;
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
