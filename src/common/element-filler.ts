/* eslint-disable no-param-reassign */

import cssesc from "cssesc";
import moment from "moment";
import RandExp from "randexp";

import DataGenerator from "src/common/data-generator";
import { SanitizeText, DEFAULT_EMAIL_CUSTOM_FIELD, sleep } from "src/common/helpers";
import PageOperator from "src/common/page-operator";
import { IFakeFillerOptions, ICustomField, CustomFieldTypes } from "src/types";

type FillableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

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
   * 获取元素中心点的全局坐标
   * @param element 目标元素
   * @returns {x, y} 全局坐标
   */
  private getElementCenterCoordinates(element: Element): { x: number; y: number } {
    const rect = this.getElementGlobalRect(element);
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  /**
   * 使用PageOperator进行真实的用户输入操作，更适合现代框架
   * @param element 目标元素
   * @param value 要输入的值
   * @returns Promise<boolean> 是否成功使用PageOperator输入
   */
  private async fillElementWithPageOperator(element: FillableElement, value: string): Promise<boolean> {
    if (!this.pageOperator || !value) {
      return false;
    }

    try {
      // 先点击元素以获取焦点，使用准确的全局坐标
      const { x, y } = this.getElementCenterCoordinates(element);

      await this.pageOperator.click(x, y);
      await sleep(100); // 等待焦点设置

      // 清空现有内容并输入新值
      await this.pageOperator.clearAndType(value, element);
      await sleep(50); // 等待输入完成

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
      const { x, y } = this.getElementCenterCoordinates(element);

      await this.pageOperator.click(x, y);
      await sleep(100); // 等待状态更新

      // 验证状态是否正确更新
      return element.checked === shouldCheck;
    } catch (error) {
      console.warn("PageOperator checkbox click failed, will fallback to direct assignment:", error);
      return false;
    }
  }

  /**
   * 统一的元素值设置方法，优先使用PageOperator，失败时回退到直接赋值
   * @param element 目标元素
   * @param value 要设置的值
   */
  private async setElementValue(element: FillableElement, value: string): Promise<void> {
    // 尝试使用PageOperator进行真实用户输入
    const pageOperatorSuccess = await this.fillElementWithPageOperator(element, value);

    if (!pageOperatorSuccess) {
      // 回退到直接赋值方式
      (element as HTMLInputElement | HTMLTextAreaElement).value = value;

      // 触发必要的事件
      // if (this.options.triggerClickEvents) {
      //   this.fireEvents(element);
      // }
    }
  }

  private async simulateClick(element: HTMLElement, x?: number, y?: number): Promise<void> {
    console.log("-simulateClick-", element, x, y);
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
    timeout = 2000
  ): Promise<Element | null> {
    console.log("waitForElementWithData: starting, selectorList:", selectorList);
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (Date.now() - startTime >= timeout) {
          clearInterval(interval);
          console.log("waitForElementWithData: timeout");
          resolve(null);
        }

        let activeElement: Element | null = null;
        for (let i = 0; i < selectorList.length; i += 1) {
          const selector = selectorList[i];
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
            [activeElement] = visibleElementList;
            break;
          }
        }

        if (activeElement && dataCheckFn(activeElement)) {
          clearInterval(interval);
          console.log("waitForElementWithData: found element", activeElement);
          resolve(activeElement);
        }
      }, 100);
    });
  }

  public async fillWrapedDropdownElement(
    element: HTMLInputElement,
    isMultiSelect: boolean,
    dropdownClassList: string[],
    dropdownOptionClassList: string[]
  ): Promise<void> {
    console.log("fillWrapedDropdownElement", element, isMultiSelect, dropdownClassList);
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    // 点击输入框触发下拉框
    try {
      await this.simulateClick(element);
    } catch (error) {
      console.error("Failed to click using page operator, falling back to events", error);
      element.click();
      // if (this.options.triggerClickEvents) {
      //   this.fireEvents(element);
      // }
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

    console.log("dropdownElement", dropdownElement);
    if (!dropdownElement) {
      console.warn("dropdownElement not found");
      return;
    }

    // 尝试使用不同的类名查找选项
    const options = dropdownOptionClassList.reduce<Element[]>((foundOptions, optionClass) => {
      if (foundOptions.length > 0) {
        return foundOptions;
      }
      const newOptions = Array.from(dropdownElement.querySelectorAll(`.${optionClass}:not(.disabled)`));
      console.log(`try to find options with ${optionClass}:`, newOptions);
      return newOptions;
    }, []);
    const visibleOptions = options.filter((option) => this.isElementVisible(option as FillableElement));

    if (visibleOptions.length === 0) {
      console.log("no visible options");
      return;
    }

    // let selected = false;
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
        // 关闭
        await this.clickAtBlankArea(element);
        // 再次打开（如果不是最后一个选项）
        if (i < selectedIndices.length - 1) {
          await this.simulateClick(element);
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
      // selected = true;
    }
  }

  private isAnyMatch(haystack: string, needles: string[]): boolean {
    for (let i = 0, count = needles.length; i < count; i += 1) {
      if (new RegExp(needles[i], "iu").test(haystack)) {
        return true;
      }
    }
    return false;
  }

  private isElementVisible(element: FillableElement): boolean {
    // BEGIN Docassemble specific code
    if (element.className.includes("labelauty")) {
      // this tells us it's a Docassemble input
      // it's visible unless it's behind a showif
      if (
        element.parentNode &&
        element.parentNode.parentNode &&
        element.parentNode.parentNode.parentNode &&
        element.parentNode.parentNode.parentNode.parentNode
      ) {
        const showifContainer = element.parentNode.parentNode.parentNode.parentNode as FillableElement;
        if (showifContainer.className.includes("dashowif")) {
          return this.isElementVisible(showifContainer); // check to see if the 4th grandparent container is visible
        }
      }
      return true;
    }
    // END Docassemble specific code

    // 检查基本尺寸
    if (!element.offsetHeight && !element.offsetWidth) {
      return false;
    }

    // 检查 CSS 样式
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.visibility === "hidden" || computedStyle.display === "none" || computedStyle.opacity === "0") {
      return false;
    }

    // 使用 getBoundingClientRect 检查元素是否真正可见
    const rect = element.getBoundingClientRect();

    // 检查元素是否有实际的尺寸
    // TODO 确认是否会误伤
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    // 检查元素是否在视口内
    const isInViewport =
      rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;

    if (!isInViewport) {
      return false;
    }

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

    // Ignore any elements that match an item in the the "ignoredFields" array.
    const elementName = this.getElementName(element);
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
      const { x, y } = this.getElementCenterCoordinates(element);

      await this.pageOperator.click(x, y);
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
    elementName: string,
    matchTypes: CustomFieldTypes[] = []
  ): ICustomField | undefined {
    const doMatchType = matchTypes.length > 0;

    for (let i = 0; i < fields.length; i += 1) {
      if (this.isAnyMatch(elementName, fields[i].match)) {
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

  private findCustomField(elementName: string, matchTypes: CustomFieldTypes[] = []): ICustomField | undefined {
    let foundField: ICustomField | undefined;

    // Try finding the custom field from a profile if available.
    if (this.profileIndex > -1) {
      foundField = this.findCustomFieldFromList(
        this.options.profiles[this.profileIndex].fields,
        elementName,
        matchTypes
      );
    }

    // If a custom field could not be found from the profile, try getting one from the default list.
    if (!foundField) {
      foundField = this.findCustomFieldFromList(this.options.fields, elementName, matchTypes);
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

  private getElementName(element: FillableElement): string {
    let normalizedName = "";

    if (this.options.fieldMatchSettings.matchName) {
      normalizedName += ` ${this.NormalizeTextForElementName(element.name)}`;
    }

    if (this.options.fieldMatchSettings.matchId) {
      normalizedName += ` ${this.NormalizeTextForElementName(element.id)}`;
    }

    if (this.options.fieldMatchSettings.matchClass) {
      normalizedName += ` ${this.NormalizeTextForElementName(element.className)}`;
    }

    if (this.options.fieldMatchSettings.matchPlaceholder) {
      normalizedName += ` ${this.NormalizeTextForElementName(element.getAttribute("placeholder") || "")}`;
    }

    if (
      this.options.fieldMatchSettings.customAttributes &&
      this.options.fieldMatchSettings.customAttributes.length > 0
    ) {
      this.options.fieldMatchSettings.customAttributes.forEach((customAttribute) => {
        normalizedName += ` ${this.NormalizeTextForElementName(element.getAttribute(customAttribute) || "")}`;
      });
    }

    if (this.options.fieldMatchSettings.matchLabel) {
      const normalizedId = cssesc(element.id);
      const labels = document.querySelectorAll(`label[for='${normalizedId}']`);
      for (let i = 0; i < labels.length; i += 1) {
        normalizedName += ` ${this.NormalizeTextForElementName(labels[i].innerHTML)}`;
      }
    }

    if (this.options.fieldMatchSettings.matchAriaLabel) {
      normalizedName += ` ${this.NormalizeTextForElementName(element.getAttribute("aria-label") || "")}`;
    }

    if (this.options.fieldMatchSettings.matchAriaLabelledBy) {
      const labelIds = (element.getAttribute("aria-labelledby") || "").split(" ");
      for (let i = 0; i < labelIds.length; i += 1) {
        const labelElement = document.getElementById(labelIds[i]);
        if (labelElement) {
          normalizedName += ` ${this.NormalizeTextForElementName(labelElement.innerHTML || "")}`;
        }
      }
    }

    return normalizedName;
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

  private generateDummyDataForCustomField(
    customField: ICustomField | undefined,
    element: HTMLInputElement | HTMLTextAreaElement | undefined = undefined
  ): string {
    console.log("- generateDummyDataForCustomField -");
    console.log(customField);
    console.log(element);
    if (!customField) {
      if (element && element instanceof HTMLInputElement && element.pattern) {
        return this.generator.generateRandomStringFromRegExTemplate(element.pattern);
      }

      return this.generator.phrase(this.getElementMinLength(element), this.getElementMaxLength(element));
    }

    switch (customField.type) {
      case "username": {
        this.previousUsername = this.generator.scrambledWord(5, 10).toLowerCase();
        return this.previousUsername;
      }

      case "first-name": {
        this.previousFirstName = this.generator.firstName();
        return this.previousFirstName;
      }

      case "last-name": {
        this.previousLastName = this.generator.lastName();
        return this.previousLastName;
      }

      case "full-name": {
        this.previousFirstName = this.generator.firstName();
        this.previousLastName = this.generator.lastName();
        return `${this.previousFirstName} ${this.previousLastName}`;
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

        return prefix + username + suffix + domain;
      }

      case "organization": {
        return this.generator.organizationName();
      }

      case "telephone": {
        return this.generator.phoneNumber(customField.template);
      }

      case "number": {
        const minValue = customField.min === 0 ? 0 : customField.min || 1;
        const maxValue = customField.max || 100;
        const decimalValue = customField.decimalPlaces || 0;
        return String(this.generator.randomNumber(minValue, maxValue, decimalValue));
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

          return this.generator.date(minDate, maxDate);
        }

        return moment(this.generator.date(minDate, maxDate)).format(customField.template);
      }

      case "url": {
        return this.generator.website();
      }

      case "text": {
        if (element && element instanceof HTMLInputElement && element.pattern) {
          return this.generator.generateRandomStringFromRegExTemplate(element.pattern);
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
        return this.generator.paragraph(minWords, maxWords, minLength, maxLength);
      }

      case "alphanumeric": {
        return this.generator.alphanumeric(customField.template || "");
      }

      case "regex": {
        const regExGenerator = new RandExp(customField.template || "");
        regExGenerator.defaultRange.add(0, 65535);
        return regExGenerator.gen();
      }

      case "randomized-list": {
        if (customField.list && customField.list.length > 0) {
          return customField.list[this.generator.randomNumber(0, customField.list.length - 1)];
        }
        return "";
      }

      default: {
        return this.generator.phrase(this.getElementMinLength(element), this.getElementMaxLength(element));
      }
    }
  }

  public async fillInputElement(element: HTMLInputElement): Promise<void> {
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    const elementType = element.type ? element.type.toLowerCase() : "";

    switch (elementType) {
      case "checkbox": {
        let shouldCheck: boolean;
        if (this.isAnyMatch(this.getElementName(element), this.options.agreeTermsFields)) {
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
        const dateCustomField = this.findCustomField(this.getElementName(element), ["date"]);

        let dateValue: string;
        if (dateCustomField) {
          dateValue = this.generateDummyDataForCustomField(dateCustomField, element);
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
        const datetimeCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        let datetimeValue: string;
        if (datetimeCustomField) {
          datetimeValue = this.generateDummyDataForCustomField(datetimeCustomField, element);
        } else {
          datetimeValue = `${this.generator.date()}T${this.generator.time()}Z`;
        }
        await this.setElementValue(element, datetimeValue);
        break;
      }

      case "datetime-local": {
        const datetimeLocalCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        let datetimeLocalValue: string;
        if (datetimeLocalCustomField) {
          datetimeLocalValue = this.generateDummyDataForCustomField(datetimeLocalCustomField, element);
        } else {
          datetimeLocalValue = `${this.generator.date()}T${this.generator.time()}`;
        }
        await this.setElementValue(element, datetimeLocalValue);
        break;
      }

      case "time": {
        const timeCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        let timeValue: string;
        if (timeCustomField) {
          timeValue = this.generateDummyDataForCustomField(timeCustomField, element);
        } else {
          timeValue = this.generator.time();
        }
        await this.setElementValue(element, timeValue);
        break;
      }

      case "month": {
        const monthCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        let monthValue: string;
        if (monthCustomField) {
          monthValue = this.generateDummyDataForCustomField(monthCustomField, element);
        } else {
          monthValue = `${this.generator.year()}-${this.generator.month()}`;
        }
        await this.setElementValue(element, monthValue);
        break;
      }

      case "week": {
        const weekCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        let weekValue: string;
        if (weekCustomField) {
          weekValue = this.generateDummyDataForCustomField(weekCustomField, element);
        } else {
          weekValue = `${this.generator.year()}-W${this.generator.weekNumber()}`;
        }
        await this.setElementValue(element, weekValue);
        break;
      }

      case "email": {
        let emailValue: string;
        if (this.isAnyMatch(this.getElementName(element), this.options.confirmFields)) {
          emailValue = this.previousValue;
        } else {
          let emailCustomField = this.findCustomField(this.getElementName(element), ["email"]);
          if (!emailCustomField) {
            emailCustomField = DEFAULT_EMAIL_CUSTOM_FIELD;
          }

          this.previousValue = this.generateDummyDataForCustomField(emailCustomField, element);
          emailValue = this.previousValue;
        }
        await this.setElementValue(element, emailValue);
        break;
      }

      case "number":
      case "range": {
        let min = element.min ? parseInt(element.min, 10) : 1;
        let max = element.max ? parseInt(element.max, 10) : 100;

        const numberCustomField = this.findCustomField(this.getElementName(element), ["number"]);

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
        if (this.isAnyMatch(this.getElementName(element), this.options.confirmFields)) {
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
          const matchingCustomField = this.findCustomField(this.getElementName(element), ["randomized-list"]);
          const valuesList = matchingCustomField?.list ? matchingCustomField?.list : [];
          await this.selectRandomRadio(element.name, valuesList);
        }
        break;
      }

      case "tel": {
        const telephoneCustomField = this.findCustomField(this.getElementName(element), [
          "telephone",
          "regex",
          "randomized-list",
        ]);

        let telephoneValue: string;
        if (telephoneCustomField) {
          telephoneValue = this.generateDummyDataForCustomField(telephoneCustomField, element);
        } else {
          telephoneValue = this.generator.phoneNumber();
        }
        await this.setElementValue(element, telephoneValue);
        break;
      }

      case "url": {
        const urlCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "url",
          "regex",
          "randomized-list",
        ]);

        let urlValue: string;
        if (urlCustomField) {
          urlValue = this.generateDummyDataForCustomField(urlCustomField, element);
        } else {
          urlValue = this.generator.website();
        }
        await this.setElementValue(element, urlValue);
        break;
      }

      case "color": {
        const colorCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        let colorValue: string;
        if (colorCustomField) {
          colorValue = this.generateDummyDataForCustomField(colorCustomField, element);
        } else {
          colorValue = this.generator.color();
        }
        await this.setElementValue(element, colorValue);
        break;
      }

      case "search": {
        const searchCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
          "text",
        ]);

        let searchValue: string;
        if (searchCustomField) {
          searchValue = this.generateDummyDataForCustomField(searchCustomField, element);
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
        if (this.isAnyMatch(this.getElementName(element), this.options.confirmFields)) {
          defaultValue = this.previousValue;
        } else {
          const customField = this.findCustomField(this.getElementName(element));
          this.previousValue = this.generateDummyDataForCustomField(customField, element);
          defaultValue = this.previousValue;
        }
        await this.setElementValue(element, defaultValue);
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
