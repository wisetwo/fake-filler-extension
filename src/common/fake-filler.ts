import ElementFiller from "src/common/element-filler";
import PageOperator from "src/common/page-operator";

import { IFakeFillerOptions, FillElementFunction } from "src/types";

class FakeFiller {
  private elementFiller: ElementFiller;
  private clickedElement: HTMLElement | undefined;
  private urlMatchesToBlock: string[];
  private readonly selectInputClass = "t-select-input";
  private readonly cascaderClass = "t-cascader";
  private readonly datePickerClass = "t-date-picker";
  private readonly selectInputMultipleClass = "t-select-input--multiple";
  private readonly selectInputDropdownClassList = ["t-select__dropdown", "t-popup__content"];
  private readonly selectInputDropdownOptionClassList = ["t-select-option", "t-avatar"];
  private readonly cascaderDropdownClassList = ["t-popup__content"];
  private readonly cascaderDropdownOptionClassList = ["t-cascader__item"];
  private readonly datePickerDropdownClassList = ["t-popup__content"];
  private readonly datePickerDropdownOptionClassList = ["t-date-picker__cell"];
  private pageOperator: PageOperator | null;
  // 用于存储事件监听器引用，以便后续清理
  private hoverEventHandler: ((event: Event) => void) | null = null;
  // 用于延迟隐藏弹出框的计时器
  private hidePopupTimer: NodeJS.Timeout | null = null;
  // 用于控制停止填充的标志
  private shouldStop = false;

  constructor(options: IFakeFillerOptions, profileIndex = -1) {
    this.pageOperator = new PageOperator();
    this.elementFiller = new ElementFiller(options, profileIndex, this.pageOperator);
    this.urlMatchesToBlock = options.urlMatchesToBlock;
  }

  private getInputInfo(element: Element): {
    isWrappedSelect: boolean;
    isMultiSelect: boolean;
    isCascader: boolean;
    isDatePicker: boolean;
  } {
    let { parentElement } = element;
    let isWrappedSelect = false;
    let isMultiSelect = false;
    let isCascader = false;
    let isDatePicker = false;

    while (parentElement) {
      if (parentElement.classList.contains(this.selectInputClass)) {
        isWrappedSelect = true;
        isMultiSelect = parentElement.classList.contains(this.selectInputMultipleClass);

        // 检查是否为日期选择器（最高优先级）
        // 向上查找父节点是否有 t-date-picker
        let datePickerParent = parentElement.parentElement;
        while (datePickerParent) {
          if (datePickerParent.classList.contains(this.datePickerClass)) {
            isDatePicker = true;
            break;
          }
          datePickerParent = datePickerParent.parentElement;
        }

        // 如果不是日期选择器，检查是否为cascader
        if (!isDatePicker) {
          isCascader = parentElement.classList.contains(this.cascaderClass);
        }
        break;
      }
      parentElement = parentElement.parentElement;
    }

    return { isWrappedSelect, isMultiSelect, isCascader, isDatePicker };
  }

  private async handleInputElement(element: HTMLInputElement): Promise<void> {
    const { isWrappedSelect, isMultiSelect, isCascader, isDatePicker } = this.getInputInfo(element);
    console.log("~        handle input         ~");
    console.log("# handleInputElement", element);
    console.log(
      "isWrappedSelect, isMultiSelect, isCascader, isDatePicker",
      isWrappedSelect,
      isMultiSelect,
      isCascader,
      isDatePicker
    );

    if (isWrappedSelect) {
      if (isDatePicker) {
        // 日期选择器优先级最高
        await this.elementFiller.fillWrapedDropdownElement(
          element,
          false, // 单日期选择
          this.datePickerDropdownClassList,
          this.datePickerDropdownOptionClassList
        );
      } else if (isCascader) {
        // Cascader优先级次高
        await this.elementFiller.fillWrapedDropdownElement(
          element,
          false, // cascader通常是单选
          this.cascaderDropdownClassList,
          this.cascaderDropdownOptionClassList
        );
      } else {
        // 普通的wrapped select
        await this.elementFiller.fillWrapedDropdownElement(
          element,
          isMultiSelect,
          this.selectInputDropdownClassList,
          this.selectInputDropdownOptionClassList
        );
      }
    } else {
      await this.elementFiller.fillInputElement(element);
    }
  }

  private urlMatchesBlockList(): boolean {
    const url = window.location.href;

    if (url && this.urlMatchesToBlock && this.urlMatchesToBlock.length > 0) {
      for (let i = 0; i < this.urlMatchesToBlock.length; i += 1) {
        const currentURL = this.urlMatchesToBlock[i];

        if (url.match(new RegExp(currentURL))) {
          return true;
        }
      }
    }

    return false;
  }

  private async getPageOperator(): Promise<PageOperator> {
    try {
      // 检查当前 pageOperator 是否为 null 或已被销毁，如果是则创建新实例
      if (!this.pageOperator || this.pageOperator.isDestroyed()) {
        console.log("getPageOperator: creating new PageOperator instance");
        this.pageOperator = new PageOperator();
        this.elementFiller.updatePageOperator(this.pageOperator);
      }

      await this.pageOperator.initialize();
      return this.pageOperator;
    } catch (error) {
      console.log("getPageOperator: error occurred, creating new instance:", error);
      // 如果出现错误，创建新的实例
      this.pageOperator = new PageOperator();
      this.elementFiller.updatePageOperator(this.pageOperator);
      await this.pageOperator.initialize();
      return this.pageOperator;
    }
  }

  /**
   * 获取容器内所有可填充的元素
   * @param container 容器元素，默认为document
   * @returns 可填充的元素数组，按位置排序（从上到下，从左到右）
   */
  public getFillableElements(container: Document | HTMLElement = document): Element[] {
    // 1. 先获取所有可填充的元素
    const allElements: Element[] = [
      // 下拉框可能是readonly的，看能否优化 TODO
      ...Array.from(container.querySelectorAll("input:not(:disabled)")),
      ...Array.from(container.querySelectorAll("textarea:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("select:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("[contenteditable]")),
    ];

    // 2. 按位置排序（从上到下，从左到右）
    return this.sortElementsByPosition(allElements);
  }

  /**
   * 按位置对元素进行排序（从上到下，从左到右）
   * @param elements 要排序的元素数组
   * @returns 排序后的元素数组
   */
  private sortElementsByPosition(elements: Element[]): Element[] {
    return elements.sort((a, b) => {
      // 获取元素的边界矩形
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();

      // 计算元素中心点坐标
      const centerA = {
        x: rectA.left + rectA.width / 2,
        y: rectA.top + rectA.height / 2,
      };
      const centerB = {
        x: rectB.left + rectB.width / 2,
        y: rectB.top + rectB.height / 2,
      };

      // 定义一个容差值，用于判断两个元素是否在同一行
      const tolerance = 10;

      // 如果两个元素在同一行（Y坐标相近），则按X坐标排序（从左到右）
      if (Math.abs(centerA.y - centerB.y) <= tolerance) {
        return centerA.x - centerB.x;
      }

      // 否则按Y坐标排序（从上到下）
      return centerA.y - centerB.y;
    });
  }

  /**
   * 高亮显示页面中所有可填充的表单元素
   */
  public highlightFormElements(): void {
    if (this.urlMatchesBlockList()) {
      return;
    }

    // 先确保CSS样式已添加
    this.addHighlightStyles();

    // 获取所有可填充的元素并添加高亮class
    const fillableElements = this.getFillableElements();
    fillableElements.forEach((element) => {
      element.classList.add("fake-filler-element-highlight");
    });

    // 创建事件处理函数并存储引用
    this.hoverEventHandler = (event: Event) => {
      const target = event.target as HTMLElement;

      if (event.type === "mouseenter") {
        // 检查目标元素或其父级是否有高亮class
        if (target.classList && target.classList.contains("fake-filler-element-highlight")) {
          // 取消任何pending的隐藏计时器
          this.cancelHidePopupTimer();
          this.showElementPopup(target, event as MouseEvent);
        }
      } else if (event.type === "mouseleave") {
        // 检查目标元素或其父级是否有高亮class
        if (target.classList && target.classList.contains("fake-filler-element-highlight")) {
          // 延迟隐藏弹出框，给用户时间移动到弹出框上
          this.scheduleHidePopup();
        }
      }
    };

    // 使用事件代理在document上监听mouseenter和mouseleave事件
    document.addEventListener("mouseenter", this.hoverEventHandler, true);
    document.addEventListener("mouseleave", this.hoverEventHandler, true);

    console.log(`已高亮显示 ${fillableElements.length} 个可填充元素`);
  }

  /**
   * 清除页面中所有元素的高亮显示
   */
  public clearFormHighlight(): void {
    // 移除所有带有高亮class的元素的class
    const highlightedElements = document.querySelectorAll(".fake-filler-element-highlight");
    highlightedElements.forEach((element) => {
      element.classList.remove("fake-filler-element-highlight");
    });

    // 移除事件监听器
    if (this.hoverEventHandler) {
      document.removeEventListener("mouseenter", this.hoverEventHandler, true);
      document.removeEventListener("mouseleave", this.hoverEventHandler, true);
      this.hoverEventHandler = null;
    }

    // 取消任何pending的隐藏计时器并隐藏弹出框
    this.cancelHidePopupTimer();
    this.hideElementPopup();

    console.log(`已清除 ${highlightedElements.length} 个元素的高亮显示`);
  }

  /**
   * 添加高亮显示的CSS样式到页面
   */
  private addHighlightStyles(): void {
    // 检查是否已经存在样式
    if (document.getElementById("fake-filler-highlight-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "fake-filler-highlight-styles";
    style.textContent = `
      .fake-filler-element-highlight {
        outline: 2px solid #ff6b6b !important;
        background-color: rgba(255, 107, 107, 0.1) !important;
        transition: all 0.3s ease-in-out !important;
      }

      .fake-filler-popup {
        position: fixed !important;
        background: #2d3748 !important;
        color: #e2e8f0 !important;
        border: 1px solid #4a5568 !important;
        border-radius: 8px !important;
        padding: 12px !important;
        max-width: 500px !important;
        max-height: 400px !important;
        z-index: 999999 !important;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
        font-size: 12px !important;
        line-height: 1.4 !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        backdrop-filter: blur(8px) !important;
        opacity: 0 !important;
        transform: translateY(-10px) !important;
        transition: all 0.2s ease-in-out !important;
        pointer-events: auto !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }

      .fake-filler-popup.show {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }

      .fake-filler-popup-header {
        font-weight: bold !important;
        margin-bottom: 8px !important;
        color: #63b3ed !important;
        border-bottom: 1px solid #4a5568 !important;
        padding-bottom: 6px !important;
      }

      .fake-filler-popup-content {
        max-height: 300px !important;
        overflow-y: auto !important;
        white-space: pre-wrap !important;
        background: #1a202c !important;
        border: 1px solid #4a5568 !important;
        border-radius: 4px !important;
        padding: 8px !important;
        margin-top: 8px !important;
        cursor: text !important;
        user-select: all !important;
      }

      .fake-filler-popup-content::-webkit-scrollbar {
        width: 6px !important;
      }

      .fake-filler-popup-content::-webkit-scrollbar-track {
        background: #2d3748 !important;
      }

      .fake-filler-popup-content::-webkit-scrollbar-thumb {
        background: #4a5568 !important;
        border-radius: 3px !important;
      }

      .fake-filler-popup-tip {
        font-size: 10px !important;
        color: #a0aec0 !important;
        margin-top: 6px !important;
        font-style: italic !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示弹出框展示元素的outerHTML
   */
  private showElementPopup(element: HTMLElement, mouseEvent: MouseEvent): void {
    // 移除已存在的弹出框
    this.hideElementPopup();

    // 创建弹出框
    const popup = document.createElement("div");
    popup.id = "fake-filler-popup";
    popup.className = "fake-filler-popup";

    // 创建标题
    const header = document.createElement("div");
    header.className = "fake-filler-popup-header";

    // 设置标题内容
    const tagName = document.createElement("span");
    tagName.textContent = `${element.tagName}`;
    tagName.style.fontWeight = "bold";
    header.appendChild(tagName);

    // 如果元素有 name 属性，添加次级信息和复制功能
    const nameAttr = element.getAttribute("name");
    if (nameAttr) {
      const nameInfo = document.createElement("span");
      nameInfo.style.marginLeft = "10px";
      nameInfo.style.fontSize = "0.9em";
      nameInfo.style.color = "#666";
      const nameText = document.createElement("span");
      nameText.textContent = `name="${nameAttr}" `;
      nameInfo.appendChild(nameText);

      const copyButton = document.createElement("span");
      copyButton.textContent = "复制";
      copyButton.style.color = "#63b3ed";
      copyButton.style.cursor = "pointer";
      copyButton.style.textDecoration = "underline";
      copyButton.title = "点击复制 name 值";

      // 添加复制功能
      copyButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(nameAttr);
          // 临时显示复制成功提示
          const originalText = copyButton.textContent;
          copyButton.textContent = "已复制";
          copyButton.style.color = "#28a745";
          setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.color = "#63b3ed";
          }, 1500);
        } catch (err) {
          console.error("复制失败:", err);
          // 降级方案：使用 execCommand
          try {
            const textArea = document.createElement("textarea");
            textArea.value = nameAttr;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);

            const originalText = copyButton.textContent;
            copyButton.textContent = "已复制";
            copyButton.style.color = "#28a745";
            setTimeout(() => {
              copyButton.textContent = originalText;
              copyButton.style.color = "#63b3ed";
            }, 1500);
          } catch (fallbackErr) {
            console.error("降级复制方案也失败:", fallbackErr);
            copyButton.textContent = "复制失败";
            copyButton.style.color = "#dc3545";
            setTimeout(() => {
              copyButton.textContent = "复制";
              copyButton.style.color = "#63b3ed";
            }, 1500);
          }
        }
      });

      nameInfo.appendChild(copyButton);
      header.appendChild(nameInfo);
    }

    // 创建内容区域
    const content = document.createElement("div");
    content.className = "fake-filler-popup-content";

    // 临时移除高亮类以获取原始HTML
    const hadHighlightClass = element.classList.contains("fake-filler-element-highlight");
    if (hadHighlightClass) {
      element.classList.remove("fake-filler-element-highlight");
    }

    // 获取不包含插件添加类的原始HTML
    content.textContent = element.outerHTML;

    // 恢复高亮类
    if (hadHighlightClass) {
      element.classList.add("fake-filler-element-highlight");
    }

    // 创建提示文字
    const tip = document.createElement("div");
    tip.className = "fake-filler-popup-tip";
    tip.textContent = "点击内容区域可选中全部文本进行复制";

    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(tip);

    // 为弹出框添加事件监听器
    popup.addEventListener("mouseenter", () => {
      // 当鼠标进入弹出框时，取消隐藏计时器
      this.cancelHidePopupTimer();
    });

    popup.addEventListener("mouseleave", () => {
      // 当鼠标离开弹出框时，立即隐藏
      this.hideElementPopup();
    });

    document.body.appendChild(popup);

    // 计算弹出框位置
    const rect = element.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();

    // 默认显示在元素右侧
    const { right, left: rectLeft, top: rectTop } = rect;
    let left = right + 10;
    let top = rectTop;

    // 如果右侧空间不够，显示在左侧
    if (left + popupRect.width > window.innerWidth) {
      left = rectLeft - popupRect.width - 10;
    }

    // 如果左侧也不够，显示在鼠标位置
    if (left < 0) {
      left = mouseEvent.clientX + 10;
    }

    // 确保不会超出屏幕底部
    if (top + popupRect.height > window.innerHeight) {
      top = window.innerHeight - popupRect.height - 10;
    }

    // 确保不会超出屏幕顶部
    if (top < 0) {
      top = 10;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // 显示动画
    requestAnimationFrame(() => {
      popup.classList.add("show");
    });
  }

  /**
   * 隐藏弹出框
   */
  private hideElementPopup(): void {
    const existingPopup = document.getElementById("fake-filler-popup");
    if (existingPopup) {
      existingPopup.remove();
    }
    // 清除计时器
    this.cancelHidePopupTimer();
  }

  /**
   * 安排延迟隐藏弹出框
   */
  private scheduleHidePopup(): void {
    // 清除之前的计时器
    this.cancelHidePopupTimer();

    // 设置300ms延迟隐藏
    this.hidePopupTimer = setTimeout(() => {
      this.hideElementPopup();
    }, 300);
  }

  /**
   * 取消隐藏弹出框的计时器
   */
  private cancelHidePopupTimer(): void {
    if (this.hidePopupTimer) {
      clearTimeout(this.hidePopupTimer);
      this.hidePopupTimer = null;
    }
  }

  private async fillAllElements(container: Document | HTMLElement): Promise<void> {
    console.log("# fillAllElements", container);
    if (this.urlMatchesBlockList()) {
      return;
    }

    try {
      await this.getPageOperator();
      console.log("got operator");

      const delay = (ms: number): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, ms);
        });

      // 获取所有需要填充的元素
      const fillableElements = this.getFillableElements(container);

      // 创建一个填充单个元素的函数
      const fillElement: FillElementFunction = async (element) => {
        const tagName = element.tagName.toLowerCase();
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        if (tagName === "input") {
          await this.handleInputElement(element as HTMLInputElement);
        } else if (tagName === "textarea") {
          await this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
        } else if (tagName === "select") {
          this.elementFiller.fillSelectElement(element as HTMLSelectElement);
        } else if ((element as HTMLElement).isContentEditable) {
          this.elementFiller.fillContentEditableElement(element as HTMLElement);
        }
      };

      // 串行处理所有元素
      await fillableElements.reduce(async (promise, element) => {
        await promise;

        // 检查是否需要停止填充
        if (this.shouldStop) {
          console.log("Filling stopped by user request");
          return;
        }

        await fillElement(element);
        await delay(200); // 每个元素处理完后等待200ms
      }, Promise.resolve());
    } finally {
      if (this.pageOperator) {
        await this.pageOperator.destroy();
        this.pageOperator = null;
      }
    }
  }

  public setClickedElement(element: HTMLElement | undefined): void {
    this.clickedElement = element;
  }

  public async fillAllInputs(): Promise<void> {
    this.shouldStop = false; // 重置停止标志
    try {
      await this.getPageOperator();
      await this.fillAllElements(document);
    } finally {
      if (this.pageOperator) {
        await this.pageOperator.destroy();
        this.pageOperator = null;
      }
      this.shouldStop = false; // 清理停止标志
    }
  }

  public stopFilling(): void {
    console.log("Setting stop flag for filling");
    this.shouldStop = true;
  }

  public async fillThisInput(): Promise<void> {
    if (this.urlMatchesBlockList()) {
      return;
    }
    console.log("# fillThisInput");

    try {
      await this.getPageOperator();
      const element = this.clickedElement || document.activeElement;

      if (element) {
        const tagName = element.tagName.toLowerCase();

        if (tagName === "input") {
          await this.handleInputElement(element as HTMLInputElement);
        } else if (tagName === "textarea") {
          await this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
        } else if (tagName === "select") {
          this.elementFiller.fillSelectElement(element as HTMLSelectElement);
        } else if ((element as HTMLElement).isContentEditable) {
          this.elementFiller.fillContentEditableElement(element as HTMLElement);
        }
      }
    } finally {
      if (this.pageOperator) {
        await this.pageOperator.destroy();
        this.pageOperator = null;
      }
      this.setClickedElement(undefined);
    }
  }

  public async fillThisForm(): Promise<void> {
    if (this.urlMatchesBlockList()) {
      return;
    }

    try {
      await this.getPageOperator();
      const element = this.clickedElement || document.activeElement;

      if (element && element.tagName.toLowerCase() !== "body") {
        const form = element.closest("form");

        if (form) {
          await this.fillAllElements(form);
        }
      }
    } finally {
      if (this.pageOperator) {
        await this.pageOperator.destroy();
        this.pageOperator = null;
      }
      this.setClickedElement(undefined);
    }
  }
}

export default FakeFiller;
