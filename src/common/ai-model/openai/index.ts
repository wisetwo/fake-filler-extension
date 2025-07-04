import assert from 'node:assert';
import { type AIUsageInfo } from 'src/types';
// import dJSON from 'dirty-json';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import {
  OPENAI_MODEL_NAME,
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  // allAIConfig,
  getAIConfig,
  // getAIConfigInJson,
} from 'src/env';

// default model
const defaultModel = 'gpt-3.5-turbo';
export function getModelName() {
  let modelName = defaultModel;
  const nameInConfig = getAIConfig(OPENAI_MODEL_NAME);
  if (nameInConfig) {
    modelName = nameInConfig;
  }
  return modelName;
}

async function createOpenAI() {
  let openai: OpenAI;
  openai = new OpenAI({
    baseURL: getAIConfig(OPENAI_BASE_URL),
    apiKey: getAIConfig(OPENAI_API_KEY),
    dangerouslyAllowBrowser: true,
  });

  return openai;
}

export async function complete(
  messages: ChatCompletionMessageParam[],
  responseFormat?:
    | OpenAI.ChatCompletionCreateParams['response_format']
    | OpenAI.ResponseFormatJSONObject,
): Promise<{ content: string; usage?: AIUsageInfo }> {
  const openai = await createOpenAI();
  // const startTime = Date.now();
  const model = getModelName();
  const completion = await openai.chat.completions.create({
    model,
    messages,
    response_format: responseFormat,
    temperature: 0.1,
    stream: false,
  } as any);
  const { content } = completion.choices[0].message;
  assert(content, 'empty content');
  return { content, usage: completion.usage };
}

export function extractJSONFromCodeBlock(response: string) {
  // First, try to match a JSON object directly in the response
  const jsonMatch = response.match(/^\s*(\{[\s\S]*\})\s*$/);
  if (jsonMatch) {
    return jsonMatch[1];
  }

  // If no direct JSON object is found, try to extract JSON from a code block
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // If no code block is found, try to find a JSON-like structure in the text
  const jsonLikeMatch = response.match(/\{[\s\S]*\}/);
  if (jsonLikeMatch) {
    return jsonLikeMatch[0];
  }

  // If no JSON-like structure is found, return the original response
  return response;
}
