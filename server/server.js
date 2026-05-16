import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const db = new Pool({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'goal_tracker',
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-this';

// ============ MIDDLEWARE ============
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await db.query('SELECT id, email, role, full_name FROM users WHERE id = $1', [decoded.userId]);
    req.user = result.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
  next();
};

// ============ AUTH ROUTES ============
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GOAL ROUTES ============
app.get('/api/goals', authenticate, async (req, res) => {
  try {
    let query = '';
    let params = [];
    
    if (req.user.role === 'employee') {
      query = 'SELECT g.*, ta.name as thrust_area FROM goals g LEFT JOIN thrust_areas ta ON g.thrust_area_id = ta.id WHERE g.employee_id = $1 ORDER BY g.created_at DESC';
      params = [req.user.id];
    } else if (req.user.role === 'manager') {
      query = `SELECT g.*, u.full_name as employee_name, ta.name as thrust_area 
               FROM goals g 
               JOIN users u ON g.employee_id = u.id 
               LEFT JOIN thrust_areas ta ON g.thrust_area_id = ta.id 
               WHERE u.manager_id = $1 OR g.employee_id = $1
               ORDER BY g.created_at DESC`;
      params = [req.user.id];
    } else {
      query = 'SELECT g.*, u.full_name as employee_name, ta.name as thrust_area FROM goals g JOIN users u ON g.employee_id = u.id LEFT JOIN thrust_areas ta ON g.thrust_area_id = ta.id ORDER BY g.created_at DESC';
      params = [];
    }
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/goals', authenticate, authorize('employee'), async (req, res) => {
  const { title, description, thrustAreaId, uomType, targetValue, weightage, deadline } = req.body;
  
  try {
    // Check goal count
    const countResult = await db.query('SELECT COUNT(*) FROM goals WHERE employee_id = $1 AND status IN ($2, $3)', 
      [req.user.id, 'draft', 'pending']);
    
    if (parseInt(countResult.rows[0].count) >= 8) {
      return res.status(400).json({ error: 'Maximum 8 goals allowed' });
    }
    
    if (weightage < 10) {
      return res.status(400).json({ error: 'Minimum weightage is 10%' });
    }
    
    const result = await db.query(
      `INSERT INTO goals (employee_id, thrust_area_id, title, description, uom_type, target_value, weightage, deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, thrustAreaId, title, description, uomType, targetValue, weightage, deadline, 'draft']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/goals/:id', authenticate, async (req, res) => {
  const { title, description, targetValue, weightage } = req.body;
  
  try {
    const result = await db.query(
      `UPDATE goals SET title=$1, description=$2, target_value=$3, weightage=$4, updated_at=NOW() 
       WHERE id=$5 AND status='draft' RETURNING *`,
      [title, description, targetValue, weightage, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/goals/submit', authenticate, authorize('employee'), async (req, res) => {
  try {
    const goals = await db.query('SELECT * FROM goals WHERE employee_id = $1 AND status = $2', [req.user.id, 'draft']);
    
    if (goals.rows.length === 0) {
      return res.status(400).json({ error: 'No goals to submit' });
    }
    
    // Calculate total weightage
    const totalWeightage = goals.rows.reduce((sum, g) => sum + parseFloat(g.weightage), 0);
    if (Math.abs(totalWeightage - 100) > 0.01) {
      return res.status(400).json({ error: `Total weightage must be 100% (current: ${totalWeightage}%)` });
    }
    
    await db.query('UPDATE goals SET status = $1 WHERE employee_id = $2 AND status = $3', 
      ['pending', req.user.id, 'draft']);
    
    res.json({ message: 'Goals submitted for approval' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/goals/:id/approve', authenticate, authorize('manager', 'admin'), async (req, res) => {
  const { action, comments } = req.body;
  
  try {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const result = await db.query('UPDATE goals SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', 
      [status, req.params.id]);
    
    // Log audit
    await db.query('INSERT INTO audit_log (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'GOAL_APPROVAL', { goalId: req.params.id, action, comments }]);
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROGRESS ROUTES ============
app.post('/api/progress', authenticate, async (req, res) => {
  const { goalId, quarter, achievement, status } = req.body;
  
  try {
    // Calculate progress based on UOM type
    const goal = await db.query('SELECT uom_type, target_value FROM goals WHERE id = $1', [goalId]);
    let progressPercent = 0;
    
    if (goal.rows[0].uom_type === 'numeric_min') {
      progressPercent = (achievement / goal.rows[0].target_value) * 100;
    } else if (goal.rows[0].uom_type === 'percentage') {
      progressPercent = achievement;
    } else if (goal.rows[0].uom_type === 'timeline') {
      progressPercent = achievement === 1 ? 100 : 0;
    }
    
    progressPercent = Math.min(100, Math.max(0, progressPercent));
    
    const result = await db.query(
      `INSERT INTO goal_progress (goal_id, quarter, achievement, status, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (goal_id, quarter) 
       DO UPDATE SET achievement = $3, status = $4, updated_at = NOW()
       RETURNING *`,
      [goalId, quarter, achievement, status]
    );
    
    // Update actual value in goals
    await db.query('UPDATE goals SET actual_value = $1 WHERE id = $2', [achievement, goalId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/progress/:goalId', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM goal_progress WHERE goal_id = $1 ORDER BY quarter', [req.params.goalId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ REPORTING ROUTES ============
app.get('/api/reports/dashboard', authenticate, async (req, res) => {
  try {
    let goalsQuery = '';
    let params = [];
    
    if (req.user.role === 'employee') {
      goalsQuery = 'SELECT * FROM goals WHERE employee_id = $1';
      params = [req.user.id];
    } else if (req.user.role === 'manager') {
      goalsQuery = `SELECT g.* FROM goals g JOIN users u ON g.employee_id = u.id WHERE u.manager_id = $1`;
      params = [req.user.id];
    } else {
      goalsQuery = 'SELECT * FROM goals';
      params = [];
    }
    
    const goals = await db.query(goalsQuery, params);
    const totalGoals = goals.rows.length;
    const completed = goals.rows.filter(g => g.actual_value >= g.target_value).length;
    const completionRate = totalGoals ? (completed / totalGoals) * 100 : 0;
    
    res.json({
      stats: {
        totalGoals,
        completed,
        completionRate: Math.round(completionRate),
        pendingApprovals: goals.rows.filter(g => g.status === 'pending').length
      },
      recentGoals: goals.rows.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ROUTES ============
app.get('/api/admin/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, email, full_name, role, department, created_at FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users', authenticate, authorize('admin'), async (req, res) => {
  const { email, password, fullName, role, managerId, department } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const result = await db.query(
      'INSERT INTO users (email, password, full_name, role, manager_id, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, role',
      [email, hashedPassword, fullName, role, managerId, department]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/goals/:id/unlock', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query('UPDATE goals SET status = $1 WHERE id = $2 RETURNING *', ['draft', req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/audit', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, u.full_name as user_name 
      FROM audit_log a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});