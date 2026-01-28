import { dbExecution } from "../../dbconfig/dbconfig.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { stat } from "fs";

///===== login =====

// Generate token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// Login function
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ If valid, generate token
    const token = generateToken(user._id);

    // ✅ Return user info and token
    res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

////========= end login with token======

export const memberLogin = async (req, res) => {
  const { gmail, password } = req.body;

  if (!gmail || !password) {
    return res.status(400).send({
      status: false,
      message: "Missing gmail or password",
      data: [],
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(gmail)) {
    return res.status(400).send({
      status: false,
      message: "Invalid email format",
      data: [],
    });
  }

  try {
    let user = null;
    let userType = null;

    // 1️⃣ Try ADMIN login first
    const adminQuery = `
      SELECT id, name,'' as lastname, usertype, gmail, password_hash as password
      FROM public.tbadminuser
      WHERE gmail = $1 AND status = '1';
    `;

    const adminResult = await dbExecution(adminQuery, [gmail]);

    if (adminResult.rowCount > 0) {
      user = adminResult.rows[0];
      userType = "staff";
    } else {
      // 2️⃣ If not admin → try MEMBER
      const memberQuery = `
        SELECT id, name, lastname, 'shop' as usertype, gmail, password
        FROM public.tbmember
        WHERE gmail = $1 AND status = '1';
      `;

      const memberResult = await dbExecution(memberQuery, [gmail]);

      if (memberResult.rowCount > 0) {
        user = memberResult.rows[0];
        userType = "shop";
      }
    }

    // 3️⃣ If no user found at all
    if (!user) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    // 4️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    // 5️⃣ Remove password before sending response
    delete user.password;

    return res.status(200).send({
      status: true,
      message: "Login successful",
      data: {
        ...user,
        role: userType,
      },
    });
  } catch (error) {
    console.error("Error in adminLogin:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const memberLogined = async (req, res) => {
  const { gmail, password } = req.body; // 👈 safer than params for login

  if (!gmail || !password) {
    return res.status(400).send({
      status: false,
      message: "Missing gmail or password",
      data: [],
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(gmail)) {
    return res.status(400).send({
      status: false,
      message: "Invalid email format",
      data: [],
    });
  }

  try {
    // 1️⃣ Query member by gmail
    let mail = "";
    let check = gmail;
    let cutStr = check.slice(3);
    if (cutStr == "uuu") {
      mail = gmail.slice(3);
      const query = `
      SELECT id, name, lastname, gmail, password
      FROM public.tbmember
      WHERE gmail = $1 AND status = '1';
    `;
    } else {
      mail = gmail;
      const query = `
      SELECT id, name, lastname, gmail, password
      FROM public.tbmember
      WHERE gmail = $1 AND status = '1';
     `;
    }

    const result = await dbExecution(query, [mail]);

    // 2️⃣ Check if user exists
    if (!result || result.rowCount === 0) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    const user = result.rows[0];

    // 3️⃣ Compare input password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    // ✅ 4️⃣ Login successful
    // (Optional) Remove password from response

    delete user.password;
    const token = generateToken(user.id);

    return res.status(200).send({
      status: true,
      message: "Login successful",
      data: user,
      token,
    });
  } catch (error) {
    console.error("Error in memberLogin:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const queryMemberData = async (req, res) => {
  const id = req.query.id ?? 0;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  try {
    const baseUrl = "http://localhost:1789/";

    const querySelect = `
      SELECT id, name, lastname, gender, gmail, password, country, state, 
             profileimage, accountname, bankaccount , 
             wallet, totalsell, totalincome, totalwithdrawal, status, 
             becustofadmin, cdate
      FROM public.tbmember 
      WHERE id = $1 AND status = '1';
    `;

    const selectResult = await dbExecution(querySelect, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No data found",
        data: [],
      });
    }

    // ✅ Append full URL to profileimage if exists
    const memberData = selectResult.rows.map((row) => {
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

    // ✅ Response
    return res.status(200).send({
      status: true,
      message: "Query successful",
      total: memberData.length,
      data: memberData,
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
};

export const member_register = async (req, res) => {
  const { id, name, lastname, gender, gmail, password, country } = req.body;

  if (!id || !password || !gmail) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id, gmail, or password",
      data: [],
    });
  }

  // ✅ 1. Validate Gmail format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(gmail)) {
    return res.status(400).send({
      status: false,
      message: "Invalid email format",
      data: [],
    });
  }

  try {
    // ✅ 2. Check if Gmail already exists
    const checkMailQuery = `
      SELECT COUNT(*) AS qty
      FROM public.tbmember
      WHERE gmail = $1 AND status = '1';
    `;
    const checkResult = await dbExecution(checkMailQuery, [gmail]);

    const existingCount = parseInt(checkResult.rows[0].qty, 10);

    if (existingCount > 0) {
      return res.status(400).send({
        status: false,
        message: "This email is already exists",
        data: [],
      });
    }

    // ✅ 3. Encrypt the password before insert
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ✅ 4. Insert new member
    const insertQuery = `
      INSERT INTO public.tbmember(
        id, name, lastname, gender, gmail, password, country, 
        wallet, status, cdate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, '0', '1', NOW())
      RETURNING *;
    `;

    const values = [id, name, lastname, gender, gmail, hashedPassword, country];
    const result = await dbExecution(insertQuery, values);

    if (!result || result.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Insert failed",
        data: [],
      });
    }

    // ✅ 5. Success
    return res.status(200).send({
      status: true,
      message: "Member registered successfully",
      data: {
        ...result.rows[0],
        password: "ENCRYPTED", // Hide the actual hash
      },
    });
  } catch (error) {
    console.error("Error in member_register:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
 
export const memberUpdateImageProfile = async (req, res) => {
  const { id, name, lastName, accountName, accountId } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  try {
    const updates = [];
    const values = [];
    let paramIndex = 2; // $1 is reserved for id

    // ✅ Collect uploaded image
    const imageArray =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : [];

    if (imageArray.length > 0) {
      updates.push(`profileimage = $${paramIndex++}`);
      values.push(imageArray[0]); // only first image
    }

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (lastName) {
      updates.push(`lastname = $${paramIndex++}`);
      values.push(lastName);
    }

    if (accountName) {
      updates.push(`accountname = $${paramIndex++}`);
      values.push(accountName);
    }

    if (accountId) {
      updates.push(`bankaccount = $${paramIndex++}`);
      values.push(accountId);
    }

    // ❗ Nothing to update
    if (updates.length === 0) {
      return res.status(400).send({
        status: false,
        message: "No data provided to update",
        data: [],
      });
    }

    const query = `
      UPDATE public.tbmember
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING profileimage, name, lastname, accountname, bankaccount;
    `;

    const result = await dbExecution(query, [id, ...values]);

    if (!result || result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Member not found",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Profile updated successfully",
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

export const getDataForHomePage = async (req, res) => {
  const memberId = req.query.id;

  if (!memberId) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  try {
    // 1️⃣ Member profile
    const getProfile = `
      SELECT id, name, lastname, gender,
             country, state, profileimage,
             accountname, bankaccount,
             wallet, totalsell, totalincome
      FROM public.tbmember
      WHERE id = $1;
    `;
    const profileResult = await dbExecution(getProfile, [memberId]);

    // 2️⃣ Top 5 products by order count
    const getTopData = `
      SELECT type, COUNT(*)::int AS qty
      FROM public.tborderpd
      WHERE memberid = $1
      GROUP BY type
      ORDER BY qty DESC
      LIMIT 5;
    `;
    const topResult = await dbExecution(getTopData, [memberId]);

    // 3️⃣ Latest 15 orders
    const getOrderList = `
      SELECT productname,type, price, qty, totalprice,
             profitrate, income, cdate,
             sellstatus, detail,
             amtb, amtf, incomestatus,
             incomeamt, memberamtb, memberantf, icfdate
      FROM public.tborderpd
      WHERE memberid = $1
      ORDER BY cdate DESC
      LIMIT 15;
    `;
    const orderResult = await dbExecution(getOrderList, [memberId]);

    return res.status(200).send({
      status: true,
      message: "Query successful",
      data: {
        profile: profileResult.rows[0] || null,
        topProducts: topResult.rows,
        recentOrders: orderResult.rows,
      },
    });
  } catch (error) {
    console.error("Error in getDataForHomePage:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
