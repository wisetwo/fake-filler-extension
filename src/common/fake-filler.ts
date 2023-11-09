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

  private fillAllElements(container: Document | HTMLElement): void {
    if (this.urlMatchesBlockList()) {
      return;
    }

    container.querySelectorAll("input:not(:disabled):not([readonly])").forEach((element) => {
      this.elementFiller.fillInputElement(element as HTMLInputElement);
    });

    container.querySelectorAll("textarea:not(:disabled):not([readonly])").forEach((element) => {
      this.elementFiller.fillTextAreaElement(element as HTMLTextAreaElement);
    });

    container.querySelectorAll("select:not(:disabled):not([readonly])").forEach((element) => {
      this.elementFiller.fillSelectElement(element as HTMLSelectElement);
    });

    container.querySelectorAll("[contenteditable]").forEach((element) => {
      this.elementFiller.fillContentEditableElement(element as HTMLElement);
    });
  }

  public setClickedElement(element: HTMLElement | undefined): void {
    this.clickedElement = element;
  }

  public fillAllInputs(): void {
    this.fillAllElements(document);
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

  public fillThisForm(): void {
    const element = this.clickedElement || document.activeElement;

    if (element && element.tagName.toLowerCase() !== "body") {
      const form = element.closest("form");

      if (form) {
        this.fillAllElements(form);
      }
    }

    this.setClickedElement(undefined);
  }
}

export default FakeFiller;
