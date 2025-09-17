import React, { useState } from "react";
import { render } from "react-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
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

  const sendMessage = async (action: string, loadingKey: keyof typeof loadingStates) => {
    setLoadingStates((prev) => ({ ...prev, [loadingKey]: true }));
    setMessage(null); // 清除之前的消息
    try {
      const response = await chrome.runtime.sendMessage({ type: action });
      if (response.error || !response.success) {
        const errorMsg = response.error || "操作失败";
        console.error("Error:", errorMsg);
        setMessage({ type: "error", text: errorMsg });
      } else {
        console.log("操作成功完成");
        setMessage({ type: "success", text: "操作成功完成" });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMsg = error instanceof Error ? error.message : "未知错误";
      setMessage({
        type: "error",
        text: errorMsg.includes("Could not establish connection")
          ? "无法连接到页面，请确保当前页面允许扩展运行"
          : `通信错误: ${errorMsg}`,
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
      setMessage({ type: "info", text: "已请求停止填充" });
    } catch (error) {
      console.error("Failed to stop filling:", error);
      setMessage({ type: "error", text: "停止填充失败" });
    }
  };

  const handleHighlightElements = () => sendMessage("HIGHLIGHT_FORM_ELEMENTS", "highlight");

  const handleClearHighlight = () => sendMessage("CLEAR_FORM_HIGHLIGHT", "clear");

  const handleOpenSettings = () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      console.log("chrome.runtime.openOptionsPage not available");
      // 方法2：使用chrome.tabs.create作为备选
      chrome.tabs.create({
        url: chrome.runtime.getURL("options.html"),
      });
    }
  };

  return (
    <div className="popup-container">
      <div className="header">
        <button type="button" onClick={handleOpenSettings} className="settings-button" title="设置" aria-label="设置">
          <i className="bi bi-gear" />
        </button>
        <h2 className="title">Auto Filler</h2>
        <p className="description">点击按钮或使用右键菜单来开始填充</p>
      </div>

      <div className="main-actions">
        <button type="button" onClick={handleFillAllInputs} disabled={loadingStates.fillAll} className="fill-button">
          {loadingStates.fillAll ? "正在填充..." : "🚀 填充所有输入框"}
        </button>

        {loadingStates.fillAll && (
          <button
            type="button"
            onClick={handleStopFilling}
            className="stop-button"
            title="停止填充"
            aria-label="停止填充"
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
          {loadingStates.highlight ? "识别中..." : "🔍 识别表单"}
        </button>

        <button
          type="button"
          onClick={handleClearHighlight}
          disabled={loadingStates.clear}
          className="action-button clear-button"
        >
          {loadingStates.clear ? "清除中..." : "🧹 清除识别"}
        </button>
      </div>

      {message && <div className={`message message-${message.type}`}>{message.text}</div>}
    </div>
  );
};

render(<SidePanel />, document.getElementById("root"));
