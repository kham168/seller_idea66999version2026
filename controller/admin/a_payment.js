import { dbExecution } from "../../dbconfig/dbconfig.js";

export const adminConfirmUserAccount = async (req, res) => {
  const { id, status, statusDetail } = req.body;

  if (!id || !status) {
    return res.status(400).send({
      status: false,
      message: "Missing id or status",
      data: [],
    });
  }

  try {
    const updateMemberData = `
      UPDATE public.tbmember
      SET status = $2,
          statusdetail = $3
      WHERE id = $1
        AND status = '2'
      RETURNING id, status, statusdetail;
    `;

    const memberUpdated = await dbExecution(updateMemberData, [
      id,
      status,
      statusDetail || null,
    ]);

    // ❗ No row updated
    if (!memberUpdated || memberUpdated.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Member not found or status not eligible for update",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Member account confirmed successfully",
      data: memberUpdated.rows[0],
    });
  } catch (error) {
    console.error("Error in adminConfirmUserAccount:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const adminManualAddCreditToMember123 = async (req, res) => {
  const { id, orderid, confirmType, amount } = req.body;

  if (!id || !amount) {
    return res.status(400).send({
      status: false,
      message: "Missing id or amount",
      data: [],
    });
  }

  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).send({
      status: false,
      message: "Invalid amount",
      data: [],
    });
  }

  try {
    const selectResult = await dbExecution(
      `SELECT wallet FROM public.tbmember WHERE id=$1`,
      [id],
    );

    if (selectResult.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Member not found",
        data: [],
      });
    }

    const walletNum = Number(selectResult.rows[0].wallet) || 0;
    const amountAfter = walletNum + amountNum;

    const memberUpdated = await dbExecution(
      `UPDATE public.tbmember SET wallet=$2 WHERE id=$1 RETURNING id, wallet`,
      [id, amountAfter],
    );

    const logId = Math.random().toString(36).substring(2, 11);

    const logInserted = await dbExecution(
      `INSERT INTO public.tblogsmemberpayment
       (id, memberid, orderid, type, amount, creditb, creditf, status, cdate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'1',NOW())
       RETURNING *`,
      [
        logId,
        id,
        orderid || null,
        confirmType || "ADMIN_ADD",
        amountNum,
        walletNum,
        amountAfter,
      ],
    );

    return res.status(200).send({
      status: true,
      message: "Wallet credited successfully",
      data: {
        member: memberUpdated.rows[0],
        log: logInserted.rows[0],
      },
    });
  } catch (error) {
    console.error("Error in adminManualAddCreditToMember123:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const adminAddCreditToMemberWallet = async (req, res) => {
  const { id, orderid, confirmType, amount } = req.body;

  if (!id || !amount) {
    return res.status(400).send({
      status: false,
      message: "Missing id or amount",
      data: [],
    });
  }

  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    return res.status(400).send({
      status: false,
      message: "Invalid amount",
      data: [],
    });
  }

  try {
    // 1️⃣ Get member wallet
    const selectQuery = `
      SELECT wallet
      FROM public.tbmember
      WHERE id = $1;
    `;
    const selectResult = await dbExecution(selectQuery, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Member not found",
        data: [],
      });
    }

    const walletNum = Number(selectResult.rows[0].wallet) || 0;
    const amountAfter = walletNum + amountNum;

    // 2️⃣ Update wallet
    const updateMember = `
      UPDATE public.tbmember
      SET wallet = $2
      WHERE id = $1
      RETURNING id, wallet;
    `;
    const memberUpdated = await dbExecution(updateMember, [id, amountAfter]);

    // 3️⃣ Insert payment log
    const insertLog = `
      INSERT INTO public.tblogsmemberpayment(
        id, memberid, orderid, type, amount, creditb, creditf, status, cdate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, '1', NOW())
      RETURNING *;
    `;

    const logId = crypto.randomUUID();
    const logInserted = await dbExecution(insertLog, [
      logId,
      id,
      orderid || null,
      confirmType || "ADMIN_ADD",
      amountNum,
      walletNum,
      amountAfter,
    ]);

    return res.status(200).send({
      status: true,
      message: "Wallet credited successfully",
      data: {
        member: memberUpdated.rows[0],
        log: logInserted.rows[0],
      },
    });
  } catch (error) {
    console.error("Error in adminAddCreditToMemberWallet:", error);
    return res.status(500).send({
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
    const sqlED = `
     SELECT sum(totalprice) as total
	FROM public.tborderpd where memberid=$1 and sellstatus='pending'
    `;
    const resulted = await dbExecution(sqlED, [memberId]);

    if (resulted.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Member not found",
        data: [],
      });
    }

    const totalAmountPending = Number(resulted.rows[0].total);

    if (totalAmountPending > 0) {
      const updateLog = `
     Update public.tblogsmemberpayment set status='fail',resultdesc='Some orders are currently pending.' where id=$1;
    `;

      const logResultA = await dbExecution(updateLog, [id]);

      return res.status(404).json({
        status: false,
        message:
          "Failed to confirm payment. Some orders are currently pending.",
        data: [],
      });
    }

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
        [memberId, creditF, totalwithdrawal + amt],
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
        [memberId, creditF],
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

export const acUpdateData = async (req, res) => {
  const { id, name, no, type, status } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing AC ID",
      data: [],
    });
  }

  try {
    const updates = [];
    const values = [];
    let paramIndex = 2; // $1 = acId

    // ✅ Handle uploaded QR image
    const imageArray =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    if (imageArray.length > 0) {
      updates.push(`acqr = $${paramIndex++}`);
      values.push(imageArray[0]);
    }

    if (name) {
      updates.push(`acname = $${paramIndex++}`);
      values.push(name);
    }

    if (no) {
      updates.push(`acno = $${paramIndex++}`);
      values.push(no);
    }

    if (type) {
      updates.push(`actype = $${paramIndex++}`);
      values.push(type);
    }

    // ✅ allow status = '0' or '1'
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).send({
        status: false,
        message: "No data provided to update",
        data: [],
      });
    }

    const query = `
      UPDATE public.tbreceive_ac
      SET ${updates.join(", ")}
      WHERE acid = $1
      RETURNING acname, acno, actype, acqr, status as active_status;
    `;

    const result = await dbExecution(query, [id, ...values]);

    if (!result || result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "AC record not found",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "AC updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error in acUpdateData:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const queryACData = async (req, res) => {
  try {
    const baseUrl = "http://localhost:1789/";

    const query = `
      SELECT acid, acname, acno, acqr, actype, status, cdate
      FROM public.tbreceive_ac
      WHERE status = '1'
      ORDER BY cdate DESC;
    `;

    const selectResult = await dbExecution(query);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No data found",
        data: [],
      });
    }

    const acdata = selectResult.rows.map((row) => ({
      ...row,
      acqr: row.acqr ? `${baseUrl}${row.acqr}` : null,
    }));

    return res.status(200).send({
      status: true,
      message: "Query successful",
      data: acdata,
    });
  } catch (error) {
    console.error("Error in queryACData:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};

export const insertACData = async (req, res) => {
  try {
    const { name, no, type } = req.body;

    // ✅ Validate required fields
    if (!name || !no || !type) {
      return res.status(400).send({
        status: false,
        message: "Missing required fields (name, no, type)",
        data: [],
      });
    }

    // ✅ Generate ID
    const id = "ac" + Math.random().toString(36).substring(2, 10);

    // ✅ Get uploaded image (use first one)
    const imageArray =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    const acqr = imageArray.length > 0 ? imageArray[0] : null;

    const query = `
      INSERT INTO public.tbreceive_ac(
        acid, acname, acno, acqr, actype, status, cdate
      )
      VALUES ($1, $2, $3, $4, $5, '1', NOW())
      RETURNING *;
    `;

    const values = [id, name, no, acqr, type];

    const result = await dbExecution(query, values);

    if (!result || result.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Insert failed",
        data: [],
      });
    }

    return res.status(201).send({
      status: true,
      message: "Insert AC data successful",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error in insertACData:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
