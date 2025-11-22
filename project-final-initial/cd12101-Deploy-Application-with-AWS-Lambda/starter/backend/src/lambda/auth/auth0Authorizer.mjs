import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
});

export const handler = async (event) => {
  try {
    const token = getToken(event.authorizationToken);
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header) throw new Error("Invalid token");

    const kid = decoded.header.kid;

    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`
    });

    // SUCCESS → return context so Lambda receives userId
    return {
      principalId: verified.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: verified.sub
      }
    };

  } catch (err) {
    console.error("AUTH ERROR:", err);
    throw new Error("Unauthorized");
  }
};

function getToken(authHeader) {
  if (!authHeader) throw new Error("No authentication header");
  if (!authHeader.toLowerCase().startsWith("bearer "))
    throw new Error("Invalid authentication header");

  return authHeader.split(" ")[1];
}
