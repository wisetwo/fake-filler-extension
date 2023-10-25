import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { GetMessage } from "src/common/helpers";
import { createCustomField, deleteCustomField, saveCustomField, saveSortedCustomFields } from "src/options/actions";
import CustomFieldModal from "src/options/components/custom-fields/CustomFieldModal";
import CustomFieldsList from "src/options/components/custom-fields/CustomFieldsList";
import { ICustomField, ICustomFieldForm } from "src/types";

type Props = {
  profileIndex: number;
  customFields: ICustomField[];
};

export default function CustomFieldsView(props: Props): JSX.Element {
  const { profileIndex, customFields } = props;

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [customFieldIndex, setCustomFieldIndex] = useState(-1);
  const [customField, setCustomField] = useState<ICustomField | null>(null);
  const [actionType, setActionType] = useState<"create" | "edit" | undefined>();

  const dispatch = useDispatch();

  function closeModal(): void {
    setModalIsOpen(false);
    setCustomField(null);
    setActionType(undefined);
    setCustomFieldIndex(-1);
  }

  function newCustomField(index: number): void {
    setCustomFieldIndex(index);
    setActionType("create");
    setCustomField(null);
    setModalIsOpen(true);
  }

  function handleEdit(currentCustomField: ICustomField, index: number): void {
    setCustomFieldIndex(index);
    setCustomField(currentCustomField);
    setActionType("edit");
    setModalIsOpen(true);
  }

  function handleDelete(index: number): void {
    // eslint-disable-next-line no-alert
    if (window.confirm(GetMessage("customFields_delete_confirm_message"))) {
      dispatch(deleteCustomField(index, profileIndex));
    }
  }

  function handleSort(sortedCustomFields: ICustomField[]): void {
    dispatch(saveSortedCustomFields(sortedCustomFields, profileIndex));
  }

  function handleSave(formValues: ICustomFieldForm): void {
    if (actionType === "edit") {
      dispatch(saveCustomField(formValues, customFieldIndex, profileIndex));
    } else {
      dispatch(createCustomField(formValues, customFieldIndex, profileIndex));
    }
    closeModal();
  }

  return (
    <>
      <b>Items listed earlier match earlier.</b> 
      <CustomFieldsList
        customFields={customFields}
        onAdd={newCustomField}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSort={handleSort}
      />
      <b>Items listed later match later.</b>
      <CustomFieldModal isOpen={modalIsOpen} customField={customField} onClose={closeModal} onSave={handleSave} />
    </>
  );
}
