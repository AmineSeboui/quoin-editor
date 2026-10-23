/** The anchor GitHub and this site give a heading: lower case, punctuation dropped, each space a hyphen. */
export const headingAnchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
