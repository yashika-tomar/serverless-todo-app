export const createTodoSchema = {
  type: 'object',
  required: ['name', 'dueDate'],
  properties: {
    name: { type: 'string' },
    dueDate: { type: 'string' }
  }
}
