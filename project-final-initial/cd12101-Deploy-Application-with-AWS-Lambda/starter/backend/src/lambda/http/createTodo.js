import AWS from 'aws-sdk'
import { v4 as uuid } from 'uuid'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('todos')
const docClient = new AWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export async function handler(event) {
  const newTodo = JSON.parse(event.body)

  try {
   
    const userId = event.requestContext.authorizer.userId

    const todoItem = {
      todoId: uuid(),
      userId: userId,
      name: newTodo.name,
      dueDate: newTodo.dueDate,
      done: false,
      createdAt: new Date().toISOString()
    }

    // Save to DynamoDB
    await docClient.put({
      TableName: todosTable,
      Item: todoItem
    }).promise()

    logger.info('Created new TODO', { todoItem })

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ item: todoItem })
    }

  } catch (error) {
    logger.error('Error creating TODO', { error })

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: 'Could not create TODO' })
    }
  }
}
