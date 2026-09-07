// Layer 3 repository for the To-do module. Shares the OperationStore (and therefore the
// device's sequence/Lamport clock and the single op log) with the grocery repository, and
// derives to-do state with the to-do reducer. Same shape as GroceryRepository.

import type { Operation, TodoStatus } from "../domain/types.js";
import type {
  TodoAddPayload,
  TodoEditPayload,
  TodoRespondPayload,
} from "../domain/payloads.js";
import type { TodoState } from "../domain/reducer-todo.js";
import { reduceTodos } from "../domain/reducer-todo.js";
import { OperationStore } from "./operation-store.js";

export class TodoRepository {
  private state: TodoState;

  private constructor(private readonly store: OperationStore) {
    this.state = reduceTodos(store.getOperations());
  }

  static fromStore(store: OperationStore): TodoRepository {
    return new TodoRepository(store);
  }

  getState(): TodoState {
    return this.state;
  }

  /** Re-derive from the shared log (e.g. after sync ingested tasks into the store). */
  refresh(): TodoState {
    this.state = reduceTodos(this.store.getOperations());
    return this.state;
  }

  private async commit(op: Operation): Promise<TodoState> {
    await this.store.append(op);
    return this.refresh();
  }

  addTask(payload: TodoAddPayload): Promise<TodoState> {
    return this.commit(this.store.factory.addTodo(payload));
  }

  editTask(taskId: string, fields: TodoEditPayload): Promise<TodoState> {
    return this.commit(this.store.factory.editTodo(taskId, fields));
  }

  setDue(taskId: string, dueAt: number | null): Promise<TodoState> {
    return this.commit(this.store.factory.setTodoDue(taskId, dueAt));
  }

  setStatus(taskId: string, status: TodoStatus): Promise<TodoState> {
    return this.commit(this.store.factory.setTodoStatus(taskId, status));
  }

  respond(taskId: string, response: TodoRespondPayload["delegation_status"]): Promise<TodoState> {
    return this.commit(this.store.factory.respondTodo(taskId, response));
  }

  deleteTask(taskId: string): Promise<TodoState> {
    return this.commit(this.store.factory.deleteTodo(taskId));
  }
}
