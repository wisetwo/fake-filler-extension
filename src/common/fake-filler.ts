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
      this.elementFiller.fillInputElement(element);
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
   * @returns 可填充的元素数组
   */
  public getFillableElements(container: Document | HTMLElement = document): Element[] {
    return [
      // 下拉框可能是readonly的，看能否优化 TODO
      ...Array.from(container.querySelectorAll("input:not(:disabled)")),
      ...Array.from(container.querySelectorAll("textarea:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("select:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("[contenteditable]")),
    ];
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
    `;
    document.head.appendChild(style);
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
          this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
        } else if (tagName === "select") {
          this.elementFiller.fillSelectElement(element as HTMLSelectElement);
        } else if ((element as HTMLElement).isContentEditable) {
          this.elementFiller.fillContentEditableElement(element as HTMLElement);
        }
      };

      // 串行处理所有元素
      await fillableElements.reduce(async (promise, element) => {
        await promise;
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
    try {
      await this.getPageOperator();
      await this.fillAllElements(document);
    } finally {
      if (this.pageOperator) {
        await this.pageOperator.destroy();
        this.pageOperator = null;
      }
    }
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
          this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
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
