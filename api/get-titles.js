// Soubor: api/get-titles.js

// Načtení klíče z proměnné prostředí (dostupné pouze na straně serveru/edge)
const API_KEY = process.env.YOUTUBE_API_KEY; 

export default async function handler(request, response) {
  // 1. Kontrola konfigurace a metody
  if (!API_KEY) {
    return response.status(500).json({ error: 'Server configuration error: API key not set.' });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { videoIds } = request.body; // Pole ID videí z klienta (index.html)

  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    return response.status(400).json({ error: 'Missing or invalid videoIds array in request body.' });
  }

  try {
    const idsString = videoIds.join(',');
    // 2. Volání YouTube Data API
    const youtubeUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${idsString}&key=${API_KEY}`;

    const apiResponse = await fetch(youtubeUrl);
    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      // Zpracování chyb z YouTube API
      return response.status(apiResponse.status).json({ 
          error: 'YouTube API Error', 
          details: apiData.error ? apiData.error.message : 'Unknown error' 
      });
    }

    // 3. Zpracování dat a příprava odpovědi
    const titles = apiData.items.map(item => ({
      id: item.id,
      title: item.snippet.title
    }));

    response.status(200).json({ titles }); // Vrácení dynamických názvů klientovi
  } catch (error) {
    console.error('Proxy function error:', error);
    response.status(500).json({ error: 'Internal Server Error during API call.' });
  }
}
