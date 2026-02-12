import Route from "express";
import { verifyJWT } from "../middleware/auth.js";

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
import upload from "../middleware/updateACimage.uploadimage.js";
import {
  queryMemberData,
  memberLogin,
  member_register,
  memberUpdateImageProfile,
  memberConfirmIdentity,
  getDataForHomePage,
} from "../controller/shop/s_login.js";
const router = Route();

router.get("/getProductList", verifyJWT, queryAllProductByMemberId);
router.get("/toJoinProduct", verifyJWT, queryAllProductWhichOneNoJoinWithId);
router.get("/getDataForHomePage", verifyJWT, getDataForHomePage);
router.get(
  "/toJoinProductNew",
  verifyJWT,
  queryAllProductWhichOneNoJoinWithIdNewData,
);
router.get("/getMemberData", verifyJWT, queryMemberData);
router.post("/memberRegister", member_register);
router.post("/memberLogin", memberLogin);   ////.      here MOUA
router.post("/joinProduct", verifyJWT, insertJoinProductId);
router.put("/unJoinProduct", verifyJWT, UnJoinProduct);
//router.put("/updateProfileImage", uploadImage, memberUpdateImageProfile);
router.put(
  "/updateProfileImage",
  upload.fields([
    { name: "profileimage", maxCount: 1 },
    { name: "peopleCarOrPassport", maxCount: 1 },
    { name: "personalImage", maxCount: 3 },
    { name: "walletQr", maxCount: 1 },
  ]),verifyJWT,
  memberUpdateImageProfile,
);
router.put(
  "/memberConfirmIdentity",
  upload.fields([
    { name: "peopleCarOrPassport", maxCount: 1 },
    { name: "personalImage", maxCount: 3 },
  ]),verifyJWT,
  memberConfirmIdentity,
);
router.get("/getLogsPayment",verifyJWT, query_logs_adjust_and_payment);
router.put("/memberRefill",verifyJWT, uploadImage, member_refill_wallet);
router.post("/withdraw",verifyJWT, member_withdraw_credit);

export default router;
