/* eslint-disable no-param-reassign */

import cssesc from "cssesc";
import moment from "moment";
import RandExp from "randexp";

import DataGenerator from "src/common/data-generator";
import { SanitizeText, DEFAULT_EMAIL_CUSTOM_FIELD } from "src/common/helpers";
import { IFakeFillerOptions, ICustomField, CustomFieldTypes } from "src/types";

type FillableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

class ElementFiller {
  private generator: DataGenerator;
  private options: IFakeFillerOptions;
  private profileIndex: number;

  private previousValue: string;
  private previousPassword: string;
  private previousUsername: string;
  private previousFirstName: string;
  private previousLastName: string;

  constructor(options: IFakeFillerOptions, profileIndex = -1) {
    this.options = options;
    this.profileIndex = profileIndex;
    this.generator = new DataGenerator();

    this.previousValue = "";
    this.previousPassword = "";
    this.previousUsername = "";
    this.previousFirstName = "";
    this.previousLastName = "";
  }

  private fireEvents(element: FillableElement): void {
    ["input", "click", "change", "blur"].forEach((event) => {
      const changeEvent = new Event(event, { bubbles: true, cancelable: true });
      element.dispatchEvent(changeEvent);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private waitForElementWithData(
    selector: string,
    dataCheckFn: (element: Element) => boolean,
    timeout = 2000
  ): Promise<Element | null> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (Date.now() - startTime >= timeout) {
          clearInterval(interval);
          resolve(null);
        }

        const element = document.querySelector(selector);
        if (element && dataCheckFn(element)) {
          clearInterval(interval);
          resolve(element);
        }
      }, 100);
    });
  }

  public async fillWrapedSelectElement(
    element: HTMLInputElement,
    isMultiSelect: boolean,
    dropdownClass: string,
    dropdownOptionClassList: string[]
  ): Promise<void> {
    console.log("fillWrapedSelectElement", element, isMultiSelect, dropdownClass);
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    // 点击输入框触发下拉框
    element.click();

    // 先等待一小段时间，让点击事件完成处理
    await this.sleep(50);

    // 等待下拉框出现并且有数据
    const dropdownElement = await this.waitForElementWithData(`.${dropdownClass}`, (el) => {
      // 检查是否有选项数据
      const hasOptions = dropdownOptionClassList.some(
        (optionClass) => el.querySelectorAll(`.${optionClass}:not(.disabled)`).length > 0
      );
      console.log("检查下拉框数据:", hasOptions);
      return hasOptions;
    });

    console.log("dropdownElement", dropdownElement);
    if (!dropdownElement) {
      console.log("下拉框未出现或无数据");
      return;
    }

    // 尝试使用不同的类名查找选项
    const options = dropdownOptionClassList.reduce<Element[]>((foundOptions, optionClass) => {
      if (foundOptions.length > 0) {
        return foundOptions;
      }
      const newOptions = Array.from(dropdownElement.querySelectorAll(`.${optionClass}:not(.disabled)`));
      console.log(`尝试使用类名 ${optionClass} 查找选项:`, newOptions);
      return newOptions;
    }, []);

    if (options.length === 0) {
      console.log("未找到任何可选项");
      return;
    }

    if (isMultiSelect) {
      // 多选模式：随机选择1-3个选项
      const numberOfOptionsToSelect = this.generator.randomNumber(1, Math.min(3, options.length));
      const selectedIndices = new Set<number>();

      while (selectedIndices.size < numberOfOptionsToSelect) {
        const randomIndex = this.generator.randomNumber(0, options.length - 1);
        if (!selectedIndices.has(randomIndex)) {
          selectedIndices.add(randomIndex);
          const option = options[randomIndex] as HTMLElement;
          option.click();
        }
      }
    } else {
      // 单选模式：随机选择一个选项
      const randomIndex = this.generator.randomNumber(0, options.length - 1);
      const option = options[randomIndex] as HTMLElement;
      option.click();
    }

    // 如果是单选，点击会自动关闭下拉框
    // 如果是多选，需要点击输入框来关闭下拉框
    if (isMultiSelect) {
      element.click();
    }
    if (this.options.triggerClickEvents) {
      this.fireEvents(element);
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

    if (!element.offsetHeight && !element.offsetWidth) {
      return false;
    }
    const { visibility } = window.getComputedStyle(element);
    console.log("element visibility ->", visibility);
    if (visibility === "hidden") {
      return false;
    }
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

  private selectRandomRadio(name: string, valuesList: string[] = []): void {
    const list = [];
    const elements = document.getElementsByName(name) as NodeListOf<HTMLInputElement>;

    for (let i = 0; i < elements.length; i += 1) {
      if (elements[i].type === "radio" && (valuesList.length === 0 || valuesList.includes(elements[i].value))) {
        list.push(elements[i]);
      }
    }

    const radioElement = list[Math.floor(Math.random() * list.length)];
    radioElement.checked = true;
    this.fireEvents(radioElement);
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

  public fillInputElement(element: HTMLInputElement): void {
    if (this.shouldIgnoreElement(element)) {
      console.log("element ignored");
      return;
    }

    let fireEvent = true;
    const elementType = element.type ? element.type.toLowerCase() : "";

    switch (elementType) {
      case "checkbox": {
        // standard version of this selector:
        if (this.isAnyMatch(this.getElementName(element), this.options.agreeTermsFields)) {
          element.checked = true;
          if (element.value && element.value === "false") {
            element.value = "true";
          }
        } else {
          element.checked = Math.random() > 0.5;
        }

        // docassemble version of this selector:
        /*
        if (this.isAnyMatch(this.getElementName(element), this.options.agreeTermsFields)) {
          let label: HTMLElement = element.nextElementSibling as HTMLElement;
          if (label) {
            label.click();
          }
          if (element.value && element.value == "false") {
            element.value = "true";
          }
        } else {
          let label: HTMLElement = element.nextElementSibling as HTMLElement;
          if (label) {
            label.click();
          }
        }
        */

        break;
      }

      case "date": {
        const dateCustomField = this.findCustomField(this.getElementName(element), ["date"]);

        if (dateCustomField) {
          element.value = this.generateDummyDataForCustomField(dateCustomField, element);
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

          element.value = this.generator.date(minDate, maxDate);
        }
        break;
      }

      case "datetime": {
        const datetimeCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        if (datetimeCustomField) {
          element.value = this.generateDummyDataForCustomField(datetimeCustomField, element);
        } else {
          element.value = `${this.generator.date()}T${this.generator.time()}Z`;
        }
        break;
      }

      case "datetime-local": {
        const datetimeLocalCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        if (datetimeLocalCustomField) {
          element.value = this.generateDummyDataForCustomField(datetimeLocalCustomField, element);
        } else {
          element.value = `${this.generator.date()}T${this.generator.time()}`;
        }
        break;
      }

      case "time": {
        const timeCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        if (timeCustomField) {
          element.value = this.generateDummyDataForCustomField(timeCustomField, element);
        } else {
          element.value = this.generator.time();
        }
        break;
      }

      case "month": {
        const monthCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        if (monthCustomField) {
          element.value = this.generateDummyDataForCustomField(monthCustomField, element);
        } else {
          element.value = `${this.generator.year()}-${this.generator.month()}`;
        }
        break;
      }

      case "week": {
        const weekCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        if (weekCustomField) {
          element.value = this.generateDummyDataForCustomField(weekCustomField, element);
        } else {
          element.value = `${this.generator.year()}-W${this.generator.weekNumber()}`;
        }
        break;
      }

      case "email": {
        if (this.isAnyMatch(this.getElementName(element), this.options.confirmFields)) {
          element.value = this.previousValue;
        } else {
          let emailCustomField = this.findCustomField(this.getElementName(element), ["email"]);
          if (!emailCustomField) {
            emailCustomField = DEFAULT_EMAIL_CUSTOM_FIELD;
          }

          this.previousValue = this.generateDummyDataForCustomField(emailCustomField, element);
          element.value = this.previousValue;
        }
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

        element.value = String(this.generator.randomNumber(min, max, decimalPlaces));
        break;
      }

      case "password": {
        if (this.isAnyMatch(this.getElementName(element), this.options.confirmFields)) {
          element.value = this.previousPassword;
        } else {
          if (this.options.passwordSettings.mode === "defined") {
            this.previousPassword = this.options.passwordSettings.password;
          } else {
            this.previousPassword = this.generator.scrambledWord(8, 8).toLowerCase();
            // eslint-disable-next-line no-console
            console.info(this.previousPassword);
          }

          element.value = this.previousPassword;
        }
        break;
      }

      case "radio": {
        if (element.name) {
          const matchingCustomField = this.findCustomField(this.getElementName(element), ["randomized-list"]);
          const valuesList = matchingCustomField?.list ? matchingCustomField?.list : [];
          this.selectRandomRadio(element.name, valuesList);
        }
        fireEvent = false;
        break;
      }

      case "tel": {
        const telephoneCustomField = this.findCustomField(this.getElementName(element), [
          "telephone",
          "regex",
          "randomized-list",
        ]);

        if (telephoneCustomField) {
          element.value = this.generateDummyDataForCustomField(telephoneCustomField, element);
        } else {
          element.value = this.generator.phoneNumber();
        }
        break;
      }

      case "url": {
        const urlCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "url",
          "regex",
          "randomized-list",
        ]);

        if (urlCustomField) {
          element.value = this.generateDummyDataForCustomField(urlCustomField, element);
        } else {
          element.value = this.generator.website();
        }
        break;
      }

      case "color": {
        const colorCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
        ]);

        if (colorCustomField) {
          element.value = this.generateDummyDataForCustomField(colorCustomField, element);
        } else {
          element.value = this.generator.color();
        }
        break;
      }

      case "search": {
        const searchCustomField = this.findCustomField(this.getElementName(element), [
          "alphanumeric",
          "regex",
          "randomized-list",
          "text",
        ]);

        if (searchCustomField) {
          element.value = this.generateDummyDataForCustomField(searchCustomField, element);
        } else {
          element.value = this.generator.words(1);
        }
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
        if (this.isAnyMatch(this.getElementName(element), this.options.confirmFields)) {
          element.value = this.previousValue;
        } else {
          const customField = this.findCustomField(this.getElementName(element));
          this.previousValue = this.generateDummyDataForCustomField(customField, element);
          element.value = this.previousValue;
        }
        break;
      }
    }

    if (this.options.triggerClickEvents && fireEvent) {
      this.fireEvents(element);
    }
  }

  public fillTextAreaElement(element: HTMLTextAreaElement): void {
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

    element.value = this.generateDummyDataForCustomField(matchingCustomField, element);

    if (this.options.triggerClickEvents) {
      this.fireEvents(element);
    }
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
    let valueSelected = false;
    const matchingCustomField = this.findCustomField(this.getElementName(element));

    // If a custom field exists for this element, we use that to determine the value.
    // However, if the generated value is not present in the options list we will select a random one.
    if (matchingCustomField) {
      const value = this.generateDummyDataForCustomField(matchingCustomField);

      for (let i = 0; i < element.options.length; i += 1) {
        if (element.options[i].value === value) {
          element.options[i].selected = true;
          valueExists = true;
          valueSelected = true;
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
            valueSelected = true;
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
            valueSelected = true;
            break;
          } else {
            iterations += 1;
          }
        }
      }
    }

    if (valueSelected && this.options.triggerClickEvents) {
      this.fireEvents(element);
    }
  }

  public fillContentEditableElement(element: HTMLElement): void {
    if ((element as HTMLElement).isContentEditable) {
      element.textContent = this.generator.paragraph(5, 100, 0, this.options.defaultMaxLength);
    }
  }
}

export default ElementFiller;
