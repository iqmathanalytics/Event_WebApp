const app = require("./app");
const { port } = require("./config/env");
const { testConnection } = require("./config/db");
const { startYoutubeSubscriberRefreshJob } = require("./services/influencerService");

async function startServer() {
  try {
    await testConnection();
    startYoutubeSubscriberRefreshJob();
    const PORT = Number(process.env.PORT || port || 3000);
    app.listen(PORT, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
