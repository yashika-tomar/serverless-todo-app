import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

export const handler = async (event) => {
  try {
    const token = extractToken(event.authorizationToken);

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw new Error("Invalid token");

    const key = await client.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    });

    return {
      principalId: verified.sub,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: verified.sub,
      },
    };
  } catch (e) {
    console.error("AUTH ERROR:", e);
    return {
      principalId: "anonymous",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: event.methodArn,
          },
        ],
      },
    };
  }
};

function extractToken(header) {
  if (!header) throw new Error("Missing auth header");
  if (!header.toLowerCase().startsWith("bearer "))
    throw new Error("Invalid auth header");
  return header.split(" ")[1];
}
