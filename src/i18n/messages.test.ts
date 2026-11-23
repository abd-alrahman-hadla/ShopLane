import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

type Tree = { [key: string]: string | Tree };

/** "a.b.c" → message, for every leaf. */
function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/**
 * Argument names ({count}, {name, plural, …}) and rich-text tags (<strong>) a
 * message uses. Plural/select branches are walked; their own text isn't an
 * argument, so Arabic's extra plural forms don't count as differences.
 */
function placeholders(message: string): string[] {
  const found = new Set<string>();
  let i = 0;

  function text(stopAtBrace: boolean): void {
    while (i < message.length) {
      const char = message[i];
      if (char === "'" && message[i + 1] === "'") i += 2;
      else if (char === "{") argument();
      else if (char === "}" && stopAtBrace) return;
      else if (char === "<") {
        const tag = /^<\/?([a-zA-Z][\w-]*)>/.exec(message.slice(i));
        if (tag?.[1]) found.add(`<${tag[1]}>`);
        i += tag ? tag[0].length : 1;
      } else i += 1;
    }
  }

  function argument(): void {
    i += 1; // {
    const head = /^\s*(\w+)\s*(?:,\s*(\w+)\s*)?/.exec(message.slice(i));
    if (!head?.[1]) throw new Error(`Bad argument in: ${message}`);
    found.add(head[1]);
    i += head[0].length;
    if (head[2] === "plural" || head[2] === "select" || head[2] === "selectordinal") {
      i += 1; // the comma before the branches
      while (i < message.length && message[i] !== "}") {
        const branch = /^\s*(?:offset:\d+\s*)?(=?[\w]+)\s*\{/.exec(message.slice(i));
        if (!branch) break;
        i += branch[0].length;
        text(true);
        i += 1; // } closing the branch
        while (message[i] === " " || message[i] === "\n") i += 1;
      }
    } else if (head[2]) {
      // Simple formats like {n, number} or {d, date, short}: skip to the closing brace.
      while (i < message.length && message[i] !== "}") i += 1;
    }
    i += 1; // } closing the argument
  }

  text(false);
  return [...found].sort();
}

const english = flatten(en as Tree);
const arabic = flatten(ar as Tree);

describe("message catalogs", () => {
  it("have the same keys in English and Arabic", () => {
    const missingInArabic = [...english.keys()].filter((key) => !arabic.has(key));
    const extraInArabic = [...arabic.keys()].filter((key) => !english.has(key));
    expect({ missingInArabic, extraInArabic }).toEqual({ missingInArabic: [], extraInArabic: [] });
  });

  it("use the same placeholders and tags in both languages", () => {
    const mismatches: string[] = [];
    for (const [key, message] of english) {
      const translation = arabic.get(key);
      if (translation === undefined) continue;
      const expected = placeholders(message).join(" ");
      const actual = placeholders(translation).join(" ");
      if (expected !== actual) mismatches.push(`${key}: en [${expected}] ≠ ar [${actual}]`);
    }
    expect(mismatches).toEqual([]);
  });

  it("parse and format in both languages", () => {
    for (const [locale, messages] of [
      ["en", en],
      ["ar", ar],
    ] as const) {
      const t = createTranslator({ locale, messages, timeZone: "UTC" });
      for (const [key, message] of locale === "en" ? english : arabic) {
        const values = Object.fromEntries(
          placeholders(message)
            .filter((name) => !name.startsWith("<"))
            .map((name) => [name, 1]),
        );
        const tags = Object.fromEntries(
          placeholders(message)
            .filter((name) => name.startsWith("<"))
            .map((name) => [name.slice(1, -1), (chunks: unknown) => chunks]),
        );
        expect(() => {
          const translate = t as unknown as {
            (key: string, values: object): string;
            rich: (key: string, values: object) => unknown;
          };
          if (Object.keys(tags).length > 0) translate.rich(key, { ...values, ...tags });
          else translate(key, values);
        }, `${locale}:${key}`).not.toThrow();
      }
    }
  });
});

describe("placeholders", () => {
  it("reads arguments, plural branches and tags", () => {
    expect(placeholders("Hi {name}")).toEqual(["name"]);
    expect(placeholders("{count, plural, one {# item} other {# items in {place}}}")).toEqual([
      "count",
      "place",
    ]);
    expect(placeholders("Order <strong>{number}</strong>")).toEqual(["<strong>", "number"]);
    expect(placeholders("No arguments")).toEqual([]);
  });
});
