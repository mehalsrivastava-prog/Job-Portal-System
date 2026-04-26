const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});

const db = mysql.createPool({
  host: "interchange.proxy.rlwy.net",
  port: 21480,
  user: "root",
  password: "",
  database: "job_portal",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("DB connection failed:", err);
    return;
  }
  console.log("MySQL Pool Connected");
  connection.release();
});

app.get("/", (req, res) => {
  res.send("Server running 🚀");
});

app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  db.query(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [name, email, password],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.json({ success: false, message: "Email exists" });
        }
        return res.json({ success: false });
      }

      res.json({ success: true });
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    (err, results) => {

      if (err || results.length === 0) {
        return res.json({ success: false });
      }

      const user = results[0];

      if (user.password_hash === password) {
        return res.json({
          success: true,
          user_id: user.user_id   // 🔥 IMPORTANT
        });
      }

      res.json({ success: false });
    }
  );
});

app.get("/jobs", (req, res) => {
  db.query("SELECT * FROM jobs", (err, results) => {
    if (err) return res.status(500).send("Error fetching jobs");
    res.json(results);
  });
});

app.post("/apply", (req, res) => {
  const { user_id, job_id } = req.body;

  db.query(
    "INSERT INTO applications (user_id, job_id, status) VALUES (?, ?, 'applied')",
    [user_id, job_id],
    (err, result) => {

      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.json({
            success: false,
            message: "Already applied"
          });
        }

        return res.status(500).send("Error applying");
      }

      const applicationId = result.insertId;

  
      db.query(
        "INSERT INTO application_logs (application_id, status, updated_at) VALUES (?, 'applied', CURDATE())",
        [applicationId],
        (err2) => {
          if (err2) console.log("Log insert error:", err2);
        }
      );

      res.json({
        success: true,
        message: "Applied successfully"
      });
    }
  );
});

app.get("/companies", (req, res) => {
  db.query("SELECT * FROM companies", (err, results) => {
    if (err) return res.status(500).send("Error fetching companies");
    res.json(results);
  });
});

app.get("/dashboard/stats/:userId", (req, res) => {
  const userId = req.params.userId;

  db.query(
    "SELECT COUNT(*) AS total FROM applications WHERE user_id = ?",
    [userId],
    (err, result) => {

      if (err) return res.status(500).send(err);

      const stats = {
        total_applications: result[0].total,
        total_jobs: result[0].total
      };

      db.query(
        `SELECT COUNT(DISTINCT j.company_id) AS total_companies
         FROM applications a
         JOIN jobs j ON a.job_id = j.job_id
         WHERE a.user_id = ?`,
        [userId],
        (err, compResult) => {

          if (err) return res.status(500).send(err);

          stats.total_companies = compResult[0].total_companies;
          res.json(stats);
        }
      );
    }
  );
});


app.get("/dashboard/recent-applications/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT 
      j.title,
      c.company_name,
      a.status,
      a.applied_at
    FROM applications a
    JOIN jobs j ON a.job_id = j.job_id
    JOIN companies c ON j.company_id = c.company_id
    WHERE a.user_id = ?
    ORDER BY a.application_id DESC
    LIMIT 5
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).send("Error fetching applications");
    res.json(results);
  });
});

app.get('/profile/:id', (req, res) => {
  const userId = req.params.id;

  db.query("SELECT name FROM users WHERE user_id = ?", [userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error");
    }

    if (result.length === 0) {
      return res.json({ name: "User not found" });
    }

    db.query(`
      SELECT s.skill_name
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.skill_id
      WHERE us.user_id = ?
    `, [userId], (err2, skillsResult) => {

      if (err2) return res.status(500).send(err2);

      const skills = skillsResult.map(s => s.skill_name);

      res.json({
        name: result[0].name,
        skills: skills
      });
    });
  });
});

app.get('/recommended-jobs/:id', (req, res) => {
  const userId = req.params.id;

  const query = `
    SELECT 
      j.job_id,
      j.title,
      c.company_name,
      js.skill_id,
      s.skill_name

    FROM jobs j
    JOIN job_skills js ON j.job_id = js.job_id
    JOIN skills s ON js.skill_id = s.skill_id
    JOIN companies c ON j.company_id = c.company_id
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    db.query(
      "SELECT skill_id FROM user_skills WHERE user_id = ?",
      [userId],
      (err2, userSkillsRes) => {
        if (err2) return res.status(500).send(err2);

        const userSkills = userSkillsRes.map(s => s.skill_id);

        const jobsMap = {};

        results.forEach(row => {
          if (!jobsMap[row.job_id]) {
            jobsMap[row.job_id] = {
              job_id: row.job_id,
              title: row.title,
              company_name: row.company_name,
              total_skills: 0,
              matched_skills: 0,
              missing_skills: [],
              matched_skill_names: []
            };
          }

          const job = jobsMap[row.job_id];
          job.total_skills++;

          if (userSkills.includes(row.skill_id)) {
            job.matched_skills++;
            job.matched_skill_names.push(row.skill_name);
          } else {
            job.missing_skills.push(row.skill_name);
          }
        });


        const jobs = Object.values(jobsMap)
          .map(job => ({
            ...job,
            match_score: Math.round(
              (job.matched_skills / job.total_skills) * 100
            )
          }))
          .filter(job => job.matched_skills > 0)
          .sort((a, b) => b.match_score - a.match_score)
          .slice(0, 5);

        res.json(jobs);
      }
    );
  });
});
app.post('/save-skills', (req, res) => {
  const { user_id, skills } = req.body;

  if (!user_id || !skills) {
    return res.status(400).json({ error: "Missing data" });
  }


  const query = `
    SELECT skill_id, skill_name 
    FROM skills 
    WHERE skill_name IN (?)
  `;

  db.query(query, [skills], (err, results) => {
    if (err) return res.status(500).send(err);

    const values = results.map(skill => [user_id, skill.skill_id]);

    if (values.length === 0) {
      return res.json({ message: "No valid skills found" });
    }

    const insertQuery = `
      INSERT IGNORE INTO user_skills (user_id, skill_id)
      VALUES ?
    `;

    db.query(insertQuery, [values], (err2) => {
      if (err2) return res.status(500).send(err2);

      res.json({ success: true });
    });
  });
});

app.get('/user-skills/:id', (req, res) => {
  const userId = req.params.id;

  db.query(
    "SELECT * FROM user_skills WHERE user_id = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).send(err);

      res.json(results); 
    }
  );
});

app.post('/mark-learned', (req, res) => {
  const { user_id, skill_name } = req.body;

  const query = `
    INSERT INTO user_skills (user_id, skill_id)
    SELECT ?, skill_id FROM skills
    WHERE skill_name = ?
  `;

  db.query(query, [user_id, skill_name], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.send("Already learned ✅");
      }
      return res.status(500).send(err);
    }

    res.send("Skill learned 🚀");
  });
});

app.get("/search-jobs", (req, res) => {
  const search = req.query.q || "";
  console.log("Search query:", search);
  const query = `
    SELECT j.job_id, j.title, j.location, c.company_name
    FROM jobs j
    JOIN companies c ON j.company_id = c.company_id
    WHERE 
      j.title LIKE ? OR 
      c.company_name LIKE ? OR 
      j.location LIKE ?
  `;

  const value = `%${search}%`;

  db.query(query, [value, value, value], (err, results) => {
    if (err) return res.status(500).send("Error searching jobs");
    res.json(results);
  });
});

app.get("/top-jobs", (req, res) => {
  const sql = `
    SELECT title, salary
    FROM jobs
    ORDER BY salary DESC
    LIMIT 5
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

app.get("/top-companies", (req, res) => {
  const sql = `
    SELECT c.company_name, COUNT(j.job_id) AS total_jobs
    FROM companies c
    JOIN jobs j ON c.company_id = j.company_id
    GROUP BY c.company_name
    ORDER BY total_jobs DESC
    LIMIT 5
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(result);
  });
});

app.get("/company-dashboard/:company_id", (req, res) => {
  const companyId = req.params.company_id;

  const sql = `
    SELECT j.job_id, j.title, j.salary, j.location,
           u.user_id, u.name AS user_name,
           COUNT(*) AS match_score
    FROM jobs j
    LEFT JOIN job_skills js ON j.job_id = js.job_id
    LEFT JOIN user_skills us ON js.skill_id = us.skill_id
    LEFT JOIN users u ON us.user_id = u.user_id
    WHERE j.company_id = ?
    GROUP BY j.job_id, u.user_id
    ORDER BY j.job_id, match_score DESC
  `;

  db.query(sql, [companyId], (err, result) => {
    if (err) return res.status(500).json(err);

    const jobs = {};

    result.forEach(row => {
      if (!jobs[row.job_id]) {
        jobs[row.job_id] = {
          job_id: row.job_id,
          title: row.title,
          salary: row.salary,
          location: row.location,
          candidates: []
        };
      }

      if (row.user_id && jobs[row.job_id].candidates.length < 5) {
        jobs[row.job_id].candidates.push({
          name: row.user_name,
          score: row.match_score
        });
      }
    });

    res.json(Object.values(jobs));
  });
});

app.post("/company-login", (req, res) => {
  const { email, password } = req.body;

  const sql = `
    SELECT company_id, company_name
    FROM companies
    WHERE email = ? AND password_hash = ?
  `;

  db.query(sql, [email, password], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      res.json({
        success: true,
        company_id: result[0].company_id,
        company_name: result[0].company_name
      });
    } else {
      res.json({ success: false });
    }
  });
});

app.post("/company-signup", (req, res) => {
  const { company_name, email, password, location } = req.body;

  const sql = `
    INSERT INTO companies (company_name, email, password_hash, location)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [company_name, email, password, location], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ success: false, message: err.message });
    }

    res.json({ success: true });
  });
});

app.get("/all-skills", (req, res) => {
  db.query("SELECT * FROM skills", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

app.get("/company/:id/jobs", (req, res) => {
  db.query(
    "SELECT * FROM jobs WHERE company_id = ?",
    [req.params.id],
    (err, result) => res.json(result)
  );
});

app.post("/add-job", (req, res) => {
  console.log(" ADD JOB HIT");

  const { company_id, title, salary, location, skills } = req.body;

  db.query(
    `INSERT INTO jobs (company_id, title, salary, location)
     VALUES (?, ?, ?, ?)`,
    [company_id, title, salary, location],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.status(500).json({ success: false });
      }

      const jobId = result.insertId;

      skills.forEach(skillName => {

        db.query(
          "SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(?)",
          [skillName],
          (err2, res2) => {

            if (err2) {
              console.log(err2);
              return;
            }

            if (res2.length === 0) {

              db.query(
                "INSERT INTO skills (skill_name) VALUES (LOWER(?))",
                [skillName],
                (err3, res3) => {

                  if (err3) {
                    console.log("Skill insert error:", err3);
                    return;
                  }

                  const newSkillId = res3.insertId;

                  db.query(
                    "INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)",
                    [jobId, newSkillId],
                    (err4) => {
                      if (err4) console.log("Insert job_skill error:", err4);
                    }
                  );
                }
              );

            } else {

              const skillId = res2[0].skill_id;

              db.query(
                "INSERT INTO job_skills (job_id, skill_id) VALUES (?, ?)",
                [jobId, skillId],
                (err3) => {
                  if (err3) console.log("Insert job_skill error:", err3);
                }
              );
            }

          }
        );

      });

      res.json({ success: true });
    }
  );
});

app.get("/company-full-dashboard/:company_id", (req, res) => {
  const companyId = req.params.company_id;

  const query = `
  SELECT 
    j.job_id,
    j.title,
    j.location,
    j.salary,

    u.user_id,
    u.name,

    MAX(a.application_id) AS application_id,
    MAX(a.status) AS status,

    COUNT(us.skill_id) AS matched_skills,
    COUNT(js.skill_id) AS total_skills

  FROM jobs j

  LEFT JOIN applications a ON j.job_id = a.job_id
  LEFT JOIN users u ON a.user_id = u.user_id

  LEFT JOIN job_skills js ON j.job_id = js.job_id
  LEFT JOIN user_skills us 
    ON js.skill_id = us.skill_id 
    AND us.user_id = u.user_id

  WHERE j.company_id = ?

  GROUP BY 
    j.job_id, j.title, j.location, j.salary,
    u.user_id, u.name
`;

  db.query(query, [companyId], (err, results) => {
    if (err) return res.status(500).send(err);

    const jobs = {};

    results.forEach(row => {
      if (!jobs[row.job_id]) {
        jobs[row.job_id] = {
          job_id: row.job_id,
          title: row.title,
          location: row.location,
          salary: row.salary,
          applicants: [],
          topCandidates: []
        };
      }

      if (row.user_id) {
        const score = row.total_skills > 0
          ? Math.round((row.matched_skills / row.total_skills) * 100)
          : 0;

        jobs[row.job_id].applicants.push({
          application_id: row.application_id,
          name: row.name,
          status: row.status,
          score: score
        });
      }
    });

    Object.values(jobs).forEach(job => {
      job.applicants.sort((a, b) => b.score - a.score);
      job.topCandidates = job.applicants.slice(0, 5);
    });

    res.json(Object.values(jobs));
  });
});

app.post("/update-status", (req, res) => {
  const { application_id, status } = req.body;

  db.query(
    "UPDATE applications SET status = ? WHERE application_id = ?",
    [status, application_id],
    (err) => {
      if (err) return res.status(500).send(err);

      db.query(
        "INSERT INTO application_logs (application_id, status, updated_at) VALUES (?, ?, CURDATE())",
        [application_id, status]
      );

      res.json({ success: true });
    }
  );
});

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
