// config keys
export const OPENAI_MODEL_NAME = 'OPENAI_MODEL_NAME';
export const OPENAI_API_KEY = 'OPENAI_API_KEY';
export const OPENAI_BASE_URL = 'OPENAI_BASE_URL';

const allConfigFromEnv = () => {
  return {
    [OPENAI_API_KEY]: process.env[OPENAI_API_KEY] || undefined,
    [OPENAI_BASE_URL]: process.env[OPENAI_BASE_URL] || undefined,
    [OPENAI_MODEL_NAME]: process.env[OPENAI_MODEL_NAME] || undefined,
  };
};

let userConfig: ReturnType<typeof allConfigFromEnv> = {} as any;

export const getAIConfig = (
  configKey: keyof typeof userConfig,
): string | undefined => {
  if (typeof userConfig[configKey] !== 'undefined') {
    return userConfig[configKey];
  }
  return allConfigFromEnv()[configKey];
};

export const getAIConfigInJson = (configKey: keyof typeof userConfig) => {
  const config = getAIConfig(configKey);
  try {
    return config ? JSON.parse(config) : undefined;
  } catch (error: any) {
    throw new Error(
      `Failed to parse json config: ${configKey}. ${error.message}`,
    );
  }
};

export const allAIConfig = () => {
  return { ...allConfigFromEnv(), ...userConfig };
};

export const overrideAIConfig = (
  newConfig: ReturnType<typeof allConfigFromEnv>,
  extendMode?: boolean,
) => {
  userConfig = extendMode ? { ...userConfig, ...newConfig } : { ...newConfig };
};
