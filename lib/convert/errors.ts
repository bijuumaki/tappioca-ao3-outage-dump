/* A problem with one file, worded so it can be shown to Bijuu as it is. */
export class ConvertError extends Error {
  constructor(message: string) { super(message); this.name = "ConvertError"; }
}
