import { dbExecution } from "../../dbconfig/dbconfig.js";

export const InsertCovData = async (req, res) => {
  const { name, tonThun, income } = req.body;

  if (!name || !tonThun || !income) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id, amount, or accountId",
      data: [],
    });
  }

  const tonThunAMT = Number(tonThun);
  if (isNaN(tonThunAMT) || tonThunAMT <= 0) {
    return res.status(400).send({
      status: false,
      message: "tonThun withdraw amount",
      data: [],
    });
  }

  const incomeAMT = Number(income);
  if (isNaN(incomeAMT) || incomeAMT <= 0) {
    return res.status(400).send({
      status: false,
      message: "Invalid income amount",
      data: [],
    });
  }

  try {
    const generateId = "cgi" + Date.now();
    const peopleImage =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];
    const insertLog = `
    INSERT INTO public.tbmember_getincomepermonth(
	id, name, tonthun, income, peopleimage, status, cdate)
	VALUES ($1, $2, $3, $4, $5, '1', NOW())
      RETURNING *;
    `;

    const logInserted = await dbExecution(insertLog, [
      generateId,
      name,
      tonThunAMT,
      incomeAMT,
      peopleImage,
    ]);

    if (!logInserted || logInserted.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "insert request failed to save",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "insert request successfully",
      data: logInserted.rows[0],
    });
  } catch (error) {
    console.error("Error in insert customer data:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const query_logs_WH_get_income_per_month = async (req, res) => {
  const page = req.query.page ?? 0;
  const limit = req.query.limit ?? 15;

  const validPage = Math.max(parseInt(page, 10) || 0, 0);
  const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
  const offset = validPage * validLimit;

  try {
    const baseUrl = "http://localhost:1789/";

    // Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tbmember_getincomepermonth
      WHERE status ='1';
    `;
    const countResult = await dbExecution(countQuery, []);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // Query logs
    const querySelect = `
    SELECT id, name, tonthun, income, peopleimage, 
	status, cdate FROM public.tbmember_getincomepermonth where status='1'
    ORDER BY income DESC
    LIMIT $1 OFFSET $2;
    `;

    const selectResult = await dbExecution(querySelect, [validLimit, offset]);

    const cleanImagePath = (value) => {
      if (!value) return null;

      return value.replace(/[{}"]/g, "").replace(/\\/g, "").trim();
    };

    const data = (selectResult?.rows || []).map((item) => {
      const cleanPath = cleanImagePath(item.peopleimage);

      return {
        ...item,
        peopleimage: cleanPath ? baseUrl + cleanPath : null,
      };
    });

    return res.status(200).send({
      status: true,
      message: data.length > 0 ? "Query successful" : "No logs found",
      data,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("Error in query_logs:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const updateCustomerList = async (req, res) => {
  try {
    let { id } = req.body;

    if (!id) {
      return res.status(400).send({
        status: false,
        message: "id is required",
      });
    }

    const sql = `UPDATE public.tbmember_getincomepermonth set status='0'
	WHERE id=$1 RETURNING id, status;
    `;

    const result = await dbExecution(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).send({
        status: false,
        message: "id record not found",
      });
    }

    res.status(200).send({
      status: true,
      message: "Updated data successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating logs:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
    });
  }
};
