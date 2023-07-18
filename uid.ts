import { ulid } from "https://deno.land/x/ulid@v0.2.0/mod.ts";
import {
  decodeString,
  getDate,
  isValid,
  objectId,
} from "https://deno.land/x/objectid@0.2.0/mod.ts";
import { encode } from "https://deno.land/std@0.194.0/encoding/hex.ts";

enum IDKind {
  uuid = "uuid",
  ulid = "ulid",
  objectid = "objectid",
}

enum HandlerKind {
  help = "help",
  render_id = "render_id",
}

let outputIDKind = IDKind.ulid;
let handlerKind = HandlerKind.render_id;
let endWithNewLine = true;
let ulidSeedTime: number | undefined;

const options: Record<
  string,
  (nextArg?: string) => void
> = {
  "--uuid"() {
    outputIDKind = IDKind.uuid;
  },
  get "--uuid-v4"() {
    return this["--uuid"];
  },
  "--ulid"() {
    outputIDKind = IDKind.ulid;
  },
  "--ulid-seed-time"(asd) {
    ulidSeedTime = Number(asd);
  },
  "--objectid"() {
    outputIDKind = IDKind.objectid;
  },
  "--zero"() {
    endWithNewLine = false;
  },
  get "-z"() {
    return this["--zero"];
  },
  "--help"() {
    handlerKind = HandlerKind.help;
  },
  get "-h"() {
    return this["--help"];
  },
};

const printCommands: Record<IDKind, () => Uint8Array | Promise<Uint8Array>> = {
  uuid() {
    return new TextEncoder().encode(crypto.randomUUID());
  },
  ulid() {
    return new TextEncoder().encode(ulid(ulidSeedTime));
  },
  objectid() {
    return encode(objectId());
  },
};

const handlers = {
  help() {
    const usageLine = `Usage: uid`;

    const help = Object.entries(options).map(([optionKey, optionHandler]) =>
      optionHandler.length
        ? `[${optionKey} <${
          Reflect.get(optionHandler, Symbol.for(`targetValueName`)) ?? `value`
        }>]`
        : `[${optionKey}]`
    ).join(
      ` `,
    );

    return new TextEncoder().encode(`${usageLine} ${help}`);
  },
  async render_id() {
    return await printCommands[outputIDKind]();
  },
} satisfies Record<HandlerKind, () => Uint8Array | Promise<Uint8Array>>;

const main = async () => {
  const args = Deno.args[Symbol.iterator]();
  for (const arg of args) {
    if (Reflect.has(options, arg)) {
      await options[arg](options[arg].length ? args.next().value : undefined);
    }
  }

  const output = await handlers[handlerKind]();

  Deno.stdout.write(output);
  if (endWithNewLine) {
    Deno.stdout.write(new TextEncoder().encode(`\n`));
  }
};

await main();
