/* A friendly made-up name for an anonymous reader, always the same for the same reader hash: "quiet otter 42". */
const ADJECTIVES = ["quiet", "bright", "gentle", "sleepy", "curious", "brave", "mellow", "cozy", "swift", "shy", "merry", "calm", "clever", "dreamy", "plucky", "sunny",
  "misty", "witty", "humble", "lively", "patient", "rosy", "stormy", "velvet", "wandering", "amber", "silver", "mossy", "starry", "breezy", "tender", "spry"];
const ANIMALS = ["otter", "heron", "fox", "moth", "finch", "badger", "newt", "owl", "hare", "wren", "seal", "lynx", "crane", "robin", "toad", "swan",
  "mole", "stoat", "lark", "vole", "raven", "pika", "ibis", "koala", "gecko", "marten", "puffin", "tapir", "quail", "yak", "dove", "eel"];

export function readerName(hash: string): string {
  const n = (i: number) => parseInt(hash.slice(i * 2, i * 2 + 2) || "0", 16);
  return `${ADJECTIVES[n(0) % ADJECTIVES.length]} ${ANIMALS[n(1) % ANIMALS.length]} ${10 + (n(2) % 90)}`;
}
