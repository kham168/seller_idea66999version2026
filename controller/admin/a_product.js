import { generateKey } from "crypto";
import { dbExecution } from "../../dbconfig/dbconfig.js";

// insert data  test  nw work lawm
export const insertData = async (req, res) => {
  const { name, type, price1, price2, size, productDetail, profitRate } =
    req.body;

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
     id, modelname, type, price1, price2, size, productdetail, profitrate,
    image, status, cdate)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '1', NOW())
      RETURNING *;
    `;

    const values = [
      id,
      name,
      type,
      price1 || null,
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
export const UpdateReviewNumberOfAnyProduct = async (req, res) => {
  const { id, userType } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing product id",
      data: [],
    });
  }

  if (userType !== "admin") {
    return res.status(403).send({
      status: false,
      message: "Unauthorized: Only admin can update review number",
      data: [],
    });
  }

  try {
    // 1️⃣ Get current review number
    const selectQuery = `
      SELECT reviewnumber
      FROM public.tbproduct
      WHERE id = $1;
    `;
    const selectResult = await dbExecution(selectQuery, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Product not found",
        data: [],
      });
    }

    const currentReview = Number(selectResult.rows[0].reviewnumber) || 0;
    const randomAdd = Math.floor(Math.random() * 9) + 1;
    const newReviewNumber = currentReview + randomAdd;

    // 2️⃣ Update review number
    const updateQuery = `
      UPDATE public.tbproduct
      SET reviewnumber = $2
      WHERE id = $1
      RETURNING reviewnumber;
    `;
    const updateResult = await dbExecution(updateQuery, [id, newReviewNumber]);

    return res.status(200).send({
      status: true,
      message: "Review number updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Error in UpdateReviewNumberOfAnyProduct:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
