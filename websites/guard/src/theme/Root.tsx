import type { ReactNode } from "react";
import GuardNav from "../components/GuardNav";

export default function Root({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <>
      <GuardNav />
      {children}
    </>
  );
}
