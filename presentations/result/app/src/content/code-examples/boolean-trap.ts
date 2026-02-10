import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "boolean-trap",
  title: "The Boolean Trap",
  before: {
    code: `async function verifySignature(
  payload: Buffer,
  signatureHeader: string
): Promise<boolean> {
  try {
    const certUrl = parseCertUrl(signatureHeader);
    if (!certUrl) return false; // Bad URL? false.

    const cert = await fetchCertificate(certUrl);
    if (!cert) return false; // Fetch failed? false.

    const isValid = crypto.verify(
      "sha256",
      payload,
      cert,
      Buffer.from(signatureHeader, "base64")
    );

    return isValid; // Invalid sig? Also false.
  } catch {
    return false; // Literally anything: false.
  }
}

// Caller:
const isValid = await verifySignature(body, header);
if (!isValid) {
  // Was the cert expired? URL invalid? Signature forged?
  // Network down? Crypto bug? We have no idea.
  return res.status(401).json({ error: "Invalid" });
}`,
    language: "typescript",
    filename: "verify-signature.ts",
    highlights: [4, 7, 10, 18, 20, 21],
    annotations: [
      { line: 4, text: "boolean: 4 different failures all become 'false'", type: "error" },
      { line: 7, text: "Invalid URL = false", type: "error" },
      { line: 10, text: "Network error = false", type: "error" },
      { line: 20, text: "Catch-all: any exception = false", type: "error" },
    ],
  },
  after: {
    code: `import {
  ResultAsync, ok, err, createError, fromPredicate, tryCatch,
} from "@hex-di/result";

const InvalidCertUrl = createError("InvalidCertUrl");
const CertFetchFailed = createError("CertFetchFailed");
const SignatureInvalid = createError("SignatureInvalid");
const VerificationCrash = createError("VerificationCrash");

type VerifyError =
  | ReturnType<typeof InvalidCertUrl>
  | ReturnType<typeof CertFetchFailed>
  | ReturnType<typeof SignatureInvalid>
  | ReturnType<typeof VerificationCrash>;

function verifySignature(
  payload: Buffer,
  signatureHeader: string
): ResultAsync<true, VerifyError> {
  const certUrl = fromPredicate(
    parseCertUrl(signatureHeader),
    (url): url is string => url !== null,
    () => InvalidCertUrl({ header: signatureHeader })
  );

  return certUrl
    .asyncAndThen((url) =>
      ResultAsync.fromPromise(
        fetchCertificate(url),
        () => CertFetchFailed({ url })
      )
    )
    .andThen((cert) =>
      tryCatch(
        () => crypto.verify(
          "sha256", payload, cert,
          Buffer.from(signatureHeader, "base64")
        ),
        () => VerificationCrash({})
      ).andThen((isValid) =>
        isValid ? ok(true as const) : err(SignatureInvalid({}))
      )
    );
}

// Caller: every failure is distinct
result.match(
  () => next(),
  (error) => {
    switch (error._tag) {
      case "InvalidCertUrl":
        return res.status(400).json({ error: "Bad cert URL" });
      case "CertFetchFailed":
        return res.status(502).json({ error: "Cert unreachable" });
      case "SignatureInvalid":
        return res.status(401).json({ error: "Forged signature" });
      case "VerificationCrash":
        return res.status(500).json({ error: "Internal error" });
    }
  }
);`,
    language: "typescript",
    filename: "verify-signature.ts",
    highlights: [20, 22, 28, 35, 47, 52],
    annotations: [
      { line: 20, text: "ResultAsync<true, VerifyError>: success IS verified", type: "ok" },
      { line: 22, text: "fromPredicate replaces null check", type: "ok" },
      { line: 28, text: "Each step has its own typed failure", type: "ok" },
      { line: 52, text: "Security-critical: each failure gets the right HTTP status", type: "ok" },
    ],
  },
};
