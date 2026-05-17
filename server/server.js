require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// ================= DATABASE =================

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET;

// ================= MIDDLEWARE =================

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(
      "Bearer ",
      ""
    );

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    const result = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        error: "Invalid token",
      });
    }

    req.user = result.rows[0];

    next();

  } catch (err) {
    console.error(err);

    res.status(401).json({
      error: "Invalid token",
    });
  }
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied",
      });
    }

    next();
  };

// ================= AUTH =================

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      const valid = await bcrypt.compare(
        password,
        user.password
      );

      if (!valid) {
        return res.status(401).json({
          error: "Invalid credentials",
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
        },
        JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ================= GOALS =================

// MY GOALS
app.get(
  "/api/goals/my",
  authenticate,
  authorize(
    "employee",
    "manager",
    "admin"
  ),
  async (req, res) => {
    try {
      const result = await db.query(
        `
        SELECT *
        FROM goals
        WHERE employee_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// TEAM GOALS
app.get(
  "/api/goals/team",
  authenticate,
  authorize(
    "manager",
    "admin"
  ),
  async (req, res) => {
    try {
      const result = await db.query(
        `
        SELECT
          g.*,
          u.full_name as employee_name
        FROM goals g
        JOIN users u
          ON g.employee_id = u.id
        WHERE
          u.manager_id = $1
          OR $2 = 'admin'
        ORDER BY g.created_at DESC
        `,
        [
          req.user.id,
          req.user.role,
        ]
      );

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

app.get(
  "/api/reports/export",
  authenticate,
  async (req, res) => {
    try {
      let result;

      // EMPLOYEE
      if (req.user.role === "employee") {
        result = await db.query(
          `
          SELECT
            u.full_name as employee_name,
            u.department,
            g.title,
            g.status,
            g.weightage,
            COALESCE(gp.progress_percent, 0) as progress_percent,
            gp.manager_feedback
          FROM goals g
          JOIN users u ON g.employee_id = u.id
          LEFT JOIN goal_progress gp
          ON g.id = gp.goal_id
          WHERE g.employee_id = $1
          ORDER BY g.created_at DESC
        `,
          [req.user.id]
        );
      }

      // MANAGER
      else if (req.user.role === "manager") {
        result = await db.query(
          `
          SELECT
            u.full_name as employee_name,
            u.department,
            g.title,
            g.status,
            g.weightage,
            COALESCE(gp.progress_percent, 0) as progress_percent,
            gp.manager_feedback
          FROM goals g
          JOIN users u ON g.employee_id = u.id
          LEFT JOIN goal_progress gp
          ON g.id = gp.goal_id
          WHERE u.manager_id = $1
          ORDER BY g.created_at DESC
        `,
          [req.user.id]
        );
      }

      // ADMIN
      else {
        result = await db.query(
          `
          SELECT
            u.full_name as employee_name,
            u.department,
            g.title,
            g.status,
            g.weightage,
            COALESCE(gp.progress_percent, 0) as progress_percent,
            gp.manager_feedback
          FROM goals g
          JOIN users u ON g.employee_id = u.id
          LEFT JOIN goal_progress gp
          ON g.id = gp.goal_id
          ORDER BY g.created_at DESC
        `
        );
      }

      res.json(result.rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);



// CREATE GOAL
app.post(
  "/api/goals",
  authenticate,
  authorize("employee"),
  async (req, res) => {
    try {
      const {
        title,
        description,
        thrust_area,
        uom_type,
        target_value,
        weightage,
        deadline,
      } = req.body;

      const countRes = await db.query(
        `
        SELECT COUNT(*)
        FROM goals
        WHERE employee_id = $1
        AND status IN ('draft', 'pending')
        `,
        [req.user.id]
      );

      if (
        parseInt(
          countRes.rows[0].count
        ) >= 8
      ) {
        return res.status(400).json({
          error:
            "Maximum 8 goals allowed",
        });
      }

      if (
        weightage < 10 ||
        weightage > 100
      ) {
        return res.status(400).json({
          error:
            "Weightage must be between 10 and 100",
        });
      }

      const result = await db.query(
        `
        INSERT INTO goals (
          employee_id,
          title,
          description,
          thrust_area,
          uom_type,
          target_value,
          weightage,
          deadline,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )
        RETURNING *
        `,
        [
          req.user.id,
          title,
          description,
          thrust_area,
          uom_type,
          target_value,
          weightage,
          deadline,
          "draft",
        ]
      );

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// EDIT GOAL
app.put(
  "/api/goals/:id",
  authenticate,
  authorize("employee"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        title,
        description,
        thrust_area,
        uom_type,
        target_value,
        weightage,
        deadline,
      } = req.body;

      const check = await db.query(
        `
        SELECT *
        FROM goals
        WHERE id = $1
        AND employee_id = $2
        AND status = 'draft'
        `,
        [id, req.user.id]
      );

      if (!check.rows.length) {
        return res.status(403).json({
          error:
            "Only draft goals can be edited",
        });
      }

      const result = await db.query(
        `
        UPDATE goals
        SET
          title = $1,
          description = $2,
          thrust_area = $3,
          uom_type = $4,
          target_value = $5,
          weightage = $6,
          deadline = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
        `,
        [
          title,
          description,
          thrust_area,
          uom_type,
          target_value,
          weightage,
          deadline,
          id,
        ]
      );

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// DELETE GOAL
app.delete(
  "/api/goals/:id",
  authenticate,
  authorize("employee"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const check = await db.query(
        `
        SELECT *
        FROM goals
        WHERE id = $1
        AND employee_id = $2
        AND status = 'draft'
        `,
        [id, req.user.id]
      );

      if (!check.rows.length) {
        return res.status(403).json({
          error:
            "Only draft goals can be deleted",
        });
      }

      await db.query(
        `
        DELETE FROM goals
        WHERE id = $1
        `,
        [id]
      );

      res.json({
        success: true,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// SUBMIT GOALS
app.post(
  "/api/goals/submit",
  authenticate,
  authorize("employee"),
  async (req, res) => {
    try {
      const goals = await db.query(
        `
        SELECT *
        FROM goals
        WHERE employee_id = $1
        AND status = 'draft'
        `,
        [req.user.id]
      );

      if (!goals.rows.length) {
        return res.status(400).json({
          error:
            "No draft goals found",
        });
      }

      const totalWeight =
        goals.rows.reduce(
          (sum, g) =>
            sum +
            parseFloat(g.weightage),
          0
        );

      if (
        Math.abs(totalWeight - 100) >
        0.01
      ) {
        return res.status(400).json({
          error:
            "Total weightage must be 100%",
        });
      }

      await db.query(
        `
        UPDATE goals
        SET status = 'pending'
        WHERE employee_id = $1
        AND status = 'draft'
        `,
        [req.user.id]
      );

      res.json({
        message:
          "Goals submitted successfully",
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// APPROVE / REJECT
app.put(
  "/api/goals/:id/approve",
  authenticate,
  authorize("manager", "admin"),
  async (req, res) => {

    try {

      const { id } = req.params;
      const { action } = req.body;

      const goalRes = await db.query(
        `
        SELECT
          g.*,
          u.manager_id
        FROM goals g
        JOIN users u
        ON g.employee_id = u.id
        WHERE g.id = $1
      `,
        [id]
      );

      if (!goalRes.rows.length) {

        return res.status(404).json({
          error: "Goal not found",
        });

      }

      const goal = goalRes.rows[0];

      const isManager =
        Number(goal.manager_id) ===
        Number(req.user.id);

      if (
        !isManager &&
        req.user.role !== "admin"
      ) {

        return res.status(403).json({
          error: "Access denied",
        });

      }

      let newStatus = "draft";

      if (action === "approve") {
        newStatus = "approved";
      }

      if (action === "reject") {
        newStatus = "draft";
      }

      const updated = await db.query(
        `
        UPDATE goals
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
        [
          newStatus,
          id,
        ]
      );

      await db.query(
        `
        INSERT INTO audit_log
        (
          user_id,
          action,
          entity_type,
          entity_id,
          new_value
        )
        VALUES ($1,$2,$3,$4,$5)
      `,
        [
          req.user.id,
          action.toUpperCase(),
          "goal",
          id,
          JSON.stringify(updated.rows[0]),
        ]
      );

      res.json(updated.rows[0]);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message,
      });

    }

  }
);

// MANAGER EDIT
app.put(
  "/api/goals/:id/manager-edit",
  authenticate,
  authorize(
    "manager",
    "admin"
  ),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        title,
        description,
        thrust_area,
        uom_type,
        target_value,
        weightage,
        deadline,
      } = req.body;

      const goalRes = await db.query(
        `
        SELECT
          g.*,
          u.manager_id
        FROM goals g
        JOIN users u
          ON g.employee_id = u.id
        WHERE g.id = $1
        `,
        [id]
      );

      if (!goalRes.rows.length) {
        return res.status(404).json({
          error: "Goal not found",
        });
      }

      const goal = goalRes.rows[0];

      const isManager =
        parseInt(goal.manager_id) ===
        parseInt(req.user.id);

      if (
        !isManager &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          error: "Access denied",
        });
      }

      const updated = await db.query(
        `
        UPDATE goals
        SET
          title = $1,
          description = $2,
          thrust_area = $3,
          uom_type = $4,
          target_value = $5,
          weightage = $6,
          deadline = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
        `,
        [
          title,
          description,
          thrust_area,
          uom_type,
          target_value,
          weightage,
          deadline,
          id,
        ]
      );

      res.json(updated.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ================= DASHBOARD =================

app.get(
  "/api/reports/dashboard",
  authenticate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      let statsRes;

      if (role === "employee") {
        statsRes = await db.query(
          `
          SELECT
            COUNT(*) as total_goals,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft
          FROM goals
          WHERE employee_id = $1
          `,
          [userId]
        );
      }

      else if (role === "manager") {
        statsRes = await db.query(
          `
          SELECT
            COUNT(*) as total_goals,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approval,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
          FROM goals g
          JOIN users u
            ON g.employee_id = u.id
          WHERE u.manager_id = $1
          `,
          [userId]
        );
      }

      else {
        statsRes = await db.query(
          `
          SELECT
            COUNT(*) as total_goals,
            COUNT(DISTINCT employee_id) as employees,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approval
          FROM goals
          `
        );
      }

      res.json({
        stats: statsRes.rows[0],
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ================= ADMIN =================

// USERS
app.get(
  "/api/admin/users",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const result = await db.query(
        `
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.role,
          u.department,
          u.manager_id,
          m.full_name as manager_name
        FROM users u
        LEFT JOIN users m
          ON u.manager_id = m.id
        ORDER BY u.role, u.full_name
        `
      );

      res.json(result.rows);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// CREATE USER
app.post(
  "/api/admin/users",
  authenticate,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        email,
        password,
        full_name,
        role,
        department,
        manager_id,
      } = req.body;

      const hashed =
        await bcrypt.hash(
          password,
          10
        );

      const result = await db.query(
        `
        INSERT INTO users (
          email,
          password,
          full_name,
          role,
          department,
          manager_id
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, email, full_name, role
        `,
        [
          email,
          hashed,
          full_name,
          role,
          department,
          manager_id || null,
        ]
      );

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// DELETE USER
app.delete(
  "/api/admin/users/:id",
  authenticate,
  authorize("admin"),
  async (req, res) => {

    try {

      const { id } = req.params;

      // prevent deleting admin
      const userRes = await db.query(
        `SELECT * FROM users WHERE id = $1`,
        [id]
      );

      if (!userRes.rows.length) {

        return res.status(404).json({
          error: "User not found",
        });

      }

      if (userRes.rows[0].role === "admin") {

        return res.status(403).json({
          error: "Cannot delete admin",
        });

      }

      // DELETE PROGRESS
      await db.query(
        `
        DELETE FROM goal_progress
        WHERE goal_id IN (
          SELECT id FROM goals
          WHERE employee_id = $1
        )
      `,
        [id]
      );

      // DELETE AUDIT LOGS
      await db.query(
        `
        DELETE FROM audit_log
        WHERE user_id = $1
      `,
        [id]
      );

      // DELETE GOALS
      await db.query(
        `
        DELETE FROM goals
        WHERE employee_id = $1
      `,
        [id]
      );

      // REMOVE MANAGER REFERENCES
      await db.query(
        `
        UPDATE users
        SET manager_id = NULL
        WHERE manager_id = $1
      `,
        [id]
      );

      // DELETE USER
      await db.query(
        `
        DELETE FROM users
        WHERE id = $1
      `,
        [id]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message,
      });

    }

  }
);

// ================= ERROR HANDLER =================

app.use(
  (err, req, res, next) => {
    console.error(err.stack);

    res.status(500).json({
      error:
        err.message ||
        "Server Error",
    });
  }
);
app.get(
  "/api/admin/audit",
  authenticate,
  authorize("admin"),
  async (req, res) => {

    try {

      const result = await db.query(`
        SELECT
          a.*,
          u.full_name AS user_name
        FROM audit_log a
        JOIN users u
        ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 200
      `);

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message,
      });

    }

  }
);
// ================= START SERVER =================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});