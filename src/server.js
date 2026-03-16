const app = require("./app");
const { port } = require("./config/env");
const { testConnection } = require("./config/db");

async function startServer() {
  try {
    await testConnection();
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
