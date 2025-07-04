// config keys
export const OPENAI_MODEL_NAME = 'OPENAI_MODEL_NAME';
export const OPENAI_API_KEY = 'OPENAI_API_KEY';
export const OPENAI_BASE_URL = 'OPENAI_BASE_URL';

const allConfigFromEnv = () => {
  // 已经去掉从process.env获取逻辑
  return {
    [OPENAI_API_KEY]: undefined,
    [OPENAI_BASE_URL]: undefined,
    [OPENAI_MODEL_NAME]: undefined,
  };
};

let userConfig: ReturnType<typeof allConfigFromEnv> = {} as any;

export const getAIConfig = (
  configKey: keyof typeof userConfig,
): string | undefined => {
  if (typeof userConfig[configKey] !== 'undefined') {
    return userConfig[configKey];
  }
  return undefined;
};

// export const getAIConfigInJson = (configKey: keyof typeof userConfig) => {
//   const config = getAIConfig(configKey);
//   try {
//     return config ? JSON.parse(config) : undefined;
//   } catch (error: any) {
//     throw new Error(
//       `Failed to parse json config: ${configKey}. ${error.message}`,
//     );
//   }
// };

export const allAIConfig = () => {
  return { ...allConfigFromEnv(), ...userConfig };
};

export const overrideAIConfig = (
  newConfig: ReturnType<typeof allConfigFromEnv>,
  extendMode?: boolean,
) => {
  userConfig = extendMode ? { ...userConfig, ...newConfig } : { ...newConfig };
};

export const parseAIConfig = (configString: string) => {
  const lines = configString.split('\n');
  const config: Record<string, string> = {};
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) return;

    const cleanLine = trimmed
      .replace(/^export\s+/i, '')
      .replace(/;$/, '')
      .trim();
    const match = cleanLine.match(/^(\w+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      let parsedValue = value.trim();

      // Remove surrounding quotes if present
      if (
        (parsedValue.startsWith("'") && parsedValue.endsWith("'")) ||
        (parsedValue.startsWith('"') && parsedValue.endsWith('"'))
      ) {
        parsedValue = parsedValue.slice(1, -1);
      }

      config[key] = parsedValue;
    }
  });
  return config;
};