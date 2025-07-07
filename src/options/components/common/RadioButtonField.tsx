import { useField } from "formik";
import React from "react";

import { SanitizeText } from "src/common/helpers";

type Props = {
  name: string;
  id?: string;
  label?: string;
  helpText?: string | JSX.Element;
  className?: string;
  title?: string;
  value: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const RadioButtonField = React.forwardRef((props: Props, ref: React.Ref<HTMLInputElement>) => {
  const [field, meta] = useField({ ...props, type: "radio" });
  const { name, id, label, helpText, className, value, title, ...rest } = props;

  let validationCssClass = "";

  if (meta.touched) {
    if (meta.error) {
      validationCssClass = "is-invalid";
    }
  }

  const componentId = `${id || name}_${SanitizeText(value)}`;

  const controlMarkup = (
    <div className={`form-check ${className || ""}`}>
      <input
        id={componentId}
        type="radio"
        ref={ref}
        className={`form-check-input ${validationCssClass}`}
        {...field}
        {...rest}
      />
      <label htmlFor={componentId} className="form-check-label">
        {label}
      </label>
      {helpText && <div className="form-text">{helpText}</div>}
      {meta.touched && meta.error ? <div className="invalid-feedback">{meta.error}</div> : null}
    </div>
  );

  if (title) {
    return (
      <div className="mb-3 row">
        <div className="col-sm-3 text-sm-end">{title}</div>
        <div className="col-sm-9">{controlMarkup}</div>
      </div>
    );
  }

  return controlMarkup;
});

export default RadioButtonField;
