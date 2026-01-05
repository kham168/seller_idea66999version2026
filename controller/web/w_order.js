import { dbExecution } from "../../dbconfig/dbconfig.js";
//import { QueryTopup } from "../class/class.controller.js";

// query muas data all or select top 15
export const queryOrderDataOne = async (req, res) => {
  try {
    const id = req.query.id ?? 0;

    if (!id) {
      return res.status(400).send({
        status: false,
        message: "Missing required parameter: id",
        data: [],
      });
    }

    // ✅ Fetch data by id
    const dataQuery = `
      SELECT id, productid, type, size, price, custaddress, incomerate, 
             memberid,membername, cdate, membercf, detail, cfdate
      FROM public.tborderpd
      WHERE memberId is not null and id = $1
      ORDER BY cdate DESC;
    `;

    let rows = (await dbExecution(dataQuery, [id]))?.rows || [];

    // ✅ Parse JSON safely
    const parseJSON = (val) => {
      if (!val) return null;
      try {
        if (typeof val === "object") return val;
        if (typeof val === "string") {
          const clean = val.replace(/^"|"$/g, "").replace(/\\"/g, '"');
          return JSON.parse(clean);
        }
      } catch {
        return val;
      }
    };

    // ✅ Parse and group
    rows = rows.map((r) => ({
      ...r,
      custaddress: parseJSON(r.custaddress),
    }));

    if (rows.length === 0) {
      return res.status(404).send({
        status: false,
        message: "No data found for this ID",
        data: [],
      });
    }

    // ✅ Build grouped response
    const custAddress = rows[0].custaddress;
    const data = rows.map((r) => ({
      productId: r.productid,
      type: r.type,
      size: r.size,
      price: r.price,
      incomeRate: r.incomerate,
      memberId: r.memberid,
      membername: r.membername,
    }));

    const finalResult = {
      id: rows[0].id,
      data,
      custAddress,
    };

    // ✅ Send response
    res.status(200).send({
      status: true,
      message: "Query successful",
      data: finalResult,
    });
  } catch (error) {
    console.error("Error in queryOrderDataOne:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};


export const queryOrderDataAll = async (req, res) => {

  try {
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // ✅ Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tborderpd where memberId is not null;
    `;
    const countResult = await dbExecution(countQuery, []);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // ✅ Fetch paginated data
    const dataQuery = `
      SELECT id, productid, type, size, price, custaddress, incomerate, 
             memberid,membername, cdate, membercf, detail, cfdate
      FROM public.tborderpd where memberId is not null
      ORDER BY cdate DESC
      LIMIT $1 OFFSET $2;
    `;

    let rows = (await dbExecution(dataQuery, [validLimit, offset]))?.rows || [];

    // ✅ Safely parse JSON fields
    const parseJSON = (val) => {
      if (!val) return null;
      try {
        if (typeof val === "object") return val;
        if (typeof val === "string") {
          const clean = val.replace(/^"|"$/g, "").replace(/\\"/g, '"');
          return JSON.parse(clean);
        }
      } catch {
        return val;
      }
    };

    // ✅ Parse custaddress JSON
    rows = rows.map((r) => ({
      ...r,
      custaddress: parseJSON(r.custaddress),
    }));

    // ✅ Group by `id`
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.id]) {
        grouped[r.id] = {
          id: r.id,
          data: [],
          custAddress: r.custaddress,
        };
      }

      grouped[r.id].data.push({
        productId: r.productid,
        type: r.type,
        size: r.size,
        price: r.price,
        incomeRate: r.incomerate,
        memberId: r.memberid,
        membername: r.membername,
      });
    }

    const finalData = Object.values(grouped);

    // ✅ Send response
    res.status(200).send({
      status: true,
      message: finalData.length > 0 ? "Query successful" : "No data found",
      data: finalData,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("Error in queryOrderDataAll:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};


export const insertOrderData = async (req, res) => {
  try {
    const { id, custAddress, data } = req.body;

    // ✅ Validate request body
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).send({
        status: false,
        message: "Missing or invalid 'data' array",
        data: [],
      });
    }

    // ✅ Prepare the customer address (shared for all orders)
    const addressJSON = Array.isArray(custAddress)
      ? JSON.stringify(custAddress)
      : custAddress || null;

    // ✅ Define base insert SQL
    const query = `
      INSERT INTO public.tborderpd (
        id, productid, type, size, price, custaddress, incomerate, memberid,membername, cdate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9, NOW())
      RETURNING *;
    `;
     
    const insertedRows = [];

    // ✅ Insert each order item one by one (or use batch if needed)
    for (const item of data) {
      const { productId, type, size, price, incomeRate, memberId,membername } = item;

      if (!id || !productId || !memberId) {
        console.warn(`Skipping invalid item:`, item);
        continue;
      }

      const values = [
        id,
        productId,
        type || null,
        size || null,
        price || null,
        addressJSON,
        incomeRate || null,
        memberId || null,
        membername || null,
      ];

      const result = await dbExecution(query, values);
      if (result?.rowCount > 0) {
        insertedRows.push(result.rows[0]);
      }
    }

    // ✅ Response
    if (insertedRows.length > 0) {
      return res.status(200).send({
        status: true,
        message: "Insert data successful",
        data: insertedRows,
      });
    } else {
      return res.status(400).send({
        status: false,
        message: "No valid data inserted",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error in insertOrderData:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
