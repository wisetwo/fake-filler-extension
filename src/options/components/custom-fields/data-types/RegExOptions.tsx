import React, { useState } from "react";

import DataGenerator from "src/common/data-generator";
import { GetMessage } from "src/common/helpers";
import HtmlPhrase from "src/options/components/common/HtmlPhrase";
import TextField from "src/options/components/common/TextField";

type Props = {
  regexTemplate?: string;
};

function RegExOptions(props: Props) {
  const [regExSample, setRegExSample] = useState("");

  const generator = new DataGenerator();

  function generateAndSetRandomRegExString() {
    if (props.regexTemplate) {
      setRegExSample(generator.generateRandomStringFromRegExTemplate(props.regexTemplate));
    }
  }

  const regexTypeHelpText = (
    <div>
      <HtmlPhrase phrase={GetMessage("customFields_regExHelp")} as="p" />
      <button type="button" className="btn btn-sm btn-outline-primary" onClick={generateAndSetRandomRegExString}>
        {GetMessage("testMe")}
      </button>
    </div>
  );

  return (
    <>
      <TextField name="regexTemplate" label={GetMessage("customFields_label_pattern")} helpText={regexTypeHelpText} />
      {regExSample && (
        <div className="row">
          <div className="col-sm-3">&nbsp;</div>
          <div className="col-sm-9">{regExSample}</div>
        </div>
      )}
    </>
  );
}

RegExOptions.defaultProps = {
  regexTemplate: undefined,
};

export default RegExOptions;
