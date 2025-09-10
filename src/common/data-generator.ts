import { faker, fakerZH_CN as fakerZhCn, fakerEN as fakerEn } from "@faker-js/faker";
import RandExp from "randexp";

import { DEFAULT_TELEPHONE_TEMPLATE } from "src/common/helpers";

// 中文词汇生成策略
const CHINESE_WORD_GENERATORS = [
  "noun", // 名词：公司、朋友、海洋
  "adjective", // 形容词：平坦、美丽、强大
  "verb", // 动词：擒、看、做
  "adverb", // 副词：惟独、非常、特别
] as const;

class DataGenerator {
  private currentFaker = faker;
  private isChineseLocale = false;

  public setLocale(locale: string): void {
    console.log("DataGenerator.setLocale called with:", locale);
    switch (locale) {
      case "zh_CN":
      case "zh-CN":
        this.currentFaker = fakerZhCn;
        this.isChineseLocale = true;
        console.log("Set faker to Chinese (zh_CN)");
        break;
      case "en":
      case "en_US":
      case "en-US":
      default:
        this.currentFaker = fakerEn;
        this.isChineseLocale = false;
        console.log("Set faker to English (en)");
        break;
    }
  }

  private getRandomWord(): string {
    if (this.isChineseLocale) {
      // 随机选择一种词汇类型
      const wordType = (this.currentFaker.helpers as any).arrayElement(CHINESE_WORD_GENERATORS);
      return (this.currentFaker.word as any)[wordType]();
    }
    return this.currentFaker.lorem.word();
  }

  public randomNumber(start: number, end: number, decimalPlaces = 0): number {
    if (decimalPlaces > 0) {
      return this.currentFaker.number.float({ min: start, max: end, fractionDigits: decimalPlaces });
    }
    return this.currentFaker.number.int({ min: Math.ceil(start), max: Math.floor(end) });
  }

  public scrambledWord(minLength = 3, maxLength = 15): string {
    if (this.isChineseLocale) {
      // 中文模式：根据长度要求生成合适的词汇
      if (minLength <= 4) {
        // 短词：直接返回一个词
        return this.getRandomWord();
      }
      if (minLength <= 8) {
        // 中等长度：组合2-3个词
        const words = [];
        for (let i = 0; i < this.randomNumber(2, 3); i++) {
          words.push(this.getRandomWord());
        }
        let result = words.join("");

        // 如果太长就截断
        if (result.length > maxLength) {
          result = result.substring(0, maxLength);
        }
        return result;
      }
      // 长词：使用商业短语或技术短语
      try {
        const phrases = [
          () => this.currentFaker.company.buzzPhrase(),
          () => this.currentFaker.hacker.phrase(),
          () => this.currentFaker.commerce.productDescription(),
        ];
        const phrase = (this.currentFaker.helpers as any).arrayElement(phrases)();

        // 处理长度
        if (phrase.length > maxLength) {
          return phrase.substring(0, maxLength);
        }
        if (phrase.length < minLength) {
          // 如果短语太短，补充一些词汇
          let result = phrase;
          while (result.length < minLength) {
            result += this.getRandomWord();
          }
          return result.length > maxLength ? result.substring(0, maxLength) : result;
        }
        return phrase;
      } catch {
        // 回退到基本方法
        return this.getBasicChineseWord(minLength, maxLength);
      }
    } else {
      // 英文模式：保持原逻辑
      const wordLength = this.randomNumber(minLength, maxLength);
      let resultWord = this.getRandomWord();

      while (resultWord.length < minLength) {
        resultWord += this.getRandomWord();
      }

      if (resultWord.length > wordLength) {
        resultWord = resultWord.substring(0, wordLength);
      }

      return resultWord;
    }
  }

  private getBasicChineseWord(minLength: number, maxLength: number): string {
    let resultWord = "";
    const targetLength = this.randomNumber(minLength, maxLength);

    while (resultWord.length < minLength) {
      const word = this.getRandomWord();
      resultWord += word;
    }

    if (resultWord.length > targetLength) {
      resultWord = resultWord.substring(0, targetLength);
    }

    return resultWord;
  }

  public words(wordCount: number, minLength = 0, maxLength = 0): string {
    if (this.isChineseLocale) {
      return this.generateChineseText(wordCount, minLength, maxLength);
    }
    return this.generateEnglishText(wordCount, minLength, maxLength);
  }

  private generateChineseText(wordCount: number, minLength: number, maxLength: number): string {
    // 对于中文，优先考虑语义完整性
    if (wordCount >= 5 || minLength > 20) {
      // 生成较长的描述性文本
      try {
        const generators = [
          () => this.currentFaker.company.buzzPhrase(),
          () => this.currentFaker.hacker.phrase(),
          () => this.currentFaker.commerce.productDescription(),
        ];

        let result = (this.currentFaker.helpers as any).arrayElement(generators)();

        // 清理可能的英文内容
        if (this.containsEnglish(result)) {
          result = this.getBasicChineseWords(wordCount, minLength);
        }

        // 调整长度
        if (maxLength > 0 && result.length > maxLength) {
          result = result.substring(0, maxLength);
        } else if (result.length < minLength) {
          while (result.length < minLength && (maxLength === 0 || result.length < maxLength)) {
            result += this.getRandomWord();
          }
        }

        console.log("words->", result);
        return result;
      } catch {
        return this.getBasicChineseWords(wordCount, minLength);
      }
    } else {
      // 生成简单的词汇组合
      return this.getBasicChineseWords(wordCount, minLength);
    }
  }

  private generateEnglishText(wordCount: number, minLength: number, maxLength: number): string {
    let resultPhrase = "";
    let phraseLength = 0;

    // 如果 wordCount 不足以达到 minLength，则 minLength 优先
    for (let i = 0; i < wordCount || phraseLength < minLength; i += 1) {
      let word = this.getRandomWord();
      phraseLength = resultPhrase.length;

      // 句首大写处理
      if (
        phraseLength === 0 ||
        resultPhrase.substring(phraseLength - 1, phraseLength) === "." ||
        resultPhrase.substring(phraseLength - 1, phraseLength) === "?"
      ) {
        word = word.substring(0, 1).toUpperCase() + word.substring(1, word.length);
      }

      resultPhrase += phraseLength > 0 ? ` ${word}` : word;
      phraseLength = resultPhrase.length;
    }

    if (maxLength && maxLength > 0) {
      resultPhrase = resultPhrase.substring(0, maxLength);
    }

    console.log("words->", resultPhrase);
    return resultPhrase;
  }

  private getBasicChineseWords(wordCount: number, minLength: number): string {
    let resultPhrase = "";

    for (let i = 0; i < wordCount; i++) {
      if (i > 0 && this.randomNumber(1, 3) === 1) {
        // 有时候加标点符号增加自然度
        resultPhrase += this.randomNumber(1, 2) === 1 ? "，" : "。";
      }
      resultPhrase += this.getRandomWord();
    }

    // 确保达到最小长度
    while (resultPhrase.length < minLength) {
      resultPhrase += this.getRandomWord();
    }

    console.log("words->", resultPhrase);
    return resultPhrase;
  }

  private containsEnglish(text: string): boolean {
    return /[a-zA-Z]/.test(text);
  }

  public alphanumeric(template: string): string {
    const count = template.length;
    let i = 0;
    let returnValue = "";
    let currentCharacter = "";
    let ignore = false;

    // 定义字符集
    const alphabets = "abcdefghijklmnopqrstuvwxyz";
    const consonants = "bcdfghjklmnpqrstvwxyz";
    const vowels = "aeiou";

    for (; i < count; i += 1) {
      currentCharacter = template[i];

      if (currentCharacter === "]") {
        ignore = false;
        // eslint-disable-next-line no-continue
        continue;
      }

      if (currentCharacter === "[") {
        ignore = true;
        // eslint-disable-next-line no-continue
        continue;
      }

      if (ignore) {
        currentCharacter = "";
      }

      switch (currentCharacter) {
        case "L":
          returnValue += (this.currentFaker.helpers as any).arrayElement([...alphabets]).toUpperCase();
          break;

        case "l":
          returnValue += (this.currentFaker.helpers as any).arrayElement([...alphabets]).toLowerCase();
          break;

        case "D":
          returnValue += this.currentFaker.datatype.boolean()
            ? (this.currentFaker.helpers as any).arrayElement([...alphabets]).toUpperCase()
            : (this.currentFaker.helpers as any).arrayElement([...alphabets]).toLowerCase();
          break;

        case "C":
          returnValue += (this.currentFaker.helpers as any).arrayElement([...consonants]).toUpperCase();
          break;

        case "c":
          returnValue += (this.currentFaker.helpers as any).arrayElement([...consonants]).toLowerCase();
          break;

        case "E":
          returnValue += this.currentFaker.datatype.boolean()
            ? (this.currentFaker.helpers as any).arrayElement([...consonants]).toUpperCase()
            : (this.currentFaker.helpers as any).arrayElement([...consonants]).toLowerCase();
          break;

        case "V":
          returnValue += (this.currentFaker.helpers as any).arrayElement([...vowels]).toUpperCase();
          break;

        case "v":
          returnValue += (this.currentFaker.helpers as any).arrayElement([...vowels]).toLowerCase();
          break;

        case "F":
          returnValue += this.currentFaker.datatype.boolean()
            ? (this.currentFaker.helpers as any).arrayElement([...vowels]).toUpperCase()
            : (this.currentFaker.helpers as any).arrayElement([...vowels]).toLowerCase();
          break;

        case "X":
          returnValue += this.randomNumber(1, 9);
          break;

        case "x":
          returnValue += this.randomNumber(0, 9);
          break;

        default:
          returnValue += template[i];
          break;
      }
    }

    return returnValue;
  }

  public paragraph(minWords: number, maxWords: number, minLength: number, maxLength: number): string {
    const wordCount = this.randomNumber(minWords, maxWords);
    let resultPhrase = this.words(wordCount, minLength, maxLength);

    // 确保段落以感叹号结尾
    resultPhrase = resultPhrase.replace(/[?.!,;]? ?[^ ]*$/, "!");

    while (resultPhrase.length < minLength) {
      resultPhrase += "!";
    }

    return resultPhrase;
  }

  public phrase(minLength: number, maxLength: number): string {
    const length = this.randomNumber(5, 20);
    let resultPhrase = this.words(length, minLength, maxLength);

    // 移除标点符号和多余空格
    resultPhrase = resultPhrase.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");

    if (resultPhrase.length < minLength) {
      const missingLength = minLength - resultPhrase.length;
      resultPhrase += this.scrambledWord(missingLength, missingLength);
    }

    return resultPhrase;
  }

  public website(): string {
    // 生成随机网站URL
    return this.currentFaker.internet.url({ protocol: "https", appendSlash: false });
  }

  public phoneNumber(template: string = DEFAULT_TELEPHONE_TEMPLATE): string {
    let i = 0;
    let telephone = "";

    for (; i < template.length; i += 1) {
      if (template[i] === "X") {
        telephone += this.randomNumber(1, 9);
      } else if (template[i] === "x") {
        telephone += this.randomNumber(0, 9);
      } else {
        telephone += template[i];
      }
    }

    return telephone;
  }

  public date(minimumDate?: Date, maximumDate?: Date): string {
    let randomDate: Date;

    if (minimumDate && maximumDate) {
      randomDate = this.currentFaker.date.between({ from: minimumDate, to: maximumDate });
    } else {
      randomDate = this.currentFaker.date.between({
        from: new Date(1970, 0, 1),
        to: new Date(),
      });
    }

    const formattedYear = String(randomDate.getFullYear());
    const formattedMonth = `0${randomDate.getMonth() + 1}`.slice(-2);
    const formattedDay = `0${randomDate.getDate()}`.slice(-2);
    return `${formattedYear}-${formattedMonth}-${formattedDay}`;
  }

  public time(): string {
    const randomDate = this.currentFaker.date.anytime();
    const randomHour = `0${randomDate.getHours()}`.slice(-2);
    const randomMinute = `0${randomDate.getMinutes()}`.slice(-2);
    return `${randomHour}:${randomMinute}`;
  }

  public month(): string {
    return `0${this.randomNumber(1, 12)}`.slice(-2);
  }

  public year(): string {
    return String(this.randomNumber(1970, new Date().getFullYear()));
  }

  public weekNumber(): string {
    return `0${this.randomNumber(1, 52)}`.slice(-2);
  }

  public firstName(): string {
    const name = this.currentFaker.person.firstName();
    console.log("DataGenerator.firstName() generated:", name);
    return name;
  }

  public lastName(): string {
    return this.currentFaker.person.lastName();
  }

  public organizationName(): string {
    return this.currentFaker.company.name();
  }

  public color(): string {
    // 使用 faker 生成随机颜色值
    const hexValues = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i += 1) {
      color += (this.currentFaker.helpers as any).arrayElement([...hexValues]);
    }
    return color;
  }

  public generateRandomStringFromRegExTemplate(regexTemplate: string): string {
    let randomValue = "";

    if (regexTemplate) {
      try {
        const regExGenerator = new RandExp(regexTemplate);
        regExGenerator.defaultRange.add(0, 65535);
        randomValue = regExGenerator.gen();
      } catch (e) {
        randomValue = (e as Error).toString();
      }
    }

    return randomValue;
  }
}

export default DataGenerator;
