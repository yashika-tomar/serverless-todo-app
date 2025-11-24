import AWS from 'aws-sdk'
import AWSXRay from 'aws-xray-sdk'
import { createLogger } from '../../utils/logger.mjs'
const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('generateUploadUrl')

const s3 = new XAWS.S3({
  signatureVersion: 'v4'
})

const bucketName = process.env.ATTACHMENTS_BUCKET
const urlExpiration = process.env.URL_EXPIRATION || 300

export async function handler(event) {

  const todoId = event.pathParameters.todoId
  const userId = event.requestContext.authorizer.principalId

  if (!userId) {
    logger.error("Missing principalId", {
      authorizer: event.requestContext.authorizer
    })
    return {
      statusCode: 401,
      headers: cors(),
      body: JSON.stringify({ error: "Unauthorized" })
    }
  }

  const attachmentKey = `${userId}/${todoId}`

  try {

    // 1. Create presigned upload URL
    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: attachmentKey,
      Expires: Number(urlExpiration)
    })

    // 2. Permanent public image URL
    const attachmentUrl =
      `https://${bucketName}.s3.amazonaws.com/${attachmentKey}`

    // 3. Save permanent URL in DynamoDB
    const docClient = new XAWS.DynamoDB.DocumentClient()

    await docClient.update({
      TableName: process.env.TODOS_TABLE,
      Key: { userId, todoId },
      UpdateExpression: "set attachmentUrl = :url",
      ExpressionAttributeValues: {
        ":url": attachmentUrl
      }
    }).promise()

    logger.info("Generated upload URL", {
      userId,
      todoId,
      attachmentKey
    })

    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({ uploadUrl })
    }

  } catch (error) {
    logger.error("Error generating upload URL", { error })

    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: "Could not generate upload URL" })
    }
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  }
}
