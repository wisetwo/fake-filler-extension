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
      console.log("Failed to set active tab, continuing...", error);
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

  public async clearInput(element: import("src/shared/extractor").ElementInfo | Element): Promise<void> {
    await this.ensureInitialized();

    if (typeof element === "object" && element !== null && "center" in element && Array.isArray(element.center)) {
      // 如果是 ElementInfo 对象，直接使用 page.ts 中的 clearInput 方法
      await this.page.clearInput(element as import("src/shared/extractor").ElementInfo);
    } else if (typeof element === "object" && element !== null && "getBoundingClientRect" in element) {
      // 如果是 DOM Element，转换为坐标后手动实现清除
      const domElement = element as Element;
      const rect = domElement.getBoundingClientRect();
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);

      // 点击元素
      await this.click(centerX, centerY);

      // 选择全部内容
      await this.selectAll();

      // 等待一下
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 删除选中内容
      await this.backspace();
    } else {
      throw new Error(`Invalid element type: expected ElementInfo or DOM Element, got ${typeof element}`);
    }
  }

  public async clearAndType(
    text: string,
    element: import("src/shared/extractor").ElementInfo | Element
  ): Promise<void> {
    await this.ensureInitialized();

    if (typeof element === "object" && element !== null && "center" in element && Array.isArray(element.center)) {
      // 如果是 ElementInfo 对象，直接使用 page.ts 中的 clearInput 方法
      await this.page.clearInput(element as import("src/shared/extractor").ElementInfo);
    } else if (typeof element === "object" && element !== null && "getBoundingClientRect" in element) {
      // 如果是 DOM Element，转换为坐标后手动实现清除和输入
      const domElement = element as Element;
      const rect = domElement.getBoundingClientRect();
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);

      // 点击元素
      await this.click(centerX, centerY);

      // 选择全部内容
      await this.selectAll();

      // 等待一下
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 删除选中内容
      await this.backspace();
    } else {
      throw new Error(`Invalid element type: expected ElementInfo or DOM Element, got ${typeof element}`);
    }

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
        console.log("waitUntilNetworkIdle failed:", error);
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
