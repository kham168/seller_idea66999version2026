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
      SELECT
        orderid,
        type,
        amount,
        creditb,
        creditf,
        status,
        cdate
      FROM public.tblogsmemberpayment 
      WHERE memberid = $1
      ORDER BY cdate DESC;
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

  if (!id || !amount) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id or amount",
      data: [],
    });
  }

  // Collect uploaded image filenames
  const imageArray =
    req.files && req.files.length > 0
      ? req.files.map((file) => file.filename)
      : [];

  try {
    // Generate a unique ID for this refill record
    // const logId = `refill_${Date.now()}`;

    // Insert payment/refill log
    const insertLog = `
      INSERT INTO public.tblogsmemberpayment(
        id, memberid, type, amount, imagepayment, cdate
      )
      VALUES ('refill1', $1, 'refillWallet', $2, $3, NOW())
      RETURNING *;
    `;

    const logInserted = await dbExecution(insertLog, [
      // logId,
      id,
      amount,
      imageArray,
    ]);

    // Check if insert succeeded
    if (!logInserted || logInserted.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Failed to save refill transaction",
        data: [],
      });
    }

    // ✅ Return success
    return res.status(200).send({
      status: true,
      message: "request refill successfully",
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
  const { id, amount, accountid } = req.body;

  if (!id || !amount || !accountid) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id, amount, or accountid",
      data: [],
    });
  }

  try {
    // Optionally get uploaded image filenames (if provided)
    const imageArray =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    // ✅ Insert log
    const insertLog = `
      INSERT INTO public.tblogsmemberpayment(
        id, memberid, type, amount, account, cdate
      )
      VALUES ('withdraw1', $1, 'Withdraw', $2, $3, NOW())
      RETURNING *;
    `;

    const logInserted = await dbExecution(insertLog, [id, amount, accountid]);

    // ✅ Check if insert succeeded
    if (!logInserted || logInserted.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Withdraw request failed to save",
        data: [],
      });
    }

    // ✅ Success response
    return res.status(200).send({
      status: true,
      message: "Withdraw request recorded successfully",
      data: logInserted.rows[0],
    });
  } catch (error) {
    console.error("Error in member_withdraw_credit:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
