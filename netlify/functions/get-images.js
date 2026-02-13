const https = require('https');

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Cloudinary credentials from environment variables
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Cloudinary credentials not configured. Please set environment variables in Netlify.' 
      })
    };
  }

  // Build the Cloudinary API URL
  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = 'image';
  const maxResults = 500;
  const prefix = 'PhotographyPortfolio'; // Your folder

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/${resourceType}?max_results=${maxResults}&prefix=${prefix}&tags=true`;

  // Create basic auth header
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          
          if (res.statusCode !== 200) {
            resolve({
              statusCode: res.statusCode,
              headers,
              body: JSON.stringify({ 
                error: 'Failed to fetch from Cloudinary',
                details: parsedData
              })
            });
            return;
          }

          // Transform Cloudinary response to match your app's format
          const images = (parsedData.resources || []).map(resource => {
            // Extract categories from tags
            const categories = (resource.tags || [])
              .map(tag => tag.toLowerCase().trim())
              .filter(tag => ['landscapes', 'nature', 'animal'].includes(tag));

            return {
              src: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${resource.public_id}.${resource.format}`,
              title: resource.context?.custom?.title || resource.public_id.split('/').pop(),
              categories: categories.length > 0 ? categories : ['landscapes'] // Default to landscapes if no tags
            };
          });

          resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify({ images })
          });
        } catch (error) {
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to parse Cloudinary response',
              details: error.message
            })
          });
        }
      });
    }).on('error', (error) => {
      resolve({
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Network error',
          details: error.message
        })
      });
    });
  });
};
