import React from "react";

// import ExternalLink from "src/options/components/common/ExternalLink";

function ChangeLogPage() {
  return (
    <div>
      <h2>Auto Filler Changelog</h2>
      <p>
        <strong>Version 1.0.1</strong>
      </p>
      <ul>
        <li>Add suffix option to Email Address data type with ability to inject current hostname</li>
      </ul>
      <hr />
      <p>
        <strong>Version 4.3.0</strong>
      </p>
      <ul>
        <li>
          Allow custom rules on &apos;datetime&apos;, &apos;datetime-local&apos;, &apos;time&apos;, &apos;month&apos;,
          &apos;week&apos;, &apos;color&apos;, and &apos;search&apos; inputs
        </li>
        <li>Extend URL blocklisting to Fill This Form action</li>
        <li>Follow &apos;pattern&apos; when present on text inputs</li>
        <li>Respect html &apos;minlength&apos; property</li>
        <li>Improve custom field default matching terms</li>
      </ul>
      <p>&nbsp;</p>
    </div>
  );
}

export default ChangeLogPage;
