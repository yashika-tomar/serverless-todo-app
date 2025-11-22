export const updateTodoSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    dueDate: { type: 'string' },
    done: { type: 'boolean' }
  }
}
