import { setMidsceneVisibleRectOnWindow } from "./util";

import { webExtractTextWithPosition } from ".";

console.log(webExtractTextWithPosition(document.body, true));
console.log(JSON.stringify(webExtractTextWithPosition(document.body, true)));
// setExtractTextWithPositionOnWindow();
setMidsceneVisibleRectOnWindow();
