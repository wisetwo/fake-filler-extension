import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Redirect } from "react-router-dom";

import { GetMessage } from "src/common/helpers";
import { getOptions } from "src/options/actions";
import CustomFieldsView from "src/options/components/custom-fields/CustomFieldsView";
import Introduction from "src/options/components/custom-fields/Introduction";
import ProfilesView from "src/options/components/custom-fields/ProfilesView";
import { IAppState, IFakeFillerOptions, ICustomField } from "src/types";

export default function CustomFieldsPage(): JSX.Element {
  const dispatch = useDispatch();

  const { index } = useParams<{ index: string }>();
  const profileIndex = parseInt(String(index || -1), 10);

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

  const handleDelete = (idx: number) => {
    // TODO: Implement delete functionality
    console.log("Delete profile at index:", idx);
  };

  const handleEdit = (idx: number) => {
    // TODO: Implement edit functionality
    console.log("Edit profile at index:", idx);
  };

  const handleNew = () => {
    // TODO: Implement new profile functionality
    console.log("Create new profile");
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
    </>
  );
}
