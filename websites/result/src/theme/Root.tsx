import type { ReactNode } from "react";
import ResultNav from "../components/ResultNav";

export default function Root({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <>
      <ResultNav />
      {children}
    </>
  );
}
