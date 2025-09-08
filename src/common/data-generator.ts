import { faker } from "@faker-js/faker";
import RandExp from "randexp";

import { DEFAULT_TELEPHONE_TEMPLATE } from "src/common/helpers";

class DataGenerator {
  public randomNumber(start: number, end: number, decimalPlaces = 0): number {
    if (decimalPlaces > 0) {
      return faker.number.float({ min: start, max: end, fractionDigits: decimalPlaces });
    }
    return faker.number.int({ min: Math.ceil(start), max: Math.floor(end) });
  }

  public scrambledWord(minLength = 3, maxLength = 15): string {
    const wordLength = this.randomNumber(minLength, maxLength);

    // 生成一个假单词，如果长度不符合要求则调整
    let resultWord = faker.lorem.word();

    // 如果生成的单词太短，重复生成或添加字符
    while (resultWord.length < minLength) {
      resultWord += faker.lorem.word();
    }

    // 如果太长，截断到合适长度
    if (resultWord.length > wordLength) {
      resultWord = resultWord.substring(0, wordLength);
    }

    return resultWord;
  }

  public words(wordCount: number, minLength = 0, maxLength = 0): string {
    let resultPhrase = "";
    let phraseLength = 0;

    // 如果 wordCount 不足以达到 minLength，则 minLength 优先
    for (let i = 0; i < wordCount || phraseLength < minLength; i += 1) {
      let word = faker.lorem.word();
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

    return resultPhrase;
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
          returnValue += (faker.helpers as any).arrayElement([...alphabets]).toUpperCase();
          break;

        case "l":
          returnValue += (faker.helpers as any).arrayElement([...alphabets]).toLowerCase();
          break;

        case "D":
          returnValue += faker.datatype.boolean()
            ? (faker.helpers as any).arrayElement([...alphabets]).toUpperCase()
            : (faker.helpers as any).arrayElement([...alphabets]).toLowerCase();
          break;

        case "C":
          returnValue += (faker.helpers as any).arrayElement([...consonants]).toUpperCase();
          break;

        case "c":
          returnValue += (faker.helpers as any).arrayElement([...consonants]).toLowerCase();
          break;

        case "E":
          returnValue += faker.datatype.boolean()
            ? (faker.helpers as any).arrayElement([...consonants]).toUpperCase()
            : (faker.helpers as any).arrayElement([...consonants]).toLowerCase();
          break;

        case "V":
          returnValue += (faker.helpers as any).arrayElement([...vowels]).toUpperCase();
          break;

        case "v":
          returnValue += (faker.helpers as any).arrayElement([...vowels]).toLowerCase();
          break;

        case "F":
          returnValue += faker.datatype.boolean()
            ? (faker.helpers as any).arrayElement([...vowels]).toUpperCase()
            : (faker.helpers as any).arrayElement([...vowels]).toLowerCase();
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
    return faker.internet.url({ protocol: "https", appendSlash: false });
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
      randomDate = faker.date.between({ from: minimumDate, to: maximumDate });
    } else {
      randomDate = faker.date.between({
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
    const randomDate = faker.date.anytime();
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
    return faker.person.firstName();
  }

  public lastName(): string {
    return faker.person.lastName();
  }

  public organizationName(): string {
    return faker.company.name();
  }

  public color(): string {
    // 使用 faker 生成随机颜色值
    const hexValues = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i += 1) {
      color += (faker.helpers as any).arrayElement([...hexValues]);
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
