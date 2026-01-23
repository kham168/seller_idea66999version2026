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
      SELECT id, productid, productname, price, qty, totalprice, profitrate, 
income, custgmail, custaddress, memberid, cdate, sellstatus, 
detail, amtb, amtf, scfdate, incomestatus, incomeamt, memberamtb, 
memberantf, icfdate
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
    // Parse JSON once
    rows = rows.map((r) => ({
      ...r,
      customerGmail: r.custgmail,
      customerAddress: parseJSON(r.custaddress),
    }));

    // Group by order id
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.id]) {
        grouped[r.id] = {
          id: r.id,
          customerGmail: r.customerGmail,
          customerAddress: r.customerAddress,
          data: [],
        };
      }

      grouped[r.id].data.push({
        productId: r.productid,
        productName: r.productname,
        price: r.price,
        qty: r.qty,
        totalPrice: r.totalprice,
        profitRate: r.profitrate,
        income: r.income,
        memberId: r.memberid,
        cdate: r.cdate,
        sellStatus: r.sellstatus,
        detail: r.detail,
        amtb: r.amtb,
        amtf: r.amtf,
        scfdate: r.scfdate,
        incomestatus: r.incomestatus,
        incomeamt: r.incomeamt,
        memberamtb: r.memberamtb,
        memberantf: r.memberantf,
        icfdate: r.icfdate,
      });
    }

    const finalResult = grouped[id];

    // ✅ Send response
    if (!grouped[id]) {
      return res.status(404).send({
        status: false,
        message: "Order not found",
        data: [],
      });
    }

    res.status(200).send({
      status: true,
      message: "Query successful",
      data: grouped[id],
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
      SELECT id, productid, productname, price, qty, totalprice, profitrate, 
income, custgmail, custaddress, memberid, cdate, sellstatus, 
detail, amtb, amtf, scfdate, incomestatus, incomeamt, memberamtb, 
memberantf, icfdate
	FROM public.tborderpd 
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
    // Parse JSON once
    rows = rows.map((r) => ({
      ...r,
      customerGmail: r.custgmail,
      customerAddress: parseJSON(r.custaddress),
    }));

    // Group by order id
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.id]) {
        grouped[r.id] = {
          id: r.id,
          customerGmail: r.customerGmail,
          customerAddress: r.customerAddress,
          data: [],
        };
      }

      grouped[r.id].data.push({
        productId: r.productid,
        productName: r.productname,
        price: r.price,
        qty: r.qty,
        totalPrice: r.totalprice,
        profitRate: r.profitrate,
        income: r.income,
        memberId: r.memberid,
        cdate: r.cdate,
        sellStatus: r.sellstatus,
        detail: r.detail,
        amtb: r.amtb,
        amtf: r.amtf,
        scfdate: r.scfdate,
        incomestatus: r.incomestatus,
        incomeamt: r.incomeamt,
        memberamtb: r.memberamtb,
        memberantf: r.memberantf,
        icfdate: r.icfdate,
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

export const queryOrderDataAllByMemberId = async (req, res) => {
  try {
    const memberId = req.query.memberId ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // ✅ Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tborderpd where memberId=$1;
    `;
    const countResult = await dbExecution(countQuery, [memberId]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // ✅ Fetch paginated data
    const dataQuery = `
      SELECT id, productid, productname, price, qty, totalprice, profitrate, 
income, custgmail, custaddress, memberid, cdate, sellstatus, 
detail, amtb, amtf, scfdate, incomestatus, incomeamt, memberamtb, 
memberantf, icfdate
	FROM public.tborderpd where memberId=$1
      ORDER BY cdate DESC
      LIMIT $2 OFFSET $3;
    `;

    let rows =
      (await dbExecution(dataQuery, [memberId, validLimit, offset]))?.rows ||
      [];

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
    // Parse JSON once
    rows = rows.map((r) => ({
      ...r,
      customerGmail: r.custgmail,
      customerAddress: parseJSON(r.custaddress),
    }));

    // Group by order id
    const grouped = {};
    for (const r of rows) {
      if (!grouped[r.id]) {
        grouped[r.id] = {
          id: r.id,
          customerGmail: r.customerGmail,
          customerAddress: r.customerAddress,
          data: [],
        };
      }

      grouped[r.id].data.push({
        productId: r.productid,
        productName: r.productname,
        price: r.price,
        qty: r.qty,
        totalPrice: r.totalprice,
        profitRate: r.profitrate,
        income: r.income,
        memberId: r.memberid,
        cdate: r.cdate,
        sellStatus: r.sellstatus,
        detail: r.detail,
        amtb: r.amtb,
        amtf: r.amtf,
        scfdate: r.scfdate,
        incomestatus: r.incomestatus,
        incomeamt: r.incomeamt,
        memberamtb: r.memberamtb,
        memberantf: r.memberantf,
        icfdate: r.icfdate,
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

export const CountStatusPending = async (req, res) => {
  try {
    const memberId = req.query.memberId;

    if (!memberId) {
      return res.status(400).send({
        status: false,
        message: "Missing memberId",
        data: [],
      });
    }

    // Count pending sell orders
    const sellStatusQuery = `
      SELECT sellstatus, COUNT(*)::int AS qty
      FROM public.tborderpd
      WHERE memberid = $1
      GROUP BY sellstatus;
    `;

    // Count income status
    const incomeStatusQuery = `
      SELECT incomestatus, COUNT(*)::int AS qty
      FROM public.tborderpd
      WHERE memberid = $1 and incomestatus is not null
      GROUP BY incomestatus;
    `;

    const sellResult = await dbExecution(sellStatusQuery, [memberId]);
    const incomeResult = await dbExecution(incomeStatusQuery, [memberId]);

    return res.status(200).send({
      status: true,
      message: "Query successful",
      data: {
        sellStatus: sellResult.rows,
        incomeStatus: incomeResult.rows,
      },
    });
  } catch (error) {
    console.error("Error in CountStatus:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
