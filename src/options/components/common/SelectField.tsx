import { useField } from "formik";
import React from "react";

type Props = {
  name: string;
  id?: string;
  label?: string;
  helpText?: string | JSX.Element;
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectField = React.forwardRef((props: Props, ref: React.Ref<HTMLSelectElement>) => {
  const [field, meta] = useField(props);
  const { name, id, label, helpText, className, ...rest } = props;

  let controlCssClass = "form-select";

  if (meta.touched) {
    if (meta.error) {
      controlCssClass += " is-invalid";
    }
  }

  if (className) {
    controlCssClass += ` ${className}`;
  }

  const controlMarkup = (
    <>
      <select id={id || name} className={controlCssClass} ref={ref} {...field} {...rest} />
      {helpText && <div className="form-text">{helpText}</div>}
      {meta.touched && meta.error ? <div className="invalid-feedback">{meta.error}</div> : null}
    </>
  );

  if (label) {
    return (
      <div className="mb-3 row">
        <label className="col-sm-3 col-form-label text-sm-end" htmlFor={name}>
          {label}
        </label>
        <div className="col-sm-9">{controlMarkup}</div>
      </div>
    );
  }

  return controlMarkup;
});

export default SelectField;
