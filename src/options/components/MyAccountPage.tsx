import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Redirect, useHistory } from "react-router-dom";

import { logout, getOptionsLastUpdatedTimestamp, saveOptionsToDb } from "src/common/firebase";
import { GetFakeFillerOptions, GetMessage } from "src/common/helpers";
import HtmlPhrase from "src/options/components/common/HtmlPhrase";
import { IAppState, FirebaseUser } from "src/types";

const MyAccountPage = () => {
  const user = useSelector<IAppState, FirebaseUser>((state) => state.authData.user);
  const [optionsLastUpdatedTimestamp, setOptionsLastUpdatedTimestamp] = useState<Date>();
  const history = useHistory();

  useEffect(() => {
    getOptionsLastUpdatedTimestamp().then((timestamp) => {
      setOptionsLastUpdatedTimestamp(timestamp);
    });
  }, []);

  function handleLogout() {
    logout().then(() => {
      history.push("/login");
    });
  }

  async function handleStartSync() {
    const options = await GetFakeFillerOptions();
    await saveOptionsToDb(options);
    setOptionsLastUpdatedTimestamp(new Date());
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <div>
      <h2>{GetMessage("account_myAccount")}</h2>

      <div className="row">
        <div className="col-md-8">
          <dl>
            <dt>{GetMessage("account_emailAddress")}</dt>
            <dd>{user.email}</dd>

            <dt>{GetMessage("account_edition")}</dt>
            <dd>
              <span className="badge badge-success">Community</span>
            </dd>

            {optionsLastUpdatedTimestamp && (
              <>
                <dt>{GetMessage("account_settingsLastUpdated")}</dt>
                <dd>
                  {optionsLastUpdatedTimestamp.toLocaleString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </dd>
              </>
            )}
          </dl>
        </div>
        <div className="col-md-4">
          {!optionsLastUpdatedTimestamp && (
            <div>
              <div className="d-flex">
                <img src="images/sync.svg" width="24" height="24" alt="Sync" />
                <h3 className="h5 ml-2">{GetMessage("account_enableSync_title")}</h3>
              </div>
              <p>{GetMessage("account_enableSync_message")}</p>
              <div className="sync-tip rounded p-2 mb-3">
                <HtmlPhrase phrase={GetMessage("account_enableSync_tip")} />
              </div>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleStartSync}>
                {GetMessage("account_enableSync_button")}
              </button>
            </div>
          )}

        </div>
      </div>

      <div className="mt-5">
        <a className="btn btn-secondary btn-sm mr-3" href="http://fakefiller.com/account/">
          {GetMessage("account_manageAccount")}
        </a>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
          {GetMessage("account_logout")}
        </button>
      </div>
    </div>
  );
};

export default MyAccountPage;
