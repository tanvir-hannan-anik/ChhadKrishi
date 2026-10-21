# Graph Report - ChhadKrishi  (2026-10-21)

## Corpus Check
- 211 files · ~332,724 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 1, .onnx 1)

## Summary
- 1183 nodes · 3470 edges · 56 communities (54 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.86)
- Token cost: 77,230 input · 0 output

## Community Hubs (Navigation)
- API Routes & HTTP Helpers
- Plant Analyzer UI
- Weather Feature
- Problems Library & i18n
- ML Service (Python)
- Chat Workspace UI
- App Pages & Next Config
- Garden Designer Service
- Landing & Motion
- Care Routine UI
- Designer Requirements Form
- AI Model Config
- Landing Hero & Feature Cards
- Care Task Store
- Garden & Care Panels
- Chat & Analysis Prompts
- API Validation (zod)
- Push Subscriptions
- Profile & Geolocation
- Auth Modal Flow
- Voice Input/Output
- Package Metadata
- Shop Cart
- TypeScript Config
- Notification Bell
- AI Dependencies
- Garden Plants API
- Architecture Docs
- Chat Resources (YouTube/Shop)
- Android App Docs
- Book Ingestion Script
- Care Task Update API
- Dev Dependencies
- Database Layer
- Profile Form & Push
- Feature Docs
- Resource Cards UI
- Shop Catalogue
- Landing Chat Composer
- Landing Features
- Auth Server
- RAG Retrieval
- Root Layout & Fonts
- Auth Redirects
- Notifications API
- App Header
- Toaster
- Designer Consultation
- ML Service Docs
- NPM Scripts
- Designer Question Bank
- Security & Provider Docs
- Vision Measurements
- ESLint Config
- Vercel Cron

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 126 edges
2. `formatNumber()` - 55 edges
3. `react` - 50 edges
4. `requireUser()` - 49 edges
5. `next` - 46 edges
6. `lucide-react` - 41 edges
7. `motion` - 39 edges
8. `parseJson()` - 33 edges
9. `apiError()` - 32 edges
10. `getServerSession()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `ML_SERVICE_TOKEN Bearer Auth` --semantically_similar_to--> `Server-only AI`  [INFERRED] [semantically similar]
  ml-service/README.md → README.md
- `Azure Speech API Read-aloud` --semantically_similar_to--> `POST /tts (edge-tts neural voices)`  [INFERRED] [semantically similar]
  README.md → ml-service/README.md
- `Photo Analysis` --calls--> `POST /vision/analyze`  [INFERRED]
  README.md → ml-service/README.md
- `ChhadKrishi ML Service (FastAPI, CPU-only)` --references--> `Groq Whisper large-v3 Voice Input`  [EXTRACTED]
  ml-service/README.md → README.md
- `ChhadKrishi App` --references--> `ChhadKrishi ML Service (FastAPI, CPU-only)`  [EXTRACTED]
  README.md → ml-service/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **RAG-grounded Chat Answer Flow** — readme_api_chat, readme_rag_retrieve, readme_qwen3_embedding, readme_supabase_pgvector, readme_llm_providers, readme_resource_planner, readme_data_resources_part [EXTRACTED 1.00]
- **Computer-vision Evidence for Photo Analysis** — readme_photo_analysis, ml_service_readme_vision_analyze_route, ml_service_readme_yolov8s_leaf_detector, ml_service_readme_opencv_measurements [INFERRED 0.85]
- **Android Packaging Options Considered** — docs_mobile_app_capacitor_remote_url_shell, docs_mobile_app_trusted_web_activity, docs_mobile_app_static_export_option, docs_mobile_app_native_rewrite_option [EXTRACTED 1.00]

## Communities (56 total, 2 thin omitted)

### Community 0 - "API Routes & HTTP Helpers"
Cohesion: 0.06
Nodes (79): measurePhoto(), POST(), STATUS_FOR, input, POST(), DELETE(), GET(), GET() (+71 more)

### Community 1 - "Plant Analyzer UI"
Cohesion: 0.06
Nodes (64): AnalysisResources(), AnalysisResult(), AnalyzingSteps(), BAND_COLOUR, BANDS, HEALTH_TONE, LEVEL_TONE, Phase (+56 more)

### Community 2 - "Weather Feature"
Cohesion: 0.07
Nodes (58): WeatherPreview(), DayList(), Report(), WeatherView(), conditionLabel(), dhaka(), formatDay(), formatHour() (+50 more)

### Community 3 - "Problems Library & i18n"
Cohesion: 0.06
Nodes (44): metadata, generateMetadata(), Problem(), ProblemDetail(), CATEGORIES, ProblemCard(), ProblemsLibrary(), SEVERITY_TONE (+36 more)

### Community 4 - "ML Service (Python)"
Cohesion: 0.05
Nodes (42): BaseModel, contextlib, cv2, edge_tts, FastAPI, fastapi_concurrency, fastapi_responses, functools (+34 more)

### Community 5 - "Chat Workspace UI"
Cohesion: 0.09
Nodes (32): EmptyState(), HistoryPanel(), MessageBubble(), NotConfiguredNotice(), ThinkingIndicator(), SpacePanel(), TrendChart(), CompactLanguageToggle() (+24 more)

### Community 6 - "App Pages & Next Config"
Cohesion: 0.11
Nodes (18): nextConfig, next, react, AnalyzeGate(), metadata, metadata, DesignerGate(), metadata (+10 more)

### Community 7 - "Garden Designer Service"
Cohesion: 0.12
Nodes (33): ref_node_crypto, ResultProps, fixturePlan(), fixtureSpace(), consultationSystemPrompt(), firstTurnInstruction(), LANGUAGE, planSystemPrompt() (+25 more)

### Community 8 - "Landing & Motion"
Cohesion: 0.14
Nodes (22): motion, Leaf(), LogoMark(), Sprout(), Benefits(), ICONS, LAYOUT, CallToAction() (+14 more)

### Community 9 - "Care Routine UI"
Cohesion: 0.15
Nodes (25): EVERY, formatDate(), KIND_ICON, KIND_TONE, KINDS, Suggestion, TaskRow(), TIMES (+17 more)

### Community 10 - "Designer Requirements Form"
Cohesion: 0.09
Nodes (22): Field(), item, ReviewProps, TagEditor(), answerSchema, AspectRatio, clamp(), designPlanSchema (+14 more)

### Community 11 - "AI Model Config"
Cohesion: 0.11
Nodes (22): ai, CareSuggestion, careSuggestionSchema, suggestCareRoutine(), activeImageProvider(), AiProvider, configuredModels(), DEFAULTS (+14 more)

### Community 12 - "Landing Hero & Feature Cards"
Cohesion: 0.15
Nodes (18): lucide-react, FeatureCards(), FEATURES, ACCOUNT_LINKS, PROTECTED_PREFIXES, UserMenu(), container, focusTextarea() (+10 more)

### Community 13 - "Care Task Store"
Cohesion: 0.16
Nodes (19): createInput, GET(), POST(), GET(), CareGate(), CareKind, createTasks(), listTasks() (+11 more)

### Community 14 - "Garden & Care Panels"
Cohesion: 0.17
Nodes (23): CareRoutine(), NewTaskForm(), SuggestPanel(), DashboardView(), AddPlantForm(), GardenManager(), PlantRow(), ProfileForm() (+15 more)

### Community 15 - "Chat & Analysis Prompts"
Cohesion: 0.23
Nodes (19): ref_server_only, limitAnalysis(), prepareHistory(), streamChatReply(), activeProvider(), getModel(), isFixtureMode(), describePhoto() (+11 more)

### Community 16 - "API Validation (zod)"
Cohesion: 0.23
Nodes (18): zod, input, PUT(), DELETE(), GET(), input, PUT(), input (+10 more)

### Community 17 - "Push Subscriptions"
Cohesion: 0.17
Nodes (17): DELETE(), GET(), POST(), subscription, POST(), digits(), NotificationKind, NotificationParams (+9 more)

### Community 18 - "Profile & Geolocation"
Cohesion: 0.14
Nodes (16): input, POST(), GET(), input, PUT(), ProfileGate(), db, addressLineOf() (+8 more)

### Community 19 - "Auth Modal Flow"
Cohesion: 0.16
Nodes (17): AuthDialog(), AuthModal(), ErrorKey, errorKeyFor(), Status, AuthModalState, AuthMode, closeAuthModal() (+9 more)

### Community 20 - "Voice Input/Output"
Cohesion: 0.16
Nodes (17): BrowserMic(), currentLang(), ListenButton(), MicButton(), MicProps, MicState, MicView(), MIME_CANDIDATES (+9 more)

### Community 21 - "Package Metadata"
Cohesion: 0.11
Nodes (18): name, private, version, @ai-sdk/google, @ai-sdk/groq, @ai-sdk/react, babel-plugin-react-compiler, @openrouter/ai-sdk-provider (+10 more)

### Community 22 - "Shop Cart"
Cohesion: 0.19
Nodes (14): GET(), input, PUT(), GET(), GET(), DashboardGate(), metadata, ShopGate() (+6 more)

### Community 23 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 24 - "Notification Bell"
Cohesion: 0.22
Nodes (16): KIND_ICON, KIND_TONE, NotificationBell(), timeAgo(), clearNotifications(), EMPTY, listeners, loadNotifications() (+8 more)

### Community 25 - "AI Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, ai, @ai-sdk/google, @ai-sdk/groq, @ai-sdk/react, better-auth, @electric-sql/pglite, kysely (+9 more)

### Community 26 - "Garden Plants API"
Cohesion: 0.22
Nodes (13): DELETE(), PATCH(), POST(), GET(), profileInput, PUT(), GardenGate(), addPlant() (+5 more)

### Community 27 - "Architecture Docs"
Cohesion: 0.16
Nodes (16): Render Free Plan Deployment, AI Chat (main workspace), /api/chat route, App Database (Postgres/PGlite via Kysely), data-resources Message Part, FAO Manuals (A Garden for Everyone 2005; Diversifying Rural Incomes Through Home Gardens 2004), Graceful Degradation, Qwen3-Embedding-8B (1024-d multilingual) (+8 more)

### Community 28 - "Chat Resources (YouTube/Shop)"
Cohesion: 0.19
Nodes (14): fallbackVideoQuery(), findChatResources(), mentionedProducts(), planPrompt(), planSchema, PRODUCT_TERMS, RESOURCE_PLAN_MARKER, withDeadline() (+6 more)

### Community 29 - "Android App Docs"
Cohesion: 0.16
Nodes (14): Next.js Breaking Changes Notice (read node_modules/next/dist/docs), ChhadKrishi Android App (APK) Guide, mobile/capacitor.config.ts, Capacitor Shell (remote-URL mode), React Native / Expo / Flutter Rewrite (rejected), Offline Fallback Page (mobile/www/index.html), Signed Release APK / AAB, Capacitor with next build Static Export (rejected) (+6 more)

### Community 30 - "Book Ingestion Script"
Cohesion: 0.16
Nodes (9): ref_node_fs, ref_node_path, unpdf, { documents }, download(), DRY_RUN, ENTITIES, htmlToText() (+1 more)

### Community 31 - "Care Task Update API"
Cohesion: 0.21
Nodes (11): DELETE(), PATCH(), deleteTask(), updateTask(), ownsPlant(), careKind, careTaskInput, checkoutInput (+3 more)

### Community 32 - "Dev Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, babel-plugin-react-compiler, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/node, @types/pg (+5 more)

### Community 33 - "Database Layer"
Cohesion: 0.18
Nodes (11): @electric-sql/pglite, kysely, ProductResource, AppDatabase, ensureAppSchema(), globalForKysely, lockDownTables(), Timestamp (+3 more)

### Community 34 - "Profile Form & Push"
Cohesion: 0.28
Nodes (11): avatarDataUrl(), Coords, Field, noopSubscribe(), PushSettings(), currentSubscription(), disablePush(), enablePush() (+3 more)

### Community 35 - "Feature Docs"
Cohesion: 0.18
Nodes (12): Android Permissions (Camera, Record Audio), Native Push Reminders (@capacitor/push-notifications + Firebase), AI Garden Designer, /api/analyze route, /api/designer/{start,turn,plan,render}, Care Routine, ChhadKrishi App, Common Problems Library (+4 more)

### Community 36 - "Resource Cards UI"
Cohesion: 0.21
Nodes (10): groupSources(), PRODUCT_ICONS, PRODUCT_TINTS, ProductCard(), ResourceCards(), VideoCard(), ChatResources, ChatUIMessage (+2 more)

### Community 37 - "Shop Catalogue"
Cohesion: 0.17
Nodes (10): BY_2, BY_3, BY_SA_3, BY_SA_4, CATALOGUE, CatalogueItem, CC0, IDS (+2 more)

### Community 38 - "Landing Chat Composer"
Cohesion: 0.27
Nodes (6): ChatComposer(), ChatComposerProps, getRecognitionCtor(), noopSubscribe(), RecognitionCtor, SpeechRecognitionLike

### Community 39 - "Landing Features"
Cohesion: 0.27
Nodes (10): CarePreview(), ChatPreview(), DESTINATIONS, Features(), ScanPreview(), ShopPreview(), subscribeReducedMotion(), TABS (+2 more)

### Community 40 - "Auth Server"
Cohesion: 0.33
Nodes (8): better-auth, GET(), handle(), handlers, POST(), auth, ensureAuthReady(), Session

### Community 41 - "RAG Retrieval"
Cohesion: 0.33
Nodes (8): pg, BookSource, BookPassage, embedQuery(), globalForRag, isRagConfigured(), pool(), retrieveBookPassages()

### Community 42 - "Root Layout & Fonts"
Cohesion: 0.22
Nodes (7): src_app_globals, fraunces, hindSiliguri, metadata, tiroBangla, viewport, Providers()

### Community 43 - "Auth Redirects"
Cohesion: 0.31
Nodes (7): AuthRedirectListener(), AUTH_QUERY, AuthReason, buildSignInUrl(), safeReturnPath(), config, proxy()

### Community 44 - "Notifications API"
Cohesion: 0.38
Nodes (6): GET(), input, lastChecked, POST(), listNotifications(), markRead()

### Community 45 - "App Header"
Cohesion: 0.38
Nodes (5): activeHref(), APP_LINKS, AppHeader(), NavList(), noopSubscribe()

### Community 46 - "Toaster"
Cohesion: 0.33
Nodes (6): emit(), EMPTY, listeners, subscribe(), Toaster(), toasts

### Community 47 - "Designer Consultation"
Cohesion: 0.33
Nodes (6): AnswerInput(), ChatMessage, Consultation(), ConsultationProps, Answer, DESIGNER_LIMITS

### Community 48 - "ML Service Docs"
Cohesion: 0.33
Nodes (6): GET /health, ChhadKrishi ML Service (FastAPI, CPU-only), POST /tts (edge-tts neural voices), edge-tts==7.3.1, fastapi==0.156.0, Azure Speech API Read-aloud

### Community 49 - "NPM Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, rag:ingest, start

### Community 50 - "Designer Question Bank"
Cohesion: 0.33
Nodes (5): Bank, bn, en, RequirementField, Lang

### Community 51 - "Security & Provider Docs"
Cohesion: 0.40
Nodes (5): ML_SERVICE_TOKEN Bearer Auth, CHHADKRISHI_AI_FIXTURE Test Model, src/lib/ai/config.ts Provider-agnostic Model Selection, LLM Providers (AI Gateway, OpenRouter, Google, Groq), Server-only AI

### Community 52 - "Vision Measurements"
Cohesion: 0.40
Nodes (5): OpenCV Sharpness/Exposure and Leaf-colour Measurements, POST /vision/analyze, YOLOv8s Leaf Detector (foduucom, ONNX), onnxruntime==1.31.0, opencv-python-headless==5.0.0.93

### Community 53 - "ESLint Config"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **287 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 377 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLanguage()` connect `Chat Workspace UI` to `Plant Analyzer UI`, `Profile Form & Push`, `Weather Feature`, `Resource Cards UI`, `Problems Library & i18n`, `App Pages & Next Config`, `Landing Chat Composer`, `Landing & Motion`, `Care Routine UI`, `Designer Requirements Form`, `Landing Features`, `Landing Hero & Feature Cards`, `App Header`, `Garden & Care Panels`, `Designer Consultation`, `Auth Modal Flow`, `Voice Input/Output`, `Notification Bell`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Why does `next` connect `App Pages & Next Config` to `API Routes & HTTP Helpers`, `Plant Analyzer UI`, `Weather Feature`, `Problems Library & i18n`, `Chat Workspace UI`, `Landing & Motion`, `Care Routine UI`, `Landing Hero & Feature Cards`, `Garden & Care Panels`, `Auth Modal Flow`, `Package Metadata`, `Shop Cart`, `Notification Bell`, `Profile Form & Push`, `Resource Cards UI`, `Landing Features`, `Root Layout & Fonts`, `Auth Redirects`, `App Header`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `react` connect `App Pages & Next Config` to `API Routes & HTTP Helpers`, `Plant Analyzer UI`, `Weather Feature`, `Problems Library & i18n`, `Chat Workspace UI`, `Landing & Motion`, `Care Routine UI`, `Designer Requirements Form`, `Landing Hero & Feature Cards`, `Garden & Care Panels`, `Auth Modal Flow`, `Voice Input/Output`, `Package Metadata`, `Shop Cart`, `Notification Bell`, `Profile Form & Push`, `Landing Chat Composer`, `Landing Features`, `App Header`, `Toaster`, `Designer Consultation`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useLanguage()` (e.g. with `readLang()` and `readServerLang()`) actually correct?**
  _`useLanguage()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Routes & HTTP Helpers` be split into smaller, more focused modules?**
  _Cohesion score 0.05630630630630631 - nodes in this community are weakly interconnected._
- **Should `Plant Analyzer UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05673274094326726 - nodes in this community are weakly interconnected._