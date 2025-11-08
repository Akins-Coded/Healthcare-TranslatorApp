// types/node-gtts.d.ts
declare module "node-gtts" {
  import type { Readable } from "stream";

  export type GttsInstance = {
    stream(text: string): Readable;
  };

  // CommonJS default export: a factory that returns an instance
  export default function gtts(lang: string): GttsInstance;
}
