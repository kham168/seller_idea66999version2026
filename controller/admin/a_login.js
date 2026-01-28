import { dbExecution } from "../../dbconfig/dbconfig.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const adminLogin = async (req, res) => {
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
        SELECT id, name, lastname, '' as usertype, gmail, password
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
export const getAllUserAC = async (req, res) => {
  const { type } = req.query;

  if (type !== "admin") {
    return res.status(403).send({
      status: false,
      message: "Access denied",
      data: [],
    });
  }

  try {
    const query = `
      SELECT id, name, usertype, gmail, status, cdate
      FROM public.tbadminuser
      ORDER BY cdate DESC;
    `;

    const result = await dbExecution(query, []);

    return res.status(200).send({
      status: true,
      message: result.rowCount > 0 ? "Query successful" : "No data found",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error in getAllUserAC:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
    });
  }
};

export const updatePassword = async (req, res) => {
  const { gmail, oldPassword, newPassword } = req.body;

  if (!gmail || !oldPassword || !newPassword) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields",
      data: [],
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).send({
      status: false,
      message: "Password must be at least 8 characters long",
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

    // 🔍 Check admin first
    const adminQuery = `
      SELECT id, name, '' AS lastname, gmail, password_hash AS password
      FROM public.tbadminuser
      WHERE gmail = $1 AND status = '1';
    `;

    const adminResult = await dbExecution(adminQuery, [gmail]);

    if (adminResult.rowCount > 0) {
      user = adminResult.rows[0];
      userType = "staff";
    } else {
      // 🔍 Check member
      const memberQuery = `
        SELECT id, name, lastname, gmail, password
        FROM public.tbmember
        WHERE gmail = $1 AND status = '1';
      `;

      const memberResult = await dbExecution(memberQuery, [gmail]);

      if (memberResult.rowCount > 0) {
        user = memberResult.rows[0];
        userType = "shop";
      }
    }

    if (!user) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).send({
        status: false,
        message: "Old password is incorrect",
        data: [],
      });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    let updateResult;
    if (userType === "staff") {
      updateResult = await dbExecution(
        `UPDATE public.tbadminuser SET password_hash = $2 WHERE id = $1 AND status = '1'`,
        [user.id, newHashedPassword],
      );
    } else {
      updateResult = await dbExecution(
        `UPDATE public.tbmember SET password = $2 WHERE id = $1 AND status = '1'`,
        [user.id, newHashedPassword],
      );
    }

    if (!updateResult || updateResult.rowCount === 0) {
      return res.status(500).send({
        status: false,
        message: "Password update failed",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Password updated successfully",
      data: {
        id: user.id,
        gmail,
        role: userType,
      },
    });
  } catch (error) {
    console.error("Error in UpdatePassword:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const updatePasswordConfirmByMail = async (req, res) => {
  const { gmail, code, newPassword, step } = req.body;

  if (!gmail || !step) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields",
      data: [],
    });
  }

  if (!["1", "2"].includes(step)) {
    return res.status(400).send({
      status: false,
      message: "Invalid step",
      data: [],
    });
  }

  if (step === "2" && (!code || !newPassword)) {
    return res.status(400).send({
      status: false,
      message: "Missing code or new password",
      data: [],
    });
  }

  if (newPassword && newPassword.length < 8) {
    return res.status(400).send({
      status: false,
      message: "Password must be at least 8 characters long",
      data: [],
    });
  }

  try {
    let user = null;
    let userType = null;

    // 🔍 Admin
    const adminResult = await dbExecution(
      `SELECT id, gmail FROM public.tbadminuser WHERE gmail = $1 AND status = '1'`,
      [gmail],
    );

    if (adminResult.rowCount > 0) {
      user = adminResult.rows[0];
      userType = "staff";
    } else {
      // 🔍 Member
      const memberResult = await dbExecution(
        `SELECT id, gmail FROM public.tbmember WHERE gmail = $1 AND status = '1'`,
        [gmail],
      );

      if (memberResult.rowCount > 0) {
        user = memberResult.rows[0];
        userType = "shop";
      }
    }

    if (!user) {
      return res.status(401).send({
        status: false,
        message: "Email not found",
        data: [],
      });
    }

    // ================= STEP 1: SEND CODE =================
    if (step === "1") {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      await dbExecution(
        `
        INSERT INTO public.tbcodecftoupdatepassword
        (userid, usertype, code, status, cdate)
        VALUES ($1, $2, $3, '1', NOW())
        `,
        [user.id, userType, pin],
      );

      // TODO: send pin via email here

      return res.status(200).send({
        status: true,
        message: "Verification code sent to email",
        data: {},
      });
    }

    // ================= STEP 2: VERIFY CODE & UPDATE =================
    const pinResult = await dbExecution(
      `
      SELECT code, cdate
      FROM public.tbcodecftoupdatepassword
      WHERE userid = $1
        AND usertype = $2
        AND status = '1'
        AND cdate > NOW() - INTERVAL '10 minutes'
      ORDER BY cdate DESC
      LIMIT 1
      `,
      [user.id, userType],
    );

    if (pinResult.rowCount === 0 || pinResult.rows[0].code !== code) {
      return res.status(400).send({
        status: false,
        message: "Invalid or expired code",
        data: [],
      });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    if (userType === "staff") {
      await dbExecution(
        `UPDATE public.tbadminuser SET password_hash = $2 WHERE id = $1`,
        [user.id, newHashedPassword],
      );
    } else {
      await dbExecution(
        `UPDATE public.tbmember SET password = $2 WHERE id = $1`,
        [user.id, newHashedPassword],
      );
    }

    await dbExecution(
      `UPDATE public.tbcodecftoupdatepassword SET status = '0' WHERE userid = $1 AND code = $2`,
      [user.id, code],
    );

    return res.status(200).send({
      status: true,
      message: "Password updated successfully",
      data: {
        gmail,
        role: userType,
      },
    });
  } catch (error) {
    console.error("Error in updatePasswordConfirmByMail:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const queryAdminData = async (req, res) => {
  const id = req.query.id ?? 0;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  try {
    const querySelect = `
    SELECT id, name, usertype, gmail,
password, wallet, customergroup, status, cdate
	FROM public.tbadminuser where id=$1;
    `;

    const selectResult = await dbExecution(querySelect, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No data found",
        data: [],
      });
    }

    // ✅ Response
    return res.status(200).send({
      status: true,
      message: "Query successful",
      data: selectResult.rows,
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

export const admin_register = async (req, res) => {
  const { id, name, userType, gmail, password } = req.body;

  if (!id || !name || !userType || !gmail || !password) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id, gmail, or password",
      data: [],
    });
  }

  try {
    // ✅ 2. Check if Gmail already exists
    const checkMailQuery = `
      SELECT COUNT(*) AS qty
      FROM public.tbadminuser
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
     INSERT INTO public.tbadminuser(
	id, name, usertype, gmail, password_hash , status, cdate)
	VALUES ($1, $2, $3, $4, $5, '1', NOW())
      RETURNING *;
    `;

    const values = [id, name, userType, gmail, hashedPassword];
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

export const UpdateAdminStatus = async (req, res) => {
  const { id, status } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  try {
    // ✅ Update the member's profile image (just first image)
    const UpdateUserStatus = `
    UPDATE public.tbadminuser
	SET status=$s2
	WHERE id=$1
      RETURNING *;
    `;

    const result = await dbExecution(UpdateUserStatus, [id, status]);

    if (!result || result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "user not found or update failed",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Updated status successfully",
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

export const queryAdminAll = async (req, res) => {
  const id = req.query.id ?? 0;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  try {
    const querySelect = `
    SELECT id, name, lastname, gender, usertype, gmail, status, cdate
	FROM public.tbadminuser order by cdate desc;
    `;

    const selectResult = await dbExecution(querySelect, []);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No data found",
        data: [],
      });
    }

    // ✅ Response
    return res.status(200).send({
      status: true,
      message: "Query successful",
      data: selectResult.rows,
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


export const memberUpdateBeLongToUser = async (req, res) => {
  const { id, type, status, uId } = req.body;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  if (!status && !uId) {
    return res.status(400).send({
      status: false,
      message: "Missing status or uId",
      data: [],
    });
  }

  if (type !== "admin") {
    return res.status(403).send({
      status: false,
      message: "Access denied",
      data: [],
    });
  }

  try {
    const query = `
      UPDATE public.tbmember
      SET  status=$2, becustofadmin = $3
      WHERE id = $1
      RETURNING id, status, becustofadmin;
    `;

    const result = await dbExecution(query, [id, status, uId]);

    if (result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "Member not found",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error in memberUpdateBeLongToUser:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      data: [],
    });
  }
};
