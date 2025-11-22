import AWS from 'aws-sdk'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('todos')
const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export async function handler(event) {
  const todoId = event.pathParameters.todoId
  const updatedTodo = JSON.parse(event.body)

  // FIX: correct userId from authorizer
  const userId = event.requestContext.authorizer.userId

  try {
    // Update the TODO item in DynamoDB
    await docClient.update({
      TableName: todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      },
      UpdateExpression:
        'set #name = :name, dueDate = :dueDate, done = :done',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': updatedTodo.name,
        ':dueDate': updatedTodo.dueDate,
        ':done': updatedTodo.done
      },
      ReturnValues: 'UPDATED_NEW'
    }).promise()

    logger.info('Updated TODO', { todoId, userId, updatedTodo })

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ message: 'Todo updated successfully' })
    }

  } catch (error) {
    logger.error('Error updating TODO', { error })

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: 'Could not update TODO' })
    }
  }
}
