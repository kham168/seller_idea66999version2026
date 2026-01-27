import { Router } from "express";
import {
  queryOrderDataOne,
  queryOrderDataAll,
  insertOrderData,
  searchOrderDataByGmail,
  UpdateOrderListStatus,
  queryAllProductByMemberId,
  queryAllMemberWhoBeLongToAdminId,
  queryAllMemberActiveForSupperAdmin,
  normal_update_order_list_into_to_failed,
} from "../controller/admin/a_order.js";
import {
  adminLogin,
  queryAdminData,
  admin_register,
  UpdateAdminStatus,queryAdminAll
} from "../controller/admin/a_login.js";
import {confirmSellStatus,confirmIncomeIntoMemberWallet} from "../controller/admin/a_order.js";
import {insertData} from "../controller/admin/a_product.js";
import {StaffConfirmPayForMemberPaymentAndWithdraw,insertACData,acUpdateData,queryACData} from "../controller/admin/a_payment.js";
import { uploadImage } from "../middleware/product.uploadimage.js";
//import { protect } from "../middleware/token.js"; insertOrderData
const router = Router();

router.get("/getOrderOne", queryOrderDataOne);
router.get("/getOrderAll", queryOrderDataAll);
router.post("/adminOrder", insertOrderData);
router.get("/searchOrderByGmail", searchOrderDataByGmail);
router.put("/adminUpdateOrderToTrue", UpdateOrderListStatus);
router.get("/getProductByMemberID", queryAllProductByMemberId);
router.get("/getMemberListByAdminId", queryAllMemberWhoBeLongToAdminId);
router.get("/getMemberListForSupperAdmin", queryAllMemberActiveForSupperAdmin);
router.put("/updateOrderToFalse", normal_update_order_list_into_to_failed);
router.post("/adminUpdatePayment", StaffConfirmPayForMemberPaymentAndWithdraw);
router.post("/adminLogin", adminLogin);
router.get("/getAdminDataById", queryAdminData);
router.post("/adminRegister", admin_register);
router.put("/updateAdminStatus", UpdateAdminStatus);
router.get("/getAllAdmin", queryAdminAll);
router.post("/insertProductList", uploadImage, insertData);
router.post("/insertACData", uploadImage, insertACData);
router.get("/getACData", queryACData);
router.post("/updateACData", uploadImage, acUpdateData);
router.post("/confirmSellStatus", confirmSellStatus);
router.post("/confirmIncomeToMember", confirmIncomeIntoMemberWallet);

export default router;
