import AWS from 'aws-sdk'
import AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../../utils/logger.mjs'

// Enable X-Ray for AWS services
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('getTodos')
const docClient = new XAWS.DynamoDB.DocumentClient()
const TODOS_TABLE = process.env.TODOS_TABLE
const TODOS_CREATED_AT_INDEX = process.env.TODOS_CREATED_AT_INDEX

export async function handler(event) {

  // X-Ray tracing subsegment for this handler
  const segment = AWSXRay.getSegment()
  const subsegment = segment.addNewSubsegment("getTodos-handler")

  logger.info('getTodos invoked', { eventSummary: summarizeEvent(event) })

  const userId =
    event.requestContext?.authorizer?.userId ||
    event.requestContext?.authorizer?.principalId

  if (!userId) {
    logger.error('No userId in requestContext.authorizer', {
      requestContext: event?.requestContext?.authorizer
    })

    subsegment.addAnnotation("error", "missingUserId")
    subsegment.close()

    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Unauthorized: userId not found' })
    }
  }

  const params = {
    TableName: TODOS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }

  try {
    subsegment.addAnnotation("userId", userId)
    subsegment.addAnnotation("action", "getTodos")

    logger.info('Querying DynamoDB', { paramsSummary: summarizeParams(params) })

    const result = await docClient.query(params).promise()
    const items = result.Items || []

    logger.info('DynamoDB query success', { userId, itemsCount: items.length })

    subsegment.close()

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ items })
    }

  } catch (error) {
    logger.error('DynamoDB query failed', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error
    })

    subsegment.addError(error)
    subsegment.close()

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Could not fetch TODOs',
        details: error.message
      })
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true
  }
}

function summarizeEvent(event) {
  try {
    return {
      path: event?.path,
      httpMethod: event?.httpMethod,
      userIdPresent: !!event?.requestContext?.authorizer?.userId,
      principalId: event?.requestContext?.authorizer?.principalId
    }
  } catch {
    return {}
  }
}

function summarizeParams(params) {
  return {
    TableName: params.TableName,
    hasKeyCondition: !!params.KeyConditionExpression,
    hasIndex: !!params.IndexName
  }
}
