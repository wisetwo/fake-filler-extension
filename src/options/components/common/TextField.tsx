import { useField } from "formik";
import React from "react";

type Props = {
  name: string;
  id?: string;
  label?: string;
  helpText?: string | JSX.Element;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const TextField = React.forwardRef((props: Props, ref: React.Ref<HTMLInputElement>) => {
  const [field, meta] = useField(props);
  const { name, id, label, helpText, className, ...rest } = props;

  let controlCssClass = "form-control";

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
      <input id={id || name} ref={ref} className={controlCssClass} {...field} {...rest} />
      {helpText && <div className="form-text">{helpText}</div>}
      {meta.touched && meta.error ? <div className="invalid-feedback">{meta.error}</div> : null}
    </>
  );

  if (label) {
    return (
      <div className="mb-3 row">
        <label htmlFor={id || name} className="col-sm-3 col-form-label text-sm-end">
          {label}
        </label>
        <div className="col-sm-9">{controlMarkup}</div>
      </div>
    );
  }

  return controlMarkup;
});

TextField.defaultProps = {
  type: "text",
};

export default TextField;
