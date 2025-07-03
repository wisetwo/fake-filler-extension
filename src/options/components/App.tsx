import React from "react";
import { Nav, Navbar } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { Link, NavLink, Route } from "react-router-dom";

import { GetMessage, FakeFillerDefaultOptions } from "src/common/helpers";
import { saveOptions } from "src/options/actions";
import BackupAndRestorePage from "src/options/components/BackupAndRestorePage";
import ChangeLogPage from "src/options/components/ChangeLogPage";
import CustomFieldsPage from "src/options/components/CustomFieldsPage";
import GeneralSettingsPage from "src/options/components/GeneralSettingsPage";
import KeyboardShortcutsPage from "src/options/components/KeyboardShortcutsPage";
// import ExternalLink from "src/options/components/common/ExternalLink";
// import HtmlPhrase from "src/options/components/common/HtmlPhrase";
import ScrollToTop from "src/options/components/common/ScrollToTop";

import "src/options/components/App.scss";

function App() {
  const dispatch = useDispatch();

  // const sendFeedbackMessage = chrome.i18n.getMessage("leftNav_sendFeedback", ["james.thomas.hays@gmail.com"]);

  function handleResetSettings(event: React.SyntheticEvent): void {
    event.preventDefault();

    // eslint-disable-next-line no-alert
    if (window.confirm(GetMessage("leftNav_confirmResetSettings"))) {
      const options = FakeFillerDefaultOptions();
      dispatch(saveOptions(options));
    }
  }

  return (
    <>
      <ScrollToTop />
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand>
          <img src="images/logo-white.svg" height="30" alt={GetMessage("extensionName")} />
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
            <Nav.Link as={NavLink} to="/keyboard-shortcuts">
              {GetMessage("leftNav_keyboardShortcuts")}
            </Nav.Link>
            <Nav.Link as={NavLink} to="/backup">
              {GetMessage("leftNav_backupRestore")}
            </Nav.Link>
            <Nav.Link href="https://github.com/calvinballing/fake-filler-extension/wiki" target="_blank">
              Help
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <div id="main-content" className="container">
        <Route path="/" exact component={GeneralSettingsPage} />
        <Route path="/custom-fields/:index?" component={CustomFieldsPage} />
        <Route path="/keyboard-shortcuts" component={KeyboardShortcutsPage} />
        <Route path="/backup" component={BackupAndRestorePage} />
        <Route path="/changelog" component={ChangeLogPage} />
      </div>
      <footer id="main-footer" className="container">
        {/* <HtmlPhrase phrase={sendFeedbackMessage} as="p" /> */}
        <ul className="list-inline">
          <li className="list-inline-item">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" onClick={handleResetSettings}>
              {GetMessage("leftNav_restoreFactorySettings")}
            </a>
          </li>
          <li className="list-inline-item">
            <Link to="/changelog">{GetMessage("leftNav_changelog")}</Link>
          </li>
        </ul>
      </footer>
    </>
  );
}

export default App;
