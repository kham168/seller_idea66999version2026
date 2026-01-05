
import { dbExecution } from "../../dbconfig/dbconfig.js";
 
export const adminAddCreditToMemberWallet = async (req, res) => {

  const { id, orderid,confirmType,amount } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing id",
      data: [],
    });
  }

  try {
    // 1️⃣ Get total price + member wallet
    const querySelect = `
      SELECT id As mid,wallet
      FROM public.tbmember where id=$1;
    `;
    const selectResult = await dbExecution(querySelect, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "No valid order found or member inactive",
        data: [],
      });
    }

    const {mid, wallet } = selectResult.rows[0];
    
    // 2️⃣ Calculate new wallet balance
    const walletNum = Number(wallet); 
    
    if (mid === 0) {

      return res.status(400).send({
        status: false,
        message: "Insufficient balance in member wallet",
        data: [],
      });
    }

     const amountAfter = walletNum + amount;

    // 3️⃣ Update member wallet
    const updateMember = `
      UPDATE public.tbmember
      SET wallet = $2
      WHERE id = $1
      RETURNING *;
    `;
    const memberUpdated = await dbExecution(updateMember, [id, amountAfter]);
 
    // 5️⃣ Insert payment log
    const insertLog = `
      INSERT INTO public.tblogsmemberpayment(
        id, memberid, orderid, type, amount, creditb, creditf, status, cdate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, '1', NOW())
      RETURNING *;
    `;

    const newId = Math.random().toString(36).substring(2, 12); // simple unique id
    const logInserted = await dbExecution(insertLog, [
      newId,
      id,
      orderid,
      confirmType,
      amount,
      walletNum,
      amountAfter,
    ]);

    // ✅ Success response
    return res.status(200).send({
      status: true,
      message: "Order confirmed and wallet updated successfully",
      data: {
        order: orderUpdated.rows[0],
        member: memberUpdated.rows[0],
        log: logInserted.rows[0],
      },
    });
  } catch (error) {
    console.error("Error in UpdateOrderListStatus:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
 

