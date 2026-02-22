import { describe, it, expect } from "vitest";
import { createWriteAheadLog } from "../../src/guard/wal.js";
import type { AuditEntry } from "../../src/guard/types.js";

function makeEntry(id: string): AuditEntry {
  return {
    evaluationId: id,
    timestamp: new Date().toISOString(),
    subjectId: "user-1",
    authenticationMethod: "password",
    policy: "hasRole",
    decision: "allow",
    portName: "TestPort",
    scopeId: "scope-1",
    reason: "Access granted",
    durationMs: 1,
    schemaVersion: 1,
  };
}

describe("WriteAheadLog", () => {
  describe("createWriteAheadLog()", () => {
    it("appends an entry and returns a WAL id", () => {
      const wal = createWriteAheadLog();
      const entry = makeEntry("eval-1");
      const result = wal.append(entry);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value).toBe("string");
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    it("appended entry appears in entries() as uncommitted", () => {
      const wal = createWriteAheadLog();
      const entry = makeEntry("eval-2");
      const appendResult = wal.append(entry);
      expect(appendResult.isOk()).toBe(true);

      const allEntries = wal.entries();
      expect(allEntries).toHaveLength(1);
      expect(allEntries[0].committed).toBe(false);
      expect(allEntries[0].entry).toBe(entry);
    });

    it("commit() marks an entry as committed", () => {
      const wal = createWriteAheadLog();
      const appendResult = wal.append(makeEntry("eval-3"));
      expect(appendResult.isOk()).toBe(true);
      const id = appendResult.isOk() ? appendResult.value : "";

      const commitResult = wal.commit(id);
      expect(commitResult.isOk()).toBe(true);

      const allEntries = wal.entries();
      expect(allEntries[0].committed).toBe(true);
    });

    it("rollback() removes an uncommitted entry", () => {
      const wal = createWriteAheadLog();
      const appendResult = wal.append(makeEntry("eval-4"));
      const id = appendResult.isOk() ? appendResult.value : "";

      const rollbackResult = wal.rollback(id);
      expect(rollbackResult.isOk()).toBe(true);
      expect(wal.entries()).toHaveLength(0);
    });

    it("rollback() fails for a committed entry", () => {
      const wal = createWriteAheadLog();
      const appendResult = wal.append(makeEntry("eval-5"));
      const id = appendResult.isOk() ? appendResult.value : "";
      wal.commit(id);

      const rollbackResult = wal.rollback(id);
      expect(rollbackResult.isErr()).toBe(true);
    });

    it("rollback() fails for unknown id", () => {
      const wal = createWriteAheadLog();
      const result = wal.rollback("unknown-id");
      expect(result.isErr()).toBe(true);
    });

    it("commit() fails for unknown id", () => {
      const wal = createWriteAheadLog();
      const result = wal.commit("unknown-id");
      expect(result.isErr()).toBe(true);
    });

    it("recover() returns only uncommitted entries", () => {
      const wal = createWriteAheadLog();

      const r1 = wal.append(makeEntry("eval-a"));
      const r2 = wal.append(makeEntry("eval-b"));
      const r3 = wal.append(makeEntry("eval-c"));

      expect(r1.isOk() && r2.isOk() && r3.isOk()).toBe(true);

      const id1 = r1.isOk() ? r1.value : "";
      const id3 = r3.isOk() ? r3.value : "";

      // Commit first and third
      wal.commit(id1);
      wal.commit(id3);

      // Only second should be recoverable
      const recovered = wal.recover();
      expect(recovered).toHaveLength(1);
      expect(recovered[0].entry.evaluationId).toBe("eval-b");
    });

    it("multiple appends produce distinct ids", () => {
      const wal = createWriteAheadLog();
      const ids = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const result = wal.append(makeEntry(`eval-${i}`));
        if (result.isOk()) ids.add(result.value);
      }
      expect(ids.size).toBe(10);
    });

    it("crash recovery: append 3, commit 1, recover 2 uncommitted", () => {
      const wal = createWriteAheadLog();
      const r1 = wal.append(makeEntry("crash-1"));
      const r2 = wal.append(makeEntry("crash-2"));
      const r3 = wal.append(makeEntry("crash-3"));

      // Commit only the second
      const id2 = r2.isOk() ? r2.value : "";
      wal.commit(id2);

      const recovered = wal.recover();
      expect(recovered).toHaveLength(2);
      const evalIds = recovered.map((w) => w.entry.evaluationId);
      expect(evalIds).toContain("crash-1");
      expect(evalIds).toContain("crash-3");
      // Guard against unused result variables
      expect(r1.isOk()).toBe(true);
      expect(r3.isOk()).toBe(true);
    });

    it("double-commit on same id is idempotent (still committed)", () => {
      const wal = createWriteAheadLog();
      const r = wal.append(makeEntry("double-commit"));
      const id = r.isOk() ? r.value : "";

      const first = wal.commit(id);
      expect(first.isOk()).toBe(true);

      const second = wal.commit(id);
      expect(second.isOk()).toBe(true);

      // Entry remains committed
      const all = wal.entries();
      const entry = all.find((e) => e.id === id);
      expect(entry?.committed).toBe(true);
    });

    it("entries maintain insertion order", () => {
      const wal = createWriteAheadLog();
      wal.append(makeEntry("order-a"));
      wal.append(makeEntry("order-b"));
      wal.append(makeEntry("order-c"));

      const all = wal.entries();
      expect(all[0].entry.evaluationId).toBe("order-a");
      expect(all[1].entry.evaluationId).toBe("order-b");
      expect(all[2].entry.evaluationId).toBe("order-c");
    });
  });
});
