import type { MouseButton } from "src/common/abstract-page";
import ChromeExtensionProxyPage from "src/common/chrome/page";

class PageOperator {
  private page: ChromeExtensionProxyPage;
  private initialized = false;
  private destroyed = false;

  constructor() {
    this.page = new ChromeExtensionProxyPage(true); // forceSameTabNavigation = true
    this.destroyed = false;
  }

  private ensureNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error("PageOperator has been destroyed");
    }
  }

  private async ensureInitialized(): Promise<void> {
    this.ensureNotDestroyed();

    if (!this.initialized) {
      await this.initialize();
    }
  }

  public async initialize(): Promise<void> {
    this.ensureNotDestroyed();

    if (this.initialized) return;

    // 设置活动标签页
    try {
      const tabs = await this.page.getBrowserTabList();
      const activeTab = tabs.find((tab) => tab.currentActiveTab);

      if (activeTab) {
        await this.page.setActiveTabId(parseInt(activeTab.id, 10));
      }
    } catch (error) {
      console.warn("Failed to set active tab, continuing...", error);
    }

    this.initialized = true;
  }

  public async click(x: number, y: number, button: MouseButton = "left"): Promise<void> {
    await this.ensureInitialized();
    await this.page.mouse.click(x, y, { button });
  }

  public async move(x: number, y: number): Promise<void> {
    await this.ensureInitialized();
    await this.page.mouse.move(x, y);
  }

  public async type(text: string): Promise<void> {
    await this.ensureInitialized();
    await this.page.keyboard.type(text);
  }

  public async selectAll(): Promise<void> {
    await this.ensureInitialized();
    // 使用与 page.ts 中 clearInput 相同的 selectAll 实现
    await this.sendCommandToDebugger("Input.dispatchKeyEvent", {
      type: "keyDown",
      commands: ["selectAll"],
    });
    await this.sendCommandToDebugger("Input.dispatchKeyEvent", {
      type: "keyUp",
      commands: ["selectAll"],
    });
  }

  private async sendCommandToDebugger(command: string, params: any): Promise<any> {
    // 直接调用 page 的 sendCommandToDebugger 方法
    return (this.page as any).sendCommandToDebugger(command, params);
  }

  public async backspace(): Promise<void> {
    await this.ensureInitialized();
    await this.page.keyboard.press({ key: "Backspace" });
  }

  public async clearInput(element: import("src/shared/extractor").ElementInfo): Promise<void> {
    await this.ensureInitialized();
    // 直接使用 page.ts 中已有的 clearInput 实现，它包含点击、选择全部、删除的完整流程
    await this.page.clearInput(element);
  }

  public async clearAndType(text: string, element: import("src/shared/extractor").ElementInfo): Promise<void> {
    await this.ensureInitialized();
    // 使用 page.ts 中更完整的 clearInput 方法，它包含点击、选择全部、删除的完整流程
    await this.page.clearInput(element);
    await this.type(text);
  }

  public async evaluateScript(script: string): Promise<any> {
    await this.ensureInitialized();
    if (this.page.evaluateJavaScript) {
      return this.page.evaluateJavaScript(script);
    }
    throw new Error("evaluateJavaScript not supported");
  }

  public async waitUntilNetworkIdle(): Promise<void> {
    await this.ensureInitialized();
    if (this.page.waitUntilNetworkIdle) {
      try {
        await this.page.waitUntilNetworkIdle();
      } catch (error) {
        console.warn("waitUntilNetworkIdle failed:", error);
      }
    }
  }

  public async drag(from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
    await this.ensureInitialized();
    await this.page.mouse.drag(from, to);
  }

  public async scrollUp(distance?: number, startingPoint?: { x: number; y: number }): Promise<void> {
    await this.ensureInitialized();
    const point = startingPoint ? { left: startingPoint.x, top: startingPoint.y } : undefined;
    await this.page.scrollUp(distance, point);
  }

  public async scrollDown(distance?: number, startingPoint?: { x: number; y: number }): Promise<void> {
    await this.ensureInitialized();
    const point = startingPoint ? { left: startingPoint.x, top: startingPoint.y } : undefined;
    await this.page.scrollDown(distance, point);
  }

  public async scrollLeft(distance?: number, startingPoint?: { x: number; y: number }): Promise<void> {
    await this.ensureInitialized();
    const point = startingPoint ? { left: startingPoint.x, top: startingPoint.y } : undefined;
    await this.page.scrollLeft(distance, point);
  }

  public async scrollRight(distance?: number, startingPoint?: { x: number; y: number }): Promise<void> {
    await this.ensureInitialized();
    const point = startingPoint ? { left: startingPoint.x, top: startingPoint.y } : undefined;
    await this.page.scrollRight(distance, point);
  }

  public async getUrl(): Promise<string> {
    await this.ensureInitialized();
    return this.page.url();
  }

  public async getPageSize(): Promise<import("src/shared/types").Size> {
    await this.ensureInitialized();
    return this.page.size();
  }

  public async takeScreenshot(): Promise<string> {
    await this.ensureInitialized();
    return this.page.screenshotBase64();
  }

  public async destroy(): Promise<void> {
    if (this.destroyed) return;

    if (this.page && this.initialized) {
      await this.page.destroy();
    }
    this.initialized = false;
    this.destroyed = true;
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }
}

export default PageOperator;
