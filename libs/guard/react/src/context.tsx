import { createContext } from "react";
import type { AuthSubject } from "@hex-di/guard";
import type { SubjectState } from "./types.js";

/**
 * Internal React context holding the current subject state.
 *
 * - `null`: no SubjectProvider found in the tree
 * - `"loading"`: subject is being resolved asynchronously
 * - `AuthSubject`: subject is resolved and available
 */
export const SubjectContext = createContext<SubjectState<AuthSubject> | null>(null);
