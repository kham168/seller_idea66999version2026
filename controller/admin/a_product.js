import { dbExecution } from "../../dbconfig/dbconfig.js";
 
// insert data  test  nw work lawm
export const insertData = async (req, res) => {
  const {
    channel,
    name,
    type,
    price1,
    price2,
    size,
    productDetail,
    detail,
  } = req.body;

  // ✅ Validate required fields
  const id = "p" + Date.now();

  if (!id || !name || !price2 || !detail) {
    return res.status(400).send({
      status: false,
      message:
        "Missing required fields: id, name, price1, and detail are required",
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
    channel, id, modelname, type, price1, price2, size, productdetail, detail, 
    image, status, cdate)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10, '1', NOW())
      RETURNING *;
    `;

    const values = [
      channel,
      id,
      name,
      type,
      price1 || null,
      price2,
      Array.isArray(size) ? JSON.stringify(size) : size, // ✅ fix here
      Array.isArray(productDetail)
        ? JSON.stringify(productDetail)
        : productDetail,
      Array.isArray(detail) ? JSON.stringify(detail) : detail,
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



