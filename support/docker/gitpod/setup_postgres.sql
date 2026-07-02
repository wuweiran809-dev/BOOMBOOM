create database boomboom_dev;
create user boomboom password 'boomboom';
grant all privileges on database boomboom_dev to boomboom;
\c boomboom_dev
CREATE EXTENSION pg_trgm;
CREATE EXTENSION unaccent;
