import React from "react";

type Props = {
  phrase: string;
  as?: "p" | "div" | "span";
} & React.HTMLAttributes<HTMLElement>;

function HtmlPhrase(props: Props) {
  const { phrase, as } = props;
  const Component = as === undefined ? "span" : as;

  // eslint-disable-next-line react/no-danger
  return <Component dangerouslySetInnerHTML={{ __html: phrase }} />;
}

HtmlPhrase.defaultProps = {
  as: "span",
};

export default HtmlPhrase;
