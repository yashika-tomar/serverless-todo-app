import AWS from 'aws-sdk'
import AWSXRay from 'aws-xray-sdk'
import { v4 as uuid } from 'uuid'
import { createLogger } from '../../utils/logger.mjs'

// Enable X-Ray tracing for AWS services
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('todos')

// Use X-Ray-wrapped AWS client
const docClient = new XAWS.DynamoDB.DocumentClient()

const todosTable = process.env.TODOS_TABLE

export async function handler(event) {

  // X-Ray tracing segment for this Lambda
  const segment = AWSXRay.getSegment()
  const subsegment = segment.addNewSubsegment("createTodo-handler")

  logger.info("EVENT RECEIVED", { event })

  try {
    const auth = event.requestContext?.authorizer

    const userId =
      event.requestContext.authorizer.userId ||
      event.requestContext.authorizer.principalId

    if (!userId) {
      logger.error("Missing userId from authorizer", { auth })

      subsegment.addAnnotation("missingUserId", true)
      subsegment.close()

      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Unauthorized: userId missing" })
      }
    }

    subsegment.addAnnotation("userId", userId)
    subsegment.addAnnotation("action", "createTodo")

    const newTodo = JSON.parse(event.body)

    const todoItem = {
      todoId: uuid(),
      userId,
      name: newTodo.name,
      dueDate: newTodo.dueDate,
      done: false,
      createdAt: new Date().toISOString()
    }

    subsegment.addMetadata("todoItem", todoItem)

    await docClient.put({
      TableName: todosTable,
      Item: todoItem
    }).promise()

    subsegment.close()

    return {
      statusCode: 201,
      headers: corsHeaders(),
      body: JSON.stringify({ item: todoItem })
    }

  } catch (error) {
    logger.error("Error creating TODO", { error })

    subsegment.addError(error)
    subsegment.close()

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Could not create TODO" })
    }
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  }
}
