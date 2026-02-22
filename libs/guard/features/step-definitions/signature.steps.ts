import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { ElectronicSignature } from "@hex-di/guard";
import type { GuardCucumberWorld } from "./world.js";

interface SignatureWorld extends GuardCucumberWorld {
  lastSignature: ElectronicSignature | null;
}

// ---------------------------------------------------------------------------
// Signature setup steps
// ---------------------------------------------------------------------------

Given(
  "the signature service is configured for signer {string}",
  function (this: SignatureWorld, signerId: string) {
    this.signatureService.configure({ signerId, signerName: signerId });
    this.lastSignature = null;
  },
);

Given(
  "the signature service is configured for signer {string} with role {string}",
  function (this: SignatureWorld, signerId: string, role: string) {
    this.signatureService.configure({ signerId, signerName: signerId, signerRoles: [role] });
    this.lastSignature = null;
  },
);

Given(
  "the signature service is configured for signer {string} requiring reauthentication",
  function (this: SignatureWorld, signerId: string) {
    this.signatureService.configure({ signerId, signerName: signerId, reauthenticated: true });
    this.lastSignature = null;
  },
);

// ---------------------------------------------------------------------------
// Signature action steps
// ---------------------------------------------------------------------------

When(
  "a signature is captured with meaning {string}",
  async function (this: SignatureWorld, meaning: string) {
    this.lastSignature = await this.signatureService.capture(meaning);
  },
);

When(
  "a signature is captured with meaning {string} and role {string}",
  async function (this: SignatureWorld, meaning: string, role: string) {
    this.lastSignature = await this.signatureService.capture(meaning, role);
  },
);

// ---------------------------------------------------------------------------
// Signature assertion steps
// ---------------------------------------------------------------------------

Then("the signature should be valid", function (this: SignatureWorld) {
  assert.ok(this.lastSignature, "No signature was captured");
  assert.equal(
    this.signatureService.validate(this.lastSignature),
    true,
    "Signature should be valid",
  );
});

Then(
  "the signature should have signer {string}",
  function (this: SignatureWorld, signerId: string) {
    assert.ok(this.lastSignature, "No signature was captured");
    assert.equal(this.lastSignature.signerId, signerId, `Expected signerId to be ${signerId}`);
  },
);

Then(
  "the signature should have meaning {string}",
  function (this: SignatureWorld, meaning: string) {
    assert.ok(this.lastSignature, "No signature was captured");
    assert.equal(this.lastSignature.meaning, meaning, `Expected meaning to be ${meaning}`);
  },
);

Then(
  "the signature should indicate reauthentication",
  function (this: SignatureWorld) {
    assert.ok(this.lastSignature, "No signature was captured");
    assert.equal(this.lastSignature.reauthenticated, true, "Signature should indicate reauthentication");
  },
);

Then(
  "the signature should have a valid signedAt timestamp",
  function (this: SignatureWorld) {
    assert.ok(this.lastSignature, "No signature was captured");
    assert.ok(this.lastSignature.signedAt, "signedAt should not be empty");
    assert.ok(
      !isNaN(new Date(this.lastSignature.signedAt).getTime()),
      `signedAt should be a valid ISO 8601 date: ${this.lastSignature.signedAt}`,
    );
  },
);

Then(
  "the captured signature count should be {int}",
  function (this: SignatureWorld, count: number) {
    assert.equal(
      this.signatureService.captured.length,
      count,
      `Expected ${count} captured signatures but got ${this.signatureService.captured.length}`,
    );
  },
);
