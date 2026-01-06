import Route from "express";
// fixed import path: middleware is one level up from `router`
//import { verifyJWT } from "../middleware/jwt.js";
import {
  query_logs_adjust_and_payment,
  member_refill_wallet,
  member_withdraw_credit,
} from "../controller/shop/s_payment.js";
import {
  queryAllProductByMemberId,
  queryAllProductWhichOneNoJoinWithId,
  queryAllProductWhichOneNoJoinWithIdNewData,
  insertJoinProductId,
  UnJoinProduct,
} from "../controller/shop/s_product.js";
import { queryOrderDataAllByMemberId } from "../controller/shop/s_order.js";
import { uploadImage } from "../middleware/refillwallet.upload.js";
import {
  queryMemberData,
  memberLogin,
  member_register,
  memberUpdateAccountId,
  memberUpdateImageProfile,
} from "../controller/shop/s_login.js";
const route = Route();

route.get("/getProductList", queryAllProductByMemberId);
route.get("/getOrderList", queryOrderDataAllByMemberId);
route.get("/toJoinProduct", queryAllProductWhichOneNoJoinWithId);
route.get("/toJoinProductNew", queryAllProductWhichOneNoJoinWithIdNewData);
route.get("/getMemberData", queryMemberData);
route.post("/memberRegister", member_register);
route.post("/memberLogin", memberLogin);
route.post("/joinProduct", insertJoinProductId);
route.put("/unJoinProduct", UnJoinProduct);
route.put("/updateAccount", memberUpdateAccountId);
route.put("/updateProfileImage", uploadImage, memberUpdateImageProfile);
route.get("/getLogsPayment", query_logs_adjust_and_payment);
route.put("/memberRefill", uploadImage, member_refill_wallet);
route.post("/withdraw", member_withdraw_credit);

export default route;
