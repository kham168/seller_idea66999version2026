import express from "express";
import router from "./router/a_router"; // ✅ Add .js if using ESM (TypeScript + ts-node)
const app = express();
const PORT = 9999;
// Middleware
app.use(express.json());
// Routes
app.use("/api", router);
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
