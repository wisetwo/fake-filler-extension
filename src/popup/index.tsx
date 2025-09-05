import React, { useState } from "react";
import { render } from "react-dom";

const SidePanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (action: string) => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: action });
      if (response.error) {
        console.error("Error:", response.error);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillAllInputs = () => sendMessage("FILL_ALL_INPUTS");
  const handleFillThisForm = () => sendMessage("FILL_THIS_FORM");
  const handleFillThisInput = () => sendMessage("FILL_THIS_INPUT");

  return (
    <div
      style={{
        padding: "20px",
        minHeight: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: "#f8f9fa",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
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
          使用下面的按钮来填充页面中的表单字段
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          type="button"
          onClick={handleFillAllInputs}
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            opacity: isLoading ? 0.6 : 1,
          }}
          onFocus={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#0056b3";
            }
          }}
          onBlur={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#007bff";
            }
          }}
        >
          {isLoading ? "处理中..." : "填充所有输入框"}
        </button>

        <button
          type="button"
          onClick={handleFillThisForm}
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            opacity: isLoading ? 0.6 : 1,
          }}
          onFocus={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#1e7e34";
            }
          }}
          onBlur={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#28a745";
            }
          }}
        >
          {isLoading ? "处理中..." : "填充当前表单"}
        </button>

        <button
          type="button"
          onClick={handleFillThisInput}
          disabled={isLoading}
          style={{
            padding: "12px 16px",
            backgroundColor: "#ffc107",
            color: "#212529",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s ease",
            opacity: isLoading ? 0.6 : 1,
          }}
          onFocus={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#e0a800";
            }
          }}
          onBlur={(e) => {
            if (!isLoading) {
              (e.target as HTMLButtonElement).style.backgroundColor = "#ffc107";
            }
          }}
        >
          {isLoading ? "处理中..." : "填充当前输入框"}
        </button>
      </div>

      <div
        style={{
          marginTop: "30px",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "#999",
            textAlign: "center",
          }}
        >
          你也可以使用右键菜单或键盘快捷键
        </p>
      </div>
    </div>
  );
};

render(<SidePanel />, document.getElementById("root"));
