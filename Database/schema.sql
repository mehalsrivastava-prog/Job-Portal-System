CREATE DATABASE job_portal;
USE job_portal;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    job_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    salary DECIMAL(10,2),
    location VARCHAR(255),
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id)
    REFERENCES companies(company_id)
    ON DELETE CASCADE
);

CREATE TABLE applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    job_id INT,
    status VARCHAR(50) DEFAULT 'applied',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

    FOREIGN KEY (job_id)
    REFERENCES jobs(job_id)
    ON DELETE CASCADE,

    UNIQUE (user_id, job_id) -- functional dependency
);

CREATE TABLE skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE
);

CREATE TABLE user_skills (
    user_id INT,
    skill_id INT,

    PRIMARY KEY (user_id, skill_id),

    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

    FOREIGN KEY (skill_id)
    REFERENCES skills(skill_id)
    ON DELETE CASCADE
);

CREATE TABLE job_skills (
    job_id INT,
    skill_id INT,

    PRIMARY KEY (job_id, skill_id),

    FOREIGN KEY (job_id)
    REFERENCES jobs(job_id)
    ON DELETE CASCADE,

    FOREIGN KEY (skill_id)
    REFERENCES skills(skill_id)
    ON DELETE CASCADE
);

CREATE TABLE application_logs (
    log_id INT PRIMARY KEY,
    application_id INT NOT NULL,

    status VARCHAR(50) NOT NULL,
    updated_at DATE NOT NULL,

    FOREIGN KEY (application_id)
    REFERENCES applications(application_id)
    ON DELETE CASCADE
);
