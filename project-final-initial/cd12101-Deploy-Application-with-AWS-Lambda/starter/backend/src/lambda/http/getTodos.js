// backend/src/lambda/http/getTodos.js
import AWS from 'aws-sdk'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('getTodos')
const docClient = new AWS.DynamoDB.DocumentClient()
const TODOS_TABLE = process.env.TODOS_TABLE
const TODOS_CREATED_AT_INDEX = process.env.TODOS_CREATED_AT_INDEX

export async function handler(event) {
  logger.info('getTodos invoked', { eventSummary: summarizeEvent(event) })

  // Try to read userId from authorizer context (set by your custom authorizer)
  const userId =
    event?.requestContext?.authorizer?.userId ||
    event?.requestContext?.authorizer?.principalId ||
    event?.requestContext?.authorizer?.sub

  if (!userId) {
    logger.error('No userId in requestContext.authorizer', {
      requestContext: event?.requestContext?.authorizer
    })
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Unauthorized: userId not found' })
    }
  }

  // Build params for DynamoDB query
  const params = {
    TableName: TODOS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
    // If you want to order/query by createdAt index, you can add IndexName:
    // IndexName: TODOS_CREATED_AT_INDEX
  }

  try {
    logger.info('Querying DynamoDB', { paramsSummary: summarizeParams(params) })
    const result = await docClient.query(params).promise()
    const items = result.Items || []
    logger.info('DynamoDB query success', { userId, itemsCount: items.length })

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ items })
    }
  } catch (error) {
    // Log full error — this is the single most usefull place to debug
    logger.error('DynamoDB query failed', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error
    })

    // Return a safe message to client but keep the logs in cloudwatch
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Could not fetch TODOs', details: error.message })
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
  // Avoid logging huge objects (like full ExpressionAttributeValues with big data)
  return {
    TableName: params.TableName,
    hasKeyCondition: !!params.KeyConditionExpression,
    hasIndex: !!params.IndexName
  }
}
