import AWS from 'aws-sdk'

const docClient = new AWS.DynamoDB.DocumentClient()

const TODOS_TABLE = process.env.TODOS_TABLE
const CREATED_AT_INDEX = process.env.TODOS_CREATED_AT_INDEX

export class TodosAccess {
  async getTodos(userId) {
    const result = await docClient.query({
      TableName: TODOS_TABLE,
      IndexName: CREATED_AT_INDEX,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }).promise()

    return result.Items
  }

  async createTodo(item) {
    await docClient.put({
      TableName: TODOS_TABLE,
      Item: item
    }).promise()
  }

  async updateTodo(userId, todoId, updated) {
    const updateExp = []
    const attributeValues = {}
    const attributeNames = {}

    if (updated.name !== undefined) {
      updateExp.push('#name = :name')
      attributeNames['#name'] = 'name'
      attributeValues[':name'] = updated.name
    }

    if (updated.dueDate !== undefined) {
      updateExp.push('#dueDate = :dueDate')
      attributeNames['#dueDate'] = 'dueDate'
      attributeValues[':dueDate'] = updated.dueDate
    }

    if (updated.done !== undefined) {
      updateExp.push('#done = :done')
      attributeNames['#done'] = 'done'
      attributeValues[':done'] = updated.done
    }

    await docClient.update({
      TableName: TODOS_TABLE,
      Key: {
        userId,
        todoId
      },
      UpdateExpression: 'set ' + updateExp.join(', '),
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues
    }).promise()
  }

  async deleteTodo(userId, todoId) {
    await docClient.delete({
      TableName: TODOS_TABLE,
      Key: { userId, todoId }
    }).promise()
  }

  async updateAttachmentUrl(userId, todoId, attachmentUrl) {
    await docClient.update({
      TableName: TODOS_TABLE,
      Key: { userId, todoId },
      UpdateExpression: 'set attachmentUrl = :a',
      ExpressionAttributeValues: {
        ':a': attachmentUrl
      }
    }).promise()
  }
}
