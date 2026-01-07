import { generateKey } from "crypto";
import { dbExecution } from "../../dbconfig/dbconfig.js";

export const query_logs_adjust_and_payment = async (req, res) => {
  //const { id } = req.body; // memberid
  const id = req.query.id ?? 0;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  try {
    // 1️⃣ Query all logs for this member
    const querySelect = `
SELECT id, memberid, orderid, type, amount, 
confirmamount, status, account,
imagepayment, cdate
	FROM public.tblogsmemberpayment order by cdate desc;
    `;

    const selectResult = await dbExecution(querySelect, [id]);

    // 2️⃣ Handle no data case
    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No payment or adjustment logs found",
        data: [],
      });
    }

    // 3️⃣ Success response
    return res.status(200).send({
      status: true,
      message: "Query successful",
      total: selectResult.rowCount,
      data: selectResult.rows,
    });
  } catch (error) {
    console.error("Error in query_logs_adjust_and_payment:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const member_refill_wallet = async (req, res) => {
  const { id, amount } = req.body;

  if (!id || amount == null) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id or amount",
      data: [],
    });
  }

  const refillAmount = Number(amount);
  if (isNaN(refillAmount) || refillAmount <= 0) {
    return res.status(400).send({
      status: false,
      message: "Invalid refill amount",
      data: [],
    });
  }

  // Collect uploaded image filenames
  const imageArray =
    req.files && req.files.length > 0
      ? req.files.map((file) => file.filename)
      : [];

  try {
    const generateId = "rf" + Date.now();

    const insertLog = `
      INSERT INTO public.tblogsmemberpayment(
        id, memberid, type, amount, status, imagepayment, cdate
      )
      VALUES ($1, $2, 'refill', $3, $4, $5, NOW())
      RETURNING *;
    `;

    const logInserted = await dbExecution(insertLog, [
      generateId,      // id
      id,              // memberid
      refillAmount,    // amount
      'pending',       // status
      imageArray       // imagepayment
    ]);

    if (!logInserted || logInserted.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Failed to save refill transaction",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Request refill successfully",
      data: logInserted.rows[0],
    });
  } catch (error) {
    console.error("Error in member_refill_wallet:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};


export const member_withdraw_credit = async (req, res) => {
  const { id, amount, accountId } = req.body;

  if (!id || !amount || !accountId) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id, amount, or accountId",
      data: [],
    });
  }

  const withdrawAmount = Number(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).send({
      status: false,
      message: "Invalid withdraw amount",
      data: [],
    });
  }

  try {
    const generateId = "wd" + Date.now();

    const insertLog = `
      INSERT INTO public.tblogsmemberpayment(
        id, memberid, type, amount, status,account, cdate
      )
      VALUES ($1, $2, 'withdraw', $3, $4,$5, NOW())
      RETURNING *;
    `;

    const logInserted = await dbExecution(insertLog, [
      generateId,
      id,
      withdrawAmount,
      'pending',
      accountId,
    ]);

    if (!logInserted || logInserted.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Withdraw request failed to save",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Withdraw request recorded successfully",
      data: logInserted.rows[0],
    });
  } catch (error) {
    console.error("Error in member_withdraw_credit:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

