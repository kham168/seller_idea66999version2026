import { Router } from "express"; 
import { verifyJWT } from "../middleware/auth.js";
import {
  queryOrderDataOne,
  queryOrderDataAll,
  insertOrderData,
  searchOrderDataByGmail,
  UpdateOrderListStatus,
  queryAllProductByMemberId,
  queryAllMemberWhoBeLongToAdminId,
  queryAllMemberActiveForSupperAdmin,
  queryAllMemberStatusIs2And0ForSupperAdmin,
  queryAllMemberUnActiveForSupperAdmin,
  normal_update_order_list_into_to_failed,
} from "../controller/admin/a_order.js";
import {
  adminLogin,
  queryAdminData,
  admin_register,
  UpdateAdminStatus,
  queryAdminAll,
  updatePassword,
  updatePasswordConfirmByMail,
  getAllUserAC,
  memberUpdateBeLongToUser,
} from "../controller/admin/a_login.js";
import {
  confirmSellStatus,
  confirmIncomeIntoMemberWallet,
} from "../controller/admin/a_order.js";
import {
  insertData,
  UpdateReviewNumberOfAnyProduct,
} from "../controller/admin/a_product.js";
import {
  StaffConfirmPayForMemberPaymentAndWithdraw,
  insertACData,
  acUpdateData,
  queryACData,
  adminConfirmUserAccount,
  adminManualAddCreditToMember123,
} from "../controller/admin/a_payment.js";
import { uploadImage } from "../middleware/product.uploadimage.js";
//import { protect } from "../middleware/token.js"; insertOrderData
const router = Router();
//
//

router.get("/getOrderOne", verifyJWT, queryOrderDataOne);
router.get("/getOrderAll", verifyJWT, queryOrderDataAll);
router.post("/adminOrder", verifyJWT, insertOrderData);
router.get("/searchOrderByGmail", verifyJWT, searchOrderDataByGmail);
router.put("/adminUpdateOrderToTrue", verifyJWT, UpdateOrderListStatus);
router.get("/getProductByMemberID", verifyJWT, queryAllProductByMemberId);
router.get(
  "/getMemberListByAdminId",
  verifyJWT,
  queryAllMemberWhoBeLongToAdminId,
);
router.get(
  "/getMemberListForSupperAdmin",
  verifyJWT,
  queryAllMemberActiveForSupperAdmin,
);
router.get(
  "/getMemberStatusIs2And0ForSupperAdmin",
  verifyJWT,
  queryAllMemberStatusIs2And0ForSupperAdmin,
);
router.get(
  "/getMemberUnActiveForSupperAdmin",
  verifyJWT,
  queryAllMemberUnActiveForSupperAdmin,
);
router.put(
  "/updateOrderToFalse",
  verifyJWT,
  normal_update_order_list_into_to_failed,
);
router.post(
  "/adminUpdatePayment",
  verifyJWT,
  StaffConfirmPayForMemberPaymentAndWithdraw,
);
router.post("/adminLoginN", adminLogin);
router.get("/getAdminDataById", verifyJWT, queryAdminData);
router.get("/getUserAll", verifyJWT, getAllUserAC);
router.post("/adminRegister", verifyJWT, admin_register);
router.put("/updateAdminStatus", verifyJWT, UpdateAdminStatus);
router.get("/getAllAdmin", verifyJWT, queryAdminAll);
router.post("/insertProductList", verifyJWT, uploadImage, insertData);
router.post("/insertACData", verifyJWT, uploadImage, insertACData);
router.get("/getACData", verifyJWT, queryACData);
router.post("/updateACData", verifyJWT, uploadImage, acUpdateData);
router.put("/updateBeToUS",verifyJWT, memberUpdateBeLongToUser);
router.post("/confirmSellStatus", verifyJWT, confirmSellStatus);
router.put("/updateReviewNumber", verifyJWT, UpdateReviewNumberOfAnyProduct);
router.put("/updatePassword", verifyJWT, updatePassword);
router.put("/updatePasswordCFByMail", verifyJWT, updatePasswordConfirmByMail);
router.post("/confirmIncomeToMember", verifyJWT, confirmIncomeIntoMemberWallet);
router.put("/adminConfirmUACID", verifyJWT, adminConfirmUserAccount);
router.put("/adminManualACDFMB", verifyJWT, adminManualAddCreditToMember123);

export default router;
