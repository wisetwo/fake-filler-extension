import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { HashRouter, Route } from "react-router-dom";

import App from "src/options/components/App";
import Store from "src/options/store";

const indexApp = (
  <Provider store={Store}>
    <HashRouter>
      <Route path="/" component={App} />
    </HashRouter>
  </Provider>
);

render(indexApp, document.getElementById("root"));
