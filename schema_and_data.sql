PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id TEXT,
  github_username TEXT,
  github_token TEXT,
  google_id TEXT,
  username TEXT NOT NULL,
  email TEXT,
  password_hash TEXT,
  avatar_url TEXT,
  github_repo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO users VALUES(1,NULL,NULL,NULL,'google_12345','Tom Google','tom@google.com',NULL,'https://lh3.googleusercontent.com/a/ACg8ocL...',NULL,'2026-05-12T04:18:30.265Z','2026-05-13T08:27:49.713Z');
INSERT INTO users VALUES(2,NULL,NULL,NULL,NULL,'Tom','tom@example.com','ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',NULL,NULL,'2026-05-12T04:18:30.454Z','2026-05-12T09:50:09.832Z');
INSERT INTO users VALUES(3,NULL,NULL,NULL,NULL,'Tom','tom@tom.com','bf91df79a0c1db76d19817bf00d30631981b7d11bfb85a821e6527e62542c801',NULL,NULL,'2026-05-12T04:18:30.614Z','2026-05-12T04:18:30.614Z');
INSERT INTO users VALUES(4,NULL,NULL,NULL,NULL,'Jeff','jef@jef.com','2e0b8d61fa2a6959d254b6ff5d0fb512249329097336a35568089933b49abdde',NULL,NULL,'2026-05-12T04:18:30.788Z','2026-05-12T04:18:30.788Z');
CREATE TABLE timer_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client TEXT NOT NULL,
    project TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    device_info TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
INSERT INTO timer_sessions VALUES(1,1,'kyb','glossa','ui fix','completed','2026-05-06T09:41:07.391Z','2026-05-06T09:44:46.692Z',219,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','2026-05-12T04:19:24.927Z','2026-05-12T04:19:24.927Z');
INSERT INTO timer_sessions VALUES(2,1,'GitHub','Issues','#18 sample test 2','completed','2026-05-06T09:46:54.086Z','2026-05-06T11:30:32.224Z',6218,'{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','2026-05-12T04:19:25.081Z','2026-05-12T04:19:25.081Z');
INSERT INTO timer_sessions VALUES(3,2,'GitHub','Issues','#1 sample test','completed','2026-05-06T11:26:03.029Z','2026-05-06T11:26:49.029Z',46,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","platform":"Win32"}','2026-05-12T04:19:25.269Z','2026-05-12T04:19:25.269Z');
INSERT INTO timer_sessions VALUES(4,1,'GitHub','Issues','#2 Testing GitHub API for issue creation 2','completed','2026-05-06T12:41:56.131Z','2026-05-06T17:40:23.658Z',17907,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','2026-05-12T04:19:25.448Z','2026-05-12T04:19:25.448Z');
INSERT INTO timer_sessions VALUES(5,2,'GitHub','Issues','#1 sample test','completed','2026-05-06T12:50:04.121Z','2026-05-06T17:41:46.888Z',17502,'{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','2026-05-12T04:19:25.726Z','2026-05-12T04:19:25.726Z');
INSERT INTO timer_sessions VALUES(6,2,'GitHub','Issues','#1 Feature: GitHub Issues Metadata Listing','completed','2026-05-07T04:44:22.255Z','2026-05-12T10:25:18.588Z',0,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','2026-05-12T04:19:25.884Z','2026-05-12T10:25:18.588Z');
INSERT INTO timer_sessions VALUES(7,1,'GitHub','Issues','#18 sample test 2','completed','2026-05-07T07:01:45.864Z','2026-05-07T07:01:50.751Z',38,'{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','2026-05-12T04:19:26.025Z','2026-05-12T04:19:26.025Z');
INSERT INTO timer_sessions VALUES(8,1,'GitHub','Issues','#17 sample test','completed','2026-05-07T06:37:15.044Z','2026-05-07T07:01:34.520Z',1459,'{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','2026-05-12T04:19:26.159Z','2026-05-12T04:19:26.159Z');
INSERT INTO timer_sessions VALUES(9,1,'GitHub','Issues','#13 Mobile testing 5','completed','2026-05-07T07:01:53.086Z','2026-05-07T08:43:26.721Z',6093,'{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','2026-05-12T04:19:26.332Z','2026-05-12T04:19:26.332Z');
INSERT INTO timer_sessions VALUES(10,1,'GitHub','Issues','#1 sample test','completed','2026-05-07T08:43:44.332Z','2026-05-07T08:47:49.240Z',244,'{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','2026-05-12T04:19:26.503Z','2026-05-12T04:19:26.503Z');
INSERT INTO timer_sessions VALUES(11,1,'GitHub','Issues','#1 sample test','completed','2026-05-07T08:47:53.738Z','2026-05-07T11:27:29.674Z',9575,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","platform":"Win32"}','2026-05-12T04:19:26.669Z','2026-05-12T04:19:26.669Z');
INSERT INTO timer_sessions VALUES(12,1,'GitHub','Issues','#7 Feature: Keyboard Shortcuts and Command Palette','completed','2026-05-07T11:45:41.485Z','2026-05-07T14:35:11.017Z',10169,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','2026-05-12T04:19:26.845Z','2026-05-12T04:19:26.845Z');
INSERT INTO timer_sessions VALUES(13,1,'GitHub','Issues','#1 Testing GitHub API for issue creation','completed','2026-05-07T14:35:31.192Z','2026-05-11T09:31:10.816Z',327339,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','2026-05-12T04:19:27.003Z','2026-05-12T04:19:27.003Z');
INSERT INTO timer_sessions VALUES(14,1,'GitHub','Issues','#19 sample test 2','completed','2026-05-12T09:35:06.978Z','2026-05-12T10:25:18.588Z',0,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','2026-05-12T09:35:06.979Z','2026-05-12T10:25:18.588Z');
INSERT INTO timer_sessions VALUES(15,1,'GitHub','Issues','#19 sample test 2','completed','2026-05-12T11:15:12.574Z','2026-05-12T12:02:14.725Z',2822,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','2026-05-12T11:15:12.576Z','2026-05-12T12:02:14.730Z');
INSERT INTO timer_sessions VALUES(16,1,'GitHub','Issues','#19 sample test 2','completed','2026-05-12T12:04:22.587Z','2026-05-12T18:36:24.527Z',23521,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','2026-05-12T12:04:22.588Z','2026-05-12T18:36:24.532Z');
INSERT INTO timer_sessions VALUES(17,1,'GitHub','Issues','#18 sample test 2','completed','2026-05-12T18:36:37.094Z','2026-05-12T18:40:34.634Z',237,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','2026-05-12T18:36:37.095Z','2026-05-12T18:40:34.635Z');
INSERT INTO timer_sessions VALUES(18,1,'GitHub','Issues','#1 Testing GitHub API for issue creation','completed','2026-05-12T18:41:09.979Z','2026-05-13T04:36:16.541Z',35706,'{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','2026-05-12T18:41:09.979Z','2026-05-13T04:36:16.541Z');
CREATE TABLE timer_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'complete', 'discard')),
    timestamp TEXT NOT NULL,
    device_info TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES timer_sessions(id)
  );
INSERT INTO timer_events VALUES(1,1,'start','2026-05-06T09:41:07.395Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(2,1,'complete','2026-05-06T09:44:46.696Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0"}','{"action":"complete_timer","final_duration":219}');
INSERT INTO timer_events VALUES(3,2,'start','2026-05-06T09:46:54.087Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(4,3,'start','2026-05-06T11:26:03.030Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(5,3,'complete','2026-05-06T11:26:49.031Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}','{"action":"complete_timer","final_duration":46}');
INSERT INTO timer_events VALUES(6,2,'complete','2026-05-06T11:30:32.226Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"}','{"action":"complete_timer","final_duration":6218}');
INSERT INTO timer_events VALUES(7,4,'start','2026-05-06T12:41:56.133Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(8,5,'start','2026-05-06T12:50:04.122Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(9,4,'complete','2026-05-06T17:40:23.674Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0"}','{"action":"complete_timer","final_duration":17907}');
INSERT INTO timer_events VALUES(10,5,'complete','2026-05-06T17:41:46.891Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0"}','{"action":"complete_timer","final_duration":17502}');
INSERT INTO timer_events VALUES(11,6,'start','2026-05-07T04:44:22.259Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(12,7,'start','2026-05-07T06:36:36.516Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(13,7,'pause','2026-05-07T06:37:10.583Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"}','{"action":"pause_timer","duration_added":34,"total_duration":34}');
INSERT INTO timer_events VALUES(14,8,'start','2026-05-07T06:37:15.046Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(15,8,'complete','2026-05-07T07:01:34.523Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"}','{"action":"complete_timer","final_duration":1459}');
INSERT INTO timer_events VALUES(16,7,'resume','2026-05-07T07:01:45.866Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"}','{"action":"resume_timer"}');
INSERT INTO timer_events VALUES(17,7,'complete','2026-05-07T07:01:50.752Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"}','{"action":"complete_timer","final_duration":38}');
INSERT INTO timer_events VALUES(18,9,'start','2026-05-07T07:01:53.088Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(19,9,'complete','2026-05-07T08:43:26.723Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36"}','{"action":"complete_timer","final_duration":6093}');
INSERT INTO timer_events VALUES(20,10,'start','2026-05-07T08:43:44.333Z','{"browser":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36","platform":"Linux armv81"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(21,10,'complete','2026-05-07T08:47:49.241Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"}','{"action":"complete_timer","final_duration":244}');
INSERT INTO timer_events VALUES(22,11,'start','2026-05-07T08:47:53.739Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(23,11,'complete','2026-05-07T11:27:29.695Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0"}','{"action":"complete_timer","final_duration":9575}');
INSERT INTO timer_events VALUES(24,12,'start','2026-05-07T11:45:41.486Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(25,12,'complete','2026-05-07T14:35:11.019Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0"}','{"action":"complete_timer","final_duration":10169}');
INSERT INTO timer_events VALUES(26,13,'start','2026-05-07T14:35:31.194Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(27,13,'complete','2026-05-11T09:31:10.822Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"}','{"action":"complete_timer","final_duration":327339}');
INSERT INTO timer_events VALUES(28,14,'start','2026-05-12T09:35:07.297Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(29,15,'start','2026-05-12T11:15:12.888Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(30,15,'complete','2026-05-12T12:02:15.006Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"}','{"action":"complete_timer","final_duration":2822}');
INSERT INTO timer_events VALUES(31,16,'start','2026-05-12T12:04:22.786Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(32,16,'complete','2026-05-12T18:36:24.996Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"}','{"action":"complete_timer","final_duration":23521}');
INSERT INTO timer_events VALUES(33,17,'start','2026-05-12T18:36:37.276Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(34,17,'complete','2026-05-12T18:40:35.263Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"}','{"action":"complete_timer","final_duration":237}');
INSERT INTO timer_events VALUES(35,18,'start','2026-05-12T18:41:10.159Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0","platform":"Win32"}','{"action":"start_timer"}');
INSERT INTO timer_events VALUES(36,18,'complete','2026-05-13T04:36:16.704Z','{"browser":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0"}','{"action":"complete_timer","final_duration":35706}');
PRAGMA writable_schema=ON;
CREATE TABLE IF NOT EXISTS sqlite_sequence(name,seq);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',10);
INSERT INTO sqlite_sequence VALUES('timer_sessions',18);
INSERT INTO sqlite_sequence VALUES('timer_events',36);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_timer_sessions_user_id ON timer_sessions(user_id);
CREATE INDEX idx_timer_sessions_status ON timer_sessions(status);
CREATE INDEX idx_timer_events_session_id ON timer_events(session_id);
PRAGMA writable_schema=OFF;
COMMIT;
