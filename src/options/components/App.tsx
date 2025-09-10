import React from "react";
import { Nav, Navbar } from "react-bootstrap";
// import { useDispatch } from "react-redux";
import { Link, NavLink, Route } from "react-router-dom";

import { GetMessage } from "src/common/helpers";
import ChangeLogPage from "src/options/components/ChangeLogPage";
import CustomFieldsPage from "src/options/components/CustomFieldsPage";
import GeneralSettingsPage from "src/options/components/GeneralSettingsPage";
import SystemToolsPage from "src/options/components/SystemToolsPage";
// import ExternalLink from "src/options/components/common/ExternalLink";
// import HtmlPhrase from "src/options/components/common/HtmlPhrase";
import ScrollToTop from "src/options/components/common/ScrollToTop";

import "src/options/components/App.scss";

function App() {
  // const sendFeedbackMessage = chrome.i18n.getMessage("leftNav_sendFeedback", ["james.thomas.hays@gmail.com"]);
  return (
    <>
      <ScrollToTop />
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand>
          <img
            src="images/magic-star-256.png"
            alt={GetMessage("extensionName")}
            style={{ padding: "0 0 2px 25px", height: "18px" }}
          />
          <span style={{ paddingLeft: "8px" }}>Auto Filler</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar-nav" />
        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="mr-auto">
            <Nav.Link as={NavLink} to="/" exact>
              {GetMessage("leftNav_General")}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/custom-fields">
              {GetMessage("leftNav_customFields")}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/system-tools">
              {GetMessage("leftNav_systemTools")}
            </Nav.Link>
            {/* <Nav.Link href="https://github.com/calvinballing/fake-filler-extension/wiki" target="_blank">
              Help
            </Nav.Link> */}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <div id="main-content" className="container">
        <Route path="/" exact component={GeneralSettingsPage} />
        <Route path="/custom-fields/:index?" component={CustomFieldsPage} />
        <Route path="/system-tools" component={SystemToolsPage} />
        <Route path="/changelog" component={ChangeLogPage} />
      </div>
      <footer id="main-footer" className="container">
        {/* <HtmlPhrase phrase={sendFeedbackMessage} as="p" /> */}
        <ul className="list-inline" style={{ display: "none" }}>
          <li className="list-inline-item">
            <Link to="/changelog">{GetMessage("leftNav_changelog")}</Link>
          </li>
        </ul>
      </footer>
    </>
  );
}

export default App;
