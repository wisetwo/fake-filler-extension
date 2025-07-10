import type { MouseButton } from "src/common/abstract-page";
import ChromeExtensionProxyPage from "src/common/chrome/page";

class PageOperator {
  private page: ChromeExtensionProxyPage;
  private initialized = false;

  constructor() {
    this.page = new ChromeExtensionProxyPage(true); // forceSameTabNavigation = true
  }

  public async initialize(): Promise<void> {
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
    await this.initialize();
    await this.page.mouse.click(x, y, { button });
  }

  public async move(x: number, y: number): Promise<void> {
    await this.initialize();
    await this.page.mouse.move(x, y);
  }

  public async type(text: string): Promise<void> {
    await this.initialize();
    await this.page.keyboard.type(text);
  }

  public async evaluateScript(script: string): Promise<any> {
    await this.initialize();
    if (this.page.evaluateJavaScript) {
      return this.page.evaluateJavaScript(script);
    }
    throw new Error("evaluateJavaScript not supported");
  }

  public async clickOnBlankArea(): Promise<void> {
    await this.initialize();
    const size = await this.page.size();
    const x = Math.floor(Math.random() * (size.width - 100)) + 50;
    const y = Math.floor(Math.random() * (size.height - 100)) + 50;
    await this.click(x, y);
  }

  public async waitUntilNetworkIdle(): Promise<void> {
    await this.initialize();
    if (this.page.waitUntilNetworkIdle) {
      try {
        await this.page.waitUntilNetworkIdle();
      } catch (error) {
        console.warn("waitUntilNetworkIdle failed:", error);
      }
    }
  }

  public async destroy(): Promise<void> {
    if (this.page && this.initialized) {
      await this.page.destroy();
    }
    this.initialized = false;
  }
}

export default PageOperator;
