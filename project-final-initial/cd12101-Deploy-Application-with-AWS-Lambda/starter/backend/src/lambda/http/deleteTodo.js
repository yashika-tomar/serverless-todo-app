import AWS from 'aws-sdk'
import AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../../utils/logger.mjs'

// Enable X-Ray for all AWS services
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('todos')
const docClient = new XAWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export async function handler(event) {

  // X-Ray tracing segment
  const segment = AWSXRay.getSegment()
  const subsegment = segment.addNewSubsegment("deleteTodo-handler")

  const todoId = event.pathParameters.todoId

  try {
    const userId = event.requestContext.authorizer.principalId

    subsegment.addAnnotation("action", "deleteTodo")
    subsegment.addAnnotation("userId", userId)
    subsegment.addAnnotation("todoId", todoId)

    await docClient.delete({
      TableName: todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      }
    }).promise()

    logger.info('Deleted TODO', { todoId, userId })

    subsegment.close()

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ message: 'Todo deleted successfully' })
    }

  } catch (error) {
    logger.error('Error deleting TODO', { error })

    subsegment.addError(error)
    subsegment.close()

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
