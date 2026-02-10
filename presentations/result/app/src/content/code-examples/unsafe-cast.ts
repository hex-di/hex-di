import type { CodeExample } from "../../ports/code-examples.port.js";

export const example: CodeExample = {
  id: "unsafe-cast",
  title: "The Unsafe Cast",
  before: {
    code: `async getMetadata(id: string): Promise<MetadataRecord> {
  try {
    const record = await this.prisma.metadata.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(\`Metadata \${id} not found\`);
    }
    return record;
  } catch (err) {
    if (err instanceof NotFoundException) throw err;
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException(
      (err as Error)?.message ?? "Unknown error"
    );
  }
}`,
    language: "typescript",
    filename: "metadata.controller.ts",
    highlights: [11, 12, 13, 14],
    annotations: [
      { line: 11, text: "instanceof can fail across package boundaries", type: "error" },
      { line: 12, text: "Defensive re-throw: catch-and-rethrow your own errors", type: "error" },
      { line: 13, text: "Unsafe cast: err could be anything", type: "error" },
      { line: 14, text: "?.message -- what if err has no message?", type: "error" },
    ],
  },
  after: {
    code: `function getMetadata(id: string): ResultAsync<MetadataRecord, MetadataError> {
  return ResultAsync.fromPromise(
    prisma.metadata.findUnique({ where: { id } }),
    (e) => DatabaseError({ cause: String(e) })
  ).andThen((record) =>
    record ? ok(record) : err(NotFound({ resource: "Metadata", id }))
  );
}
result.match(
  (data) => res.json(data),
  (error) => {
    switch (error._tag) {
      case "NotFound": throw new NotFoundException(error.id);
      case "DatabaseError": throw new InternalServerErrorException();
    }
  }
);`,
    language: "typescript",
    filename: "metadata.controller.ts",
    highlights: [1, 5, 9],
    annotations: [
      { line: 1, text: "Return type: no surprises", type: "ok" },
      { line: 5, text: "andThen chains without nesting", type: "ok" },
      { line: 9, text: "match() -- no instanceof, no casts", type: "ok" },
      { line: 13, text: "Framework boundary: exhaustive NestJS translation", type: "info" },
    ],
  },
};
