/*
 * HDCG site configuration.
 * This is the ONLY file that contains the YouTube API key. To rotate the key, edit apiKey below.
 *
 * SECURITY REMINDER: this is a static site, so the key is sent to every visitor's browser and
 * anyone can copy it. Before going live, open Google Cloud Console > APIs & Services > Credentials,
 * select this key and:
 *   1. Application restrictions -> "Websites" (HTTP referrers): add your production domain(s)
 *      (and http://localhost:5173/* only while testing).
 *   2. API restrictions -> "Restrict key" -> YouTube Data API v3 only.
 */
window.HDCG_CONFIG = {
  youtube: {
    apiKey: "AIzaSyAKDBxymUi_-8stZ3ZSLhO2oVyxfWpUSk8",
    channelId: "UCExjRGNrnELWfdgzyyVXdgQ",
    channelUrl: "https://www.youtube.com/@rwandacad4343",
    // Hand-picked videos, shown in exactly this order (the homepage shows the first 3, the Projects page all).
    // To add or swap a video: paste its ID (the part after v= in the YouTube link) and a title.
    // Leave this list empty to go back to automatic selection (top videos by views, Shorts removed).
    featuredVideos: [
      { id: "1e3R-1GIf_o", title: "inzu nziza wakubaka murwanda" },
      { id: "ldHzbxwAc9w", title: "construction services in kigali rwanda" },
      // "Nkumira Omukwano" is not on this channel. Add its video ID here once confirmed.
      { id: "cdy8NcbB5EY", title: "BEST TWIN HOUSE DESINED IN 300 SQMETER #kigali #RWANDA" },
      { id: "EB4FqbXQWOI", title: "Modern Residential House IN RWANDA KIGALI" }
    ],
    // Automatic selection (used only when featuredVideos is empty): drop Shorts (duration <= minDurationSeconds), rank by views, keep the top videosToShow.
    videosToShow: 8,
    minDurationSeconds: 60,
    // false: stop as soon as 8 non-Shorts are found (ranks the most recent uploads only).
    // true: scan every upload (up to maxPages) so the ranking covers the channel's all-time most-viewed videos.
    scanAllUploads: false,
    pageSize: 50,   // playlistItems / videos.list batch size (API maximum is 50)
    maxPages: 10,   // safety cap when extra pages are needed to find enough non-Short videos
    cacheMinutes: 60,
    // Shown when the API fails or quota is exceeded, so the section is never empty.
    fallbackVideos: [
      { id: "GvCIGrQ3kqo", title: "Hirwa Design Construction Group — Project Video" }
    ]
  }
};
