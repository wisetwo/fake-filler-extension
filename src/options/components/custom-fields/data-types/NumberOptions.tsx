import React from "react";

import { GetMessage } from "src/common/helpers";
import TextField from "src/options/components/common/TextField";

function NumberOptions() {
  return (
    <>
      <TextField name="numberMin" type="number" label={GetMessage("customFields_label_minValue")} />
      <TextField name="numberMax" type="number" label={GetMessage("customFields_label_maxValue")} />
      <TextField
        name="numberDecimalPlaces"
        type="number"
        min={0}
        max={10}
        label={GetMessage("customFields_label_decimalPlaces")}
        helpText={GetMessage("customFields_label_decimalPlaces_helpText")}
      />
    </>
  );
}

export default NumberOptions;
