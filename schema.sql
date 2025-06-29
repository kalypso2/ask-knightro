CREATE TABLE IF NOT EXISTS courses (
  code          TEXT PRIMARY KEY,
  title         TEXT,
  description   TEXT,
  credits       INTEGER,
  prereqs       TEXT,
  coreqs        TEXT,
  notes         TEXT,
  catalog_year  INTEGER
);

CREATE VIRTUAL TABLE IF NOT EXISTS courses_fts
  USING fts5(code, title, description, content='courses', content_rowid='rowid');
