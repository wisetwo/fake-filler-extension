import React, { useState } from "react";
import { render } from "react-dom";

const SidePanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (action: string) => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: action });
      if (response.error || !response.success) {
        const errorMsg = response.error || "操作失败";
        console.error("Error:", errorMsg);
        alert(`错误: ${errorMsg}`);
      } else {
        console.log("操作成功完成");
        // 可以显示成功提示
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(`通信错误: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillAllInputs = () => sendMessage("FILL_ALL_INPUTS");

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

      <button
        type="button"
        onClick={handleFillAllInputs}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "16px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: isLoading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          opacity: isLoading ? 0.6 : 1,
          boxShadow: "0 2px 4px rgba(0, 123, 255, 0.2)",
        }}
        onFocus={(e) => {
          if (!isLoading) {
            (e.target as HTMLButtonElement).style.backgroundColor = "#0056b3";
            (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 4px 8px rgba(0, 123, 255, 0.3)";
          }
        }}
        onBlur={(e) => {
          if (!isLoading) {
            (e.target as HTMLButtonElement).style.backgroundColor = "#007bff";
            (e.target as HTMLButtonElement).style.transform = "translateY(0)";
            (e.target as HTMLButtonElement).style.boxShadow = "0 2px 4px rgba(0, 123, 255, 0.2)";
          }
        }}
      >
        {isLoading ? "正在填充..." : "🚀 填充所有输入框"}
      </button>

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
