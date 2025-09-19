import React, { useState, useEffect } from "react";
import { render } from "react-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

import { GetMessage } from "src/common/helpers";
import "./index.scss";

interface Message {
  type: "success" | "error" | "info";
  text: string;
}

const SidePanel: React.FC = () => {
  const [loadingStates, setLoadingStates] = useState({
    fillAll: false,
    highlight: false,
    clear: false,
  });
  const [message, setMessage] = useState<Message | null>(null);
  const [version, setVersion] = useState<string>("");

  // Get extension version
  useEffect(() => {
    const manifest = chrome.runtime.getManifest();
    setVersion(manifest.version);
  }, []);

  // Auto-clear success and info messages after 3 seconds
  useEffect(() => {
    if (message && (message.type === "success" || message.type === "info")) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message]);

  const clearMessage = () => {
    setMessage(null);
  };

  const sendMessage = async (action: string, loadingKey: keyof typeof loadingStates) => {
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
    setMessage(null); // Clear previous message
    try {
      const response = await chrome.runtime.sendMessage({ type: action });
      if (response.error || !response.success) {
        const errorMsg = response.error || GetMessage("popup_operationFailed");
        console.error("Error:", errorMsg);
        setMessage({ type: "error", text: errorMsg });
      } else {
        console.log("Operation completed successfully");
        setMessage({ type: "success", text: GetMessage("popup_operationSuccess") });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setMessage({
        type: "error",
        text: errorMsg.includes("Could not establish connection")
          ? GetMessage("popup_connectionError")
          : GetMessage("popup_communicationError", errorMsg),
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleFillAllInputs = () => sendMessage("FILL_ALL_INPUTS", "fillAll");

  const handleStopFilling = async () => {
    try {
      await chrome.runtime.sendMessage({ type: "STOP_FILLING" });
      setLoadingStates((prev) => ({ ...prev, fillAll: false }));
      setMessage({ type: "info", text: GetMessage("popup_stopFillingRequested") });
    } catch (error) {
      console.error("Failed to stop filling:", error);
      setMessage({ type: "error", text: GetMessage("popup_stopFillingFailed") });
    }
  };

  const handleHighlightElements = () => sendMessage("HIGHLIGHT_FORM_ELEMENTS", "highlight");

  const handleClearHighlight = () => sendMessage("CLEAR_FORM_HIGHLIGHT", "clear");

  const handleOpenSettings = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      console.log("chrome.runtime.openOptionsPage not available");
      // Fallback: use chrome.tabs.create
      chrome.tabs.create({
        url: chrome.runtime.getURL("options.html"),
      });
    }
  };

  return (
    <div className="popup-container">
      <div className="main-content">
        <div className="header">
          <button
            type="button"
            onClick={handleOpenSettings}
            className="settings-button"
            title={GetMessage("popup_settings")}
            aria-label={GetMessage("popup_settings")}
          >
            <i className="bi bi-gear" />
          </button>
          <h2 className="title">Auto Filler</h2>
          <p className="description">{GetMessage("popup_description")}</p>
        </div>

        <div className="main-actions">
          <button type="button" onClick={handleFillAllInputs} disabled={loadingStates.fillAll} className="fill-button">
            {loadingStates.fillAll ? GetMessage("popup_filling") : GetMessage("popup_fillAllInputs")}
          </button>

          {loadingStates.fillAll && (
            <button
              type="button"
              onClick={handleStopFilling}
              className="stop-button"
              title={GetMessage("popup_stopFilling")}
              aria-label={GetMessage("popup_stopFilling")}
            >
              ⏹
            </button>
          )}
        </div>

        <div className="secondary-actions">
          <button
            type="button"
            onClick={handleHighlightElements}
            disabled={loadingStates.highlight}
            className="action-button highlight-button"
          >
            {loadingStates.highlight ? GetMessage("popup_identifying") : GetMessage("popup_highlightElements")}
          </button>

          <button
            type="button"
            onClick={handleClearHighlight}
            disabled={loadingStates.clear}
            className="action-button clear-button"
          >
            {loadingStates.clear ? GetMessage("popup_clearing") : GetMessage("popup_clearHighlight")}
          </button>
        </div>

        {message && (
          <div className={`message message-${message.type}`} role="alert" aria-live="polite">
            <span className="message-text">{message.text}</span>
            <button
              type="button"
              className="message-close"
              onClick={clearMessage}
              aria-label="Close message"
              title="Close message"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {version && <div className="version-display">v{version}</div>}
    </div>
  );
};

render(<SidePanel />, document.getElementById("root"));
