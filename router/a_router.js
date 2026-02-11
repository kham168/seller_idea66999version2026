import { Router } from "express";
import {
  queryOrderDataOne,
  queryOrderDataAll,
  insertOrderData,
  searchOrderDataByGmail,
  UpdateOrderListStatus,
  queryAllProductByMemberId,
  queryAllMemberWhoBeLongToAdminId,
  queryAllMemberActiveForSupperAdmin,queryAllMemberStatusIsTwoForSupperAdmin,queryAllMemberUnActiveForSupperAdmin,
  normal_update_order_list_into_to_failed,
} from "../controller/admin/a_order.js";
import {
  adminLogin,
  queryAdminData,
  admin_register,
  UpdateAdminStatus,queryAdminAll,updatePassword,updatePasswordConfirmByMail,getAllUserAC,memberUpdateBeLongToUser
} from "../controller/admin/a_login.js";
import {confirmSellStatus,confirmIncomeIntoMemberWallet} from "../controller/admin/a_order.js";
import {insertData,UpdateReviewNumberOfAnyProduct} from "../controller/admin/a_product.js";
import {StaffConfirmPayForMemberPaymentAndWithdraw,insertACData,acUpdateData,queryACData,adminConfirmUserAccount,adminManualAddCreditToMember123} from "../controller/admin/a_payment.js";
import { uploadImage } from "../middleware/product.uploadimage.js";
//import { protect } from "../middleware/token.js"; insertOrderData
const router = Router();
// 
 // 

router.get("/getOrderOne", queryOrderDataOne);
router.get("/getOrderAll", queryOrderDataAll);
router.post("/adminOrder", insertOrderData);
router.get("/searchOrderByGmail", searchOrderDataByGmail);
router.put("/adminUpdateOrderToTrue", UpdateOrderListStatus);
router.get("/getProductByMemberID", queryAllProductByMemberId);
router.get("/getMemberListByAdminId", queryAllMemberWhoBeLongToAdminId);
router.get("/getMemberListForSupperAdmin", queryAllMemberActiveForSupperAdmin);
router.get("/getMemberStatusIsTwoForSupperAdmin", queryAllMemberStatusIsTwoForSupperAdmin);
router.get("/getMemberUnActiveForSupperAdmin", queryAllMemberUnActiveForSupperAdmin);
router.put("/updateOrderToFalse", normal_update_order_list_into_to_failed);
router.post("/adminUpdatePayment", StaffConfirmPayForMemberPaymentAndWithdraw);
router.post("/adminLogin", adminLogin);
router.get("/getAdminDataById", queryAdminData);
router.get("/getUserAll", getAllUserAC);
router.post("/adminRegister", admin_register);
router.put("/updateAdminStatus", UpdateAdminStatus);
router.get("/getAllAdmin", queryAdminAll);
router.post("/insertProductList", uploadImage, insertData);
router.post("/insertACData", uploadImage, insertACData);
router.get("/getACData", queryACData);
router.post("/updateACData", uploadImage, acUpdateData);
router.put("/updateBeToUS", memberUpdateBeLongToUser);
router.post("/confirmSellStatus", confirmSellStatus);
router.put("/updateReviewNumber", UpdateReviewNumberOfAnyProduct);
router.put("/updatePassword", updatePassword);
router.put("/updatePasswordCFByMail", updatePasswordConfirmByMail);
router.post("/confirmIncomeToMember", confirmIncomeIntoMemberWallet);
router.put("/adminConfirmUACID", adminConfirmUserAccount);
router.put("/adminManualACDFMB", adminManualAddCreditToMember123);

export default router;
