import { Router } from "express";
import { test } from "../controller/web/w_product";
 

const router = Router();

router.get("/test", test);

export default router;
