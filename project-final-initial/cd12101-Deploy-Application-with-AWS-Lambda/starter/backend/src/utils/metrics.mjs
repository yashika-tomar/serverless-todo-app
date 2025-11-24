import AWS from "aws-sdk"

const cloudwatch = new AWS.CloudWatch()

export function putMetric(name, value = 1) {
  return cloudwatch.putMetricData({
    Namespace: "TodoApp",
    MetricData: [
      {
        MetricName: name,
        Unit: "Count",
        Value: value
      }
    ]
  }).promise()
}
