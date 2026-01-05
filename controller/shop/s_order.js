
import { dbExecution } from "../../dbconfig/dbconfig.js";

export const queryOrderDataAllByMemberId = async (req, res) => {
  try {

    const mbid = req.query.mbid ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // ✅ Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tborderpd where memberid=$1;
    `;
    const countResult = await dbExecution(countQuery, [mbid]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // ✅ Fetch paginated data
    const dataQuery = `
      SELECT id, productname, type, size, price, qty, totalprice, incomerate, custaddress, membername, cdate, detail, cfdate
	FROM public.tborderpd where memberid=$1 
      ORDER BY cdate DESC
      LIMIT $2 OFFSET $3;
    `;

    let rows = (await dbExecution(dataQuery, [mbid,validLimit, offset]))?.rows || [];

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






