import corsMiddleware from "cors";
import { whiteOrigins } from "./allowOrigin.js";

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like Postman or same-origin)
    if (!origin || whiteOrigins.includes(origin)) {
      callback(null, true); // allow
    } else {
      callback(null, false); // deny without throwing
    }
  },
  credentials: true,
};

export default corsMiddleware(corsOptions);
