import { ulid } from "npm:ulid";
import { ObjectId } from "npm:bson";
import { flag, flags, isNumberAt, Rule, Test } from "npm:@jondotsoy/flags"

const SpecDescribeSymbol = Symbol('SpecDescribeSymbol')
type SpecDescribe = {
  withValue?: boolean
}

const getDescribe = <D extends Test<any>>(test: D): SpecDescribe => {
  return Reflect.get(test, SpecDescribeSymbol) ?? {}
}

const describe: <D extends Test<any>>(test: D, spec?: SpecDescribe) => D = (test, spec) => {
  if (spec) Reflect.set(test, SpecDescribeSymbol, spec)
  return test
};

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

type FlagsOptions = {
  ulidSeedTime: number,
}

const flagsRules: Rule<FlagsOptions>[] = [
  [flag('--uuid', '--uuid-v4'), () => outputIDKind = IDKind.uuid],
  [flag('--ulid'), () => outputIDKind = IDKind.ulid],
  [describe(flag('--ulid-seed-time'), { withValue: true }), isNumberAt('ulidSeedTime')],
  [flag('--objectid'), () => outputIDKind = IDKind.objectid],
  [flag('--zero', '-z'), () => endWithNewLine = false],
  [flag('--help', '-h'), () => handlerKind = HandlerKind.help],
]

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
};

const handlers = {
  help() {
    const usageLine = `Usage: uid`;

    const help = flagsRules.reduce((acc: null | string, [test]) => {
      const spec = getDescribe(test)

      let contact: null | string = null

      for (const name of test.names ?? []) {
        const label = spec.withValue ? `${name} <value>` : name
        contact = contact ? `${contact} [${label}]` : `[${label}]`
      }

      return contact ? acc ? `${acc} ${contact}` : contact : acc
    }, null);

    return new TextEncoder().encode(`${usageLine} ${help}`);
  },
  async render_id() {
    return await printCommands[outputIDKind]();
  },
} satisfies Record<HandlerKind, () => Uint8Array | Promise<Uint8Array>>;


const parsed = flags<FlagsOptions>(Deno.args, {}, flagsRules)

ulidSeedTime = parsed.ulidSeedTime

const output = await handlers[handlerKind]();

Deno.stdout.write(output);
if (endWithNewLine) {
  Deno.stdout.write(new TextEncoder().encode(`\n`));
}
