-- =========================================
-- JOB PORTAL DBMS - QUERIES FILE
-- =========================================

-- 🔹 1. View all users
SELECT * FROM Users;

-- 🔹 2. View all jobs
SELECT * FROM Jobs;

-- 🔹 3. View all companies
SELECT * FROM Companies;

-- 🔹 4. View all applications
SELECT * FROM Applications;


-- =========================================
-- 🔹 BASIC OPERATIONS (CRUD)
-- =========================================

-- Insert a new user
INSERT INTO users(name,email) VALUES ('Test User', 'test@gmail.com');



-- Delete an application
DELETE FROM Applications
WHERE application_id = 5;


-- =========================================
-- 🔹 FILTER QUERIES
-- =========================================

-- Jobs with salary greater than 10 LPA
SELECT * FROM Jobs
WHERE salary > 1000000;

-- Jobs in Bangalore
SELECT * FROM Jobs
WHERE location = 'Bangalore';




-- =========================================
-- 🔹 JOIN QUERIES (VERY IMPORTANT)
-- =========================================

-- Show which user applied to which job
SELECT u.name, j.title, a.status
FROM Users u
JOIN Applications a ON u.user_id = a.user_id
JOIN Jobs j ON a.job_id = j.job_id;

-- Show jobs with company names
SELECT j.title, c.company_name, j.location
FROM Jobs j
JOIN Companies c ON j.company_id = c.company_id;


-- =========================================
-- 🔹 AGGREGATION QUERIES
-- =========================================

-- Count applications per job
SELECT j.title, COUNT(a.application_id) AS total_applications
FROM Jobs j
LEFT JOIN Applications a ON j.job_id = a.job_id
GROUP BY j.title;

-- Average salary of jobs
SELECT title, AVG(salary) AS avg_salary FROM Jobs
group by title;

-- Total number of users
SELECT COUNT(*) AS total_users FROM Users;


-- =========================================
-- 🔹 ORDERING & LIMIT
-- =========================================

-- Top 5 highest paying jobs
SELECT title, salary
FROM Jobs
ORDER BY salary DESC
LIMIT 5;


-- =========================================
-- 🔹 SUBQUERIES (IMPORTANT)
-- =========================================

-- Users who applied for highest paying job
SELECT name
FROM Users
WHERE user_id IN (
    SELECT user_id
    FROM Applications
    WHERE job_id = (
        SELECT job_id FROM Jobs ORDER BY salary DESC LIMIT 1
    )
);


-- =========================================
-- 🔹 EXISTS QUERY
-- =========================================

-- Users who have applied to at least one job
SELECT name
FROM Users u
WHERE EXISTS (
    SELECT 1 FROM Applications a WHERE u.user_id = a.user_id
);


-- =========================================
-- 🔹 GROUP BY + HAVING
-- =========================================

-- Companies with more than 3 job postings
SELECT company_id, COUNT(*) AS total_jobs
FROM Jobs
GROUP BY company_id
HAVING COUNT(*) > 3;


-- =========================================
-- 🔹 REAL-WORLD QUERIES (PROJECT LEVEL)
-- =========================================

-- Find all selected candidates
SELECT u.name, j.title
FROM Users u
JOIN Applications a ON u.user_id = a.user_id
JOIN Jobs j ON a.job_id = j.job_id
WHERE a.status = 'Offer';

-- Find jobs a particular user applied for
SELECT j.title, a.status
FROM Applications a
JOIN Jobs j ON a.job_id = j.job_id
WHERE a.user_id = 1;

-- Find most applied job
SELECT j.title, COUNT(a.application_id) AS total
FROM Jobs j
JOIN Applications a ON j.job_id = a.job_id
GROUP BY j.title
ORDER BY total DESC
LIMIT 1;

-- =========================================
-- JOB PORTAL DBMS - QUERIES FILE
-- =========================================



-- =========================================
-- 🔹 BASIC OPERATIONS (CRUD)
-- =========================================

-- Insert a new user
INSERT INTO Users(name,email) VALUES ('Test User', 'test@gmail.com');


-- Delete an application
DELETE FROM Applications
WHERE application_id = 5;


-- =========================================
-- 🔹 FILTER QUERIES
-- =========================================

-- Jobs with salary greater than 10 LPA
SELECT * FROM Jobs
WHERE salary > 1000000;

-- Jobs in Bangalore
SELECT * FROM Jobs
WHERE location = 'Bangalore';


-- =========================================
-- 🔹 JOIN QUERIES (VERY IMPORTANT)
-- =========================================

-- Show which user applied to which job
SELECT u.name, j.title, a.status
FROM Users u
JOIN Applications a ON u.user_id = a.user_id
JOIN Jobs j ON a.job_id = j.job_id;

-- Show jobs with company names
SELECT j.title, c.company_name, j.location
FROM Jobs j
JOIN Companies c ON j.company_id = c.company_id;


-- =========================================
-- 🔹 AGGREGATION QUERIES
-- =========================================

-- Count applications per job
SELECT j.title, COUNT(a.application_id) AS total_applications
FROM Jobs j
LEFT JOIN Applications a ON j.job_id = a.job_id
GROUP BY j.title;

-- Average salary of jobs
SELECT title, AVG(salary) AS avg_salary FROM Jobs
group by title;

-- Total number of users
SELECT COUNT(*) AS total_users FROM Users;


-- =========================================
-- 🔹 ORDERING & LIMIT
-- =========================================

-- Top 5 highest paying jobs
SELECT title, salary
FROM Jobs
ORDER BY salary DESC
LIMIT 5;


-- =========================================
-- 🔹 SUBQUERIES (IMPORTANT)
-- =========================================

-- Users who applied for highest paying job
SELECT name
FROM Users
WHERE user_id IN (
    SELECT user_id
    FROM Applications
    WHERE job_id = (
        SELECT job_id FROM Jobs ORDER BY salary DESC LIMIT 1
    )
);


-- =========================================
-- 🔹 EXISTS QUERY
-- =========================================

-- Users who have applied to at least one job
SELECT name
FROM Users u
WHERE EXISTS (
    SELECT 1 FROM Applications a WHERE u.user_id = a.user_id
);


-- =========================================
-- 🔹 GROUP BY + HAVING
-- =========================================

-- Companies with more than 3 job postings
SELECT company_id, COUNT(*) AS total_jobs
FROM Jobs
GROUP BY company_id
HAVING COUNT(*) > 3;


-- =========================================
-- 🔹 REAL-WORLD QUERIES (PROJECT LEVEL)
-- =========================================






-- Companies with most job postings
SELECT c.company_name, COUNT(j.job_id) AS total_jobs
FROM Companies c
JOIN Jobs j ON c.company_id = j.company_id
GROUP BY c.company_name
ORDER BY total_jobs DESC;

-- Jobs with no applications
SELECT j.title
FROM Jobs j
LEFT JOIN Applications a ON j.job_id = a.job_id
WHERE a.application_id IS NULL;

-- recently applied jobs
SELECT *
FROM Applications
WHERE applied_date >= CURDATE() - INTERVAL 7 DAY;

-- Highest, lowest, Average
SELECT 
    MAX(salary) AS highest,
    MIN(salary) AS lowest,
    AVG(salary) AS average
FROM Jobs;

-- Most demanded skills
SELECT s.skill_name, COUNT(*) AS demand
FROM job_skills, skills as s
GROUP BY s.skill_id
ORDER BY demand DESC;

-- Application success rate
SELECT status, COUNT(*) AS total
FROM applications
GROUP BY status;

-- users who never applied
SELECT name
FROM Users
WHERE user_id NOT IN (
    SELECT DISTINCT user_id FROM Applications
);

-- Full report: user + job + company
SELECT u.name, j.title, c.company_name, a.status
FROM Applications a
JOIN Users u ON a.user_id = u.user_id
JOIN Jobs j ON a.job_id = j.job_id
JOIN Companies c ON j.company_id = c.company_id;




-- Top hiring locations
SELECT location, COUNT(*) AS total_jobs
FROM Jobs
GROUP BY location
ORDER BY total_jobs DESC;

