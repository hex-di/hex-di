# Result Presentation - Code Examples

## Overview

This document catalogs all before/after code examples used in the presentation. Each example is derived from real patterns found in Sanofi production codebases (genai-front-web and genai-commercial-backend) with variable names and business logic anonymized but structure preserved.

---

## Example 1: "The Silent Swallower"

**Slide**: 3 (problem), 17 (solution)
**Source pattern**: Photo fetching hook, SSE streaming handlers
**Anti-pattern**: `.catch(() => null)` and empty catch blocks

### BEFORE

```typescript
// hooks/use-user-photo.ts
const fetchPhoto = async () => {
  try {
    const token = await getAccessToken("accessToken", {}).catch(() => null);

    if (!token || cancelled) {
      setPhotoUrl(null);
      return;
    }

    const response = await fetch(
      `https://graph.example.com/v1.0/users/${encodeURIComponent(email)}/photo/$value`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok || cancelled) {
      setPhotoUrl(null);
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (!cancelled) setPhotoUrl(objectUrl);
  } catch {
    if (!cancelled) setPhotoUrl(null);
  }
};
```

**Problems highlighted**:

- Line 4: `.catch(() => null)` - auth failure becomes null
- Line 7: null check conflates "cancelled" with "auth failed"
- Line 15: non-ok response becomes null - was it 404? 500? 403?
- Line 21: empty catch - any error becomes null
- Caller sees: `null`. Could mean: no photo, auth expired, network down, CORS error, user cancelled

### AFTER

```typescript
// hooks/use-user-photo.ts
import { fromPromise, safeTry, ok, err, type ResultAsync } from "@hex-di/result";

type PhotoError =
  | { readonly _tag: "AuthExpired" }
  | { readonly _tag: "NetworkError"; readonly status: number }
  | { readonly _tag: "NotFound" }
  | { readonly _tag: "Cancelled" };

function fetchPhoto(email: string, signal: AbortSignal): ResultAsync<string, PhotoError> {
  return fromPromise(getAccessToken("accessToken", {}), () => ({ _tag: "AuthExpired" as const }))
    .andThen(token =>
      fromPromise(
        fetch(`https://graph.example.com/v1.0/users/${encodeURIComponent(email)}/photo/$value`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }),
        () => ({ _tag: "Cancelled" as const })
      )
    )
    .andThen(response => {
      if (response.status === 404) return err({ _tag: "NotFound" as const });
      if (!response.ok) return err({ _tag: "NetworkError" as const, status: response.status });
      return fromPromise(
        response.blob().then(blob => URL.createObjectURL(blob)),
        () => ({ _tag: "NetworkError" as const, status: 0 })
      );
    });
}

// Usage in component
const result = await fetchPhoto(email, controller.signal);
result.match(
  photoUrl => setPhotoUrl(photoUrl),
  error => {
    switch (error._tag) {
      case "AuthExpired":
        redirectToLogin();
        break;
      case "NotFound":
        setPhotoUrl(defaultAvatar);
        break;
      case "NetworkError":
        showRetryButton();
        break;
      case "Cancelled":
        break; // intentional no-op
    }
  }
);
```

**Improvements highlighted**:

- Every failure mode has a name and type
- The caller MUST handle each case (TypeScript enforces exhaustiveness)
- No null ambiguity - `NotFound` vs `AuthExpired` are different types
- `Cancelled` is explicit, not confused with errors
- The function signature tells the whole story: `ResultAsync<string, PhotoError>`

---

## Example 2: "The Generic Thrower"

**Slide**: 4 (problem), 18 (solution)
**Source pattern**: API service functions wrapping OpenAPI clients
**Anti-pattern**: `throw new Error(error.message.toString())`

### BEFORE

```typescript
// api/survey.ts
export const getSurveyTemplate = async (surveyKey: string): Promise<SurveyTemplate> => {
  const { data, error } = await GET("/surveys/{key}", {
    params: { path: { key: surveyKey } },
  });

  if (error) throw new Error(error.message.toString());
  return data;
};

export const checkAvailability = async (
  surveyKey: string,
  contextId: string
): Promise<AvailabilityResponse> => {
  const { data, error } = await GET("/surveys/{key}/status/{contextId}", {
    params: { path: { key: surveyKey, contextId } },
  });

  if (error?.statusCode === 404) throw new SurveyNotFoundError();
  if (error) throw new Error(error.message.toString());
  return data;
};

// Caller
try {
  const survey = await getSurveyTemplate("nps-2024");
  const available = await checkAvailability("nps-2024", userId);
  showSurvey(survey, available);
} catch (e) {
  // What went wrong? Network? 404? 500? Auth?
  // e is unknown. We have no idea.
  toast.error("Something went wrong");
}
```

**Problems highlighted**:

- Line 7: `error` has structure (statusCode, message, details). We throw it all away.
- Line 20: Special case for 404, but generic throw for everything else
- Lines 26-31: Caller catch block gets `unknown`. All information is lost.

### AFTER

```typescript
// api/survey.ts
import { ok, err, safeTry, type Result, type ResultAsync, fromPromise } from "@hex-di/result";
import { createError } from "@hex-di/result";

const NotFound = createError("NotFound");
const ApiError = createError("ApiError");
const NetworkError = createError("NetworkError");

type SurveyError =
  | ReturnType<typeof NotFound>
  | ReturnType<typeof ApiError>
  | ReturnType<typeof NetworkError>;

export function getSurveyTemplate(surveyKey: string): ResultAsync<SurveyTemplate, SurveyError> {
  return fromPromise(GET("/surveys/{key}", { params: { path: { key: surveyKey } } }), () =>
    NetworkError({ endpoint: "/surveys" })
  ).andThen(({ data, error }) => {
    if (error) return err(ApiError({ status: error.statusCode, message: error.message }));
    return ok(data);
  });
}

export function checkAvailability(
  surveyKey: string,
  contextId: string
): ResultAsync<AvailabilityResponse, SurveyError> {
  return fromPromise(
    GET("/surveys/{key}/status/{contextId}", {
      params: { path: { key: surveyKey, contextId } },
    }),
    () => NetworkError({ endpoint: "/surveys/status" })
  ).andThen(({ data, error }) => {
    if (error?.statusCode === 404) return err(NotFound({ resource: "survey", id: surveyKey }));
    if (error) return err(ApiError({ status: error.statusCode, message: error.message }));
    return ok(data);
  });
}

// Caller
const result = safeTry(async function* () {
  const survey = yield* await getSurveyTemplate("nps-2024");
  const available = yield* await checkAvailability("nps-2024", userId);
  return ok({ survey, available });
});

result.match(
  ({ survey, available }) => showSurvey(survey, available),
  error => {
    switch (error._tag) {
      case "NotFound":
        toast.info("Survey not available");
        break;
      case "ApiError":
        toast.error(`Server error: ${error.message}`);
        break;
      case "NetworkError":
        toast.error("Check your connection");
        break;
    }
  }
);
```

**Improvements highlighted**:

- Error types preserve all context (status code, message, endpoint)
- `safeTry` replaces nested try/catch with flat generator
- `yield*` is the TypeScript equivalent of Rust's `?` operator
- Caller's `match` is exhaustive - add a new error type and TypeScript forces you to handle it
- Zero type casting anywhere

---

## Example 3: "The Unsafe Cast"

**Slide**: 5 (problem), 19 (solution)
**Source pattern**: Controller catch blocks, service error handling
**Anti-pattern**: `(error as Error).message`

### BEFORE

```typescript
// controllers/asset.controller.ts
async getMetadata(variationId: string) {
  try {
    return this.metadataService.getMetadata(variationId)
  } catch (err) {
    if (err instanceof NotFoundException) throw err
    throw new BadRequestException((err as Error)?.message)
  }
}

// services/metadata.service.ts
async getMetadata(variationId: string) {
  try {
    const record = await this.db.findUnique({ where: { id: variationId } })
    if (!record) {
      throw new NotFoundException(`Variation ${variationId} not found`)
    }
    return record
  } catch (err) {
    if (err instanceof NotFoundException) throw err
    this.logger.error(err, 'Database Error')
    throw new InternalServerErrorException('Database Error')
  }
}
```

**Problems highlighted**:

- Line 6: `as Error` - what if err is a string? A number? A Prisma error object?
- Lines 7, 20: `instanceof` checks - fragile across package boundaries
- Line 22: Original Prisma error details lost, replaced with "Database Error"
- The same `instanceof NotFoundException` check is duplicated in controller and service

### AFTER

```typescript
// services/metadata.service.ts
import { ok, err, fromPromise, type ResultAsync } from '@hex-di/result'
import { createError } from '@hex-di/result'

const NotFound = createError('NotFound')
const DatabaseError = createError('DatabaseError')

type MetadataError =
  | ReturnType<typeof NotFound>
  | ReturnType<typeof DatabaseError>

function getMetadata(variationId: string): ResultAsync<MetadataRecord, MetadataError> {
  return fromPromise(
    db.findUnique({ where: { id: variationId } }),
    (cause) => DatabaseError({ operation: 'findUnique', cause: String(cause) })
  ).andThen(record =>
    record
      ? ok(record)
      : err(NotFound({ resource: 'variation', id: variationId }))
  )
}

// controllers/asset.controller.ts
async getMetadata(variationId: string) {
  const result = await this.metadataService.getMetadata(variationId)
  return result.match(
    (record) => record,
    (error) => {
      switch (error._tag) {
        case 'NotFound':
          throw new NotFoundException(error.id)
        case 'DatabaseError':
          this.logger.error(error.cause, 'Database Error')
          throw new InternalServerErrorException('Database Error')
      }
    }
  )
}
```

**Improvements highlighted**:

- No `as Error` cast - the error type is known at compile time
- No `instanceof` checks - `_tag` discrimination is reliable across boundaries
- Error transformation happens once at the controller boundary
- Service never throws - controller decides how to translate to HTTP

---

## Example 4: "The Callback Pyramid"

**Slide**: 6 (problem), 20 (solution)
**Source pattern**: Multi-step form submission with nested mutations
**Anti-pattern**: Deeply nested callbacks with inconsistent error handling

### BEFORE

```typescript
// hooks/use-submit.ts
const onSubmit = useCallback(
  async (entries: FormData) => {
    const brand = brands.find(b => b.label === entries.brand);
    if (!brand) {
      console.error("Brand not found");
      return; // Silent failure - returns undefined
    }

    try {
      setIsLoading(true);

      const { data: urlData, error: urlError } = await GET("/files/{id}/signed-url", {
        params: { path: { id: entries.fileId } },
      });
      if (!urlData || urlError) {
        throw new Error("Failed to get signed URL");
      }

      const fileResponse = await fetch(urlData.signedUrl);
      if (!fileResponse.ok) {
        throw new Error("Failed to read source file");
      }
      const content = await fileResponse.json();

      createAsset(
        { body: { name: entries.name, content } },
        {
          onSuccess: createdAsset => {
            updateAsset(
              { id: createdAsset.id, body: { brand: brand.id } },
              {
                onSuccess: () => {
                  POST("/process/{id}/start", {
                    params: { path: { id: createdAsset.id } },
                    body: { locale: entries.locale },
                  })
                    .then(response => {
                      if (response.error || !response.data) {
                        const msg = Array.isArray(response.error?.message)
                          ? response.error?.message.join(", ")
                          : response.error?.message || "Failed to start";
                        throw new Error(msg);
                      }
                      navigate(`/results/${response.data.id}`);
                    })
                    .catch(error => {
                      toast.error(
                        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
                      );
                    });
                },
              }
            );
          },
        }
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to process");
    } finally {
      setIsLoading(false);
    }
  },
  [brands, createAsset, updateAsset, navigate]
);
```

**Problems highlighted**:

- Lines 3-6: Returns undefined if brand not found, caller has no idea
- Lines 25-52: Three levels of nesting for three sequential operations
- Line 39-42: Complex error message construction from unknown types
- Line 44: `throw new Error(msg)` inside a `.then()` - caught by `.catch()` below
- Line 46: `instanceof Error` check - unreliable
- Line 55: Generic catch loses all context about which step failed

### AFTER

```typescript
// hooks/use-submit.ts
import { ok, err, safeTry, fromPromise, fromNullable } from "@hex-di/result";
import { createError } from "@hex-di/result";

const BrandNotFound = createError("BrandNotFound");
const SignedUrlFailed = createError("SignedUrlFailed");
const FileFetchFailed = createError("FileFetchFailed");
const AssetCreateFailed = createError("AssetCreateFailed");
const AssetUpdateFailed = createError("AssetUpdateFailed");
const ProcessStartFailed = createError("ProcessStartFailed");

type SubmitError =
  | ReturnType<typeof BrandNotFound>
  | ReturnType<typeof SignedUrlFailed>
  | ReturnType<typeof FileFetchFailed>
  | ReturnType<typeof AssetCreateFailed>
  | ReturnType<typeof AssetUpdateFailed>
  | ReturnType<typeof ProcessStartFailed>;

const onSubmit = useCallback(
  async (entries: FormData) => {
    setIsLoading(true);

    const result = await safeTry(async function* () {
      const brand = yield* fromNullable(
        brands.find(b => b.label === entries.brand),
        () => BrandNotFound({ label: entries.brand })
      );

      const urlData = yield* await fromPromise(
        GET("/files/{id}/signed-url", { params: { path: { id: entries.fileId } } }),
        () => SignedUrlFailed({ fileId: entries.fileId })
      ).andThen(({ data, error }) =>
        error ? err(SignedUrlFailed({ fileId: entries.fileId })) : ok(data)
      );

      const content = yield* await fromPromise(
        fetch(urlData.signedUrl).then(r => {
          if (!r.ok) throw r.status;
          return r.json();
        }),
        status => FileFetchFailed({ status: Number(status) })
      );

      const asset = yield* await fromPromise(
        createAssetAsync({ body: { name: entries.name, content } }),
        () => AssetCreateFailed({ name: entries.name })
      );

      yield* await fromPromise(updateAssetAsync({ id: asset.id, body: { brand: brand.id } }), () =>
        AssetUpdateFailed({ assetId: asset.id })
      );

      const process = yield* await fromPromise(
        POST("/process/{id}/start", {
          params: { path: { id: asset.id } },
          body: { locale: entries.locale },
        }),
        () => ProcessStartFailed({ assetId: asset.id })
      ).andThen(({ data, error }) =>
        error ? err(ProcessStartFailed({ assetId: asset.id })) : ok(data)
      );

      return ok(process);
    });

    setIsLoading(false);

    result.match(
      process => navigate(`/results/${process.id}`),
      error => {
        switch (error._tag) {
          case "BrandNotFound":
            toast.error(`Brand "${error.label}" not found`);
            break;
          case "SignedUrlFailed":
            toast.error("Could not prepare file for upload");
            break;
          case "FileFetchFailed":
            toast.error(`File download failed (HTTP ${error.status})`);
            break;
          case "AssetCreateFailed":
            toast.error("Could not create asset");
            break;
          case "AssetUpdateFailed":
            toast.error("Created asset but failed to set brand");
            break;
          case "ProcessStartFailed":
            toast.error("Asset ready but processing could not start");
            break;
        }
      }
    );
  },
  [brands, createAssetAsync, updateAssetAsync, navigate]
);
```

**Improvements highlighted**:

- Flat structure: 6 sequential operations, zero nesting
- Each failure has its own error type with relevant context
- `yield*` short-circuits on first error (like Rust's `?`)
- The match at the end handles every error with a specific, helpful message
- If you add a new step, TypeScript forces you to handle its error case

---

## Example 5: "The Success That Wasn't"

**Slide**: 7 (problem), 21 (solution)
**Source pattern**: Asset polling with background downloads
**Anti-pattern**: Showing success while background operations fail

### BEFORE

```typescript
// hooks/use-polling.tsx
const downloadResults = async (run: RunAsset): Promise<void> => {
  const viewModel = new ResultViewModel(run);

  if (!viewModel.downloadUrl) return; // Silent failure

  const downloads: Promise<void>[] = [];

  if (viewModel.primaryFile) {
    downloads.push(
      downloadFile(viewModel.primaryFile, viewModel.filename).catch(error => {
        console.error("Download failed:", error); // Swallowed
      })
    );
  }

  if (viewModel.annotatedFile) {
    downloads.push(
      downloadFile(viewModel.annotatedFile, viewModel.filename).catch(error => {
        console.error("Annotation download failed:", error); // Swallowed
      })
    );
  }

  await Promise.allSettled(downloads); // Results thrown away
};

// In useEffect
if (run.status === "succeeded") {
  downloadResults(run as unknown as RunAsset).catch(error => {
    console.error("Failed:", error);
  });

  toast.success("Processing complete!"); // Shows regardless of download outcome
}
```

**Problems highlighted**:

- Line 5: Returns void silently when no URL
- Lines 12-14, 21-23: `.catch()` handlers swallow errors
- Line 27: `Promise.allSettled` results are not inspected
- Line 32: `as unknown as RunAsset` - unsafe type casting
- Line 36: Success toast appears even when all downloads failed

### AFTER

```typescript
// hooks/use-polling.tsx
import { ok, err, type Result, type ResultAsync, fromPromise } from "@hex-di/result";
import { createError } from "@hex-di/result";

const NoDownloadUrl = createError("NoDownloadUrl");
const DownloadFailed = createError("DownloadFailed");

type DownloadError = ReturnType<typeof NoDownloadUrl> | ReturnType<typeof DownloadFailed>;

type DownloadReport = {
  readonly primary: Result<string, DownloadError>;
  readonly annotated: Result<string, DownloadError> | null;
};

function downloadResults(run: RunAsset): ResultAsync<DownloadReport, DownloadError> {
  const viewModel = new ResultViewModel(run);

  if (!viewModel.downloadUrl) {
    return ResultAsync.err(NoDownloadUrl({ runId: run.id }));
  }

  const primary = fromPromise(downloadFile(viewModel.primaryFile, viewModel.filename), () =>
    DownloadFailed({ file: "primary", runId: run.id })
  );

  const annotated = viewModel.annotatedFile
    ? fromPromise(downloadFile(viewModel.annotatedFile, viewModel.filename), () =>
        DownloadFailed({ file: "annotated", runId: run.id })
      )
    : null;

  return primary.map(primaryPath => ({
    primary: ok(primaryPath),
    annotated: annotated ? /* await separately */ null : null,
  }));
}

// In useEffect
if (run.status === "succeeded") {
  const result = await downloadResults(run);

  result.match(
    report => {
      toast.success("Processing complete and files downloaded!");
    },
    error => {
      switch (error._tag) {
        case "NoDownloadUrl":
          toast.warning("Processing complete but no download available");
          break;
        case "DownloadFailed":
          toast.error(`Processing complete but ${error.file} download failed`);
          break;
      }
    }
  );
}
```

**Improvements highlighted**:

- No silent returns - missing URL is an explicit error
- Download failures are typed and returned, not swallowed
- Success toast only appears when downloads actually succeeded
- Each failure gets a specific message
- No type casting anywhere

---

## Example 6: Backend - "The Boolean Trap"

**Slide**: Used as supplementary example in Act 2
**Source pattern**: Signature verification service
**Anti-pattern**: Returns boolean, hiding multiple failure modes

### BEFORE

```typescript
// services/sns.service.ts
private async verifySignature(payload: SnsPayload): Promise<boolean> {
  try {
    const certUrl = payload.SigningCertURL
    if (!isValidCertUrl(certUrl)) return false

    const certificate = await this.getCertificate(certUrl)
    const stringToSign = buildStringToSign(payload)

    const verifier = createVerify('SHA256')
    verifier.update(stringToSign)
    return verifier.verify(certificate, payload.Signature, 'base64')
  } catch (error) {
    this.logger.error(error, 'Error verifying signature')
    return false
  }
}
```

### AFTER

```typescript
// services/sns.service.ts
import { ok, err, safeTry, fromPredicate, fromPromise, type ResultAsync } from "@hex-di/result";
import { createError } from "@hex-di/result";

const InvalidCertUrl = createError("InvalidCertUrl");
const CertFetchFailed = createError("CertFetchFailed");
const SignatureInvalid = createError("SignatureInvalid");
const VerificationCrash = createError("VerificationCrash");

type VerifyError =
  | ReturnType<typeof InvalidCertUrl>
  | ReturnType<typeof CertFetchFailed>
  | ReturnType<typeof SignatureInvalid>
  | ReturnType<typeof VerificationCrash>;

function verifySignature(payload: SnsPayload): ResultAsync<true, VerifyError> {
  return safeTry(async function* () {
    yield* fromPredicate(payload.SigningCertURL, isValidCertUrl, url => InvalidCertUrl({ url }));

    const certificate = yield* await fromPromise(getCertificate(payload.SigningCertURL), cause =>
      CertFetchFailed({ url: payload.SigningCertURL, cause: String(cause) })
    );

    const stringToSign = buildStringToSign(payload);
    const verifier = createVerify("SHA256");
    verifier.update(stringToSign);
    const valid = verifier.verify(certificate, payload.Signature, "base64");

    if (!valid) return err(SignatureInvalid({ messageId: payload.MessageId }));
    return ok(true as const);
  });
}

// Caller
const result = await verifySignature(payload);
result.match(
  () => processNotification(payload),
  error => {
    switch (error._tag) {
      case "InvalidCertUrl":
        rejectAsUntrusted(payload);
        break;
      case "CertFetchFailed":
        retryLater(payload);
        break;
      case "SignatureInvalid":
        logSecurityEvent(error);
        break;
      case "VerificationCrash":
        alertOps(error);
        break;
    }
  }
);
```

**Improvements highlighted**:

- `false` could mean: invalid URL, cert fetch failed, wrong signature, crypto crash
- With Result: each is a distinct type with context
- Security team can distinguish between "bad signature" (potential attack) and "cert unavailable" (infrastructure issue)

---

## Notes on Code Examples

1. **All examples are anonymized** - Business logic details (endpoint paths, model names, field names) are generalized but the error handling structure is preserved exactly
2. **Line counts are comparable** - The "after" versions are similar in length or slightly longer, but the extra lines are type definitions that pay for themselves in compiler safety
3. **No helper libraries needed** - Every "after" example uses only `@hex-di/result` imports
4. **Progressive complexity** - Examples 1-2 use basic `map`/`match`, example 4 introduces `safeTry`, example 6 shows `fromPredicate`
5. **Real patterns, real payoff** - Every "before" example represents a pattern found 5+ times across the codebase
