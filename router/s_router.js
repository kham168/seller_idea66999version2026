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
import { uploadImage } from "../middleware/refillwallet.upload.js";
import {
  queryMemberData,
  memberLogin,
  member_register,
  memberUpdateImageProfile,getDataForHomePage
} from "../controller/shop/s_login.js";
const router = Route();

router.get("/getProductList", queryAllProductByMemberId);
router.get("/toJoinProduct", queryAllProductWhichOneNoJoinWithId);
router.get("/getDataForHomePage", getDataForHomePage);
router.get("/toJoinProductNew", queryAllProductWhichOneNoJoinWithIdNewData);
router.get("/getMemberData", queryMemberData);
router.post("/memberRegister", member_register);
router.post("/memberLogin", memberLogin);
router.post("/joinProduct", insertJoinProductId);
router.put("/unJoinProduct", UnJoinProduct);
router.put("/updateProfileImage", uploadImage, memberUpdateImageProfile);
router.get("/getLogsPayment", query_logs_adjust_and_payment);
router.put("/memberRefill", uploadImage, member_refill_wallet);
router.post("/withdraw", member_withdraw_credit);

export default router;
