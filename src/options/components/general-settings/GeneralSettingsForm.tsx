import { Form, Formik, FormikErrors, FormikHelpers } from "formik";

import React from "react";

import TextAreaField from "../common/TextAreaField";

import { GetMessage } from "src/common/helpers";

import CheckboxField from "src/options/components/common/CheckboxField";
import RadioButtonField from "src/options/components/common/RadioButtonField";
import TextField from "src/options/components/common/TextField";

import { IFakeFillerOptionsForm, IFakeFillerOptions } from "src/types";

const validate = (values: IFakeFillerOptionsForm): FormikErrors<IFakeFillerOptionsForm> => {
  const errors: FormikErrors<IFakeFillerOptionsForm> = {};

  if (
    !values.fieldMatchId &&
    !values.fieldMatchName &&
    !values.fieldMatchLabel &&
    !values.fieldMatchClass &&
    !values.fieldMatchPlaceholder
  ) {
    errors.fieldMatchId = GetMessage("generalSettings_validation_enterAtLeastOneMatch");
  }

  if (!values.defaultMaxLength || values.defaultMaxLength.length === 0) {
    errors.defaultMaxLength = GetMessage("generalSettings_validation_invalidDefaultMaxLength");
  }

  if (values.defaultMaxLength && parseInt(values.defaultMaxLength, 10) < 1) {
    errors.defaultMaxLength = GetMessage("generalSettings_validation_invalidDefaultMaxLength");
  }

  return errors;
};

type Props = {
  options: IFakeFillerOptions;
  showSavedMessage: boolean;
  onSave: (formValues: IFakeFillerOptionsForm) => void;
  onReset: (event: React.SyntheticEvent) => void;
};

function GeneralSettingsForm(props: Props) {
  function handleSubmit(values: IFakeFillerOptionsForm, actions: FormikHelpers<IFakeFillerOptionsForm>) {
    actions.setSubmitting(true);
    props.onSave(values);
    actions.setSubmitting(false);
  }

  const initialValues: Partial<IFakeFillerOptionsForm> = {};

  initialValues.agreeTermsFields = props.options.agreeTermsFields.join(", ");
  initialValues.confirmFields = props.options.confirmFields.join(", ");
  initialValues.defaultMaxLength = String(props.options.defaultMaxLength);
  initialValues.enableContextMenu = props.options.enableContextMenu;
  initialValues.ignoreFieldsWithContent = props.options.ignoreFieldsWithContent;
  initialValues.ignoreHiddenFields = props.options.ignoreHiddenFields;
  initialValues.ignoredFields = props.options.ignoredFields.join(", ");
  initialValues.triggerClickEvents = props.options.triggerClickEvents;
  initialValues.uploadFiles = props.options.uploadFiles;
  initialValues.passwordSettingsMode = props.options.passwordSettings.mode;
  initialValues.passwordSettingsPassword = props.options.passwordSettings.password;
  initialValues.fieldMatchId = props.options.fieldMatchSettings.matchId;
  initialValues.fieldMatchName = props.options.fieldMatchSettings.matchName;
  initialValues.fieldMatchLabel = props.options.fieldMatchSettings.matchLabel;
  initialValues.fieldMatchClass = props.options.fieldMatchSettings.matchClass;
  initialValues.fieldMatchPlaceholder = props.options.fieldMatchSettings.matchPlaceholder;
  initialValues.fieldMatchAriaLabel = props.options.fieldMatchSettings.matchAriaLabel;
  initialValues.fieldMatchAriaLabelledBy = props.options.fieldMatchSettings.matchAriaLabelledBy;

  if (!props.options.fieldMatchSettings.customAttributes) {
    initialValues.fieldMatchCustomAttributes = "";
  } else {
    initialValues.fieldMatchCustomAttributes = props.options.fieldMatchSettings.customAttributes.join(", ");
  }

  if (!props.options.urlMatchesToBlock) {
    initialValues.urlMatchesToBlock = "";
  } else {
    initialValues.urlMatchesToBlock = props.options.urlMatchesToBlock.join(", ");
  }

  if (!props.options.modelEnvConfig) {
    initialValues.modelEnvConfig = "";
  } else {
    let configString = "";
    Object.entries(props.options.modelEnvConfig).forEach(([key, value]) => {
      configString += `${key}=${value}\n`;
    });
    initialValues.modelEnvConfig = configString;
  }

  return (
    <Formik
      initialValues={initialValues as IFakeFillerOptionsForm}
      enableReinitialize
      validate={validate}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, isValid }) => (
        <Form>
          <h2>{GetMessage("generalSettings_passwordSettings")}</h2>

          <div className="form-group row">
            <label className="col-sm-3 col-form-label text-sm-end pt-0" htmlFor="passwordSettingsMode">
              {GetMessage("generalSettings_password")}
            </label>
            <div className="col-sm-9">
              <RadioButtonField
                name="passwordSettingsMode"
                value="random"
                label={GetMessage("generalSettings_password_randomLabel")}
              />
              <RadioButtonField
                name="passwordSettingsMode"
                value="defined"
                label={GetMessage("generalSettings_password_useThisLabel")}
              />
              <TextField name="passwordSettingsPassword" />
            </div>
          </div>

          <h2>{GetMessage("generalSettings_fieldOptions")}</h2>

          <div className="form-group row">
            <label className="col-sm-3 col-form-label text-sm-end" htmlFor="ignoredFields">
              {GetMessage("generalSettings_ignoreFieldsMatch")}
            </label>
            <div className="col-sm-9">
              <TextField name="ignoredFields" placeholder={GetMessage("enterCsv")} />
              <CheckboxField name="ignoreHiddenFields" label={GetMessage("generalSettings_ignoreHiddenFieldsLabel")} />
              <CheckboxField
                name="ignoreFieldsWithContent"
                label={GetMessage("generalSettings_ignoreFieldsWithContentLabel")}
              />
            </div>
          </div>

          <TextField
            name="confirmFields"
            label={GetMessage("generalSettings_confirmationFieldsMatch")}
            placeholder={GetMessage("enterCsv")}
            helpText={GetMessage("generalSettings_confirmFieldsHelp")}
          />

          <TextField
            name="agreeTermsFields"
            label={GetMessage("generalSettings_agreeToTermsMatch")}
            placeholder={GetMessage("enterCsv")}
            helpText={GetMessage("generalSettings_agreeToTermsMatchHelp")}
          />

          <div className="form-group row">
            <div className="col-sm-3 text-sm-end pt-0">{GetMessage("generalSettings_matchFieldsUsing")}</div>
            <div className="col-sm-9">
              <CheckboxField name="fieldMatchId" label={GetMessage("generalSettings_matchFields_useId")} />
              <CheckboxField name="fieldMatchName" label={GetMessage("generalSettings_matchFields_useName")} />
              <CheckboxField name="fieldMatchLabel" label={GetMessage("generalSettings_matchFields_useLabel")} />
              <CheckboxField
                name="fieldMatchAriaLabel"
                label={GetMessage("generalSettings_matchFields_useAriaLabel")}
              />
              <CheckboxField
                name="fieldMatchAriaLabelledBy"
                label={GetMessage("generalSettings_matchFields_useAriaLabelledBy")}
              />
              <CheckboxField name="fieldMatchClass" label={GetMessage("generalSettings_matchFields_useClass")} />
              <CheckboxField
                name="fieldMatchPlaceholder"
                label={GetMessage("generalSettings_matchFields_usePlaceholder")}
              />
              <div className="form-text text-muted">{GetMessage("generalSettings_matchFields_help")}</div>
            </div>
          </div>

          <TextField
            name="fieldMatchCustomAttributes"
            label={GetMessage("generalSettings_customAttributes")}
            placeholder={GetMessage("generalSettings_customAttributes_placeholder")}
            helpText={GetMessage("generalSettings_customAttributesHelp")}
          />

          <TextField
            name="defaultMaxLength"
            type="number"
            label={GetMessage("generalSettings_defaultMaxLength")}
            helpText={GetMessage("generalSettings_defaultMaxLength_help")}
          />

          <h2>{GetMessage("generalSettings_urlBlocking")}</h2>
          <TextAreaField
            name="urlMatchesToBlock"
            label={GetMessage("generalSettings_urlBlockingLabel")}
            helpText={GetMessage("generalSettings_urlBlockingHelp")}
          />

          <h2>{GetMessage("generalSettings_modelConfig")}</h2>
          <TextAreaField
            name="modelEnvConfig"
            label={GetMessage("generalSettings_modelEnvConfigLabel")}
            helpText={GetMessage("generalSettings_modelEnvConfigHelp")}
          />

          <h2>{GetMessage("generalSettings")}</h2>
          <CheckboxField
            name="triggerClickEvents"
            label={GetMessage("generalSettings_triggerEventsLabel")}
            title={GetMessage("generalSettings_triggerEvents")}
          />
          <CheckboxField
            name="uploadFiles"
            label={GetMessage("generalSettings_uploadFilesLabel")}
            title={GetMessage("generalSettings_uploadFiles")}
          />
          <CheckboxField
            name="enableContextMenu"
            label={GetMessage("generalSettings_contextMenuLabel")}
            title={GetMessage("generalSettings_contextMenu")}
          />

          <div className="row">
            <div className="col-sm-3">&nbsp;</div>
            <div className="col-sm-9">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !isValid}>
                {GetMessage("saveSettings")}
              </button>
              <a href="javacript: void(0)" className="reset-settings" onClick={props.onReset}>
                {GetMessage("leftNav_restoreFactorySettings")}
              </a>
              {props.showSavedMessage && (
                <span className="saved-msg">{GetMessage("generalSettings_settingsSaved")}</span>
              )}
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default GeneralSettingsForm;
