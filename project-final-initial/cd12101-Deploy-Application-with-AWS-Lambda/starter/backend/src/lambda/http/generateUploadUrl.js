import AWS from 'aws-sdk'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('generateUploadUrl')

const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

const bucketName = process.env.ATTACHMENTS_BUCKET
const urlExpiration = process.env.URL_EXPIRATION || 300

export async function handler(event) {
  const todoId = event.pathParameters.todoId

  // ✔ FIX: Always use principalId (same as Create/Delete/Update)
  const userId = event.requestContext.authorizer.principalId

  if (!userId) {
    logger.error("Missing principalId in authorizer", {
      authorizer: event.requestContext.authorizer
    })

    return {
      statusCode: 401,
      headers: cors(),
      body: JSON.stringify({ error: "Unauthorized" })
    }
  }

  try {
    // Store file as userId/todoId
    const attachmentKey = `${userId}/${todoId}`

    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: attachmentKey,
      Expires: Number(urlExpiration)
    })

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
