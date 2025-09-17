import * as fileSaver from "file-saver";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { GetMessage } from "src/common/helpers";
import { getKeyboardShortcuts, getOptions, saveOptions, MyThunkDispatch } from "src/options/actions";
import HtmlPhrase from "src/options/components/common/HtmlPhrase";
import { IAppState, IFakeFillerOptions } from "src/types";

// function utf8ToBase64(str: string): string {
//   return window.btoa(unescape(encodeURIComponent(str)));
// }

// function base64ToUtf8(str: string): string {
//   return decodeURIComponent(escape(window.atob(str)));
// }

function SystemToolsPage() {
  // Keyboard shortcuts state
  const keyboardShortcutsIsFetching = useSelector<IAppState, boolean>(
    (state) => state.keyboardShortcutsData.isFetching
  );
  const keyboardShortcuts = useSelector<IAppState, chrome.commands.Command[]>(
    (state) => state.keyboardShortcutsData.shortcuts
  );

  // Backup and restore state
  const [showSuccess, setShowSuccess] = useState(false);
  const [backupData, setBackupData] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isVersionMismatch, setIsVersionMismatch] = useState(false);
  const [importedOptions, setImportedOptions] = useState<IFakeFillerOptions>();
  const optionsIsFetching = useSelector<IAppState, boolean>((state) => state.optionsData.isFetching);
  const options = useSelector<IAppState, IFakeFillerOptions | null>((state) => state.optionsData.options);

  const dispatch = useDispatch<MyThunkDispatch>();

  useEffect(() => {
    dispatch(getKeyboardShortcuts());
    dispatch(getOptions());
  }, [dispatch]);

  const currentOptionsVersion = (options && options.version) || 0;

  // Keyboard shortcuts functions
  function getTranslatedDescription(key: string) {
    if (key.startsWith("__MSG_")) {
      return GetMessage(key.replace("__MSG_", "").replace("__", ""));
    }
    return key;
  }

  // Backup and restore functions
  function getDateString(date: Date) {
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    return `${year}-${month}-${day}`;
  }

  function exportSettings() {
    const jsonData = JSON.stringify(options, null, 2);
    const dateStamp = getDateString(new Date());

    try {
      const blob = new Blob([jsonData], { type: "application/json;charset=utf-8" });
      fileSaver.saveAs(blob, `fake-filler-${dateStamp}.json`);
    } catch (e) {
      setErrorMessage(GetMessage("backupRestore_errorCreatingBackupFile", (e as Error).toString()));
      setBackupData(jsonData);
    }
  }

  function importSettings() {
    const fileElement = document.getElementById("file") as HTMLInputElement;

    if (fileElement.files && fileElement.files.length === 1 && fileElement.files[0].name.length > 0) {
      // eslint-disable-next-line no-alert
      if (window.confirm(GetMessage("backupRestore_confirmRestore"))) {
        const fileReader = new FileReader();

        fileReader.onload = (e) => {
          try {
            const reader = e.target as FileReader;
            const fileContent = reader.result as string;
            const decodedOptions = JSON.parse(fileContent) as IFakeFillerOptions;
            const importedOptionsVersion = decodedOptions.version || 0;

            if (currentOptionsVersion === importedOptionsVersion) {
              dispatch(saveOptions(decodedOptions)).then(() => {
                setShowSuccess(true);
                setErrorMessage("");
              });
            } else {
              setImportedOptions(decodedOptions);
              setIsVersionMismatch(true);
            }
          } catch (ex) {
            setShowSuccess(false);
            setErrorMessage(GetMessage("backupRestore_errorImporting", (ex as Error).toString()));
          }
        };

        fileReader.onerror = () => {
          setShowSuccess(false);
          setErrorMessage(GetMessage("backupRestore_errorReadingFile"));
        };

        fileReader.readAsText(fileElement.files[0]);
      }
    }
  }

  function forceImportOldSettings() {
    // eslint-disable-next-line no-alert
    if (importedOptions && window.confirm(GetMessage("backupRestore_confirmImportOldBackup"))) {
      dispatch(saveOptions(importedOptions)).then(() => {
        setShowSuccess(true);
        setErrorMessage("");
        setIsVersionMismatch(false);
      });
    }
  }

  function triggerImportSettings() {
    const fileElement = document.getElementById("file") as HTMLInputElement;
    fileElement.click();
  }

  function selectTextAreaText() {
    const textAreaElement = document.getElementById("backupTextArea") as HTMLTextAreaElement;
    textAreaElement.select();
  }

  const notSetText = <small>{GetMessage("kbdShortcuts_notSet")}</small>;

  let backupDataElements = null;

  if (backupData) {
    backupDataElements = (
      <div className="form-group">
        <textarea id="backupTextArea" className="form-control" rows={10} onClick={selectTextAreaText} readOnly>
          {backupData}
        </textarea>
        <div className="help-text">{GetMessage("backupRestore_copyAndSaveToFile")}</div>
      </div>
    );
  }

  if (keyboardShortcutsIsFetching || optionsIsFetching) {
    return <div>{GetMessage("loading")}</div>;
  }

  return (
    <>
      <h2>{GetMessage("systemTools_title")}</h2>

      {/* Keyboard Shortcuts Section */}
      <div className="mb-5">
        <h3>{GetMessage("kbdShortcuts_title")}</h3>
        <table className="table table-bordered table-sm">
          <tbody>
            {keyboardShortcuts.map((item) => {
              if (item.description) {
                return (
                  <tr key={item.name}>
                    <td className="narrow text-center">{item.shortcut ? <kbd>{item.shortcut}</kbd> : notSetText}</td>
                    <td>{getTranslatedDescription(item.description)}</td>
                  </tr>
                );
              }

              return null;
            })}
          </tbody>
        </table>
        <HtmlPhrase phrase={GetMessage("kbdShortcuts_changeInstructions")} as="p" />
      </div>

      {/* Backup and Restore Section */}
      <div>
        <h3>{GetMessage("backupRestore_title")}</h3>
        <div className="mb-1">
          <button type="button" className="btn btn-link" onClick={exportSettings}>
            {GetMessage("backupRestore_exportSettings")}
          </button>
        </div>
        <div className="mb-1">
          <button type="button" className="btn btn-link" onClick={triggerImportSettings}>
            {GetMessage("backupRestore_importSettings")}
          </button>
        </div>
        {backupDataElements}
        <input type="file" className="invisible" id="file" onChange={importSettings} />
        {errorMessage && <p className="alert alert-danger">{errorMessage}</p>}
        {showSuccess && (
          <p className="alert alert-success">{GetMessage("backupRestore_settingImportSuccessMessage")}</p>
        )}

        {isVersionMismatch && (
          <div className="alert alert-danger">
            <p>{GetMessage("backupRestore_oldBackupErrorMessage")}</p>
            <div>
              <button
                type="button"
                className="btn btn-sm font-weight-bold btn-link p-0 text-danger"
                onClick={forceImportOldSettings}
              >
                {GetMessage("backupRestore_continueAnyway")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SystemToolsPage;
