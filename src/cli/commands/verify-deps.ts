/**
 * Command verify-deps.
 */
import { SubParser } from "argparse";

import { error } from "../../log";
import { Monorepo } from "../../monorepo";
import { MonistConfig } from "../config";

// tslint:disable-next-line:no-any
async function verifyDeps(config: MonistConfig): Promise<void> {
  const errors = await new Monorepo(".", config).verifyDeps();

  if (errors.length !== 0) {
    for (const e of errors) {
      error(e);
    }
    throw new Error("verification failed");
  }
}

export function addParser(subparsers: SubParser): void {
  const parser = subparsers.addParser("verify-deps", {
    description: "Verify the dependencies in all package.json files.",
  });

  parser.setDefaults({ func: verifyDeps });
}
