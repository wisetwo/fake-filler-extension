import * as fileSaver from "file-saver";
import React, { useState } from "react";
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

const ProfilesView: React.FC<Props> = (props) => {
  const { profiles, profileIndex } = props;

  // Export/Import state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedProfilesForExport, setSelectedProfilesForExport] = useState<boolean[]>([]);
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
  }

  function selectAllProfiles() {
    setSelectedProfilesForExport(new Array(profiles.length).fill(true));
  }

  function selectNoneProfiles() {
    setSelectedProfilesForExport(new Array(profiles.length).fill(false));
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9,15 12,18 15,15" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-link p-1"
              onClick={handleImportClick}
              title={GetMessage("profiles_import") || "Import profiles"}
              aria-label={GetMessage("profiles_import") || "Import profiles"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="12" x2="12" y2="18" />
                <polyline points="9,15 12,12 15,15" />
              </svg>
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
                  onClick={() => setShowExportModal(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={selectAllProfiles}>
                    {GetMessage("profiles_export_selectAll") || "Select All"}
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectNoneProfiles}>
                    {GetMessage("profiles_export_selectNone") || "Select None"}
                  </button>
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
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

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 1060 }}>
          <div className="alert alert-success alert-dismissible">
            {successMessage}
            <button type="button" className="btn-close" onClick={() => setSuccessMessage("")} aria-label="Close" />
          </div>
        </div>
      )}

      {errorMessage && !showExportModal && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 1060 }}>
          <div className="alert alert-danger alert-dismissible">
            {errorMessage}
            <button type="button" className="btn-close" onClick={() => setErrorMessage("")} aria-label="Close" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilesView;
