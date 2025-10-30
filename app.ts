import express from "express";
import router from "./router/a_router";
import { dbExecution } from "./dbconfig/dbconfig";

const app = express();
const PORT = 9999;

app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
