import "bootstrap-icons/font/bootstrap-icons.css";
import React, { useState, useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

const ToastMessage: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const duration = type === "success" ? 3000 : 5000;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade out animation
  };

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    // Auto close timer
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  return (
    <div
      className={`position-fixed top-0 start-50 translate-middle-x mt-3 ${isVisible ? "opacity-100" : "opacity-0"}`}
      style={{
        zIndex: 1060,
        transition: "opacity 0.3s ease-in-out",
        transform: "translateX(-50%)",
        maxWidth: "400px",
        width: "90vw",
      }}
    >
      <div
        className={`alert alert-${type === "success" ? "success" : "danger"} alert-dismissible shadow-sm mb-0`}
        style={{ position: "relative", overflow: "hidden" }}
      >
        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "3px",
            width: `${progress}%`,
            backgroundColor: type === "success" ? "#198754" : "#dc3545",
            transition: "width 0.1s linear",
            opacity: 0.7,
          }}
        />

        <div className="d-flex align-items-start">
          <div className="me-2 mt-1">
            <i
              className={`bi ${type === "success" ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"}`}
              style={{ fontSize: "16px" }}
            />
          </div>
          <div className="flex-grow-1">{message}</div>
          <button
            type="button"
            className="btn-close ms-2"
            onClick={handleClose}
            aria-label="Close"
            style={{ fontSize: "12px" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ToastMessage;
