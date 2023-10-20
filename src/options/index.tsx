import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { HashRouter, Route } from "react-router-dom";

import { onAuthStateChange, onOptionsChange } from "src/common/firebase";
import { updateAuthState } from "src/options/actions";
import App from "src/options/components/App";
import Store from "src/options/store";
import { FirebaseUser, IFakeFillerOptions } from "src/types";

function handleAuthStateChange(user: FirebaseUser) {
  Store.dispatch(updateAuthState(user));
}

async function handleOptionsChange(options: IFakeFillerOptions) {
  Store.dispatch({ type: "RECEIVED_OPTIONS", options });
}

onAuthStateChange(handleAuthStateChange);
onOptionsChange(handleOptionsChange);

const optionsApp = (
  <Provider store={Store}>
    <HashRouter>
      <Route path="/" component={App} />
    </HashRouter>
  </Provider>
);

render(optionsApp, document.getElementById("root"));
