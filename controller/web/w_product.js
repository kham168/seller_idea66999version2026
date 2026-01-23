import { dbExecution } from "../../dbconfig/dbconfig.js";
//import { QueryTopup } from "../class/class.controller.js";

// query muas data all or select top 15
export const queryAll = async (req, res) => {
  // =====> user for web admin
  try {
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // Count total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.tbproduct p
      WHERE p.status = '1';
    `;
    const countResult = await dbExecution(countQuery, []);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const baseUrl = "http://localhost:1789/";

    // Fetch paginated data
    const dataQuery = `
      SELECT   id, modelname, type, price1, price2, size, 
             productdetail, profitrate, image, star, totalsell, status, cdate
      FROM public.tbproduct 
      WHERE status='1' ORDER BY cdate DESC
      LIMIT $1 OFFSET $2;
    `;

    let rows = (await dbExecution(dataQuery, [validLimit, offset]))?.rows || [];

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
        productDetail: r.productdetail,
        profitRate: r.profitrate,
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
  
// query muas data all or select top 15
export const queryOne = async (req, res) => {
  try {
    const id = req.query.id ?? 0;

    const baseUrl = "http://localhost:1789/";

    // Fetch paginated data
    const dataQuery = `
      SELECT  id, modelname, type, price1, price2, size, 
      productdetail, profitrate, image, star, totalsell, status, cdate
      FROM public.tbproduct 
      WHERE id=$1
    `;

    let rows = (await dbExecution(dataQuery, [id]))?.rows || [];

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
        productDetail: r.productdetail,
        profitRate: r.profitrate,
        image: imgs,
      };
    });

    // ✅ Response
    res.status(200).send({
      status: true,
      message: rows.length > 0 ? "Query successful" : "No data found",
      data: rows,
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

// insert data  test  nw work lawm
export const insertData = async (req, res) => {
  const { name, type, price1, price2, size, productDetail, profitRate } =
    req.body;

  // ✅ Validate required fields
  const id = "p" + Date.now();
  if (!id || !name || !price2 || !productDetail) {
    return res.status(400).send({
      status: false,
      message:
        "Missing required fields: id, name, price2, and detail are required",
      data: [],
    });
  }

  // ✅ Collect uploaded filenames into an array
  const imageArray =
    req.files && req.files.length > 0
      ? req.files.map((file) => file.filename)
      : [];

  try {
    // ✅ Insert into main table directly
    const query = `
    INSERT INTO public.tbproduct(
	 id, modelname, type, price1, price2, size, productdetail, profitrate,
    image, status, cdate)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '1', NOW())
      RETURNING *;
    `;

    const values = [
      id,
      name,
      type,
      price1 || 0,
      price2,
      Array.isArray(size) ? JSON.stringify(size) : size, // ✅ fix here
      Array.isArray(productDetail)
        ? JSON.stringify(productDetail)
        : productDetail,
      profitRate,
      imageArray,
    ];

    const result = await dbExecution(query, values);

    // ✅ Success response
    if (result && result.rowCount > 0) {
      return res.status(200).send({
        status: true,
        message: "Insert data successful",
        data: result.rows,
      });
    } else {
      return res.status(400).send({
        status: false,
        message: "Insert data failed",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error in insert data:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
 