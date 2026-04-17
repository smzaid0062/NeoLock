const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: "us-east-2" });

exports.handler = async (event) => {

  const method = event.requestContext?.http?.method
               || event.httpMethod
               || "";

  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "*"
      },
      body: ""
    };
  }

  try {
    const fileName = `face-${Date.now()}.png`;

    const command = new PutObjectCommand({
      Bucket: "face-collection-bucket-0062",
      Key: fileName,
      ContentType: "image/png"
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ url, fileName })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
