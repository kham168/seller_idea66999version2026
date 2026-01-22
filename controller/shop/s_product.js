import { dbExecution } from "../../dbconfig/dbconfig.js";

export const queryAllProductByMemberId = async (req, res) => {
  try {
    const id = req.query.id ?? 0;
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

    // Count total
    const countQuery = `
      select count(*) AS total from (
   SELECT j.memberid, p.*
   FROM public.tbproduct p
   LEFT JOIN public.tbmemberjoinproduct j 
  ON j.productid = p.id
  AND j.memberid = $1 and j.status='1'
   where p.status = '1'
    )s where s.memberid is not null;
    `;
    const countResult = await dbExecution(countQuery, [id]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const baseUrl = "http://localhost:1789/";

    const isFirstPage = validPage === 0;

    let profileData = null;

  if (isFirstPage) {
      try {
        const querySelect = `
      SELECT id, name, lastname, gender, gmail, country, state, 
             profileimage, accountname, bankaccount, 
             wallet, totalsell, totalincome, totalwithdrawal, status, 
             becustofadmin, cdate
      FROM public.tbmember WHERE id = $1 AND status = '1' order by cdate desc limit 1;
    `;

        const profile = await dbExecution(querySelect, [id]);

        if (!profile || profile.rowCount === 0) {
          return res.status(200).send({
            status: true,
            message: "No data found",
            data: [],
          });
        }

        // ✅ Append full URL to profileimage if exists
        profileData = profile.rows.map((row) => {
          let imagePath = null;

          if (row.profileimage) {
            // Handle if it's stored as array or string
            if (Array.isArray(row.profileimage)) {
              imagePath = row.profileimage.map((img) => `${baseUrl}${img}`);
            } else {
              imagePath = `${baseUrl}${row.profileimage}`;
            }
          }

          return {
            ...row,
            profileimage: imagePath,
          };
        });
      } catch (error) {
        console.error("Error in queryMemberData:", error);
        res.status(500).send({
          status: false,
          message: "Internal Server Error",
          error: error.message,
          data: [],
        });
      }
    }

    // Fetch paginated data
    const dataQuery = `
   select * from (
   SELECT j.memberid, p.*
   FROM public.tbproduct p
   LEFT JOIN public.tbmemberjoinproduct j 
   ON j.productid = p.id
   AND j.memberid = $1 and j.status='1'
   where p.status = '1'
    )s where s.memberid is not null
      LIMIT $2 OFFSET $3;
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
      const productDetail = parseJSON(r.productdetail);
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
        productDetail,
        detail,
        image: imgs,
      };
    });

    // ✅ Response
    res.status(200).send({
      status: true,
      message: rows.length > 0 ? "Query successful" : "No data found",
      data: {
        profile: profileData,
        products: rows,
      },

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

export const queryAllProductWhichOneNoJoinWithId = async (req, res) => {
  try {
    const id = req.query.id ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // Count total
    const countQuery = `
       select count(*) As total from (
   SELECT j.memberid, p.*
   FROM public.tbproduct p
   LEFT JOIN public.tbmemberjoinproduct j 
  ON j.productid = p.id
  AND j.memberid = $1
	where p.status = '1' and p.cdate <= current_date -1
    )s where s.memberid is null;
    `;
    const countResult = await dbExecution(countQuery, [id]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const baseUrl = "http://localhost:1789/";

    // Fetch paginated data
    const dataQuery = `
     select * from (
   SELECT j.memberid, p.*
   FROM public.tbproduct p
   LEFT JOIN public.tbmemberjoinproduct j 
  ON j.productid = p.id
  AND j.memberid = $1
	where p.status = '1' and p.cdate <= current_date -1
    )s where s.memberid is null 
    LIMIT $2 OFFSET $3;
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

export const queryAllProductWhichOneNoJoinWithIdNewData = async (req, res) => {
  try {
    const id = req.query.id ?? 0;
    const page = req.query.page ?? 0;
    const limit = req.query.limit ?? 15;

    const validPage = Math.max(parseInt(page, 10) || 0, 0);
    const validLimit = Math.max(parseInt(limit, 10) || 15, 1);
    const offset = validPage * validLimit;

    // Count total
    const countQuery = `
     select count(*) As total from (
   SELECT j.memberid, p.*
   FROM public.tbproduct p
   LEFT JOIN public.tbmemberjoinproduct j 
  ON j.productid = p.id
  AND j.memberid = $1
	where p.status = '1' and p.cdate >= current_date -1
    )s where s.memberid is null;
    `;
    const countResult = await dbExecution(countQuery, [id]);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const baseUrl = "http://localhost:1789/";

    // Fetch paginated data
    const dataQuery = `
    select * from (
   SELECT j.memberid, p.*
   FROM public.tbproduct p
   LEFT JOIN public.tbmemberjoinproduct j 
  ON j.productid = p.id
  AND j.memberid = $1
	where p.status = '1' and p.cdate <= current_date -1
    )s where s.memberid is null 
    LIMIT $2 OFFSET $3;
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

export const insertJoinProductId = async (req, res) => {
  const { memberId, productId } = req.body;

  // ✅ Validate required fields
  if (!memberId || !Array.isArray(productId) || productId.length === 0) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: memberId or productId list",
      data: [],
    });
  }

  try {
    const insertQuery = `
      INSERT INTO public.tbmemberjoinproduct(memberid, productid, status)
      VALUES ($1, $2, '1')
      RETURNING *;
    `;

    const insertedRows = [];

    // ✅ Loop through productId array and insert one by one
    for (const pid of productId) {
      const result = await dbExecution(insertQuery, [memberId, pid]);
      if (result && result.rowCount > 0) {
        insertedRows.push(result.rows[0]);
      }
    }

    // ✅ Success response
    return res.status(200).send({
      status: true,
      message: "Data inserted successfully for all products",
      count: insertedRows.length,
      data: insertedRows,
    });
  } catch (error) {
    console.error("Error in insertJoinData:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const UnJoinProduct = async (req, res) => {
  const { memberId, productId } = req.body;

  if (!memberId || !productId) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  try {
    // ✅ Collect uploaded filenames (use first one for profile image)
    const imageArray =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    // ✅ Ensure at least one image is uploaded
    if (imageArray.length === 0) {
      return res.status(400).send({
        status: false,
        message: "No image uploaded",
        data: [],
      });
    }

    // ✅ Update the member's profile image (just first image)
    const UnJoinProduct = `
    UPDATE public.tbmemberjoinproduct
	SET status='0' WHERE memberid=$1 and productid=$2
      RETURNING *;
    `;

    const result = await dbExecution(UnJoinProduct, [memberId, productId]);

    if (!result || result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Member not found or update failed",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "updated data successfully",
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
