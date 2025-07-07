import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Redirect, useHistory } from "react-router-dom";

import { GetMessage } from "src/common/helpers";
import { getOptions, createProfile, deleteProfile, saveProfile } from "src/options/actions";
import CustomFieldsView from "src/options/components/custom-fields/CustomFieldsView";
import Introduction from "src/options/components/custom-fields/Introduction";
import ProfileModal from "src/options/components/custom-fields/ProfileModal";
import ProfilesView from "src/options/components/custom-fields/ProfilesView";
import { IAppState, IFakeFillerOptions, ICustomField, IProfile } from "src/types";

export default function CustomFieldsPage(): JSX.Element {
  const dispatch = useDispatch();
  const history = useHistory();

  const { index } = useParams<{ index: string }>();
  const profileIndex = parseInt(String(index || -1), 10);

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [profile, setProfile] = useState<IProfile | undefined>();
  const [actionType, setActionType] = useState<"create" | "edit" | undefined>();

  const isFetching = useSelector<IAppState, boolean>((state) => state.optionsData.isFetching);
  const options = useSelector<IAppState, IFakeFillerOptions | null>((state) => state.optionsData.options);

  useEffect(() => {
    dispatch(getOptions());
  }, [dispatch]);

  if (isFetching || options === null) {
    return <div>{GetMessage("loading")}</div>;
  }

  let customFieldsList: ICustomField[];

  if (profileIndex < 0) {
    customFieldsList = options.fields;
  } else if (profileIndex < options.profiles.length) {
    customFieldsList = options.profiles[profileIndex].fields;
  } else {
    return <Redirect to="/custom-fields" />;
  }

  const closeModal = () => {
    setModalIsOpen(false);
    setProfile(undefined);
    setActionType(undefined);
  };

  const handleDelete = (idx: number) => {
    if (window.confirm(GetMessage("profile_delete_confirm_message"))) {
      dispatch(deleteProfile(idx));
      history.push("/custom-fields");
    }
  };

  const handleEdit = (idx: number) => {
    setProfile(options.profiles[idx]);
    setActionType("edit");
    setModalIsOpen(true);
  };

  const handleNew = () => {
    setProfile(undefined);
    setActionType("create");
    setModalIsOpen(true);
  };

  const handleSave = (formValues: IProfile) => {
    if (actionType === "edit") {
      dispatch(saveProfile(formValues, profileIndex));
    } else {
      dispatch(createProfile(formValues));
    }
    closeModal();
  };

  return (
    <>
      <h2>{GetMessage("customFields_title")}</h2>
      <Introduction />
      <hr />
      <ProfilesView
        profileIndex={profileIndex}
        profiles={options.profiles || []}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onNew={handleNew}
      >
        <CustomFieldsView customFields={customFieldsList} profileIndex={profileIndex} />
      </ProfilesView>

      <ProfileModal isOpen={modalIsOpen} onClose={closeModal} onSave={handleSave} profile={profile} />
    </>
  );
}
