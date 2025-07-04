import React from "react";

import { GetMessage } from "src/common/helpers";
import TextField from "src/options/components/common/TextField";

function TextOptions() {
  return (
    <>
      <TextField name="textMin" type="number" label={GetMessage("customFields_label_minWords")} />
      <TextField name="textMax" type="number" label={GetMessage("customFields_label_maxWords")} />
      <TextField name="textMaxLength" type="number" label={GetMessage("customFields_label_maxLength")} />
    </>
  );
}

export default TextOptions;
