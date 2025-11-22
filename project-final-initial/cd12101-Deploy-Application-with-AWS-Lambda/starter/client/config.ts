const apiId = 'bdqx8w2sa' //API Gateway id
export const apiEndpoint = `https://${apiId}.execute-api.us-east-1.amazonaws.com/dev`

export const authConfig = {
  domain: 'dev-swyiahy623v6dfat.us.auth0.com ',    // Domain from Auth0
  clientId: 'TnbOTgUvGJTHsq3iKG509ujSxgS0I3QW ',  // Client id from an Auth0 application
  callbackUrl: 'http://localhost:3000/callback'
}