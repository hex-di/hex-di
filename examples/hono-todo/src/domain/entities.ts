export interface User {
  id: string;
  name: string;
  roles: string[];
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
}
