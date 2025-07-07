import React from "react";
import { NavLink } from "react-router-dom";

import { GetMessage } from "src/common/helpers";
import { IProfile } from "src/types";

type Props = {
  profiles: IProfile[];
  profileIndex: number;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
  onNew: () => void;
  children: React.ReactNode;
};

const ProfilesView: React.FC<Props> = (props) => {
  const { profiles, profileIndex } = props;

  function handleDelete() {
    props.onDelete(profileIndex);
  }

  function handleEdit() {
    props.onEdit(profileIndex);
  }

  function newProfile() {
    props.onNew();
  }

  return (
    <div className="row">
      <div className="col-3">
        <h3 className="h6">{GetMessage("profiles")}</h3>
        <nav className="nav flex-column">
          <NavLink to="/custom-fields" className={(isActive) => (isActive ? "nav-link active" : "nav-link")}>
            {GetMessage("profiles_default_name")}
          </NavLink>
          {profiles.map((p, index) => (
            <NavLink
              key={`profile-${p.name}`}
              to={`/custom-fields/${index}`}
              className={(isActive) => (isActive ? "nav-link active" : "nav-link")}
            >
              {p.name}
            </NavLink>
          ))}
        </nav>
        <p />
        <div className="text-center">
          <button type="button" className="btn btn-sm btn-link" onClick={newProfile}>
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
    </div>
  );
};

export default ProfilesView;
