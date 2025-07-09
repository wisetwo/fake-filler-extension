import ElementFiller from "src/common/element-filler";
import { IFakeFillerOptions } from "src/types";

class FakeFiller {
  private elementFiller: ElementFiller;
  private clickedElement: HTMLElement | undefined;
  private urlMatchesToBlock: string[];

  constructor(options: IFakeFillerOptions, profileIndex = -1) {
    this.elementFiller = new ElementFiller(options, profileIndex);
    this.urlMatchesToBlock = options.urlMatchesToBlock;
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

  private async fillAllElements(container: Document | HTMLElement): Promise<void> {
    if (this.urlMatchesBlockList()) {
      return;
    }

    const delay = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    // 获取所有需要填充的元素
    const fillableElements = [
      ...Array.from(container.querySelectorAll("input:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("textarea:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("select:not(:disabled):not([readonly])")),
      ...Array.from(container.querySelectorAll("[contenteditable]")),
    ];

    // 创建一个填充单个元素的函数
    const fillElement = async (element: Element, index: number): Promise<void> => {
      // 先等待，让每个元素填充之间有200ms的间隔
      await delay(index * 200);

      const tagName = element.tagName.toLowerCase();

      if (tagName === "input") {
        this.elementFiller.fillInputElement(element as HTMLInputElement);
      } else if (tagName === "textarea") {
        this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
      } else if (tagName === "select") {
        this.elementFiller.fillSelectElement(element as HTMLSelectElement);
      } else if ((element as HTMLElement).isContentEditable) {
        this.elementFiller.fillContentEditableElement(element as HTMLElement);
      }
    };

    // 使用Promise.all和map来并发处理所有元素
    await Promise.all(fillableElements.map((element, index) => fillElement(element, index)));
  }

  public setClickedElement(element: HTMLElement | undefined): void {
    this.clickedElement = element;
  }

  public async fillAllInputs(): Promise<void> {
    await this.fillAllElements(document);
  }

  public fillThisInput(): void {
    if (this.urlMatchesBlockList()) {
      return;
    }

    const element = this.clickedElement || document.activeElement;

    if (element) {
      const tagName = element.tagName.toLowerCase();

      if (tagName === "input") {
        this.elementFiller.fillInputElement(element as HTMLInputElement);
      } else if (tagName === "textarea") {
        this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
      } else if (tagName === "select") {
        this.elementFiller.fillSelectElement(element as HTMLSelectElement);
      } else if ((element as HTMLElement).isContentEditable) {
        this.elementFiller.fillContentEditableElement(element as HTMLElement);
      }
    }

    this.setClickedElement(undefined);
  }

  public async fillThisForm(): Promise<void> {
    if (this.urlMatchesBlockList()) {
      return;
    }

    const element = this.clickedElement || document.activeElement;

    if (element && element.tagName.toLowerCase() !== "body") {
      const form = element.closest("form");

      if (form) {
        await this.fillAllElements(form);
      }
    }

    this.setClickedElement(undefined);
  }
}

export default FakeFiller;
