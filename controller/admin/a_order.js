import { dbExecution } from "../../dbconfig/dbconfig.js";
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
      SELECT id, productname, type, size, price,incomerate, custgmail, custaddress, 
             memberid,membername, cdate, membercf, detail, cfdate
      FROM public.tborderpd
      WHERE id = $1
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
      custgmail: r.custgmail,
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
  SELECT id, productname, type, size, price, qty, totalprice, incomerate, custgmail, custaddress, memberid, membername, cdate, membercf, detail, cfdate
	FROM public.tborderpd ORDER BY cdate DESC
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
        custgmail: r.custgmail,
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
        id, productid, type, size, price,incomerate,custgmail, custaddress, memberid,membername, cdate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9,$10, NOW())
      RETURNING *;
    `;

    const insertedRows = [];

    // ✅ Insert each order item one by one (or use batch if needed)
    for (const item of data) {
      const {
        productId,
        type,
        size,
        price,
        incomeRate,
        custGmail,
        memberId,
        membername,
      } = item;

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
        incomeRate || null,
        custGmail,
        addressJSON,
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

export const searchOrderDataByGmail = async (req, res) => {
  try {
    const gmail = req.params.gmail ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // ✅ Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tborderpd where custgmail ILIKE $1; 
    `;
    const countResult = await dbExecution(countQuery, [`%${gmail}%`]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // ✅ Fetch paginated data
    const dataQuery = `
      SELECT id, productid, type, size, price,incomerate ,custgmail,custaddress , 
             memberid,membername, cdate, membercf, detail, cfdate
      FROM public.tborderpd  where custgmail ILIKE $1
      ORDER BY cdate DESC
      LIMIT $1 OFFSET $2;
    `;

    let rows =
      (await dbExecution(dataQuery, [`%${gmail}%`, validLimit, offset]))
        ?.rows || [];

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
        custgmail: r.custgmail,
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

export const UpdateOrderListStatus = async (req, res) => {
  const { id, confirmType, detail } = req.body;

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
      SELECT 
        s.*, 
        m.id AS member_id, 
        m.wallet::numeric AS wallet
      FROM (
        SELECT 
          id,  
          SUM(price::numeric) AS price, 
          memberid
        FROM public.tborderpd 
        WHERE id = $1
          AND membercf IS NULL
        GROUP BY id, memberid
      ) s
      INNER JOIN public.tbmember m 
        ON m.id = s.memberid
      WHERE m.status = '1';
    `;
    const selectResult = await dbExecution(querySelect, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "No valid order found or member inactive",
        data: [],
      });
    }

    const { member_id, wallet, price } = selectResult.rows[0];
    const memberid = member_id;

    // 2️⃣ Calculate new wallet balance
    const walletNum = Number(wallet);
    const priceNum = Number(price);

    if (walletNum < priceNum) {
      return res.status(400).send({
        status: false,
        message: "Insufficient balance in member wallet",
        data: [],
      });
    }

    const amountAfter = walletNum - priceNum;

    // 3️⃣ Update member wallet
    const updateMember = `
      UPDATE public.tbmember
      SET wallet = $2
      WHERE id = $1
      RETURNING *;
    `;
    const memberUpdated = await dbExecution(updateMember, [
      memberid,
      amountAfter,
    ]);

    // 4️⃣ Update order confirmation
    const updateOrder = `
      UPDATE public.tborderpd
      SET membercf = $2, detail = $3, cfdate = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const orderUpdated = await dbExecution(updateOrder, [
      id,
      confirmType,
      detail,
    ]);

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
      memberid,
      id,
      confirmType,
      priceNum,
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

export const queryAllProductByMemberId = async (req, res) => {
  try {
    const id = req.query.id ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // Count total
    const countQuery = `
       SELECT count(*) AS total
	FROM public.tbproduct  p inner join
	public.tbmemberjoinproduct j on j.productid=p.id
	inner join public.tbmember m on m.id=j.memberid
      WHERE m.id = $1 and  p.status = '1' and j.status='1';
    `;
    const countResult = await dbExecution(countQuery, [id]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const baseUrl = "http://localhost:1789/";

    // Fetch paginated data
    const dataQuery = `
    SELECT m.id,m.name, channel, p.id, p.modelname, p.type, price1, 
	price2, p.size, p.productdetail, p.detail, p.image, 
	p.video, p.star, p.totalsell, p.cdate
	FROM public.tbproduct  p inner join
	public.tbmemberjoinproduct j on j.productid=p.id
	inner join public.tbmember m on m.id=j.memberid
	where m.id='1' and  and p.status = '1' and j.status='1'
      LIMIT $1 OFFSET $2;
    `;

    let rows =
      (await dbExecution(dataQuery, [id, validLimit, offset]))?.rows || [];

    // ✅ Safely parse JSON columns and image list
    rows = rows.map((r) => {
      const parseJSON = (val) => {
        if (!val) return null;
        try {
          // handle cases: already object, JSON string, or quoted JSON string
          if (typeof val === "object") return val;
          if (typeof val === "string") {
            const clean = val.replace(/^"|"$/g, "").replace(/\\"/g, '"');
            return JSON.parse(clean);
          }
        } catch {
          return val;
        }
      };

      // ✅ Parse the 3 JSON-like fields
      const size = parseJSON(r.size);
      const productdetail = parseJSON(r.productdetail);
      const detail = parseJSON(r.detail);

      // ✅ Parse images into clean URLs
      let imgs = [];
      if (r.image) {
        try {
          if (Array.isArray(r.image)) {
            imgs = r.image;
          } else if (typeof r.image === "string") {
            const clean = r.image.replace(/[{}"]/g, "");
            imgs = clean.split(",").map((i) => baseUrl + i.trim());
          }
        } catch {
          imgs = [];
        }
      }

      return {
        ...r,
        size,
        productdetail,
        detail,
        image: imgs,
      };
    });

    // ✅ Response
    res.status(200).send({
      status: true,
      message: rows.length > 0 ? "Query successful" : "No data found",
      data: rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("Error in queryaAll:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};

export const queryAllMemberWhoBeLongToAdminId = async (req, res) => {
  try {
    const id = req.query.id ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // Count total
    const countQuery = `
    SELECT count(*) AS total
 FROM public.tbmember m inner join
 public.tbadminuser a on a.id=m.becustofadmin
 where a.id=$1 and m.status='1';
    `;
    const countResult = await dbExecution(countQuery, [id]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const baseUrl = "http://localhost:1789/";

    // Fetch paginated data
    const dataQuery = `
    SELECT a.id, a.name, a.lastname, m.id, m.name, m.lastname, m.gender, 
m.gmail, m.country, 
m.state, m.profileimage, m.bankaccount1, m.bankaccount2, m.bankaccount3, 
m.wallet, m.totalsell, m.totalincome, m.totalwithdrawal, m.status, m.becustofadmin, m.cdate
 FROM public.tbmember m inner join
 public.tbadminuser a on a.id=m.becustofadmin
 where a.id=$1 and m.status='1'
      LIMIT $1 OFFSET $2;
    `;

    let rows =
      (await dbExecution(dataQuery, [id, validLimit, offset]))?.rows || [];

    // ✅ Safely parse JSON columns and image list
    rows = rows.map((r) => {
      const parseJSON = (val) => {
        if (!val) return null;
        try {
          // handle cases: already object, JSON string, or quoted JSON string
          if (typeof val === "object") return val;
          if (typeof val === "string") {
            const clean = val.replace(/^"|"$/g, "").replace(/\\"/g, '"');
            return JSON.parse(clean);
          }
        } catch {
          return val;
        }
      };

      //   // ✅ Parse the 3 JSON-like fields
      //   const size = parseJSON(r.size);
      //   const productdetail = parseJSON(r.productdetail);
      //   const detail = parseJSON(r.detail);

      // ✅ Parse images into clean URLs
      let imgs = [];
      if (r.image) {
        try {
          if (Array.isArray(r.image)) {
            imgs = r.image;
          } else if (typeof r.image === "string") {
            const clean = r.image.replace(/[{}"]/g, "");
            imgs = clean.split(",").map((i) => baseUrl + i.trim());
          }
        } catch {
          imgs = [];
        }
      }

      return {
        ...r,
        size,
        productdetail,
        detail,
        image: imgs,
      };
    });

    // ✅ Response
    res.status(200).send({
      status: true,
      message: rows.length > 0 ? "Query successful" : "No data found",
      data: rows,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    });
  } catch (error) {
    console.error("Error in queryaAll:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};

export const normal_update_order_list_into_to_failed = async (req, res) => {
  const { id, status, detail } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  try {
    // ✅ Update the member's profile image (just first image)
    const updateOrderStatus = `
       UPDATE public.tborderpd
	SET   membercf=$2, detail=$3, cfdate=NEW()
	WHERE id=$1
      RETURNING *;
    `;

    const result = await dbExecution(updateOrderStatus, [id, status, detail]);

    if (!result || result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Order not found or update failed",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Updated Order Status successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error in memberUpdateImageProfile:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
