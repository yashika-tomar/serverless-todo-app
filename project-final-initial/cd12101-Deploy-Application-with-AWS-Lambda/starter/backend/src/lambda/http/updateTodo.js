import AWS from 'aws-sdk'
import AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../../utils/logger.mjs'

// Enable X-Ray AWS SDK wrapper
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('updateTodo')
const docClient = new XAWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export async function handler(event) {

  // --- X-Ray tracing ---
  const segment = AWSXRay.getSegment()
  const subsegment = segment.addNewSubsegment("updateTodo-handler")

  const todoId = event.pathParameters.todoId
  const updatedTodo = JSON.parse(event.body)

  // Authorizer ALWAYS sets userId
  const userId =
    event.requestContext.authorizer?.userId ||
    event.requestContext.authorizer?.principalId

  if (!userId) {
    logger.error("Missing userId", { authorizer: event.requestContext.authorizer })
    subsegment.addAnnotation("error", "missingUserId")
    subsegment.close()
    return {
      statusCode: 401,
      headers: cors(),
      body: JSON.stringify({ error: "Unauthorized: userId missing" })
    }
  }

  try {
    subsegment.addAnnotation("userId", userId)
    subsegment.addAnnotation("todoId", todoId)
    subsegment.addAnnotation("action", "updateTodo")

    await docClient.update({
      TableName: todosTable,
      Key: { userId, todoId },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done',
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

    subsegment.close()

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ message: 'Todo updated successfully' })
    }

  } catch (error) {
    logger.error("Error updating TODO", { error })

    subsegment.addError(error)
    subsegment.close()

    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: 'Could not update TODO' })
    }
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  }
}
