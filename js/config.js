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
    maxResults: 12,
    cacheMinutes: 60,
    // Shown when the API fails or quota is exceeded, so the section is never empty.
    fallbackVideos: [
      { id: "GvCIGrQ3kqo", title: "Hirwa Design Construction Group — Project Video" }
    ]
  }
};
