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
            reject(
              new Error(`Failed to parse Cloudinary response: ${error.message}`),
            );
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function fetchAllResources({
  cloudName,
  path,
  baseParams,
  authHeader,
  maxPages = 20,
}) {
  const resources = [];
  let nextCursor = "";

  for (let page = 0; page < maxPages; page += 1) {
    const params = new URLSearchParams(baseParams);
    if (nextCursor) {
      params.set("next_cursor", nextCursor);
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}${path}?${params.toString()}`;
    const result = await requestJson(url, {
      Authorization: authHeader,
    });

    if (result.statusCode !== 200) {
      return {
        ok: false,
        statusCode: result.statusCode,
        details: result.data,
      };
    }

    const pageResources = result.data.resources || [];
    resources.push(...pageResources);

    nextCursor = result.data.next_cursor || "";
    if (!nextCursor) {
      break;
    }
  }

  return {
    ok: true,
    resources,
  };
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
  const FOLDER = (process.env.CLOUDINARY_FOLDER || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          "Cloudinary credentials not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
      }),
    };
  }

  const authHeader = `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")}`;

  const baseParams = {
    max_results: "500",
    tags: "true",
    context: "true",
  };

  const strategies = [];

  if (FOLDER) {
    // Dynamic folders: asset_folder in Media Library can differ from public_id prefix.
    strategies.push({
      name: "asset_folder",
      path: "/resources/by_asset_folder",
      params: {
        ...baseParams,
        asset_folder: FOLDER,
      },
    });

    // Classic folder mode fallback: public_id prefix usually includes folder path.
    strategies.push({
      name: "prefix",
      path: "/resources/image/upload",
      params: {
        ...baseParams,
        prefix: FOLDER,
      },
    });

    strategies.push({
      name: "prefix_slash",
      path: "/resources/image/upload",
      params: {
        ...baseParams,
        prefix: `${FOLDER}/`,
      },
    });
  }

  // Final fallback: all images in the cloud.
  strategies.push({
    name: "all_uploads",
    path: "/resources/image/upload",
    params: baseParams,
  });

  let selected = null;
  let lastError = null;

  try {
    for (const strategy of strategies) {
      const result = await fetchAllResources({
        cloudName: CLOUD_NAME,
        path: strategy.path,
        baseParams: strategy.params,
        authHeader,
      });

      if (!result.ok) {
        lastError = {
          strategy: strategy.name,
          statusCode: result.statusCode,
          details: result.details,
        };
        continue;
      }

      if (result.resources.length > 0 || strategy.name === "all_uploads") {
        selected = {
          strategy: strategy.name,
          resources: result.resources,
        };
        break;
      }
    }

    if (!selected) {
      return {
        statusCode: lastError?.statusCode || 500,
        headers,
        body: JSON.stringify({
          error: "Failed to fetch from Cloudinary",
          details: lastError?.details || "No successful query strategy.",
          strategy: lastError?.strategy || "unknown",
        }),
      };
    }

    const images = (selected.resources || []).map((resource) => {
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
        strategy: selected.strategy,
        folder: FOLDER || "(none)",
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
