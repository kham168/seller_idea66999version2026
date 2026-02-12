import Route from "express";
import { verifyJWT } from "../middleware/auth.js";
import { queryAll, queryOne, insertData } from "../controller/web/w_product.js";
import {
  queryOrderDataAll,
  queryOrderDataOne,
  queryOrderDataAllByMemberId,
  CountStatusPending,
} from "../controller/web/w_order.js";
import { uploadImage } from "../middleware/product.uploadimage.js";
const route = Route();

route.get("/selectProductList", verifyJWT, queryAll);
route.get("/selectProductId", verifyJWT, queryOne);
route.post("/insertProductList", verifyJWT, uploadImage, insertData);
route.get("/selectOrderList", verifyJWT, queryOrderDataAll);
route.get("/selectOrderById", verifyJWT, queryOrderDataOne);
route.get("/selectOrderByMemberId", verifyJWT, queryOrderDataAllByMemberId);
route.get("/selectStatusPendingByMemberId", verifyJWT, CountStatusPending);

export default route;
