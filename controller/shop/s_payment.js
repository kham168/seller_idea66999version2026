import { dbExecution } from "../../dbconfig/dbconfig.js";

export const query_logs_adjust_and_payment = async (req, res) => {
  const id = req.query.id;
  const page = req.query.page ?? 0;
  const limit = req.query.limit ?? 15;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  const validPage = Math.max(parseInt(page, 10) || 0, 0);
  const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
  const offset = validPage * validLimit;

  try {
    // Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tblogsmemberpayment
      WHERE memberid = $1;
    `;
    const countResult = await dbExecution(countQuery, [id]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // Query logs
    const querySelect = `
      SELECT id, memberid, orderid, type, amount, confirmamount, creditb, 
             creditf, status, account, imagepayment, userconfirm, cfcdate, cdate
      FROM public.tblogsmemberpayment
      WHERE memberid = $1
      ORDER BY cdate DESC
      LIMIT $2 OFFSET $3;
    `;

    const selectResult = await dbExecution(querySelect, [
      id,
      validLimit,
      offset,
    ]);

    const data = selectResult?.rows || [];

    return res.status(200).send({
      status: true,
      message:
        data.length > 0
          ? "Query successful"
          : "No payment or adjustment logs found",
      data,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("Error in query_logs_adjust_and_payment:", error);
    return res.status(500).send({
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
      generateId, // id
      id, // memberid
      refillAmount, // amount
      "pending", // status
      imageArray, // imagepayment
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
      "pending",
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
