const https = require("https");

function requestJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ statusCode: res.statusCode || 500, data: parsed });
          } catch (error) {
            reject(new Error(`Failed to parse Cloudinary response: ${error.message}`));
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;
  const FOLDER = (process.env.CLOUDINARY_FOLDER || "PhotographyPortfolio")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Cloudinary credentials not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
      }),
    };
  }

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");

  const prefixCandidates = [];
  if (FOLDER) {
    prefixCandidates.push(FOLDER);
    prefixCandidates.push(`${FOLDER}/`);
  }
  // Final fallback: query all uploaded images if folder prefix misses.
  prefixCandidates.push("");

  let cloudinaryData = null;
  let usedPrefix = "";

  try {
    for (const prefix of prefixCandidates) {
      const params = new URLSearchParams({
        max_results: "500",
        tags: "true",
        context: "true",
      });

      if (prefix) {
        params.set("prefix", prefix);
      }

      const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?${params.toString()}`;
      const result = await requestJson(url, {
        Authorization: `Basic ${auth}`,
      });

      if (result.statusCode !== 200) {
        return {
          statusCode: result.statusCode,
          headers,
          body: JSON.stringify({
            error: "Failed to fetch from Cloudinary",
            details: result.data,
            attemptedPrefix: prefix || "(none)",
          }),
        };
      }

      const resources = result.data.resources || [];
      if (resources.length > 0 || !prefix) {
        cloudinaryData = result.data;
        usedPrefix = prefix;
        break;
      }
    }

    const images = (cloudinaryData?.resources || []).map((resource) => {
      const categories = (resource.tags || [])
        .map((tag) => String(tag).toLowerCase().trim())
        .filter((tag) => ["landscapes", "nature", "animal"].includes(tag));

      return {
        src: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${resource.public_id}.${resource.format}`,
        title:
          resource.context?.custom?.title ||
          resource.display_name ||
          resource.public_id.split("/").pop(),
        categories,
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        images,
        source: "cloudinary",
        folderPrefix: usedPrefix,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Network or runtime error",
        details: error.message,
      }),
    };
  }
};
