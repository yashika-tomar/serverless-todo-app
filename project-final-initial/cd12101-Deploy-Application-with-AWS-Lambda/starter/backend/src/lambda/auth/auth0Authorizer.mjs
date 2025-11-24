import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,// i just did this 
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
  jwksRequestsPerMinute: 5,
  rateLimit: false,
});

export const handler = async (event) => {
  try {
    console.log("AUTH DEBUG: incoming methodArn:", event.methodArn);
    const token = extractToken(event.authorizationToken);
    console.log("AUTH DEBUG: token length", token.length);

    const decoded = jwt.decode(token, { complete: true });
    console.log("AUTH DEBUG: decoded header:", decoded && decoded.header);
    if (!decoded) throw new Error("Invalid token");
    
    if (!decoded.header || !decoded.header.kid) {
      console.error("AUTH DEBUG: token missing kid in header");
    } else {
      console.log("AUTH DEBUG: token.kid =", decoded.header.kid);
    }

    const key = await client.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();
    console.log("AUTH DEBUG: successfully fetched signing key");

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
    console.error("AUTH ERROR:", e && e.message);
    console.error("AUTH ERROR - stack:", e && e.stack);
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
