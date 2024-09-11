import { getProcessor, version } from "./load-version" with { type: "macro" }
import { ulid } from "ulid";
import { ObjectId } from "bson";
import { flag, flags, isNumberAt, Rule, Test, makeHelmMessage, describe } from "@jondotsoy/flags";
import * as nanoid from "nanoid";

const SpecDescribeSymbol = Symbol("SpecDescribeSymbol");
type SpecDescribe = {
  withValue?: boolean;
};

const getDescribe = <D extends Test<any>>(test: D): SpecDescribe => {
  return Reflect.get(test, SpecDescribeSymbol) ?? {};
};

enum IDKind {
  uuid = "uuid",
  ulid = "ulid",
  objectid = "objectid",
  nanoid = "nanoid",
}

enum HandlerKind {
  version = "version",
  help = "help",
  render_id = "render_id",
}

let outputIDKind = IDKind.ulid;
let handlerKind = HandlerKind.render_id;
let endWithNewLine = true;
let ulidSeedTime: number | undefined;
let nanoidSize: number | undefined;

type FlagsOptions = {
  ulidSeedTime: number;
  nanoidSize: number;
};

const flagsRules: Rule<FlagsOptions>[] = [
  [describe(flag("--uuid", "--uuid-v4"), { description: 'make a uuid value' }), () => outputIDKind = IDKind.uuid],
  [describe(flag("--ulid"), { description: 'mae a ulid id. (Default)' }), () => outputIDKind = IDKind.ulid],
  [
    describe(flag("--ulid-seed-time"), { description: 'input a seed time', names: ['--ulid-seed-time <value>'] }),
    isNumberAt("ulidSeedTime"),
  ],
  [describe(flag("--objectid"), { description: 'make a objectid value' }), () => outputIDKind = IDKind.objectid],
  [describe(flag("--nanoid"), { description: 'make a nanoid value' }), () => outputIDKind = IDKind.nanoid],
  [describe(flag("--nanoid-size"), { description: 'nanoid size' }), isNumberAt("nanoidSize")],
  [describe(flag("--zero", "-z"), { description: 'ignore newline on output' }), () => endWithNewLine = false],
  [describe(flag("--version", "-v"), { description: 'display version' }), () => handlerKind = HandlerKind.version],
  [describe(flag("--help", "-h"), { description: 'display this help' }), () => handlerKind = HandlerKind.help],
];

const printCommands: Record<IDKind, () => Uint8Array | Promise<Uint8Array>> = {
  uuid() {
    return new TextEncoder().encode(crypto.randomUUID());
  },
  ulid() {
    return new TextEncoder().encode(ulid(ulidSeedTime));
  },
  objectid() {
    return new TextEncoder().encode(new ObjectId().toHexString());
  },
  nanoid() {
    return new TextEncoder().encode(nanoid.nanoid(nanoidSize));
  },
};

const handlers = {
  help() {
    endWithNewLine = false
    return new TextEncoder().encode(makeHelmMessage('uid', flagsRules, [
      '--uuid',
      '--ulid-seed-time 1000',
      '--objectid',
      '--objectid -z',
      '--nanoid [--nanoid-size 10]',
    ]));
  },
  async render_id() {
    return await printCommands[outputIDKind]();
  },
  version() {
    const processor = getProcessor()
    return new TextEncoder().encode(`uid v${version()}${processor ? ` ${processor}` : ``}`)
  }
} satisfies Record<HandlerKind, () => Uint8Array | Promise<Uint8Array>>;

const parsed = flags<FlagsOptions>(Bun.argv.slice(2), {}, flagsRules);

ulidSeedTime = parsed.ulidSeedTime;
nanoidSize = parsed.nanoidSize;

const output = await handlers[handlerKind]();

process.stdout.write(output);
if (endWithNewLine) {
  process.stdout.write(new TextEncoder().encode(`\n`));
}
