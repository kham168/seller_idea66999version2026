import rateLimit from "express-rate-limit";

export const requestLimiter = rateLimit({
    windowMs: 60 * 100,// 1 minute
    max: 1000, //1000 request allowed per minute
    message: 'The system is busy. Please, wait a moment and try again.',
    statusCode: 429,//429 is default
    skipFailedRequests: true, //ignore fail case
});

