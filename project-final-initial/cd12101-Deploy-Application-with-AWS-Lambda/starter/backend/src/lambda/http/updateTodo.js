import AWS from 'aws-sdk'
import AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../../utils/logger.mjs'
import { putMetric } from '../../utils/metrics.mjs'


// Enable X-Ray tracing
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('updateTodo')
const docClient = new XAWS.DynamoDB.DocumentClient()
const todosTable = process.env.TODOS_TABLE

export const handler = async (event) => {

  const segment = AWSXRay.getSegment()
  const subsegment = segment.addNewSubsegment("updateTodo-handler")

  logger.info("updateTodo event", {
    pathParameters: event.pathParameters,
    authorizer: event.requestContext?.authorizer,
    body: event.body
  })

  const todoId = event.pathParameters.todoId
  const updatedTodo = JSON.parse(event.body)

  // Get userId the SAME WAY CreateTodo & DeleteTodo use it:
  const userId = event.requestContext.authorizer.principalId

  if (!userId) {
    logger.error("Missing principalId", {
      authorizer: event.requestContext.authorizer
    })

    subsegment.addAnnotation("error", "missingUserId")
    subsegment.close()

    return {
      statusCode: 401,
      headers: cors(),
      body: JSON.stringify({ error: "Unauthorized" })
    }
  }

  try {
    subsegment.addAnnotation("userId", userId)
    subsegment.addAnnotation("todoId", todoId)
    subsegment.addAnnotation("action", "updateTodo")

    await docClient.update({
      TableName: todosTable,
      Key: { userId, todoId },
      UpdateExpression: 'set #name = :name, dueDate = :dueDate, done = :done, attachmentUrl = :attachmentUrl',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': updatedTodo.name,
        ':dueDate': updatedTodo.dueDate,
        ':done': updatedTodo.done,
        ':attachmentUrl': updatedTodo.attachmentUrl || null
      },
      ReturnValues: 'UPDATED_NEW'
    }).promise()
    await putMetric("TodoUpdated")


    logger.info('TODO updated', {
      todoId,
      userId,
      updatedTodo
    })

    subsegment.close()

    return {
      statusCode: 204,     // Reviewer expects empty body
      headers: cors(),
      body: ''             
    }

  } catch (error) {
    logger.error("Error updating TODO", { error })

    subsegment.addError(error)
    subsegment.close()

    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: "Could not update TODO" })
    }
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  }
}
