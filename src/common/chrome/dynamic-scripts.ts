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
    const waterFlowScriptFileToRetrieve = chrome.runtime.getURL("build/water-flow.js");
    console.log("injectWaterFlowAnimation: file URL:", waterFlowScriptFileToRetrieve);

    if (waterFlowScriptFileContentCache) {
      console.log("injectWaterFlowAnimation: returning cached content");
      return waterFlowScriptFileContentCache;
    }

    console.log("injectWaterFlowAnimation: fetching script file");
    const script = await fetch(waterFlowScriptFileToRetrieve);
    console.log("injectWaterFlowAnimation: fetch response status:", script.status);

    if (!script.ok) {
      throw new Error(`Failed to fetch water flow script: ${script.status} ${script.statusText}`);
    }

    console.log("injectWaterFlowAnimation: reading script text");
    waterFlowScriptFileContentCache = await script.text();
    console.log("injectWaterFlowAnimation: script loaded, length:", waterFlowScriptFileContentCache.length);

    return waterFlowScriptFileContentCache;
  } catch (error) {
    console.error("injectWaterFlowAnimation: error occurred:", error);
    throw error;
  }
};

// inject stop water flow animation
let stopWaterFlowScriptFileContentCache: string | null = null;
export const injectStopWaterFlowAnimation = async () => {
  const stopWaterFlowScriptFileToRetrieve = chrome.runtime.getURL("build/stop-water-flow.js");
  if (stopWaterFlowScriptFileContentCache) return stopWaterFlowScriptFileContentCache;
  const script = await fetch(stopWaterFlowScriptFileToRetrieve);
  stopWaterFlowScriptFileContentCache = await script.text();
  return stopWaterFlowScriptFileContentCache;
};
