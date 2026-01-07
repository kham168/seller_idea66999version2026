import { dbExecution } from "../../dbconfig/dbconfig.js";

export const adminAddCreditToMemberWallet = async (req, res) => {
  const { id, orderid, confirmType, amount } = req.body;

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

    const { mid, wallet } = selectResult.rows[0];

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

export const StaffConfirmPayForMemberPaymentAndWithdraw = async (req, res) => {
  const { id, memberId, type, amount, userId } = req.body;

  if (!id || !memberId || !type || !userId || amount == null) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields",
      data: [],
    });
  }

  const amt = Number(amount);

  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({
      status: false,
      message: "Invalid amount",
      data: [],
    });
  }

  try {
    // 1️⃣ Get member wallet
    const sql = `
      SELECT wallet, totalwithdrawal
      FROM public.tbmember m inner join public.tblogsmemberpayment l 
	  on l.memberid=m.id and m.id=$1 and l.id=$2
      WHERE l.status='pending' AND m.status='1'
    `;
    const result = await dbExecution(sql, [memberId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Member not found",
        data: [],
      });
    }

    const wallet = Number(result.rows[0].wallet);
    const totalwithdrawal = Number(result.rows[0].totalwithdrawal || 0);

    let creditB = wallet;
    let creditF = 0;
    let resultDest = "";

    // 2️⃣ Business logic
    if (type === "refill") {
      creditF = wallet + amt;
      resultDest = "refill successful";
    } else if (type === "withdraw") {
      if (wallet < amt) {
        return res.status(400).json({
          status: false,
          message: "Insufficient wallet balance",
          data: [],
        });
      }
      creditF = wallet - amt;
      resultDest = "withdrawal successful";

      await dbExecution(
        `UPDATE public.tbmember
         SET wallet=$2, totalwithdrawal=$3
         WHERE id=$1 AND status='1'`,
        [memberId, creditF, totalwithdrawal + amt]
      );
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid type",
        data: [],
      });
    }

    // 3️⃣ Update wallet (refill)
    if (type === "refill") {
      await dbExecution(
        `UPDATE public.tbmember
         SET wallet=$2
         WHERE id=$1 AND status='1'`,
        [memberId, creditF]
      );
    }

    // 4️⃣ Update log
    const updateLog = `
      UPDATE public.tblogsmemberpayment
      SET confirmamount=$3,
          creditb=$4,
          creditf=$5,
          status='completed',
          userconfirm=$6,
          cfcdate=NOW()
      WHERE id=$1 AND type=$2
      RETURNING *;
    `;

    const logResult = await dbExecution(updateLog, [
      id,
      type,
      amt,
      creditB,
      creditF,
      userId,
    ]);

    if (logResult.rowCount === 0) {
      return res.status(400).json({
        status: false,
        message: "Failed to update payment log",
        data: [],
      });
    }

    return res.status(200).json({
      status: true,
      message: resultDest,
      data: logResult.rows[0],
    });
  } catch (error) {
    console.error("Error in StaffConfirmPay:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
