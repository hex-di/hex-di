export class TodoNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super("Todo not found");
    this.name = "TodoNotFoundError";
    this.id = id;
  }
}
