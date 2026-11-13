// Story captions, shown one at a time over the intro. `from`/`to` are positions on the 100-unit
// master timeline (see the Intro Animation Script). The wording is a first draft and will change.
export interface Caption {
  id: string;
  from: number;
  to: number;
  text: string;
  /** Shows the Open App button with the caption. */
  withCta?: boolean;
}

export const CAPTIONS: readonly Caption[] = [
  { id: "same-train", from: 0, to: 20, text: "Same campus. Same train." },
  { id: "three-cabs", from: 22, to: 34, text: "Why book three cabs?" },
  { id: "share-one", from: 36, to: 86, text: "Share one. Split the fare." },
  { id: "ride-mates", from: 88, to: 100, text: "Find your ride-mates on IITransit.", withCta: true },
];

/** The caption of the final frame: what Motion OFF and reduced-motion visitors see. */
export const FINAL_CAPTION: Caption = CAPTIONS[CAPTIONS.length - 1];
