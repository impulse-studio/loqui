use rusqlite::{Connection, Result};
use std::fmt::Write;
use std::path::PathBuf;

use super::config::ConfigStore;
use super::profiles::{ProfileRow, ProfileStore};
use super::secrets::SecretStore;
use super::transcripts::{ActivityRow, TranscriptRow, TranscriptStore};
use crate::error::AppError;
use crate::security::secrets::{self, MasterKey};

pub struct Database {
    conn: Connection,
    master_key: MasterKey,
}

impl Database {
    pub fn new() -> std::result::Result<Self, AppError> {
        let db_path = Self::db_path();
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let master_key = MasterKey::load_or_create()?;
        Ok(Self { conn, master_key })
    }

    fn db_path() -> PathBuf {
        let mut path = dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("com.impulselab.loqui");
        path.push("loqui.db");
        path
    }

    pub fn run_migrations(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS transcripts (
                id TEXT PRIMARY KEY,
                raw_text TEXT NOT NULL,
                refactored_text TEXT,
                app_name TEXT NOT NULL,
                window_title TEXT NOT NULL DEFAULT '',
                profile_id TEXT,
                profile_name TEXT,
                word_count INTEGER NOT NULL DEFAULT 0,
                duration REAL NOT NULL DEFAULT 0,
                words_per_second REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'success',
                error_message TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                system_prompt TEXT NOT NULL DEFAULT '',
                app_mappings TEXT NOT NULL DEFAULT '[]',
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_transcripts_created_at
                ON transcripts(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_transcripts_app_name
                ON transcripts(app_name);
            CREATE INDEX IF NOT EXISTS idx_profiles_is_default
                ON profiles(is_default);
            ",
        )?;

        // V2 migration: add LLM fields to profiles
        let schema_version: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(
                    (SELECT CAST(value AS INTEGER) FROM app_config WHERE key = 'schema_version'),
                    1
                )",
                [],
                |row| row.get(0),
            )
            .unwrap_or(1);

        if schema_version < 2 {
            self.conn.execute_batch(
                "ALTER TABLE profiles ADD COLUMN llm_model TEXT NOT NULL DEFAULT '';
                 ALTER TABLE profiles ADD COLUMN context_size INTEGER NOT NULL DEFAULT 4096;
                 INSERT INTO app_config (key, value) VALUES ('schema_version', '2')
                    ON CONFLICT(key) DO UPDATE SET value = '2';",
            )?;
        }

        if schema_version < 3 {
            self.conn.execute_batch(
                "ALTER TABLE profiles ADD COLUMN llm_enabled INTEGER NOT NULL DEFAULT 1;
                 INSERT INTO app_config (key, value) VALUES ('schema_version', '3')
                    ON CONFLICT(key) DO UPDATE SET value = '3';",
            )?;
        }

        if schema_version < 4 {
            self.conn.execute_batch(
                "ALTER TABLE profiles ADD COLUMN llm_provider TEXT NOT NULL DEFAULT 'disabled';
                 UPDATE profiles SET llm_provider = CASE WHEN llm_enabled = 1 THEN 'local' ELSE 'disabled' END;
                 ALTER TABLE transcripts ADD COLUMN llm_provider TEXT NOT NULL DEFAULT '';
                 ALTER TABLE transcripts ADD COLUMN llm_model_used TEXT NOT NULL DEFAULT '';
                 ALTER TABLE transcripts ADD COLUMN llm_input_tokens INTEGER NOT NULL DEFAULT 0;
                 ALTER TABLE transcripts ADD COLUMN llm_output_tokens INTEGER NOT NULL DEFAULT 0;
                 ALTER TABLE transcripts ADD COLUMN llm_cost REAL NOT NULL DEFAULT 0;
                 INSERT INTO app_config (key, value) VALUES ('schema_version', '4')
                    ON CONFLICT(key) DO UPDATE SET value = '4';",
            )?;
        }

        if schema_version < 5 {
            self.conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS secrets (
                     account TEXT PRIMARY KEY,
                     value TEXT NOT NULL
                 );
                 INSERT INTO app_config (key, value) VALUES ('schema_version', '5')
                    ON CONFLICT(key) DO UPDATE SET value = '5';",
            )?;
        }

        Ok(())
    }
}

impl ConfigStore for Database {
    fn get_config(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM app_config WHERE key = ?1")?;
        let mut rows = stmt.query_map([key], |row| row.get::<_, String>(0))?;
        match rows.next() {
            Some(val) => Ok(Some(val?)),
            None => Ok(None),
        }
    }

    fn set_config(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO app_config (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            [key, value],
        )?;
        Ok(())
    }

    fn get_all_config(&self) -> Result<serde_json::Value> {
        let mut stmt = self.conn.prepare("SELECT key, value FROM app_config")?;
        let mut map = serde_json::Map::new();
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (key, value) = row?;
            map.insert(key, serde_json::Value::String(value));
        }
        Ok(serde_json::Value::Object(map))
    }
}

impl TranscriptStore for Database {
    fn get_transcripts(
        &self,
        search: Option<String>,
        filter: Option<String>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<TranscriptRow>> {
        let mut query = "SELECT * FROM transcripts WHERE 1=1".to_string();
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![];

        if let Some(ref s) = search {
            query.push_str(" AND (raw_text LIKE ?1 OR refactored_text LIKE ?1)");
            params.push(Box::new(format!("%{s}%")));
        }

        if let Some(ref f) = filter {
            match f.as_str() {
                "today" => query.push_str(" AND date(created_at) = date('now')"),
                "week" => query.push_str(" AND created_at >= datetime('now', '-7 days')"),
                _ if !f.is_empty() => {
                    let idx = params.len() + 1;
                    let _ = write!(query, " AND app_name = ?{idx}");
                    params.push(Box::new(f.clone()));
                }
                _ => {}
            }
        }

        query.push_str(" ORDER BY created_at DESC");
        let _ = write!(query, " LIMIT {limit} OFFSET {offset}");

        let mut stmt = self.conn.prepare(&query)?;
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            params.iter().map(AsRef::as_ref).collect();
        let rows = stmt.query_map(param_refs.as_slice(), TranscriptRow::from_row)?;
        rows.collect()
    }

    fn get_transcript(&self, id: &str) -> Result<TranscriptRow> {
        self.conn.query_row(
            "SELECT * FROM transcripts WHERE id = ?1",
            [id],
            TranscriptRow::from_row,
        )
    }

    fn save_transcript(&self, t: &TranscriptRow) -> Result<()> {
        self.conn.execute(
            "INSERT INTO transcripts (id, raw_text, refactored_text, app_name, window_title,
             profile_id, profile_name, word_count, duration, words_per_second, status,
             error_message, created_at, llm_provider, llm_model_used, llm_input_tokens,
             llm_output_tokens, llm_cost)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            rusqlite::params![
                t.id,
                t.raw_text,
                t.refactored_text,
                t.app_name,
                t.window_title,
                t.profile_id,
                t.profile_name,
                t.word_count,
                t.duration,
                t.words_per_second,
                t.status,
                t.error_message,
                t.created_at,
                t.llm_provider,
                t.llm_model_used,
                t.llm_input_tokens,
                t.llm_output_tokens,
                t.llm_cost,
            ],
        )?;
        Ok(())
    }

    fn delete_transcript(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM transcripts WHERE id = ?1", [id])?;
        Ok(())
    }

    fn get_transcript_stats(&self) -> Result<serde_json::Value> {
        let total_words: i64 = self.conn.query_row(
            "SELECT COALESCE(SUM(word_count), 0) FROM transcripts WHERE status = 'success'",
            [],
            |row| row.get(0),
        )?;
        let total_transcripts: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM transcripts WHERE status = 'success'",
            [],
            |row| row.get(0),
        )?;
        let avg_wps: f64 = self.conn.query_row(
            "SELECT COALESCE(AVG(words_per_second), 0) FROM transcripts WHERE status = 'success' AND words_per_second > 0",
            [],
            |row| row.get(0),
        )?;
        #[allow(clippy::cast_precision_loss)]
        let time_saved = total_words as f64 / 40.0;

        Ok(serde_json::json!({
            "totalWords": total_words,
            "totalTranscripts": total_transcripts,
            "avgWordsPerSecond": (avg_wps * 10.0).round() / 10.0,
            "timeSavedMinutes": (time_saved * 10.0).round() / 10.0,
        }))
    }

    fn get_activity(&self, days: i64) -> Result<Vec<ActivityRow>> {
        let modifier = format!("-{days} days");
        let mut stmt = self.conn.prepare(
            "SELECT date(created_at) as d, COUNT(*) as c, COALESCE(SUM(word_count), 0) as w
             FROM transcripts
             WHERE status = 'success' AND created_at >= datetime('now', ?1)
             GROUP BY d ORDER BY d ASC",
        )?;
        let rows = stmt.query_map([&modifier], |row| {
            Ok(ActivityRow {
                date: row.get(0)?,
                count: row.get(1)?,
                words: row.get(2)?,
            })
        })?;
        rows.collect()
    }

    fn get_detected_apps(&self) -> Result<Vec<String>> {
        let mut stmt = self
            .conn
            .prepare("SELECT DISTINCT app_name FROM transcripts ORDER BY app_name ASC")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        rows.collect()
    }

    fn get_db_size(&self) -> Result<i64> {
        self.conn.query_row(
            "SELECT page_count * page_size FROM pragma_page_count, pragma_page_size",
            [],
            |row| row.get(0),
        )
    }

    fn prune_transcripts(&self, max_bytes: i64) -> Result<i64> {
        let mut deleted: i64 = 0;
        loop {
            let size = self.get_db_size()?;
            if size <= max_bytes {
                break;
            }
            let changed = self.conn.execute(
                "DELETE FROM transcripts WHERE id IN (
                    SELECT id FROM transcripts ORDER BY created_at ASC LIMIT 50
                )",
                [],
            )?;
            if changed == 0 {
                break;
            }
            deleted += changed as i64;
        }
        if deleted > 0 {
            self.conn.execute_batch("VACUUM")?;
        }
        Ok(deleted)
    }
}

impl ProfileStore for Database {
    fn get_profiles(&self) -> Result<Vec<ProfileRow>> {
        let mut stmt = self
            .conn
            .prepare("SELECT * FROM profiles ORDER BY is_default DESC, name ASC")?;
        let rows = stmt.query_map([], ProfileRow::from_row)?;
        rows.collect()
    }

    fn get_profile(&self, id: &str) -> Result<ProfileRow> {
        self.conn.query_row(
            "SELECT * FROM profiles WHERE id = ?1",
            [id],
            ProfileRow::from_row,
        )
    }

    fn save_profile(&self, p: &ProfileRow) -> Result<()> {
        self.conn.execute(
            "INSERT INTO profiles (id, name, system_prompt, app_mappings, is_default, created_at, updated_at, llm_model, context_size, llm_enabled, llm_provider)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                system_prompt = excluded.system_prompt,
                app_mappings = excluded.app_mappings,
                is_default = excluded.is_default,
                updated_at = excluded.updated_at,
                llm_model = excluded.llm_model,
                context_size = excluded.context_size,
                llm_enabled = excluded.llm_enabled,
                llm_provider = excluded.llm_provider",
            rusqlite::params![
                p.id,
                p.name,
                p.system_prompt,
                p.app_mappings,
                p.is_default,
                p.created_at,
                p.updated_at,
                p.llm_model,
                p.context_size,
                p.llm_enabled,
                p.llm_provider,
            ],
        )?;
        Ok(())
    }

    fn delete_profile(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM profiles WHERE id = ?1", [id])?;
        Ok(())
    }
}

impl Database {
    pub fn clear_all_data(&self) -> Result<()> {
        self.conn.execute_batch(
            "DELETE FROM transcripts;
             DELETE FROM app_config WHERE key != 'onboardingComplete';",
        )
    }
}

impl SecretStore for Database {
    fn save_api_key(&self, account: &str, value: &str) -> std::result::Result<(), AppError> {
        let encoded = secrets::encrypt(&self.master_key, value.as_bytes())?;
        self.conn.execute(
            "INSERT INTO secrets (account, value) VALUES (?1, ?2)
             ON CONFLICT(account) DO UPDATE SET value = excluded.value",
            [account, &encoded],
        )?;
        Ok(())
    }

    fn get_api_key(&self, account: &str) -> std::result::Result<Option<String>, AppError> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM secrets WHERE account = ?1")?;
        let mut rows = stmt.query_map([account], |row| row.get::<_, String>(0))?;
        let Some(encoded) = rows.next().transpose()? else {
            return Ok(None);
        };
        let plaintext = secrets::decrypt(&self.master_key, &encoded)?;
        let value = String::from_utf8(plaintext)
            .map_err(|e| AppError::Secret(format!("invalid utf-8 in stored secret: {e}")))?;
        Ok(Some(value))
    }

    fn delete_api_key(&self, account: &str) -> std::result::Result<(), AppError> {
        self.conn
            .execute("DELETE FROM secrets WHERE account = ?1", [account])?;
        Ok(())
    }

    fn has_api_key(&self, account: &str) -> std::result::Result<bool, AppError> {
        match self.get_api_key(account)? {
            Some(v) => Ok(!v.is_empty()),
            None => Ok(false),
        }
    }
}
