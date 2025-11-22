import AWS from 'aws-sdk'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('todos')
const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export async function handler(event) {
  const todoId = event.pathParameters.todoId

  try {
    // Correct userId from authorizer
    const userId = event.requestContext.authorizer.userId

    // Delete the TODO item from DynamoDB
    await docClient.delete({
      TableName: todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      }
    }).promise()

    logger.info('Deleted TODO', { todoId, userId })

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ message: 'Todo deleted successfully' })
    }

  } catch (error) {
    logger.error('Error deleting TODO', { error })

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: 'Could not delete TODO' })
    }
  }
}
