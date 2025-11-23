import AWS from 'aws-sdk'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('generateUploadUrl')
const s3 = new AWS.S3({ signatureVersion: 'v4' })
const bucketName = process.env.ATTACHMENTS_BUCKET
const urlExpiration = process.env.URL_EXPIRATION || 300 // 5 minutes

export async function handler(event) {
  const todoId = event.pathParameters.todoId

  // FIX: Must use context.userId (NOT principalId)
  const userId = event.requestContext.authorizer.userId

  try {
    // Save file inside a folder named after the user
    const attachmentKey = `${userId}/${todoId}`

    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: attachmentKey,
      Expires: Number(urlExpiration)
    })

    logger.info("Generated upload URL", { userId, todoId })

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ uploadUrl })
    }

  } catch (error) {
    logger.error("Error generating upload URL", { error })

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({ error: "Could not generate upload URL" })
    }
  }
}
