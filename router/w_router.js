import Route from "express";
//import { verifyJWT } from "../../middleware/jwt.js";
import { queryAll,queryOne,insertData } from "../controller/web/w_product.js";
import { queryOrderDataAll,queryOrderDataOne,insertOrderData } from "../controller/web/w_order.js";
import { uploadImage } from "../middleware/product.uploadimage.js";
const route = Route();

  route.get("/selectProductList", queryAll);
  route.get("/selectProductId", queryOne);
  route.post("/insertProductList", uploadImage, insertData);
  route.get("/selectOrderList", queryOrderDataAll);
  route.get("/selectOrderId", queryOrderDataOne);
  route.post("/insertOrderList", insertOrderData);


export default route;

