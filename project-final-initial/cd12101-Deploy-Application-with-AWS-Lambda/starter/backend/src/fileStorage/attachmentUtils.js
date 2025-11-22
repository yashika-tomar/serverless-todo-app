import AWS from 'aws-sdk'

const s3 = new AWS.S3({ signatureVersion: 'v4' })

const BUCKET = process.env.ATTACHMENTS_BUCKET
const URL_EXPIRATION = 300 // 5 minutes

export class AttachmentUtils {
  getUploadUrl(todoId) {
    return s3.getSignedUrl('putObject', {
      Bucket: BUCKET,
      Key: todoId,
      Expires: URL_EXPIRATION
    })
  }

  getAttachmentUrl(todoId) {
    return `https://${BUCKET}.s3.amazonaws.com/${todoId}`
  }
}
