import * as fileSaver from "file-saver";
import "bootstrap-icons/font/bootstrap-icons.css";
import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

import { GetMessage } from "src/common/helpers";
import { IProfile } from "src/types";

type Props = {
  profiles: IProfile[];
  profileIndex: number;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
  onNew: () => void;
  onExportProfiles: (selectedProfiles: IProfile[]) => void;
  onImportProfiles: (profiles: IProfile[]) => void;
  children: React.ReactNode;
};

// Toast message component
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

const ProfilesView: React.FC<Props> = (props) => {
  const { profiles, profileIndex } = props;

  // Export/Import state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedProfilesForExport, setSelectedProfilesForExport] = useState<boolean[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleDelete() {
    props.onDelete(profileIndex);
  }

  function handleEdit() {
    props.onEdit(profileIndex);
  }

  function newProfile() {
    props.onNew();
  }

  // Helper functions
  function getDateString(date: Date) {
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  }

  function handleExportClick() {
    if (profiles.length === 0) {
      setErrorMessage(GetMessage("profiles_export_noProfiles") || "No profiles to export");
      return;
    }
    setSelectedProfilesForExport(new Array(profiles.length).fill(true));
    setSelectAllChecked(true);
    setShowExportModal(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleExportConfirm() {
    const selectedProfiles = profiles.filter((_, index) => selectedProfilesForExport[index]);

    if (selectedProfiles.length === 0) {
      setErrorMessage(GetMessage("profiles_export_noneSelected") || "Please select at least one profile to export");
      return;
    }

    try {
      const jsonData = JSON.stringify(selectedProfiles, null, 2);
      const dateStamp = getDateString(new Date());
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8" });
      fileSaver.saveAs(blob, `profiles-${dateStamp}.json`);

      setSuccessMessage(GetMessage("profiles_export_success") || "Profiles exported successfully");
      setShowExportModal(false);
      setErrorMessage("");
      props.onExportProfiles(selectedProfiles);
    } catch (e) {
      setErrorMessage(
        GetMessage("profiles_export_error", (e as Error).toString()) || `Export failed: ${(e as Error).toString()}`
      );
    }
  }

  function handleImportClick() {
    const fileElement = document.getElementById("profileImportFile") as HTMLInputElement;
    fileElement.click();
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string;
        const importedProfiles = JSON.parse(fileContent) as IProfile[];

        // Validate imported profiles structure
        if (!Array.isArray(importedProfiles)) {
          throw new Error("Invalid file format: expected an array of profiles");
        }

        for (const profile of importedProfiles) {
          if (!profile.name || !profile.urlMatch || !Array.isArray(profile.fields)) {
            throw new Error("Invalid profile structure");
          }
        }

        props.onImportProfiles(importedProfiles);
        setSuccessMessage(
          GetMessage("profiles_import_success", importedProfiles.length.toString()) ||
            `Successfully imported ${importedProfiles.length} profiles`
        );
        setErrorMessage("");
      } catch (ex) {
        setErrorMessage(
          GetMessage("profiles_import_error", (ex as Error).toString()) || `Import failed: ${(ex as Error).toString()}`
        );
        setSuccessMessage("");
      }
    };

    fileReader.onerror = () => {
      setErrorMessage(GetMessage("profiles_import_fileError") || "Error reading file");
    };

    fileReader.readAsText(file);

    // Reset file input
    event.target.value = "";
  }

  function toggleProfileSelection(index: number) {
    const updated = [...selectedProfilesForExport];
    updated[index] = !updated[index];
    setSelectedProfilesForExport(updated);

    // Update select all checkbox based on whether all items are selected
    const allSelected = updated.every(Boolean);
    setSelectAllChecked(allSelected);
  }

  function handleSelectAllChange() {
    const newValue = !selectAllChecked;
    setSelectAllChecked(newValue);
    setSelectedProfilesForExport(new Array(profiles.length).fill(newValue));
  }

  return (
    <div className="row">
      <div className="col-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="h6 mb-0">{GetMessage("profiles")}</h3>
          <div className="d-flex">
            <button
              type="button"
              className="btn btn-sm btn-link p-1 me-1"
              onClick={handleExportClick}
              title={GetMessage("profiles_export") || "Export profiles"}
              aria-label={GetMessage("profiles_export") || "Export profiles"}
            >
              <i className="bi bi-download" style={{ fontSize: "14px" }} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-link p-1"
              onClick={handleImportClick}
              title={GetMessage("profiles_import") || "Import profiles"}
              aria-label={GetMessage("profiles_import") || "Import profiles"}
            >
              <i className="bi bi-upload" style={{ fontSize: "14px" }} />
            </button>
          </div>
        </div>
        <nav className="nav nav-pills flex-column">
          <NavLink to="/custom-fields" exact className="nav-link" activeClassName="active">
            {GetMessage("profiles_default_name")}
          </NavLink>
          {profiles.map((p, index) => (
            <NavLink
              key={`profile-${p.name}`}
              to={`/custom-fields/${index}`}
              className="nav-link"
              activeClassName="active"
            >
              {p.name}
            </NavLink>
          ))}
        </nav>
        <p />
        <div className="text-center">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={newProfile}>
            {GetMessage("profiles_create_button_label")}
          </button>
        </div>
      </div>
      <div className="col-9">
        {profileIndex >= 0 && (
          <>
            <div className="float-end">
              <button type="button" className="btn btn-sm btn-link" onClick={handleEdit}>
                <img src="images/edit.svg" width="12" height="12" alt={GetMessage("edit")} />
              </button>
            </div>
            <h3 className="h5">
              {GetMessage("profile")}: {profiles[profileIndex].name}
            </h3>
            <p className="text-muted">
              {GetMessage("profile_url_matching_expression")}: <code>{profiles[profileIndex].urlMatch}</code>
            </p>
          </>
        )}

        {props.children}

        {profileIndex >= 0 && (
          <div className="text-center mt-5">
            <button type="button" onClick={handleDelete} className="btn btn-sm btn-outline-danger">
              {GetMessage("profiles_delete_button_label")}
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input for import */}
      <input type="file" id="profileImportFile" className="d-none" accept=".json" onChange={handleImportFile} />

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {GetMessage("profiles_export_selectTitle") || "Select Profiles to Export"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowExportModal(false);
                    setErrorMessage("");
                  }}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="selectAllProfiles"
                      checked={selectAllChecked}
                      onChange={handleSelectAllChange}
                    />
                    <label className="form-check-label" htmlFor="selectAllProfiles">
                      {GetMessage("profiles_export_selectAll") || "Select All"}
                    </label>
                  </div>
                </div>

                <div className="list-group">
                  {profiles.map((profile, index) => (
                    <label
                      key={`profile-export-${profile.name.replace(/\s+/g, "-")}-${profile.urlMatch.replace(
                        /\s+/g,
                        "-"
                      )}`}
                      className="list-group-item d-flex align-items-center"
                      htmlFor={`profile-checkbox-${index}`}
                    >
                      <input
                        id={`profile-checkbox-${index}`}
                        type="checkbox"
                        className="form-check-input me-3"
                        checked={selectedProfilesForExport[index] || false}
                        onChange={() => toggleProfileSelection(index)}
                      />
                      <div>
                        <strong>{profile.name}</strong>
                        <div className="text-muted small">{profile.urlMatch}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {errorMessage && <div className="alert alert-danger mt-3">{errorMessage}</div>}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowExportModal(false);
                    setErrorMessage("");
                  }}
                >
                  {GetMessage("cancel") || "Cancel"}
                </button>
                <button type="button" className="btn btn-primary" onClick={handleExportConfirm}>
                  {GetMessage("profiles_export_confirm") || "Export Selected"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages */}
      {successMessage && <ToastMessage message={successMessage} type="success" onClose={() => setSuccessMessage("")} />}

      {errorMessage && !showExportModal && (
        <ToastMessage message={errorMessage} type="error" onClose={() => setErrorMessage("")} />
      )}
    </div>
  );
};

export default ProfilesView;
