
(base) PS C:\Users\kashy\OneDrive\Documents\AIChat> cd frontend                                                                          
(base) PS C:\Users\kashy\OneDrive\Documents\AIChat\frontend> npm install

added 235 packages, and audited 236 packages in 1m

120 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
(base) PS C:\Users\kashy\OneDrive\Documents\AIChat\frontend> npm run dev

> ai-chat-frontend@1.0.0 dev
> next dev

▲ Next.js 16.2.2 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://172.22.144.1:3000
- Environments: .env.local
✓ Ready in 1120ms

○ Compiling / ...
 GET / 200 in 4.4s (next.js: 4.1s, application-code: 336ms)
 GET /chat 200 in 1662ms (next.js: 1621ms, application-code: 41ms)
 GET / 200 in 73ms (next.js: 20ms, application-code: 53ms)




-----------------------------------------------------------------------------



(base) PS C:\Users\kashy\OneDrive\Documents\AIChat> cd backend
(base) PS C:\Users\kashy\OneDrive\Documents\AIChat\backend> npm install
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead

added 214 packages, and audited 215 packages in 56s

26 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
(base) PS C:\Users\kashy\OneDrive\Documents\AIChat\backend> npm run dev

> ai-chat-backend@1.0.0 dev
> tsx watch src/index.ts

{"level":"info","message":"Backend server running on port 4000","timestamp":"2026-04-03T12:33:25.970Z"}
{"level":"info","message":"Frontend URL: http://localhost:3000","timestamp":"2026-04-03T12:33:25.974Z"}
{"level":"info","message":"LiteLLM URL: http://localhost:4001","timestamp":"2026-04-03T12:33:25.974Z"}
{"level":"info","message":"Default model: ollama/llama3.2","timestamp":"2026-04-03T12:33:25.974Z"}


-----------------------------------------------------------------------------


(base) PS C:\Users\kashy> cd "C:\Program Files\PostgreSQL"
(base) PS C:\Program Files\PostgreSQL> cd "C:\Program Files\PostgreSQL\18\bin"
(base) PS C:\Program Files\PostgreSQL\18\bin> .\psql -U postgres -c "CREATE USER aichat WITH PASSWORD 'aichatbymayank';"
Password for user postgres:

CREATE ROLE
(base) PS C:\Program Files\PostgreSQL\18\bin> .\psql -U postgres -c "CREATE USER aichat WITH PASSWORD 'aichatbymayank';"

Password for user postgres:

CREATE ROLE
(base) PS C:\Program Files\PostgreSQL\18\bin>  .\psql -U postgres -c "CREATE DATABASE aichat OWNER aichat;"
Password for user postgres:

CREATE DATABASE
(base) PS C:\Program Files\PostgreSQL\18\bin> .\psql -U aichat -d aichat -f "C:\Users\kashy\OneDrive\Documents\AIChat\ai-chat-1\database\init.sql"
Password for user aichat:

CREATE EXTENSION
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
INSERT 0 4
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE TRIGGER



-----------------------------------------------------------------------------

(base) PS C:\Users\kashy\OneDrive\Documents\AIChat> python -m venv venv
(base) PS C:\Users\kashy\OneDrive\Documents\AIChat> venv\Scripts\Activate    
(venv) (base) PS C:\Users\kashy\OneDrive\Documents\AIChat> pip install litellm[proxy]
.
.
.
.
.
[notice] A new release of pip is available: 25.1.1 -> 26.0.1
[notice] To update, run: python.exe -m pip install --upgrade pip
(venv) (base) PS C:\Users\kashy\OneDrive\Documents\AIChat> litellm --config litellm-config.yaml --port 4001
INFO:     Started server process [25768]
INFO:     Waiting for application startup.

   ██╗     ██╗████████╗███████╗██╗     ██╗     ███╗   ███╗
   ██║     ██║╚══██╔══╝██╔════╝██║     ██║     ████╗ ████║
   ██║     ██║   ██║   █████╗  ██║     ██║     ██╔████╔██║
   ██║     ██║   ██║   ██╔══╝  ██║     ██║     ██║╚██╔╝██║
   ███████╗██║   ██║   ███████╗███████╗███████╗██║ ╚═╝ ██║
   ╚══════╝╚═╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝


#------------------------------------------------------------#
#                                                            #
#         'The worst thing about this product is...'          #
#        https://github.com/BerriAI/litellm/issues/new        #
#                                                            #
#------------------------------------------------------------#

 Thank you for using LiteLLM! - Krrish & Ishaan



Give Feedback / Get Help: https://github.com/BerriAI/litellm/issues/new


LiteLLM: Proxy initialized with Config, Set models:
    ollama/llama3.2
    ollama/llama3.1
    ollama/mistral



-----------------------------------------------------------------------------




ngrok config add-authtoken 3BtAxJhuF6CUr88GBdRziBrKzMj_4uVXSKgp6fXmFiCPJWV3J


ngrok http --domain=unreversible-helga-supermilitary.ngrok-free.dev 3000