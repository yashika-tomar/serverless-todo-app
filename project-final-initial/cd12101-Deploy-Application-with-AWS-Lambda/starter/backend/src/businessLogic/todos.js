import { v4 as uuidv4 } from 'uuid'
import { TodosAccess } from '../dataLayer/todosAccess.js'
import { AttachmentUtils } from '../fileStorage/attachmentUtils.js'

const todosAccess = new TodosAccess()
const attachmentUtils = new AttachmentUtils()

export async function getTodosForUser(userId) {
  return await todosAccess.getTodos(userId)
}

export async function createTodo(userId, createTodoRequest) {
  const todoId = uuidv4()
  const createdAt = new Date().toISOString()

  const newItem = {
    userId,
    todoId,
    createdAt,
    name: createTodoRequest.name,
    dueDate: createTodoRequest.dueDate,
    done: false
  }

  await todosAccess.createTodo(newItem)
  return newItem
}

export async function updateTodo(userId, todoId, updateRequest) {
  return await todosAccess.updateTodo(userId, todoId, updateRequest)
}

export async function deleteTodo(userId, todoId) {
  return await todosAccess.deleteTodo(userId, todoId)
}

export async function createAttachmentPresignedUrl(userId, todoId) {
  const uploadUrl = attachmentUtils.getUploadUrl(todoId)
  const attachmentUrl = attachmentUtils.getAttachmentUrl(todoId)

  await todosAccess.updateAttachmentUrl(userId, todoId, attachmentUrl)

  return uploadUrl
}
