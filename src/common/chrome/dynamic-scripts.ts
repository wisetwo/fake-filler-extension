import { ifInBrowser } from "src/shared/utils";

// remember to include this file into extension's package
// extract html element from page
let scriptFileContentCache: string | null = null;
export const getHtmlElementScript = async () => {
  const scriptFileToRetrieve = chrome.runtime.getURL("build/htmlElement.js");
  if (scriptFileContentCache) return scriptFileContentCache;
  const script = await fetch(scriptFileToRetrieve);
  scriptFileContentCache = await script.text();
  return scriptFileContentCache;
};

// inject water flow animation
let waterFlowScriptFileContentCache: string | null = null;
export const injectWaterFlowAnimation = async () => {
  console.log("injectWaterFlowAnimation: starting");
  try {
    if (waterFlowScriptFileContentCache) {
      console.log("injectWaterFlowAnimation: returning cached content");
      return waterFlowScriptFileContentCache;
    }

    console.log("injectWaterFlowAnimation: requesting script from service worker");
    const response = await new Promise<{ content: string }>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "GET_EXTENSION_RESOURCE",
          resourcePath: "build/water-flow.js",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        }
      );
    });

    console.log("injectWaterFlowAnimation: script loaded, length:", response.content.length);
    waterFlowScriptFileContentCache = response.content;
    return waterFlowScriptFileContentCache;
  } catch (error) {
    console.error("injectWaterFlowAnimation: error occurred:", error);
    throw error;
  }
};

// inject stop water flow animation
let stopWaterFlowScriptFileContentCache: string | null = null;
export const injectStopWaterFlowAnimation = async () => {
  console.log("injectStopWaterFlowAnimation: starting");
  try {
    if (stopWaterFlowScriptFileContentCache) {
      console.log("injectStopWaterFlowAnimation: returning cached content");
      return stopWaterFlowScriptFileContentCache;
    }

    console.log("injectStopWaterFlowAnimation: requesting script from service worker");
    const response = await new Promise<{ content: string }>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "GET_EXTENSION_RESOURCE",
          resourcePath: "build/stop-water-flow.js",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        }
      );
    });

    console.log("injectStopWaterFlowAnimation: script loaded, length:", response.content.length);
    stopWaterFlowScriptFileContentCache = response.content;
    return stopWaterFlowScriptFileContentCache;
  } catch (error) {
    console.error("injectStopWaterFlowAnimation: error occurred:", error);
    throw error;
  }
};
