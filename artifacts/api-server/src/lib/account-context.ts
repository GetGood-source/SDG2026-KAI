import { AsyncLocalStorage } from "node:async_hooks";
import type { Account } from "@workspace/api-zod";

export const accountContext = new AsyncLocalStorage<Account>();
