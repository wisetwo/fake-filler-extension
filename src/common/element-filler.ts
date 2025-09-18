/* eslint-disable no-param-reassign */

import cssesc from "cssesc";
import moment from "moment";
import RandExp from "randexp";

import DataGenerator from "src/common/data-generator";
import { SanitizeText, DEFAULT_EMAIL_CUSTOM_FIELD, sleep } from "src/common/helpers";
import PageOperator from "src/common/page-operator";
import { IFakeFillerOptions, ICustomField, CustomFieldTypes } from "src/types";

export type FillableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

class ElementFiller {
  private generator: DataGenerator;
  private options: IFakeFillerOptions;
  private profileIndex: number;
  private pageOperator?: PageOperator;

  private previousValue: string;
  private previousPassword: string;
  private previousUsername: string;
  private previousFirstName: string;
  private previousLastName: string;

  constructor(options: IFakeFillerOptions, profileIndex = -1, pageOperator?: PageOperator) {
    this.options = options;
    this.profileIndex = profileIndex;
    this.generator = new DataGenerator();
    this.pageOperator = pageOperator;

    this.previousValue = "";
    this.previousPassword = "";
    this.previousUsername = "";
    this.previousFirstName = "";
    this.previousLastName = "";
  }

  public updatePageOperator(pageOperator: PageOperator): void {
    this.pageOperator = pageOperator;
  }

  // private fireEvents(element: FillableElement): void {
  //   ["input", "click", "change", "blur"].forEach((event) => {
  //     const changeEvent = new Event(event, { bubbles: true, cancelable: true });
  //     element.dispatchEvent(changeEvent);
  //   });
  // }

  /**
   * 获取元素在主文档中的准确坐标，考虑iframe等嵌套情况
   * @param element 目标元素
   * @returns 在主文档坐标系中的位置和尺寸
   */
  private getElementGlobalRect(element: Element): DOMRect {
    let rect = element.getBoundingClientRect();
    let currentWindow = element.ownerDocument?.defaultView;

    // 如果元素在iframe中，需要累加iframe的偏移
    while (currentWindow && currentWindow.parent !== currentWindow) {
      try {
        const { frameElement } = currentWindow;
        if (frameElement) {
          const frameRect = frameElement.getBoundingClientRect();
          const frameStyle = currentWindow.getComputedStyle(frameElement);

          // 获取iframe的边框和内边距
          const borderLeft = parseFloat(frameStyle.borderLeftWidth) || 0;
          const borderTop = parseFloat(frameStyle.borderTopWidth) || 0;
          const paddingLeft = parseFloat(frameStyle.paddingLeft) || 0;
          const paddingTop = parseFloat(frameStyle.paddingTop) || 0;

          // 累加iframe的位置偏移
          rect = new DOMRect(
            rect.left + frameRect.left + borderLeft + paddingLeft,
            rect.top + frameRect.top + borderTop + paddingTop,
            rect.width,
            rect.height
          );
        }
        currentWindow = currentWindow.parent as typeof window;
      } catch (error) {
        // 跨域iframe无法访问，跳出循环
        console.warn("Cross-origin iframe detected, cannot calculate accurate coordinates:", error);
        break;
      }
    }

    return rect;
  }

  /**
   * 获取元素中心点的全局坐标，优先考虑可见区域
   * @param element 目标元素
   * @returns {x, y} 全局坐标
   */
  private getElementCenterCoordinates(element: Element): { x: number; y: number } {
    const visibleRect = this.getElementVisibleRect(element);
    if (visibleRect && visibleRect.width > 0 && visibleRect.height > 0) {
      // 使用可见区域计算中心点
      return {
        x: visibleRect.left + visibleRect.width / 2,
        y: visibleRect.top + visibleRect.height / 2,
      };
    }

    // 回退机制1: 尝试找到可见区域内的最佳点击位置
    const bestVisiblePoint = this.findBestClickablePoint(element);
    if (bestVisiblePoint) {
      return bestVisiblePoint;
    }

    // 回退机制2: 使用原始方法
    const rect = this.getElementGlobalRect(element);
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  /**
   * 寻找元素内最佳的可点击位置
   * @param element 目标元素
   * @returns 最佳点击位置，如果找不到则返回null
   */
  private findBestClickablePoint(element: Element): { x: number; y: number } | null {
    const elementRect = this.getElementGlobalRect(element);

    // 将元素分为9个区域进行检测（3x3网格）
    const testPoints = [
      // 中心点
      { x: elementRect.left + elementRect.width / 2, y: elementRect.top + elementRect.height / 2 },
      // 四个角落的内侧一点
      { x: elementRect.left + elementRect.width * 0.25, y: elementRect.top + elementRect.height * 0.25 },
      { x: elementRect.left + elementRect.width * 0.75, y: elementRect.top + elementRect.height * 0.25 },
      { x: elementRect.left + elementRect.width * 0.25, y: elementRect.top + elementRect.height * 0.75 },
      { x: elementRect.left + elementRect.width * 0.75, y: elementRect.top + elementRect.height * 0.75 },
      // 边缘中点
      { x: elementRect.left + elementRect.width / 2, y: elementRect.top + elementRect.height * 0.25 },
      { x: elementRect.left + elementRect.width / 2, y: elementRect.top + elementRect.height * 0.75 },
      { x: elementRect.left + elementRect.width * 0.25, y: elementRect.top + elementRect.height / 2 },
      { x: elementRect.left + elementRect.width * 0.75, y: elementRect.top + elementRect.height / 2 },
    ];

    // 检测每个点是否在可见区域内
    for (const point of testPoints) {
      if (this.isPointVisible(point, element)) {
        return point;
      }
    }

    return null;
  }

  /**
   * 检查指定点是否在元素的可见区域内
   * @param point 要检查的点
   * @param element 元素
   * @returns 是否可见
   */
  private isPointVisible(point: { x: number; y: number }, element: Element): boolean {
    // 检查点是否在视窗内
    if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) {
      return false;
    }

    // 检查点是否被父容器遮挡
    let currentElement = element.parentElement;
    while (currentElement) {
      const computedStyle = window.getComputedStyle(currentElement);

      if (this.isClippingContainer(computedStyle)) {
        const containerRect = this.getElementGlobalRect(currentElement);

        if (
          point.x < containerRect.left ||
          point.x > containerRect.right ||
          point.y < containerRect.top ||
          point.y > containerRect.bottom
        ) {
          return false;
        }
      }

      currentElement = currentElement.parentElement;
    }

    return true;
  }

  /**
   * 获取元素的实际可见区域，考虑被父容器遮挡的情况
   * @param element 目标元素
   * @returns 可见区域的矩形信息，如果不可见则返回null
   */
  private getElementVisibleRect(element: Element): DOMRect | null {
    const elementRect = this.getElementGlobalRect(element);
    let visibleRect = {
      left: elementRect.left,
      top: elementRect.top,
      right: elementRect.right,
      bottom: elementRect.bottom,
      width: elementRect.width,
      height: elementRect.height,
    };

    // 检查所有可能遮挡元素的父容器
    let currentElement = element.parentElement;
    while (currentElement) {
      const computedStyle = window.getComputedStyle(currentElement);

      // 检查是否是滚动容器或具有overflow裁剪的容器
      if (this.isClippingContainer(computedStyle)) {
        const containerRect = this.getElementGlobalRect(currentElement);

        // 计算与容器的交集
        const intersection = this.getIntersection(visibleRect, containerRect);
        if (!intersection) {
          // 完全被遮挡
          return null;
        }

        visibleRect = intersection;
      }

      currentElement = currentElement.parentElement;
    }

    // 还需要检查视窗边界
    const viewportRect = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const finalIntersection = this.getIntersection(visibleRect, viewportRect);
    if (!finalIntersection || finalIntersection.width <= 0 || finalIntersection.height <= 0) {
      return null;
    }

    return new DOMRect(
      finalIntersection.left,
      finalIntersection.top,
      finalIntersection.width,
      finalIntersection.height
    );
  }

  /**
   * 检查容器是否具有裁剪效果
   * @param computedStyle 容器的计算样式
   * @returns 是否是裁剪容器
   */
  private isClippingContainer(computedStyle: CSSStyleDeclaration): boolean {
    const { overflow, overflowX, overflowY } = computedStyle;

    // 检查是否有裁剪效果的overflow值
    const clippingValues = ["hidden", "scroll", "auto"];

    return (
      clippingValues.includes(overflow) || clippingValues.includes(overflowX) || clippingValues.includes(overflowY)
    );
  }

  /**
   * 计算两个矩形的交集
   * @param rect1 矩形1
   * @param rect2 矩形2
   * @returns 交集矩形，如果没有交集则返回null
   */
  private getIntersection(rect1: any, rect2: any): any | null {
    const left = Math.max(rect1.left, rect2.left);
    const top = Math.max(rect1.top, rect2.top);
    const right = Math.min(rect1.right, rect2.right);
    const bottom = Math.min(rect1.bottom, rect2.bottom);

    if (left >= right || top >= bottom) {
      return null; // 没有交集
    }

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  /**
   * 使用PageOperator进行真实的用户输入操作，更适合现代框架
   * @param element 目标元素
   * @param value 要输入的值
   * @returns Promise<boolean> 是否成功使用PageOperator输入
   */
  private async fillElementWithPageOperator(element: FillableElement, value: string): Promise<boolean> {
    if (!this.pageOperator || value === undefined || value === null) {
      return false;
    }

    try {
      await this.simulateClick(element);
      await sleep(100); // 等待焦点设置

      // 清空现有内容并输入新值
      await this.pageOperator.clearAndType(value, element);
      await sleep(100); // 等待输入完成

      return true;
    } catch (error) {
      console.warn("PageOperator input failed, will fallback to direct assignment:", error);
      return false;
    }
  }

  /**
   * 使用PageOperator进行真实的checkbox点击操作
   * @param element checkbox元素
   * @param shouldCheck 是否应该选中
   * @returns Promise<boolean> 是否成功使用PageOperator点击
   */
  private async clickCheckboxWithPageOperator(element: HTMLInputElement, shouldCheck: boolean): Promise<boolean> {
    if (!this.pageOperator) {
      return false;
    }

    try {
      const currentlyChecked = element.checked;

      // 如果当前状态已经是目标状态，不需要点击
      if (currentlyChecked === shouldCheck) {
        return true;
      }

      // 点击checkbox来切换状态，使用准确的全局坐标
      await this.simulateClick(element);
      await sleep(100); // 等待状态更新

      // 验证状态是否正确更新
      return element.checked === shouldCheck;
    } catch (error) {
      console.warn("PageOperator checkbox click failed, will fallback to direct assignment:", error);
      return false;
    }
  }

  /**
   * 检查元素值是否设置成功
   * @param element 输入元素
   * @param expectedValue 期望设置的值
   * @param currentValue 当前元素的值
   * @param originalValue 设置前的原始值
   * @returns 是否设置成功
   */
  private isValueSetSuccessfully(
    element: HTMLInputElement | HTMLTextAreaElement,
    expectedValue: string,
    currentValue: string,
    originalValue: string
  ): boolean {
    // 如果值有变化，认为设置成功（浏览器可能做了格式化）
    if (currentValue !== originalValue) {
      return true;
    }

    // 如果无变化，检查转字符串后是否等于设置的参数值
    if (currentValue === expectedValue) {
      return true;
    }

    // 对于number类型，还需要考虑数值相等的情况
    const inputElement = element as HTMLInputElement;
    const elementType = inputElement.type ? inputElement.type.toLowerCase() : "text";

    if (elementType === "number" || elementType === "range") {
      const expectedNum = parseFloat(expectedValue);
      const currentNum = parseFloat(currentValue);

      if (!isNaN(expectedNum) && !isNaN(currentNum)) {
        return Math.abs(expectedNum - currentNum) < Number.EPSILON;
      }
    }

    return false;
  }

  /**
   * 统一的元素值设置方法，优先使用PageOperator，失败时回退到直接赋值
   * @param element 目标元素
   * @param value 要设置的值
   * @param fallback 可选的回调函数，当设置值失败时执行
   */
  private async setElementValue(
    element: FillableElement,
    value: string,
    fallback?: () => Promise<void>
  ): Promise<void> {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    const originalValue = inputElement.value;

    // 尝试使用PageOperator进行真实用户输入
    const pageOperatorSuccess = await this.fillElementWithPageOperator(element, value);

    if (pageOperatorSuccess) {
      // 即使PageOperator返回成功，也要验证值是否真的设置成功
      if (!this.isValueSetSuccessfully(inputElement, value, inputElement.value, originalValue) && fallback) {
        // 如果PageOperator执行成功但值没有正确设置，说明浏览器拒绝了这个值
        // 恢复原值并执行fallback
        inputElement.value = originalValue;
        if (fallback) {
          await fallback();
        }
      }
    } else {
      // 回退到直接赋值方式
      try {
        inputElement.value = value;
        // 检查设置是否成功（例如，对于number类型的input，设置非数字值会失败）
        if (!this.isValueSetSuccessfully(inputElement, value, inputElement.value, originalValue) && fallback) {
          // 如果设置失败且有fallback，则执行fallback
          inputElement.value = originalValue; // 恢复原值
          if (fallback) {
            await fallback();
          }
        }
      } catch (error) {
        // 如果设置过程中出错且有fallback，则执行fallback
        inputElement.value = originalValue; // 恢复原值
        if (fallback) {
          await fallback();
          return;
        }
        throw error;
      }
    }
  }

  private async simulateClick(element: HTMLElement, x?: number, y?: number): Promise<void> {
    console.log("-simulateClick-", element, x, y, new Date().toISOString());
    if (this.pageOperator) {
      let finalX: number;
      let finalY: number;

      if (x !== undefined && y !== undefined) {
        finalX = x;
        finalY = y;
      } else {
        const coordinates = this.getElementCenterCoordinates(element);
        finalX = coordinates.x;
        finalY = coordinates.y;
      }

      try {
        await this.pageOperator.click(finalX, finalY);
      } catch (error) {
        console.error("Failed to click using page operator, falling back to events", error);
        element.click();
      }
    } else {
      element.click();
    }
  }

  // private async clickElement(element: HTMLElement): Promise<void> {
  //   if (this.chromeDebugger) {
  //     try {
  //       const rect = element.getBoundingClientRect();
  //       await this.chromeDebugger.attachDebugger();
  //       await this.chromeDebugger.click(rect.left + rect.width / 2, rect.top + rect.height / 2);
  //     } catch (error) {
  //       console.error("Failed to click using debugger, falling back to events", error);
  //       element.click();
  //     }
  //   } else {
  //     element.click();
  //   }
  // }

  public async clickAtBlankArea(element: HTMLElement): Promise<void> {
    const safePosition = this.findSafeClickPositionAroundElement(element);
    if (safePosition) {
      console.log("Found safe click position:", safePosition);
      await sleep(200);
      await this.simulateClick(document.body, safePosition.x, safePosition.y);
      await sleep(200);
    } else {
      console.warn("No safe position found");
    }
  }

  /**
   * 在元素周围寻找安全的点击位置
   * 按照上、右、下、左的顺序，从元素边界外10px开始递增到500px搜索
   */
  private findSafeClickPositionAroundElement(element: HTMLElement): { x: number; y: number } | null {
    const rect = this.getElementGlobalRect(element);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 从10px开始，递增到500px（这个距离是从元素边界外开始计算的）
    for (let distance = 10; distance <= 500; distance += 10) {
      // 搜索四个方向：上、右、下、左
      // 每个方向都从元素边界外开始搜索
      const directions = [
        { x: centerX, y: rect.top - distance }, // 上：从元素上边界外开始
        { x: rect.right + distance, y: centerY }, // 右：从元素右边界外开始
        { x: centerX, y: rect.bottom + distance }, // 下：从元素下边界外开始
        { x: rect.left - distance, y: centerY }, // 左：从元素左边界外开始
      ];

      for (const position of directions) {
        if (this.isPositionSafe(position)) {
          return position;
        }
      }
    }

    return null;
  }

  /**
   * 检查指定位置是否安全（没有可交互元素）
   */
  private isPositionSafe(position: { x: number; y: number }): boolean {
    // 检查是否在视窗内
    if (position.x < 0 || position.x > window.innerWidth || position.y < 0 || position.y > window.innerHeight) {
      return false;
    }

    // 获取该位置的元素
    const elementAtPoint = document.elementFromPoint(position.x, position.y);
    if (!elementAtPoint) return false;

    // 检查是否是安全的容器元素（body、html、main、container等）
    const tagName = elementAtPoint.tagName.toLowerCase();
    const isContainer =
      elementAtPoint === document.body ||
      elementAtPoint === document.documentElement ||
      tagName === "main" ||
      tagName === "div" ||
      tagName === "section" ||
      tagName === "article";

    if (!isContainer) {
      return false;
    }

    // 检查该元素是否有交互行为
    return !this.hasInteractiveBehavior(elementAtPoint);
  }

  /**
   * 检查元素是否有交互行为
   */
  private hasInteractiveBehavior(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();

    // 检查标签类型
    const interactiveTags = ["a", "button", "input", "select", "textarea", "label"];
    if (interactiveTags.includes(tagName)) {
      return true;
    }

    // 检查属性
    if (
      element.hasAttribute("onclick") ||
      element.hasAttribute("href") ||
      element.hasAttribute("data-toggle") ||
      element.hasAttribute("data-bs-toggle")
    ) {
      return true;
    }

    // 检查角色
    const role = element.getAttribute("role");
    if (role && ["button", "link", "menuitem", "tab", "option"].includes(role)) {
      return true;
    }

    // 检查样式
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.cursor === "pointer") {
      return true;
    }

    // 检查常见的交互类名
    const interactiveClasses = ["btn", "button", "link", "clickable", "menu", "dropdown"];
    for (const className of interactiveClasses) {
      if (element.classList.contains(className)) {
        return true;
      }
    }

    return false;
  }

  private async waitForElementWithData(
    selectorList: string[],
    dataCheckFn: (element: Element) => boolean,
    timeout = 4000
  ): Promise<Element | null> {
    console.log("waitForElementWithData: starting, selectorList:", selectorList);
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        console.log("waitForElementWithData: interval => ", new Date().toISOString());
        if (Date.now() - startTime >= timeout) {
          clearInterval(interval);
          console.log(`waitForElementWithData: timeout for ${timeout} ms`);
          resolve(null);
        }

        let activeElement: Element | null = null;
        for (let i = 0; i < selectorList.length; i += 1) {
          const selector = selectorList[i];
          console.log("visibleElementList.selector——> ", selector);
          const elementList = document.querySelectorAll(`.${selector}`);
          const visibleElementList = Array.from(elementList).filter((element) =>
            this.isElementVisible(element as FillableElement)
          );
          if (visibleElementList.length > 1) {
            console.warn("visibleElementList > 1, ", visibleElementList);
          }
          // console.log("visibleElementList——> ", visibleElementList);
          console.log(
            "visibleElementList.innerTextList——> ",
            Array.from(visibleElementList).map((el) => (el as HTMLElement).innerText)
          );
          if (visibleElementList.length > 0) {
            // 这里选择了第一个
            [activeElement] = visibleElementList;
            break;
          }
        }

        if (activeElement && dataCheckFn(activeElement)) {
          clearInterval(interval);
          console.log("waitForElementWithData: found element", activeElement);
          resolve(activeElement);
        }
      }, 800);
    });
  }

  /**
   * 生成随机字母 (a-z)
   */
  private generateRandomLetter(): string {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    return letters[Math.floor(Math.random() * letters.length)];
  }

  /**
   * 尝试触发下拉框并等待有数据的下拉框出现
   * @param element 输入框元素
   * @param dropdownClassList 下拉框的类名列表
   * @param dropdownOptionClassList 下拉框选项的类名列表
   * @param shouldInputChar 是否需要先输入字符才能触发数据
   * @returns 下拉框元素或null
   */
  private async tryTriggerDropdownWithData(
    element: HTMLInputElement,
    dropdownClassList: string[],
    dropdownOptionClassList: string[],
    shouldInputChar = false
  ): Promise<Element | null> {
    console.log("#tryTriggerDropdownWithData#");
    try {
      // 如果需要输入字符，先清空并输入随机字母
      if (shouldInputChar) {
        const randomLetter = this.generateRandomLetter();
        console.log(`输入随机字母触发搜索: ${randomLetter}`);
        await this.setElementValue(element, randomLetter);
        // 给一点时间让输入事件生效
        await sleep(200);
      } else {
        // 点击输入框触发下拉框
        await this.simulateClick(element);
        await sleep(200);
      }
    } catch (error) {
      console.error("Failed to click using page operator, falling back to events", error);
      element.click();
    }

    // 等待下拉框出现并且有数据
    const dropdownElement = await this.waitForElementWithData(dropdownClassList, (el) => {
      // 检查是否有选项数据
      const hasOptions = dropdownOptionClassList.some(
        (optionClass) => el.querySelectorAll(`.${optionClass}:not(.disabled)`).length > 0
      );
      console.log("check dropdown data:", hasOptions);
      return hasOptions;
    });

    return dropdownElement;
  }

  public async fillWrapedDropdownElement(
    inputElement: HTMLInputElement,
    elementType: "date-picker" | "cascader" | "select",
    isMultiSelect: boolean,
    dropdownClassList: string[],
    dropdownOptionClassList: string[],
    dropdownOptionClassLeafList?: string[],
    dropdownOptionExpandedClassList?: string[],
    dropdownCheckboxInputClassList?: string[],
    dropdownCheckboxDisplayClassList?: string[]
  ): Promise<void> {
    console.log("fillWrapedDropdownElement", inputElement, isMultiSelect, dropdownClassList);
    if (this.shouldIgnoreElement(inputElement)) {
      console.log("element ignored");
      return;
    }

    // 先尝试直接点击触发下拉框
    console.log("尝试直接点击触发下拉框");
    let dropdownElement = await this.tryTriggerDropdownWithData(
      inputElement,
      dropdownClassList,
      dropdownOptionClassList,
      false
    );

    let triedInputChar = false;

    // 如果没有数据，尝试输入随机字母触发搜索
    if (elementType === "select" && !dropdownElement && !inputElement.disabled) {
      console.log("直接点击未找到数据，尝试输入随机字母触发搜索");
      dropdownElement = await this.tryTriggerDropdownWithData(
        inputElement,
        dropdownClassList,
        dropdownOptionClassList,
        true
      );
      triedInputChar = true;
    }

    console.log("dropdownElement", dropdownElement);
    if (!dropdownElement) {
      if (triedInputChar) {
        await this.setElementValue(inputElement, "");
        await sleep(200);
      }
      console.warn("dropdownElement not found after both attempts");
      await this.clickAtBlankArea(inputElement);
      await sleep(200);
      return;
    }

    // 针对cascader类型的特殊处理
    if (elementType === "cascader") {
      await this.fillCascaderElement(
        dropdownElement,
        isMultiSelect,
        dropdownOptionClassList,
        dropdownOptionClassLeafList || [],
        dropdownOptionExpandedClassList || [],
        dropdownCheckboxInputClassList || [],
        dropdownCheckboxDisplayClassList || []
      );
      return;
    }

    // 原有的通用下拉框处理逻辑（date-picker和select）
    // 尝试使用不同的类名查找选项
    const options = dropdownOptionClassList.reduce<Element[]>((foundOptions, optionClass) => {
      // 已经找到，不会处理后面的类名（同一个列表不会重复插入）
      if (foundOptions.length > 0) {
        return foundOptions;
      }
      if (dropdownElement) {
        const newOptions = Array.from(dropdownElement.querySelectorAll(`.${optionClass}:not(.disabled)`));
        console.log(`try to find options with ${optionClass}:`, newOptions);
        return newOptions;
      }
      return foundOptions;
    }, []);
    const visibleOptions = options.filter((option) => this.isElementVisible(option as FillableElement));

    if (visibleOptions.length === 0) {
      console.log("no visible options");
      return;
    }

    if (isMultiSelect) {
      // 多选模式：随机选择1-3个选项
      const numberOfOptionsToSelect = this.generator.randomNumber(1, Math.min(3, visibleOptions.length));
      console.log("numberOfOptionsToSelect->", numberOfOptionsToSelect);

      // 生成不重复的随机索引数组
      const selectedIndices: number[] = [];
      const availableIndices = Array.from({ length: visibleOptions.length }, (_, i) => i);

      // 随机打乱数组并取前 numberOfOptionsToSelect 个
      for (let i = availableIndices.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
      }
      selectedIndices.push(...availableIndices.slice(0, numberOfOptionsToSelect));

      console.log("selectedIndices->", selectedIndices);

      // 依次点击选中的选项
      for (let i = 0; i < selectedIndices.length; i += 1) {
        const optionIndex = selectedIndices[i];
        const option = visibleOptions[optionIndex] as HTMLElement;
        console.log(`clicking option ${i + 1}/${selectedIndices.length}, index: ${optionIndex}`);

        await sleep(200);
        await this.simulateClick(option);
        await sleep(200);
        // 关闭
        await this.clickAtBlankArea(inputElement);
        await sleep(200);
        // 再次打开（如果不是最后一个选项）
        if (i < selectedIndices.length - 1) {
          await this.simulateClick(inputElement);
        }
      }
      // selected = true;
    } else {
      // 单选模式：随机选择一个选项
      const randomIndex = this.generator.randomNumber(0, visibleOptions.length - 1);
      const option = visibleOptions[randomIndex] as HTMLElement;
      await sleep(50);
      try {
        await this.simulateClick(option);
      } catch (error) {
        console.error("Failed to click using page operator, falling back to events", error);
        option.click();
      }
    }
  }

  /**
   * 专门处理cascader组件的选择逻辑
   * @param dropdownElement 下拉框元素
   * @param isMultiSelect 是否多选模式
   * @param dropdownOptionClassList 选项类名列表
   * @param dropdownOptionClassLeafList 叶子节点类名列表
   * @param dropdownOptionExpandedClassList 已展开节点类名列表
   * @param dropdownCheckboxInputClassList checkbox input类名列表
   * @param dropdownCheckboxDisplayClassList checkbox可见显示元素类名列表
   */
  private async fillCascaderElement(
    dropdownElement: Element,
    isMultiSelect: boolean,
    dropdownOptionClassList: string[],
    dropdownOptionClassLeafList: string[],
    dropdownOptionExpandedClassList: string[],
    dropdownCheckboxInputClassList: string[],
    dropdownCheckboxDisplayClassList: string[]
  ): Promise<void> {
    console.log("fillCascaderElement - 开始处理cascader", { isMultiSelect });

    if (isMultiSelect) {
      // 多选模式：查找所有带checkbox的选项并随机选择
      await this.fillCascaderMultiSelect(
        dropdownElement,
        dropdownCheckboxInputClassList,
        dropdownCheckboxDisplayClassList
      );
    } else {
      // 单选模式：递归展开直到找到叶子节点
      await this.fillCascaderSingleSelect(
        dropdownElement,
        dropdownOptionClassList,
        dropdownOptionClassLeafList,
        dropdownOptionExpandedClassList
      );
    }
  }

  /**
   * 处理cascader多选模式
   * @param dropdownElement 下拉框元素
   * @param dropdownCheckboxInputClassList checkbox input类名列表
   * @param dropdownCheckboxDisplayClassList checkbox可见显示元素类名列表
   */
  private async fillCascaderMultiSelect(
    dropdownElement: Element,
    dropdownCheckboxInputClassList: string[],
    dropdownCheckboxDisplayClassList: string[]
  ): Promise<void> {
    console.log("fillCascaderMultiSelect - 处理多选模式");

    // 查找所有checkbox input元素
    const checkboxInputs = dropdownCheckboxInputClassList.reduce<Element[]>((foundInputs, inputClass) => {
      if (foundInputs.length > 0) {
        return foundInputs;
      }
      const newInputs = Array.from(dropdownElement.querySelectorAll(`.${inputClass}`));
      console.log(`找到checkbox input (${inputClass}):`, newInputs);
      return newInputs;
    }, []);

    if (checkboxInputs.length === 0) {
      console.log("未找到checkbox输入框");
      return;
    }

    // 为每个checkbox input查找对应的可见显示元素
    const checkboxPairs: Array<{ input: HTMLInputElement; display: HTMLElement }> = [];

    for (const input of checkboxInputs) {
      const inputElement = input as HTMLInputElement;

      // 查找对应的可见显示元素
      let displayElement: HTMLElement | null = null;

      // 策略1：查找同级的下一个兄弟元素
      for (const displayClass of dropdownCheckboxDisplayClassList) {
        const nextSibling = inputElement.nextElementSibling;
        if (nextSibling && nextSibling.classList.contains(displayClass)) {
          displayElement = nextSibling as HTMLElement;
          break;
        }

        // 策略2：在父元素内查找
        const parent = inputElement.parentElement;
        if (parent) {
          const displayInParent = parent.querySelector(`.${displayClass}`);
          if (displayInParent) {
            displayElement = displayInParent as HTMLElement;
            break;
          }
        }
      }

      if (displayElement && this.isElementVisible(displayElement as FillableElement)) {
        checkboxPairs.push({ input: inputElement, display: displayElement });
        console.log(`找到checkbox对应关系:`, { input: inputElement, display: displayElement });
      }
    }

    if (checkboxPairs.length === 0) {
      console.log("未找到可见的checkbox显示元素");
      return;
    }

    // 随机选择1-3个checkbox进行勾选
    const numberOfOptionsToSelect = this.generator.randomNumber(1, Math.min(3, checkboxPairs.length));
    console.log(`随机选择 ${numberOfOptionsToSelect} 个选项进行勾选`);

    // 生成不重复的随机索引
    const selectedIndices: number[] = [];
    const availableIndices = Array.from({ length: checkboxPairs.length }, (_, i) => i);

    for (let i = availableIndices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }
    selectedIndices.push(...availableIndices.slice(0, numberOfOptionsToSelect));

    // 依次点击选中的checkbox显示元素
    for (let i = 0; i < selectedIndices.length; i += 1) {
      const optionIndex = selectedIndices[i];
      const { input, display } = checkboxPairs[optionIndex];

      console.log(`点击第 ${i + 1}/${selectedIndices.length} 个checkbox显示元素，索引: ${optionIndex}`);

      await sleep(200);

      // 点击可见的显示元素
      try {
        await this.simulateClick(display);
        console.log("成功点击checkbox显示元素");

        // 验证input状态是否发生变化
        await sleep(100);
        console.log(`Checkbox状态: ${input.checked ? "已选中" : "未选中"}`);
      } catch (error) {
        console.error("点击checkbox显示元素失败, 尝试直接设置input状态:", error);

        // 回退策略：直接设置input状态
        input.checked = true;
        console.log("使用直接设置方式勾选checkbox");
      }

      await sleep(200);
    }
  }

  /**
   * 处理cascader单选模式
   * @param dropdownElement 下拉框元素
   * @param dropdownOptionClassList 选项类名列表
   * @param dropdownOptionClassLeafList 叶子节点类名列表
   * @param dropdownOptionExpandedClassList 已展开节点类名列表
   */
  private async fillCascaderSingleSelect(
    dropdownElement: Element,
    dropdownOptionClassList: string[],
    dropdownOptionClassLeafList: string[],
    dropdownOptionExpandedClassList: string[]
  ): Promise<void> {
    console.log("fillCascaderSingleSelect - 处理单选模式");

    const maxDepth = 5; // 最大递归深度，防止无限循环
    let currentDepth = 0;

    while (currentDepth < maxDepth) {
      currentDepth += 1;
      console.log(`第 ${currentDepth} 层级处理`);

      // 查找当前可见的叶子节点
      const leafOptions = dropdownOptionClassLeafList.reduce<Element[]>((foundLeafs, leafClass) => {
        if (foundLeafs.length > 0) {
          return foundLeafs;
        }
        const newLeafs = Array.from(dropdownElement.querySelectorAll(`.${leafClass}`));
        console.log(`找到叶子节点 (${leafClass}):`, newLeafs);
        return newLeafs;
      }, []);

      const visibleLeafOptions = leafOptions.filter((option) => this.isElementVisible(option as FillableElement));

      if (visibleLeafOptions.length > 0) {
        // 找到叶子节点，随机选择一个并点击
        const randomIndex = this.generator.randomNumber(0, visibleLeafOptions.length - 1);
        const leafOption = visibleLeafOptions[randomIndex] as HTMLElement;

        console.log(`找到叶子节点，点击完成选择:`, leafOption);

        await sleep(200);
        await this.simulateClick(leafOption);
        await sleep(200);

        return; // 完成选择，退出
      }

      // 没有找到叶子节点，寻找可展开的非叶子节点
      const allOptions = dropdownOptionClassList.reduce<Element[]>((foundOptions, optionClass) => {
        if (foundOptions.length > 0) {
          return foundOptions;
        }
        const newOptions = Array.from(dropdownElement.querySelectorAll(`.${optionClass}`));
        return newOptions;
      }, []);

      // 过滤出未展开的、可见的、非叶子节点
      const expandableOptions = allOptions.filter((option) => {
        // 检查是否是叶子节点
        const isLeaf = dropdownOptionClassLeafList.some((leafClass) => option.classList.contains(leafClass));

        // 检查是否已展开
        const isExpanded = dropdownOptionExpandedClassList.some((expandedClass) =>
          option.classList.contains(expandedClass)
        );

        // 检查是否可见
        const isVisible = this.isElementVisible(option as FillableElement);

        return !isLeaf && !isExpanded && isVisible;
      });

      console.log(`找到可展开的选项:`, expandableOptions);

      if (expandableOptions.length === 0) {
        console.log("没有找到可展开的选项，选择结束");
        break;
      }

      // 随机选择一个可展开的选项进行点击
      const randomIndex = this.generator.randomNumber(0, expandableOptions.length - 1);
      const optionToExpand = expandableOptions[randomIndex] as HTMLElement;

      console.log(`点击展开选项:`, optionToExpand);

      await sleep(200);
      await this.simulateClick(optionToExpand);
      await sleep(500); // 等待展开动画完成

      // 重新获取更新后的dropdown元素（因为DOM可能已更新）
      // 这里简化处理，实际可能需要重新查找dropdown元素
    }

    console.log("cascader单选处理完成");
  }

  private isAnyMatch(haystacks: string[], needles: string[]): boolean {
    // console.log("#isAnyMatch#");
    // console.log("haystacks:", haystacks, "needles:", needles);

    for (let i = 0, haystackCount = haystacks.length; i < haystackCount; i += 1) {
      const haystack = haystacks[i];
      for (let j = 0, needleCount = needles.length; j < needleCount; j += 1) {
        const needle = needles[j];

        // 检查是否是正则表达式格式 (以 / 开头和结尾，可能带标志)
        const regexMatch = needle.match(/^\/(.+?)\/([igmu]*)$/);

        if (regexMatch) {
          // 解析正则表达式
          const [, pattern, flags] = regexMatch;
          try {
            const regex = new RegExp(pattern, flags || "iu");
            console.log("Using strict regex:", pattern, "with flags:", flags || "iu", "testing:", haystack);
            if (regex.test(haystack)) {
              console.log("Strict regex match found!");
              return true;
            }
          } catch (error) {
            console.warn("Invalid regex pattern:", needle, error);
            // 如果正则表达式无效，回退到普通匹配
            if (new RegExp(needle, "iu").test(haystack)) {
              console.log("Fallback regex match found!");
              return true;
            }
          }
        } else if (new RegExp(needle, "iu").test(haystack)) {
          // 普通匹配模式
          console.log("Normal regex match found!");
          return true;
        }
      }
    }
    return false;
  }

  public isElementVisible(element: FillableElement): boolean {
    // 检查基本尺寸
    if (!element.offsetHeight && !element.offsetWidth) {
      return false;
    }

    // 检查 CSS 样式
    const computedStyle = window.getComputedStyle(element);
    // tdesgin 的 input 元素 opacity 为 0
    // || computedStyle.opacity === "0"
    if (computedStyle.visibility === "hidden" || computedStyle.display === "none") {
      return false;
    }

    // 使用 getBoundingClientRect 检查元素是否真正可见
    const rect = element.getBoundingClientRect();

    // 检查元素是否有实际的尺寸，都为0才不可见
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    // 检查元素是否在视口内
    // const isInViewport =
    //   rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;

    // if (!isInViewport) {
    //   return false;
    // }

    // 检查元素是否被滚动容器裁剪
    // 遍历所有父级元素，检查是否有滚动容器裁剪了当前元素
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentStyle = window.getComputedStyle(parent);
      const hasOverflow =
        parentStyle.overflow !== "visible" ||
        parentStyle.overflowX !== "visible" ||
        parentStyle.overflowY !== "visible";

      if (hasOverflow) {
        const parentRect = parent.getBoundingClientRect();
        // 检查元素是否被父级滚动容器完全裁剪
        const isClippedByParent =
          rect.bottom <= parentRect.top ||
          rect.top >= parentRect.bottom ||
          rect.right <= parentRect.left ||
          rect.left >= parentRect.right;

        if (isClippedByParent) {
          console.log("element clipped by scroll container");
          return false;
        }
      }
      parent = parent.parentElement;
    }

    console.log("element visibility -> visible");
    return true;
  }

  private shouldIgnoreElement(element: FillableElement): boolean {
    if (["button", "submit", "reset", "image"].indexOf(element.type) > -1) {
      return true;
    }
    console.log("shouldIgnoreElement");
    // Ignore any invisible elements.
    if (this.options.ignoreHiddenFields && !this.isElementVisible(element)) {
      return true;
    }
    const elementName = this.getElementName(element);

    // Check if element matches a custom field with type "ignored"
    const ignoredCustomField = this.findCustomField(elementName, ["ignored"]);
    if (ignoredCustomField) {
      return true;
    }

    // Ignore any elements that match an item in the the "ignoredFields" array.
    if (this.isAnyMatch(elementName, this.options.ignoredFields)) {
      return true;
    }

    if (this.options.ignoreFieldsWithContent) {
      // A radio button list will be ignored if it has been selected previously.
      if (element.type === "radio") {
        if (document.querySelectorAll(`input[name="${element.name}"]:checked`).length > 0) {
          return true;
        }
      }

      // All elements excluding radio buttons and check boxes will be ignored if they have a value.
      if (element.type !== "checkbox" && element.type !== "radio") {
        const elementValue = element.value;
        if (elementValue && elementValue.trim().length > 0) {
          return true;
        }
      }
    }

    // If all above checks have failed, we do not need to ignore this element.
    return false;
  }

  private async selectRandomRadio(name: string, valuesList: string[] = []): Promise<void> {
    const list = [];
    const elements = document.getElementsByName(name) as NodeListOf<HTMLInputElement>;

    for (let i = 0; i < elements.length; i += 1) {
      if (elements[i].type === "radio" && (valuesList.length === 0 || valuesList.includes(elements[i].value))) {
        list.push(elements[i]);
      }
    }

    if (list.length === 0) return;

    const radioElement = list[Math.floor(Math.random() * list.length)];

    // 尝试使用PageOperator进行真实点击
    const clickSuccess = await this.clickRadioWithPageOperator(radioElement);

    if (!clickSuccess) {
      // 回退到直接设置属性
      radioElement.checked = true;
      // this.fireEvents(radioElement);
    }
  }

  /**
   * 使用PageOperator进行真实的radio按钮点击操作
   * @param element radio元素
   * @returns Promise<boolean> 是否成功使用PageOperator点击
   */
  private async clickRadioWithPageOperator(element: HTMLInputElement): Promise<boolean> {
    if (!this.pageOperator) {
      return false;
    }

    try {
      // 点击radio按钮，使用准确的全局坐标
      await this.simulateClick(element);
      await sleep(100); // 等待状态更新

      // 验证是否选中
      return element.checked;
    } catch (error) {
      console.warn("PageOperator radio click failed, will fallback to direct assignment:", error);
      return false;
    }
  }

  private findCustomFieldFromList(
    fields: ICustomField[],
    elementNames: string[],
    matchTypes: CustomFieldTypes[] = []
  ): ICustomField | undefined {
    const doMatchType = matchTypes.length > 0;

    for (let i = 0; i < fields.length; i += 1) {
      if (this.isAnyMatch(elementNames, fields[i].match)) {
        if (doMatchType) {
          for (let j = 0; j < matchTypes.length; j += 1) {
            if (fields[i].type === matchTypes[j]) {
              return fields[i];
            }
          }
        } else {
          return fields[i];
        }
      }
    }

    return undefined;
  }

  private findCustomField(elementNames: string[], matchTypes: CustomFieldTypes[] = []): ICustomField | undefined {
    let foundField: ICustomField | undefined;

    // Try finding the custom field from a profile if available.
    if (this.profileIndex > -1) {
      foundField = this.findCustomFieldFromList(
        this.options.profiles[this.profileIndex].fields,
        elementNames,
        matchTypes
      );
    }

    // If a custom field could not be found from the profile, try getting one from the default list.
    if (!foundField) {
      foundField = this.findCustomFieldFromList(this.options.fields, elementNames, matchTypes);
    }

    return foundField;
  }

  private NormalizeTextForElementName(text: string): string {
    const sanitizedText = SanitizeText(text);

    if (sanitizedText === text) {
      return sanitizedText;
    }

    return `${sanitizedText} ${text}`;
  }

  private getElementName(element: FillableElement): string[] {
    let normalizedNames: string[] = [];

    if (this.options.fieldMatchSettings.matchName) {
      const name = this.NormalizeTextForElementName(element.name);
      normalizedNames.push(name.trim());
    }

    if (this.options.fieldMatchSettings.matchId) {
      const id = this.NormalizeTextForElementName(element.id);
      normalizedNames.push(id.trim());
    }

    if (this.options.fieldMatchSettings.matchClass) {
      const className = this.NormalizeTextForElementName(element.className);
      normalizedNames.push(className.trim());
    }

    if (this.options.fieldMatchSettings.matchPlaceholder) {
      const placeholder = this.NormalizeTextForElementName(element.getAttribute("placeholder") || "");
      normalizedNames.push(placeholder.trim());
    }

    if (
      this.options.fieldMatchSettings.customAttributes &&
      this.options.fieldMatchSettings.customAttributes.length > 0
    ) {
      this.options.fieldMatchSettings.customAttributes.forEach((customAttribute) => {
        const attributeValue = this.NormalizeTextForElementName(element.getAttribute(customAttribute) || "");
        normalizedNames.push(attributeValue.trim());
      });
    }

    if (this.options.fieldMatchSettings.matchLabel) {
      const normalizedId = cssesc(element.id);
      const labels = document.querySelectorAll(`label[for='${normalizedId}']`);
      for (let i = 0; i < labels.length; i += 1) {
        const labelText = this.NormalizeTextForElementName(labels[i].innerHTML);
        normalizedNames.push(labelText.trim());
      }
    }

    if (this.options.fieldMatchSettings.matchAriaLabel) {
      const ariaLabel = this.NormalizeTextForElementName(element.getAttribute("aria-label") || "");
      normalizedNames.push(ariaLabel.trim());
    }

    if (this.options.fieldMatchSettings.matchAriaLabelledBy) {
      const labelIds = (element.getAttribute("aria-labelledby") || "").split(" ");
      for (let i = 0; i < labelIds.length; i += 1) {
        const labelElement = document.getElementById(labelIds[i]);
        if (labelElement) {
          const labelText = this.NormalizeTextForElementName(labelElement.innerHTML || "");
          normalizedNames.push(labelText.trim());
        }
      }
    }
    normalizedNames = normalizedNames.filter((name) => name !== "");
    console.log("normalizedNames->", normalizedNames);
    return normalizedNames;
  }

  private getElementMaxLength(element: HTMLInputElement | HTMLTextAreaElement | undefined): number {
    if (element && element.maxLength && element.maxLength > 0) {
      return element.maxLength;
    }
    return this.options.defaultMaxLength;
  }

  private getElementMinLength(element: HTMLInputElement | HTMLTextAreaElement | undefined): number {
    if (element && element.minLength && element.minLength > 0) {
      return element.minLength;
    }
    return 0;
  }

  private logAndReturn(value: string, type: string): string {
    console.log(`generateDummyDataForCustomField return (${type}):`, value);
    return value;
  }

  private generateDummyDataForCustomField(
    customField: ICustomField | undefined,
    element: HTMLInputElement | HTMLTextAreaElement | undefined = undefined
  ): string {
    console.log("- generateDummyDataForCustomField -");
    console.log("customField->", customField);
    console.log("element->", element);
    if (!customField) {
      if (element && element instanceof HTMLInputElement && element.pattern) {
        return this.logAndReturn(this.generator.generateRandomStringFromRegExTemplate(element.pattern), "pattern");
      }

      return this.logAndReturn(
        this.generator.phrase(this.getElementMinLength(element), this.getElementMaxLength(element)),
        "phrase"
      );
    }

    switch (customField.type) {
      case "username": {
        this.previousUsername = this.generator.scrambledWord(5, 10).toLowerCase();
        return this.logAndReturn(this.previousUsername, "username");
      }

      case "first-name": {
        this.previousFirstName = this.generator.firstName();
        return this.logAndReturn(this.previousFirstName, "first-name");
      }

      case "last-name": {
        this.previousLastName = this.generator.lastName();
        return this.logAndReturn(this.previousLastName, "last-name");
      }

      case "full-name": {
        this.previousFirstName = this.generator.firstName();
        this.previousLastName = this.generator.lastName();
        return this.logAndReturn(`${this.previousFirstName} ${this.previousLastName}`, "full-name");
      }

      case "email": {
        let username = "";

        switch (customField.emailUsername) {
          case "list": {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const usernames = customField.emailUsernameList || DEFAULT_EMAIL_CUSTOM_FIELD.emailUsernameList!;
            username = usernames[Math.floor(Math.random() * usernames.length)];
            break;
          }

          case "username": {
            if (this.previousUsername.length > 0) {
              username = SanitizeText(this.previousUsername);
            }
            break;
          }

          case "name": {
            if (this.previousFirstName.length > 0) {
              username = SanitizeText(this.previousFirstName);
            }
            if (this.previousLastName.length > 0) {
              if (username.length > 0) {
                username += `.${SanitizeText(this.previousLastName)}`;
              } else {
                username = SanitizeText(this.previousLastName);
              }
            }
            break;
          }

          case "regex": {
            try {
              if (customField.emailUsernameRegEx) {
                const regExGenerator = new RandExp(customField.emailUsernameRegEx);
                regExGenerator.defaultRange.add(0, 65535);
                username = regExGenerator.gen();
              }
            } catch (ex) {
              // Do nothing.
            }
            break;
          }

          default:
            break;
        }

        if (!username || username.length === 0) {
          username = this.generator.scrambledWord(4, 10).toLowerCase();
        }

        let domain = "";

        if (customField.emailHostname === "list") {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const hostnames = customField.emailHostnameList || DEFAULT_EMAIL_CUSTOM_FIELD.emailHostnameList!;
          const randomNumber = Math.floor(Math.random() * hostnames.length);
          domain = hostnames[randomNumber];
        }

        if (!domain || domain.length === 0) {
          domain = `${this.generator.scrambledWord().toLowerCase()}.com`;
        }

        if (domain.indexOf("@") === -1) {
          domain = `@${domain}`;
        }

        let prefix = "";

        if (customField.emailPrefix) {
          prefix = customField.emailPrefix;
        }

        let suffix = "";

        if (customField.emailSuffix) {
          suffix = customField.emailSuffix;
        }

        suffix = suffix.replace(/\[hostname\]/g, window.location.hostname);

        return this.logAndReturn(prefix + username + suffix + domain, "email");
      }

      case "organization": {
        return this.logAndReturn(this.generator.organizationName(), "organization");
      }

      case "telephone": {
        return this.logAndReturn(this.generator.phoneNumber(customField.template), "telephone");
      }

      case "number": {
        const minValue = customField.min === 0 ? 0 : customField.min || 1;
        const maxValue = customField.max || 100;
        const decimalValue = customField.decimalPlaces || 0;
        return this.logAndReturn(String(this.generator.randomNumber(minValue, maxValue, decimalValue)), "number");
      }

      case "date": {
        let minDate: Date | undefined;
        let maxDate: Date | undefined;

        if (customField.minDate) {
          minDate = moment(customField.minDate).toDate();
        } else if (!Number.isNaN(Number(customField.min))) {
          minDate = moment(new Date()).add(customField.min, "days").toDate();
        }

        if (customField.maxDate) {
          maxDate = moment(customField.maxDate).toDate();
        } else if (!Number.isNaN(Number(customField.max))) {
          maxDate = moment(new Date()).add(customField.max, "days").toDate();
        }

        if (element && element.type === "date") {
          const dateElement = element as HTMLInputElement;

          if (dateElement.min && moment(dateElement.min).isValid()) {
            minDate = moment(dateElement.min).toDate();
          }

          if (dateElement.max && moment(dateElement.max).isValid()) {
            maxDate = moment(dateElement.max).toDate();
          }

          return this.logAndReturn(this.generator.date(minDate, maxDate), "date-element");
        }

        return this.logAndReturn(
          moment(this.generator.date(minDate, maxDate)).format(customField.template),
          "date-formatted"
        );
      }

      case "url": {
        return this.logAndReturn(this.generator.website(), "url");
      }

      case "text": {
        if (element && element instanceof HTMLInputElement && element.pattern) {
          return this.logAndReturn(
            this.generator.generateRandomStringFromRegExTemplate(element.pattern),
            "text-pattern"
          );
        }

        const minWords = customField.min || 10;
        const maxWords = customField.max || 30;
        let maxLength = customField.maxLength || this.options.defaultMaxLength;
        if (element && element.maxLength && element.maxLength < maxLength) {
          maxLength = element.maxLength;
        }
        let minLength = 0;
        if (element && element.minLength) {
          minLength = element.minLength;
        }
        return this.logAndReturn(this.generator.paragraph(minWords, maxWords, minLength, maxLength), "text-paragraph");
      }

      case "alphanumeric": {
        return this.logAndReturn(this.generator.alphanumeric(customField.template || ""), "alphanumeric");
      }

      case "regex": {
        const regExGenerator = new RandExp(customField.template || "");
        regExGenerator.defaultRange.add(0, 65535);
        return this.logAndReturn(regExGenerator.gen(), "regex");
      }

      case "randomized-list": {
        if (customField.list && customField.list.length > 0) {
          return this.logAndReturn(
            customField.list[this.generator.randomNumber(0, customField.list.length - 1)],
            "randomized-list"
          );
        }
        return this.logAndReturn("", "randomized-list-empty");
      }

      default: {
        return this.logAndReturn(
          this.generator.phrase(this.getElementMinLength(element), this.getElementMaxLength(element)),
          "default"
        );
      }
    }
  }

  public async fillInputElement(element: HTMLInputElement): Promise<void> {
    console.log("#fillInputElement#");
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    const elementType = element.type ? element.type.toLowerCase() : "";
    console.log("elementType->", elementType);

    // 提取常用的变量，避免重复计算
    const elementName = this.getElementName(element);
    const isConfirmField = this.isAnyMatch(elementName, this.options.confirmFields);
    const isAgreeTermsField = this.isAnyMatch(elementName, this.options.agreeTermsFields);

    // 创建一个辅助函数来查找自定义字段
    const findCustomFieldForElement = (fieldTypes?: any[]) => {
      return this.findCustomField(elementName, fieldTypes);
    };

    // 创建一个辅助函数来生成自定义字段数据
    const generateCustomFieldData = (customField: any) => {
      return this.generateDummyDataForCustomField(customField, element);
    };

    switch (elementType) {
      case "checkbox": {
        let shouldCheck: boolean;
        if (isAgreeTermsField) {
          shouldCheck = true;
        } else {
          shouldCheck = Math.random() > 0.5;
        }

        // 尝试使用PageOperator进行真实点击
        const clickSuccess = await this.clickCheckboxWithPageOperator(element, shouldCheck);

        if (!clickSuccess) {
          // 回退到直接设置属性
          element.checked = shouldCheck;
          if (element.value && element.value === "false" && shouldCheck) {
            element.value = "true";
          }

          // 触发事件
          // if (this.options.triggerClickEvents) {
          //   this.fireEvents(element);
          // }
        }

        break;
      }

      case "date": {
        const dateCustomField = findCustomFieldForElement(["date"]);

        let dateValue: string;
        if (dateCustomField) {
          dateValue = generateCustomFieldData(dateCustomField);
        } else {
          let minDate: Date | undefined;
          let maxDate: Date | undefined;

          if (element.min) {
            if (moment(element.min).isValid()) {
              minDate = moment(element.min).toDate();
            }
          }

          if (element.max) {
            if (moment(element.max).isValid()) {
              maxDate = moment(element.max).toDate();
            }
          }

          dateValue = this.generator.date(minDate, maxDate);
        }
        await this.setElementValue(element, dateValue);
        break;
      }

      case "datetime": {
        const datetimeCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list"]);

        let datetimeValue: string;
        if (datetimeCustomField) {
          datetimeValue = generateCustomFieldData(datetimeCustomField);
        } else {
          datetimeValue = `${this.generator.date()}T${this.generator.time()}Z`;
        }
        await this.setElementValue(element, datetimeValue);
        break;
      }

      case "datetime-local": {
        const datetimeLocalCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list"]);

        let datetimeLocalValue: string;
        if (datetimeLocalCustomField) {
          datetimeLocalValue = generateCustomFieldData(datetimeLocalCustomField);
        } else {
          datetimeLocalValue = `${this.generator.date()}T${this.generator.time()}`;
        }
        await this.setElementValue(element, datetimeLocalValue);
        break;
      }

      case "time": {
        const timeCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list"]);

        let timeValue: string;
        if (timeCustomField) {
          timeValue = generateCustomFieldData(timeCustomField);
        } else {
          timeValue = this.generator.time();
        }
        await this.setElementValue(element, timeValue);
        break;
      }

      case "month": {
        const monthCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list"]);

        let monthValue: string;
        if (monthCustomField) {
          monthValue = generateCustomFieldData(monthCustomField);
        } else {
          monthValue = `${this.generator.year()}-${this.generator.month()}`;
        }
        await this.setElementValue(element, monthValue);
        break;
      }

      case "week": {
        const weekCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list"]);

        let weekValue: string;
        if (weekCustomField) {
          weekValue = generateCustomFieldData(weekCustomField);
        } else {
          weekValue = `${this.generator.year()}-W${this.generator.weekNumber()}`;
        }
        await this.setElementValue(element, weekValue);
        break;
      }

      case "email": {
        let emailValue: string;
        if (isConfirmField) {
          emailValue = this.previousValue;
        } else {
          let emailCustomField = findCustomFieldForElement(["email"]);
          if (!emailCustomField) {
            emailCustomField = DEFAULT_EMAIL_CUSTOM_FIELD;
          }

          this.previousValue = generateCustomFieldData(emailCustomField);
          emailValue = this.previousValue;
        }
        await this.setElementValue(element, emailValue);
        break;
      }

      case "number":
      case "range": {
        let min = element.min ? parseInt(element.min, 10) : 1;
        let max = element.max ? parseInt(element.max, 10) : 100;

        const numberCustomField = findCustomFieldForElement(["number"]);

        if (numberCustomField) {
          min = numberCustomField.min || min;
          max = numberCustomField.max || max;

          if (element.min && element.max) {
            min = Number(element.min) > min ? Number(element.min) : min;
            max = Number(element.max) < max ? Number(element.max) : max;
          }
        }

        let decimalPlaces = 0;

        if (element.step) {
          // Doesn't work properly for non-powers of 10
          decimalPlaces = Math.floor(-Math.log10(Number(element.step)));
        } else if (numberCustomField) {
          decimalPlaces = numberCustomField.decimalPlaces || 0;
        }

        const numberValue = String(this.generator.randomNumber(min, max, decimalPlaces));
        await this.setElementValue(element, numberValue);
        break;
      }

      case "password": {
        let passwordValue: string;
        if (isConfirmField) {
          passwordValue = this.previousPassword;
        } else {
          if (this.options.passwordSettings.mode === "defined") {
            this.previousPassword = this.options.passwordSettings.password;
          } else {
            this.previousPassword = this.generator.scrambledWord(8, 8).toLowerCase();
            // eslint-disable-next-line no-console
            console.info(this.previousPassword);
          }

          passwordValue = this.previousPassword;
        }
        await this.setElementValue(element, passwordValue);
        break;
      }

      case "radio": {
        if (element.name) {
          const matchingCustomField = findCustomFieldForElement(["randomized-list"]);
          const valuesList = matchingCustomField?.list ? matchingCustomField?.list : [];
          await this.selectRandomRadio(element.name, valuesList);
        }
        break;
      }

      case "tel": {
        const telephoneCustomField = findCustomFieldForElement(["telephone", "regex", "randomized-list"]);

        let telephoneValue: string;
        if (telephoneCustomField) {
          telephoneValue = generateCustomFieldData(telephoneCustomField);
        } else {
          telephoneValue = this.generator.phoneNumber();
        }
        await this.setElementValue(element, telephoneValue);
        break;
      }

      case "url": {
        const urlCustomField = findCustomFieldForElement(["alphanumeric", "url", "regex", "randomized-list"]);

        let urlValue: string;
        if (urlCustomField) {
          urlValue = generateCustomFieldData(urlCustomField);
        } else {
          urlValue = this.generator.website();
        }
        await this.setElementValue(element, urlValue);
        break;
      }

      case "color": {
        const colorCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list"]);

        let colorValue: string;
        if (colorCustomField) {
          colorValue = generateCustomFieldData(colorCustomField);
        } else {
          colorValue = this.generator.color();
        }
        await this.setElementValue(element, colorValue);
        break;
      }

      case "search": {
        const searchCustomField = findCustomFieldForElement(["alphanumeric", "regex", "randomized-list", "text"]);

        let searchValue: string;
        if (searchCustomField) {
          searchValue = generateCustomFieldData(searchCustomField);
        } else {
          searchValue = this.generator.words(1);
        }
        await this.setElementValue(element, searchValue);
        break;
      }

      case "file": {
        if (this.options.uploadFiles) {
          const dataTransfer = new DataTransfer();

          // es-lint-disable-next-line:max-line-length
          const pngFile = new File(
            [
              "data:image/png;base64,R0lGODlhDAAMAKIFAF5LAP/zxAAAANyuAP/gaP///wAAAAAAACH5BAEAAAUALAAAAAAMAAwAAAMlWLPcGjDKFYi9lxKBOaGcF35DhWHamZUW0K4mAbiwWtuf0uxFAgA7",
            ],
            "testFile.png",
            { type: "image/png" }
          );
          // es-lint-disable-next-line:max-line-length
          const pdfFile = new File(
            [
              "data:application/pdf;base64,JVBERi0xLjAKMSAwIG9iajw8L1BhZ2VzIDIgMCBSPj5lbmRvYmogMiAwIG9iajw8L0tpZHNbMyAw\nIFJdL0NvdW50IDE+PmVuZG9iaiAzIDAgb2JqPDwvTWVkaWFCb3hbMCAwIDMgM10+PmVuZG9iagp0\ncmFpbGVyPDwvUm9vdCAxIDAgUj4+Cg==",
            ],
            "testFile.pdf",
            { type: "application/pdf" }
          );
          const txtFile = new File(["Hello world!"], "testFile.txt", { type: "text/plain" });

          if (element.accept === "image/*" || element.accept.includes("png")) {
            dataTransfer.items.add(pngFile);
            if (!element.multiple) {
              element.files = dataTransfer.files;
              break;
            }
          } else if (element.accept.includes("pdf")) {
            dataTransfer.items.add(pdfFile);
            if (!element.multiple) {
              element.files = dataTransfer.files;
              break;
            }
          } else {
            dataTransfer.items.add(txtFile);
            if (!element.multiple) {
              element.files = dataTransfer.files;
              break;
            }
            dataTransfer.items.add(txtFile);
          }

          element.files = dataTransfer.files;
        }
        break;
      }

      default: {
        let defaultValue: string;
        if (isConfirmField) {
          defaultValue = this.previousValue;
        } else {
          const customField = findCustomFieldForElement();
          this.previousValue = generateCustomFieldData(customField);
          defaultValue = this.previousValue;
        }

        // 创建fallback函数，当设置值失败时按照number类型处理
        const numberFallback = async (): Promise<void> => {
          console.log("numberFallback");
          let min = element.min ? parseInt(element.min, 10) : 1;
          let max = element.max ? parseInt(element.max, 10) : 100;

          const numberCustomField = findCustomFieldForElement(["number"]);

          if (numberCustomField) {
            min = numberCustomField.min || min;
            max = numberCustomField.max || max;

            if (element.min && element.max) {
              min = Number(element.min) > min ? Number(element.min) : min;
              max = Number(element.max) < max ? Number(element.max) : max;
            }
          }

          let decimalPlaces = 0;

          if (element.step) {
            // Doesn't work properly for non-powers of 10
            decimalPlaces = Math.floor(-Math.log10(Number(element.step)));
          } else if (numberCustomField) {
            decimalPlaces = numberCustomField.decimalPlaces || 0;
          }

          const numberValue = String(this.generator.randomNumber(min, max, decimalPlaces));
          console.log("numberValue", numberValue);
          // 不传递fallback参数，避免无限递归
          await this.setElementValue(element, numberValue);
        };

        await this.setElementValue(element, defaultValue, numberFallback);
        break;
      }
    }

    // if (this.options.triggerClickEvents && fireEvent) {
    //   this.fireEvents(element);
    // }
  }

  public async fillTextAreaElement(element: HTMLTextAreaElement): Promise<void> {
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    const matchingCustomField = this.findCustomField(this.getElementName(element), [
      "text",
      "alphanumeric",
      "regex",
      "randomized-list",
    ]);

    const textValue = this.generateDummyDataForCustomField(matchingCustomField, element);
    await this.setElementValue(element, textValue);
  }

  public fillSelectElement(element: HTMLSelectElement): void {
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    if (!element.options || element.options.length < 1) {
      return;
    }

    let valueExists = false;
    const matchingCustomField = this.findCustomField(this.getElementName(element));

    // If a custom field exists for this element, we use that to determine the value.
    // However, if the generated value is not present in the options list we will select a random one.
    if (matchingCustomField) {
      const value = this.generateDummyDataForCustomField(matchingCustomField);

      for (let i = 0; i < element.options.length; i += 1) {
        if (element.options[i].value === value) {
          element.options[i].selected = true;
          valueExists = true;
          break;
        }
      }
    }

    if (!valueExists) {
      const optionsCount = element.options.length;
      const skipFirstOption = !!element.options[0].value === false;

      if (element.multiple) {
        // Unselect any existing options.
        for (let i = 0; i < optionsCount; i += 1) {
          if (!element.options[i].disabled) {
            element.options[i].selected = false;
          }
        }

        // Select a random number of options.
        const numberOfOptionsToSelect = this.generator.randomNumber(1, optionsCount);

        for (let i = 0; i < numberOfOptionsToSelect; i += 1) {
          if (!element.options[i].disabled) {
            element.options[this.generator.randomNumber(1, optionsCount - 1)].selected = true;
          }
        }
      } else {
        // Select a random option as long as it is not disabled.
        // If it is disabled, continue finding a random option that can be selected.

        let iterations = 0;

        while (iterations < optionsCount) {
          const randomOptionIndex = this.generator.randomNumber(skipFirstOption ? 1 : 0, optionsCount - 1);

          if (!element.options[randomOptionIndex].disabled) {
            element.options[randomOptionIndex].selected = true;
            break;
          } else {
            iterations += 1;
          }
        }
      }
    }

    // if (valueSelected && this.options.triggerClickEvents) {
    //   this.fireEvents(element);
    // }
  }

  public fillContentEditableElement(element: HTMLElement): void {
    if (this.shouldIgnoreElement(element as FillableElement)) {
      console.log("element ignored");
      return;
    }

    if ((element as HTMLElement).isContentEditable) {
      element.textContent = this.generator.paragraph(5, 100, 0, this.options.defaultMaxLength);

      // if (this.options.triggerClickEvents) {
      //   this.fireEvents(element as FillableElement);
      // }
    }
  }

  public async destroy(): Promise<void> {
    // PageOperator 的生命周期由 FakeFiller 管理，这里不需要销毁
    // if (this.pageOperator) {
    //   await this.pageOperator.destroy();
    // }
  }
}

export default ElementFiller;
