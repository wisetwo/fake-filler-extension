import React, { useState } from "react";
import { render } from "react-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

interface Message {
  type: "success" | "error" | "info";
  text: string;
}

const getMessageBackgroundColor = (type: Message["type"]) => {
  switch (type) {
    case "success":
      return "#d4edda";
    case "error":
      return "#f8d7da";
    case "info":
      return "#d1ecf1";
    default:
      return "#f8f9fa";
  }
};

const getMessageTextColor = (type: Message["type"]) => {
  switch (type) {
    case "success":
      return "#155724";
    case "error":
      return "#721c24";
    case "info":
      return "#0c5460";
    default:
      return "#333";
  }
};

const getMessageBorderColor = (type: Message["type"]) => {
  switch (type) {
    case "success":
      return "#c3e6cb";
    case "error":
      return "#f5c6cb";
    case "info":
      return "#bee5eb";
    default:
      return "#e0e0e0";
  }
};

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
    <div
      style={{
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ marginBottom: "20px", position: "relative" }}>
        <button
          type="button"
          onClick={handleOpenSettings}
          style={{
            position: "absolute",
            top: "0",
            right: "0",
            background: "none",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            color: "#999",
          }}
          title="设置"
          aria-label="设置"
        >
          <i className="bi bi-gear" />
        </button>
        <h2
          style={{
            margin: "0 0 10px 0",
            fontSize: "18px",
            color: "#333",
            fontWeight: "600",
          }}
        >
          Auto Filler
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#666",
            lineHeight: "1.4",
          }}
        >
          使用下面的按钮或右键菜单来填充页面中的表单字段
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={handleFillAllInputs}
          disabled={loadingStates.fillAll}
          style={{
            flex: 1,
            padding: "16px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loadingStates.fillAll ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: loadingStates.fillAll ? 0.6 : 1,
            boxShadow: "0 2px 4px rgba(0, 123, 255, 0.2)",
          }}
          onFocus={(e) => {
            if (!loadingStates.fillAll) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#0056b3";
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.3)";
            }
          }}
          onBlur={(e) => {
            if (!loadingStates.fillAll) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#007bff";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0, 123, 255, 0.2)";
            }
          }}
        >
          {loadingStates.fillAll ? "正在填充..." : "🚀 填充所有输入框"}
        </button>

        {loadingStates.fillAll && (
          <button
            type="button"
            onClick={handleStopFilling}
            style={{
              width: "48px",
              height: "48px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "50%",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(220, 53, 69, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onFocus={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#c82333";
              (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(220, 53, 69, 0.3)";
            }}
            onBlur={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#dc3545";
              (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(220, 53, 69, 0.2)";
            }}
            title="停止填充"
            aria-label="停止填充"
          >
            ⏹
          </button>
        )}
      </div>

      {/* 两个小按钮 */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "15px",
        }}
      >
        <button
          type="button"
          onClick={handleHighlightElements}
          disabled={loadingStates.highlight}
          style={{
            flex: 1,
            padding: "12px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: loadingStates.highlight ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: loadingStates.highlight ? 0.6 : 1,
          }}
        >
          {loadingStates.highlight ? "识别中..." : "🔍 识别表单"}
        </button>

        <button
          type="button"
          onClick={handleClearHighlight}
          disabled={loadingStates.clear}
          style={{
            flex: 1,
            padding: "12px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: loadingStates.clear ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: loadingStates.clear ? 0.6 : 1,
          }}
        >
          {loadingStates.clear ? "清除中..." : "🧹 清除识别"}
        </button>
      </div>

      {/* 消息显示区域 */}
      {message && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            backgroundColor: getMessageBackgroundColor(message.type),
            color: getMessageTextColor(message.type),
            border: `1px solid ${getMessageBorderColor(message.type)}`,
          }}
        >
          {message.type === "success" && "✅ "}
          {message.type === "error" && "❌ "}
          {message.type === "info" && "ℹ️ "}
          {message.text}
        </div>
      )}
    </div>
  );
};

render(<SidePanel />, document.getElementById("root"));
