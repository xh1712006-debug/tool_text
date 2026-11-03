--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;
ALTER TABLE IF EXISTS ONLY public.text_tasks DROP CONSTRAINT IF EXISTS text_tasks_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
DROP INDEX IF EXISTS public.ix_users_id;
DROP INDEX IF EXISTS public.ix_users_email;
DROP INDEX IF EXISTS public.ix_text_tasks_id;
DROP INDEX IF EXISTS public.ix_sessions_token;
DROP INDEX IF EXISTS public.ix_sessions_id;
DROP INDEX IF EXISTS public.ix_roles_role_name;
DROP INDEX IF EXISTS public.ix_roles_id;
DROP INDEX IF EXISTS public.ix_ai_presets_platform_code;
DROP INDEX IF EXISTS public.ix_ai_presets_id;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.text_tasks DROP CONSTRAINT IF EXISTS text_tasks_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.ai_presets DROP CONSTRAINT IF EXISTS ai_presets_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.text_tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ai_presets ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.text_tasks_id_seq;
DROP TABLE IF EXISTS public.text_tasks;
DROP SEQUENCE IF EXISTS public.sessions_id_seq;
DROP TABLE IF EXISTS public.sessions;
DROP SEQUENCE IF EXISTS public.roles_id_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.ai_presets_id_seq;
DROP TABLE IF EXISTS public.ai_presets;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_presets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_presets (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    platform_code character varying(50) NOT NULL,
    target_url character varying(255) NOT NULL,
    input_selectors text NOT NULL,
    send_btn_selectors text NOT NULL,
    stop_btn_selectors text NOT NULL,
    notes text,
    is_built_in boolean NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.ai_presets OWNER TO postgres;

--
-- Name: ai_presets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_presets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_presets_id_seq OWNER TO postgres;

--
-- Name: ai_presets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_presets_id_seq OWNED BY public.ai_presets.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    token character varying(512) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: text_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.text_tasks (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    input_text text NOT NULL,
    tuned_text text,
    status character varying(50) NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.text_tasks OWNER TO postgres;

--
-- Name: text_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.text_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.text_tasks_id_seq OWNER TO postgres;

--
-- Name: text_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.text_tasks_id_seq OWNED BY public.text_tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(100),
    role_id integer,
    created_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_presets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_presets ALTER COLUMN id SET DEFAULT nextval('public.ai_presets_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: text_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.text_tasks ALTER COLUMN id SET DEFAULT nextval('public.text_tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_presets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_presets (id, name, platform_code, target_url, input_selectors, send_btn_selectors, stop_btn_selectors, notes, is_built_in, created_at, updated_at) FROM stdin;
1	OpenAI ChatGPT	chatgpt	https://chatgpt.com	#prompt-textarea, textarea[data-id='root'], div[contenteditable='true'], textarea	button[data-testid='send-button'], button[aria-label*='Send'], button[aria-label*='Gửi']	button[data-testid='stop-button'], button[aria-label*='Stop'], button[aria-label*='Dừng'], .result-streaming	Hỗ trợ ChatGPT Free, Plus, Team. Tự động phát hiện streaming.	t	2026-11-02 15:11:51.576531+07	2026-11-02 15:11:51.576531+07
2	Anthropic Claude	claude	https://claude.ai/new	div[contenteditable='true'], div.ProseMirror, textarea	button[aria-label*='Send'], button[aria-label*='Gửi'], button:has(svg)	button[aria-label*='Stop'], button[aria-label*='Dừng']	Hỗ trợ Claude 3.5 Sonnet / Haiku. Nhận diện ProseMirror Rich Text Editor.	t	2026-11-02 15:11:51.576531+07	2026-11-02 15:11:51.576531+07
3	Google Gemini	gemini	https://gemini.google.com/app	div.ql-editor[contenteditable='true'], textarea[aria-label*='prompt'], div[contenteditable='true'], textarea	button[aria-label*='Send prompt'], button.send-button, button[mattooltip*='Send']	button[aria-label*='Stop response'], button[aria-label*='Dừng']	Hỗ trợ Gemini Pro / Advanced với Quill Editor.	t	2026-11-02 15:11:51.576531+07	2026-11-02 15:11:51.576531+07
4	DeepSeek Chat	deepseek	https://chat.deepseek.com	textarea#chat-input, textarea, div[contenteditable='true']	div[role='button']:has(svg), button:has(svg), button[type='submit']	div[role='button'][aria-label*='Stop'], .ds-button--stop, button[aria-label*='Stop']	Hỗ trợ DeepSeek V3 và DeepSeek R1.	t	2026-11-02 15:11:51.576531+07	2026-11-02 15:11:51.576531+07
5	Poe AI	poe	https://poe.com	textarea[class*='ChatMessageInput'], div[contenteditable='true'], textarea	button[class*='ChatMessageSendButton'], button[aria-label*='Send']	button[class*='ChatMessageStopButton'], button[aria-label*='Stop']	Hỗ trợ tất cả các bot tổng hợp trên hệ thống Poe.	t	2026-11-02 15:11:51.576531+07	2026-11-02 15:11:51.576531+07
6	Perplexity AI	perplexity	https://www.perplexity.ai	textarea[placeholder*='Ask'], div[contenteditable='true'], textarea	button[aria-label*='Submit'], button[type='submit']	button[aria-label*='Stop']	Hỗ trợ công cụ tìm kiếm và đối thoại AI Perplexity.	t	2026-11-02 15:11:51.576531+07	2026-11-02 15:11:51.576531+07
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, role_name, description) FROM stdin;
1	USER	Vai trò người dùng thông thường
2	ADMIN	Quản trị viên tối cao với token vĩnh viễn
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, token, user_id, expires_at, created_at) FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjE3OTQyMTIzMDJ9.gx65UHhwSBT1EDgiKqFq26d5MBIrPwJw4cb-TJ60Wto	1	2026-11-09 15:18:22.077396+07	2026-11-02 15:18:22.080214+07
2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyMTA1NDh9.UfvdlYPltDdQAIVnSfu12pMwVJ52R_QPGQWzRUNJD54	3	2126-10-09 16:09:08.954608+07	2026-11-02 16:09:08.954608+07
3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyMTA2MDN9.yH-A7oxA-FfPpKUEKJ4_xROU4NJvoJ8yioRnkWWXfaQ	3	2126-10-09 16:10:03.580574+07	2026-11-02 16:10:03.580574+07
4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyMTA2Mzl9.fhSwffLNt1pZ6_l85OsNX7yZQap0mHcXUsWeoWKfkY4	3	2126-10-09 16:10:39.215396+07	2026-11-02 16:10:39.215396+07
5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyMTA2NjB9.IgbbDIrWzgdlxVgsaMysNXnpz_C4IW3HeUH212Cc44Y	3	2126-10-09 16:11:00.791936+07	2026-11-02 16:11:00.791936+07
6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyMTA3MTB9.Kw7Fiex3HvtOcWiIZYtFQWZMY_Afz0RcOsrj80CWX0E	3	2126-10-09 16:11:50.014795+07	2026-11-02 16:11:50.024003+07
9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyNzU2NTF9.9_1bwXPxoZWd6JU_8DrMFEXqPeKzOEu8ik2OtI8GjXs	3	2126-10-10 10:14:11.452285+07	2026-11-03 10:14:11.453283+07
10	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyNzU2NDl9.9fqtVwoc0AR17fQLPDEM1gaKXUy5UBs3_DNh4QkTUJ4	3	2126-10-10 10:14:09.789235+07	2026-11-03 10:14:10.083272+07
11	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyNzU2NTB9.S2-3qBWTkA3leZppJOkybfOBVC_KcZ8CSXTKgWHLVGc	3	2126-10-10 10:14:10.134505+07	2026-11-03 10:14:10.157212+07
16	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyNzU2NTJ9.8eF_x39D2tv3_k_H5bGF_qIPkjv0iuljEvfACM8GiS8	3	2126-10-10 10:14:12.434441+07	2026-11-03 10:14:12.434615+07
19	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjQ5NDcyNzU2NTN9.7aXFm1cyUj3HG1v48qHaBVVP0BI6ZuU4U8qjP-lBQgo	3	2126-10-10 10:14:13.162225+07	2026-11-03 10:14:13.162225+07
\.


--
-- Data for Name: text_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.text_tasks (id, title, input_text, tuned_text, status, user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, full_name, role_id, created_at) FROM stdin;
1	xh1712006@gmail.com	$2b$12$JKtQHkqZJ5NS/HTB/MAile7HX7yjxVWJ0.fmfHhtWuTFY3plZAktq	admin123	1	2026-11-02 15:18:21.538263+07
3	admin12345@tunetext.local	$2b$12$vgamShAtmWkPTCclWJg8vusLGzA/FO.rOiioBwtC9DgkbkQnL8Hze	Quản Trị Viên (admin12345)	2	2026-11-02 16:03:43.919666+07
2	admin@tunetext.local	$2b$12$CeXtoTbZZWMBh/lWQwVwieYgpoU7cD5l4XsAlKwDe8r4XmsEI0vwi	Quản Trị Viên VIP (Token Vô Hạn)	2	2026-11-02 15:57:42.704668+07
\.


--
-- Name: ai_presets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_presets_id_seq', 6, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 2, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 19, true);


--
-- Name: text_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.text_tasks_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: ai_presets ai_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_presets
    ADD CONSTRAINT ai_presets_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: text_tasks text_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.text_tasks
    ADD CONSTRAINT text_tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_ai_presets_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ai_presets_id ON public.ai_presets USING btree (id);


--
-- Name: ix_ai_presets_platform_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_ai_presets_platform_code ON public.ai_presets USING btree (platform_code);


--
-- Name: ix_roles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_roles_id ON public.roles USING btree (id);


--
-- Name: ix_roles_role_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_roles_role_name ON public.roles USING btree (role_name);


--
-- Name: ix_sessions_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sessions_id ON public.sessions USING btree (id);


--
-- Name: ix_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_sessions_token ON public.sessions USING btree (token);


--
-- Name: ix_text_tasks_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_text_tasks_id ON public.text_tasks USING btree (id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: text_tasks text_tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.text_tasks
    ADD CONSTRAINT text_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--


