# คำไว (Worlds Thai) — เกมคำไทยออนไลน์

เกมแข่งตอบคำศัพท์ภาษาไทยแบบหลายผู้เล่นจริง มีระบบแสดงห้องรอผู้เล่นแบบสาธารณะ เปิด URL เกมเดียวกันก็เล่นกับเพื่อนได้ ใช้ **AWS Amplify Gen 2 + AppSync API + Lambda + DynamoDB + Cognito Guest** และ Vite/React

## เพลงและเสียงประกอบ

- เพลงบรรยากาศสบาย ๆ สังเคราะห์เป็นไฟล์ WAV ภายในเบราว์เซอร์แล้วเล่นผ่าน HTMLAudioElement (รองรับ iPhone/iPad); ถ้าระบบสื่อเล่นไม่ได้ จะพยายามใช้ Web Audio API แทน ไม่ต้องดาวน์โหลดเพลงจากภายนอก
- เมื่อเหลือ **5–1 วินาที** เพลงจะเร่งจังหวะ โดยลดเสียงเพลงลงเล็กน้อยให้ได้ยินเสียงนับบี๊บทุกวินาทีชัดเจน (วินาทีที่ 1 เป็นเสียงคู่); เลขเวลาเปลี่ยนเป็นสีแดงและเด้งหนึ่งครั้งต่อวินาที พร้อมแถบเวลาแดง ก่อนส่งเสียงหมดเวลา
- เพิ่มความดังให้เพลงและเอฟเฟกต์โดยยังคุมระดับไม่ให้เสียงแตก และเพิ่มเสียงคลิก/เลือกตัวเลือก/แตะช่องข้อความ (ไม่ส่งเสียงทุกตัวอักษรที่พิมพ์) รวมถึงเสียงสั้นสำหรับเข้าห้อง เริ่มรอบ ตอบคำถูกครั้งแรกในช่อง สรุปรอบ ชนะเกม และออกห้อง
- ปุ่มรูปลำโพงที่มุมบนใช้ปิด/เปิด **เพลงและเสียงเอฟเฟกต์พร้อมกัน** จำค่าในเบราว์เซอร์ ไม่กระทบผู้เล่นอื่น
- เบราว์เซอร์มือถือจะเริ่มเพลงหลังแตะ/คลิก/กดคีย์ครั้งแรกตามข้อจำกัด autoplay; เมื่อสลับแท็บระบบจะหยุดเสียงชั่วคราว และพยายามเริ่มใหม่เมื่อกลับมา
- หากไม่ได้ยินเสียง กดปุ่ม **♪ ลองเสียง** ที่มุมบน ระบบจะเปิดเสียงที่เคยปิดไว้และส่งเสียงทดสอบ 3 ครั้ง พร้อมแจ้งถ้าเบราว์เซอร์ไม่อนุญาตให้เล่นเสียง ควรตรวจเสียงสื่อ, Silent Mode และเอาต์พุต Bluetooth ด้วย
- หากอุปกรณ์ไม่รองรับ Web Audio เกมยังเล่นได้ตามปกติ ระบบเสียงไม่แตะระบบคะแนนหรือเวลาฝั่งเซิร์ฟเวอร์

## โหมดการเล่น 2 รูปแบบ

- **โหมดพยัญชนะ (เดิม):** สุ่มพยัญชนะเดียวในรอบ แล้วสุ่ม 3–8 หมวดที่รองรับ ผู้เล่นกรอกคำตามพยัญชนะนั้นให้ตรงแต่ละหมวด
- **โหมดหมวดใหญ่ (ใหม่):** สุ่มหมวดใหญ่เดียวในรอบ แล้วสุ่มพยัญชนะ **3–8 ตัวที่ไม่ซ้ำกัน** แต่ละช่องแสดงอักษรประจำช่องและให้ผู้เล่นกรอก **หนึ่งคำในหมวดเดียวกันที่ขึ้นต้นด้วยอักษรนั้น** เช่น หมวดสัตว์ → ก: กบ, ช: ช้าง, ม: ม้า, ส: เสือ, ห: หมี
- ฝั่งเซิร์ฟเวอร์คัดเฉพาะคู่หมวด–พยัญชนะที่มีคำ **ผ่านการตรวจรับอย่างน้อย 2 คำที่แตกต่างกัน** เท่านั้น พร้อมตรวจคำจริงและพยัญชนะต้นจากคลังเกม (นับคำต้นไม้/ขนมด้วยกฎคำนำหน้าเดิม) จึงไม่ใช่การสุ่มอักษรแล้วหวังว่าผู้เล่นจะนึกออก
- การนับคะแนนเหมือนกันทั้งสองโหมด: คำถูกแต่ซ้ำกับผู้เล่นอื่นในช่องเดียวกันได้ 1 คะแนน, ถูกไม่ซ้ำได้ 2 คะแนน, ไม่ตรงอักษร/หมวด/ไม่มีในคลังได้ 0 คะแนน โบนัสคำหายากยังใช้ได้ตามข้อมูลจริง และสถิติบันทึกแยกคู่หมวด–อักษร
- โหมดเป็นการตั้งค่าของ **ห้อง**: เจ้าของเลือกก่อนเริ่ม ผู้เล่นทุกคนเห็นเหมือนกัน เล่นอีกครั้งยังใช้โหมดเดิม และสามารถเปลี่ยนโหมดได้ในล็อบบี้ก่อนเริ่มครั้งต่อไป

## วิธีเล่น

1. คนแรกใส่ชื่อเล่นและกด **สร้างห้อง** เพื่อเป็นเจ้าของห้อง
2. เจ้าของเลือกโหมดก่อนเริ่ม แล้วตั้งจำนวนรอบ **1–10**, หมวดหรือคำต่อรอบ **3–8** และเวลาตอบต่อรอบ **20–120 วินาที** (ค่าเริ่มต้น 3 / 5 / 40)
3. เพื่อนเปิด URL **หน้าเกมเดียวกัน** กด **เข้าร่วมห้อง** จะเห็นรายชื่อห้องที่ยังรอผู้เล่น แล้วกดเข้าร่วมได้ทันที **ไม่ต้องส่งลิงก์หรือกรอกรหัสใด ๆ**
4. เมื่อมี 2 คนขึ้นไป เจ้าของกด **เริ่มเกม** ด้วยตัวเอง; ไม่เริ่มอัตโนมัติ
5. แต่ละรอบสุ่มพยัญชนะและหมวดที่คลังคำรองรับ; คำถูกไม่ซ้ำ 2 คะแนน ถูกซ้ำ 1 คะแนน คำไม่รับรอง/ผิดหมวด 0 คะแนน
6. จบครบจำนวนรอบ เจ้าของกด **เล่นใหม่** ได้; ถ้าเจ้าของออก ผู้เล่นที่ยังอยู่คนแรกจะเป็นเจ้าของแทน

**ขอบเขตการตรวจคำ:** ฝั่งเซิร์ฟเวอร์ตรวจพยัญชนะต้นรวมรูปแบบสระนำ `เ แ โ ใ ไ`, ตรวจรายการคำที่ผู้ดูแลตรวจรับและจัดหมวดไว้ใน `amplify/functions/game/dictionary.ts`, ตรวจคำซ้ำและเวลา ไม่ยอมรับคำใด ๆ เพียงเพราะพยัญชนะต้นตรงอีกแล้ว เลือกสุ่มเฉพาะตัวอักษรที่มีอย่างน้อย 5 หมวด โดยแต่ละหมวดต้องมีคำที่ตรวจรับอย่างน้อย 2 คำไม่ซ้ำกัน และให้โอกาสหมวดที่มีคำตอบมากถูกสุ่มมากกว่า **ฃ ขวด (ตัว ฃ) ถูกงดสุ่ม** ส่วน **ข ไข่ (ตัว ข) ใช้ได้ตามปกติ** และมีคลังคำรองรับอย่างน้อย 5 หมวด

**ข้อจำกัด:** นี่เป็นคลังคำคัดเลือก ไม่ใช่พจนานุกรมภาษาไทยฉบับสมบูรณ์ คำจริงที่ไม่ได้บันทึกจะได้ 0 คะแนน (false negative) จึงควรเปิดคำขอเพิ่มคำให้ผู้ดูแลตรวจสอบก่อนปล่อยให้เล่นแข่งขันจริง และห้ามอ้างว่าตรวจคำได้ครบทุกคำ

## Deploy ขึ้น AWS Amplify Hosting (Production)

> การ push GitHub อย่างเดียว **ไม่ทำให้ขึ้นเว็บ** จนกว่าจะสร้างและเชื่อม AWS Amplify App ในบัญชี AWS ของเจ้าของโปรเจกต์ การ deploy backend ต้องใช้ IAM role ที่มีสิทธิ์ CDK/CloudFormation, AppSync, Lambda, DynamoDB และ Cognito

1. เปิด [AWS Amplify Console](https://console.aws.amazon.com/amplify/home) → **Create new app** → **GitHub**
2. Authorize GitHub, เลือกรีโป `tanawutmalirum29-ux/worlds-thai`, branch **`main`**
3. ตรวจว่า Amplify ตรวจพบ `amplify.yml` (ไฟล์มี `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`); เลือก build/compute role ที่อนุญาตการสร้าง backend Gen 2 ตามคู่มือ AWS
4. กด **Save and deploy** รอทั้ง backend และ frontend เป็น **Succeeded**; Amplify จะกำหนดโดเมน `https://main.<APP_ID>.amplifyapp.com`
5. เปิด URL จริงจากหน้า Amplify แล้วทดสอบ **2 เครื่อง/2 เบราว์เซอร์**: join, แชร์ลิงก์, timer, autosave, คะแนน, 3 รอบ, rejoin หลังเน็ตหลุด

`amplify_outputs.json` ถูกสร้างขึ้นระหว่าง backend deploy แล้ว `amplify.yml` คัดลอกไปเป็นไฟล์ public ให้ frontend อ่าน runtime config จึง **ไม่ต้อง** commit ไฟล์ outputs หรือ AWS credentials ลง Git

### พัฒนาในเครื่อง

```bash
npm install
npx ampx sandbox   # ใช้ AWS credentials ของคุณ สร้าง backend และ amplify_outputs.json
cp amplify_outputs.json public/amplify_outputs.json
npm run dev
```

ตรวจความถูกต้อง:

```bash
npm run test
npm run build
```

## Architecture / Security

- Cognito **unauthenticated identity** ให้ Guest identity เฉพาะอุปกรณ์ ไม่ต้องล็อกอิน
- AppSync query/mutation ที่เรียก Lambda แบบ IAM (`identityPool`) เท่านั้น; ไม่มี public write ไป DynamoDB
- Server รับ id จาก Cognito identity (`cognitoIdentityId`) แล้วแฮชเป็น player ID; client **เปลี่ยนตัวตน/คะแนนเองไม่ได้**
- คำนวณคะแนน/จับเวลา/เปลี่ยนรอบใน Lambda; ป้องกันการส่งคำตอบหลัง deadline
- DynamoDB ใช้ `ConditionExpression` ตรวจ version เพื่อกันแข่งแก้ state พร้อมกัน, เปิด TTL และ PAY_PER_REQUEST
- อัปเดตผู้เล่นโดยอ่าน state ผ่าน AppSync query ทุก 2 วินาที และ pulse ผ่าน Lambda ทุก 5 วินาที; **ไม่มี WebSocket subscription** ในรุ่นนี้ เพื่อให้ทำงานกับ Cognito Guest ได้โดยไม่ชนข้อจำกัด Amplify Gen 2
- `pulse` ทุก 5 วินาที; ไม่ส่งภายใน 43 วินาทีถือว่า offline และออกจากเกม
- สูงสุด 8 ผู้เล่นต่อห้อง กำหนดเวลาและจำนวนรอบได้ ไม่ใช่ระบบ matchmaking สาธารณะ

**ข้อควรทราบก่อนเปิดสาธารณะ:** ใช้ Guest จึงยังไม่ใช่ anti-cheat หรือ moderation แบบสมบูรณ์ มี curated word bank แต่ยังไม่ครอบคลุมคำทุกคำ, ยังไม่มี rate limits/WAF, ระบบรายงานคำไม่เหมาะสม และระบบแอดมิน ควรตั้ง AWS Budgets แจ้งเตือนค่าใช้จ่ายและติดตาม CloudWatch ระหว่างเปิดจริง

## สถานะ

ซอร์สโค้ดสำหรับขึ้น production อยู่ใน `main` หลัง merge แต่สถานะ AWS deploy ต้องตรวจยืนยันจาก Amplify Console ของบัญชีจริง ไม่ถือว่า live เพียงเพราะโค้ดอยู่บน GitHub


## Diagnose a failed AWS Amplify deploy

GitHub Actions passing means tests and TypeScript/Vite build succeeded. It **does not** deploy AWS backend infrastructure. In Amplify Console open the failed deployment, then open **Build logs** and find the **first** `[ERROR]` / `[ERROR]:` and the **backend** phase that failed:

- `Unable to assume specified IAM Role`, `AccessDenied`: open Amplify **App settings → IAM roles** and confirm an **Amplify Backend Deployment** service role is selected, properly trusted, and authorized. Do not paste AWS access keys into Git.
- `BootstrapDetectionError`, `CDKToolkit`, `SSM /cdk-bootstrap`: inspect the CDK bootstrap CloudFormation stack in the same AWS account and region as the Amplify app.
- `Node.js`, `unsupported engine`: use the Amazon Linux 2023 build image and Node.js 22. The repository build specification now runs `nvm use 22` and prints the version.
- `CREATE_FAILED`, `UPDATE_ROLLBACK`, `Circular dependency`: check **CloudFormation → Stacks → Events** for the first failed resource and its actual error message. In this project, verify the custom DynamoDB table, Lambda and AppSync resources.
- `amplify_outputs.json` missing: the Amplify Gen 2 backend phase did not successfully produce config. Do not bypass the backend or deploy only a static frontend: multiplayer requires real backend services.

Only redeploy after confirming which error occurred. Avoid creating more apps or deleting CloudFormation resources blindly.

## AWS Amplify Gen 2 Guest subscription compatibility

In the initial deployment, `gameUpdated` used `a.subscription().handler(a.handler.custom(...)).authorization(allow => [allow.guest()])`. AWS rejects this combination during CDK Assembly with `InvalidSchemaError: identityPool-based auth ... is not supported with a.handler.custom`. To unblock safe production deploy without exposing a public API key, the project intentionally uses Cognito Guest IAM for the query and Lambda-backed mutation, and a short polling interval for multiplayer updates. The old `amplify/data/subscription.js` file is unused by the schema. Do not re-enable that custom resolver with guest authorization. CI includes a regression test for this deployment failure. Backend deployment to AWS still needs to be verified separately.

## Room ownership and event parsing

- Room identifiers are cryptographically random and generated on the server. The public room directory lists waiting rooms via guest-authorized listRooms query, without exposing player IDs. Visitors select a room directly from the game homepage.
- Owner-only settings, start and replay actions are authorized in the Lambda against the hashed Cognito Guest identity, not a client-supplied owner flag.
- AppSync custom query/mutation Lambda event may expose `fieldName` directly; check both direct and nested properties and fall back to the arguments shape. This resolves the prior production crash on `event.info.fieldName`.
- A new production deployment must be tested in two distinct browsers; GitHub CI passing is not sufficient to verify Lambda runtime credentials.


## Public lobby (one game URL, no invitations)

- One person creates a room with 1–10 rounds, 3–8 categories per round and 20–120 seconds per round.
- Others open the same game homepage, select **เข้าร่วมห้อง** and choose an available room. No invitation link, password, room ID or code is needed.
- `listRooms` returns only active, joinable waiting rooms (host display name, player count, settings); it filters out full, started and inactive rooms. The list refreshes every 3 seconds and is backed by a bounded DynamoDB Scan for the MVP.
- Only the server authorizes owner actions and validates the number of players. Opening the homepage does not automatically join any room.

## Instant hints, per-word statistics, and CSV
- Word inputs show green when accepted, orange for wrong initial consonant or words absent from the curated category dictionary. Final server scoring uses the same dictionary.
- The letter now shows its Thai name, such as **บ ใบไม้**, **ส เสือ**, **ข ไข่**. ฃ ขวด is excluded from the letter pool; ข ไข่ remains playable with sufficient reviewed answers in 8-category rooms.
- Award **2 points** for a correct unique answer and **1** for a correct duplicated answer. Invalid/empty = 0.
- A new separate **WordUsageStats** DynamoDB table (no TTL, RETAIN) stores totals grouped by initial letter, category, and reviewed word: usage count, cumulative awarded points, most recent usage. No player identifiers are stored.
- The round's match state and per-word increments are committed in **one DynamoDB transaction** with optimistic match-version checking; a failed/retried transaction cannot double-count stats.
- The top-bar **สถิติคำ ↓** export downloads UTF-8 CSV including unused dictionary words (0 uses), after prompting for **251029**, hardcoded in frontend GitHub source as requested.
- **This code is merely a nuisance prompt, NOT security**: anyone who can inspect the public source/client bundle can find the code and directly call the guest-authorized aggregate API. Strong authorization requires accounts/backend IAM, which is not used here.
- Data collection begins only after the successful deployment. Historical usage is unavailable. Only accepted dictionary words are aggregated; rejected entries are not stored.

## Thai consonant clarification

The old exclusion accidentally removed **ข ไข่** because **ฃ ขวด** was confused with it. Fix: exclude only `ฃ`, never `ข`. `ข ไข่` can now be randomly selected with 3–8 categories per round. There is no manual consonant button: the server picks the letter at the start of each round. Regression tests verify the distinction and accepted words such as `ข้าวผัด`, `ขลุ่ย`, and `ขวด` (the last is the word for a bottle, not the obsolete consonant).

## Avoid trivial letters and sparse categories

The revised eligibility gate requires **at least 2 distinct, accepted words in each letter/category pair** and **at least 5 qualifying categories per consonant**. It counts canonical answers, so duplicate spellings or aliases cannot inflate the threshold. Rooms can still select 3–8 categories: rounds with 6–8 categories draw only letters with at least that many qualifying categories, and every drawn category has at least 2 distinct answers. Category selection continues to favor richer pools. Explicitly excluded obsolete/rare consonants such as **ฎ ชฎา** and **ฮ นกฮูก** remain excluded. This is a curated-answer gate, not a claim to cover every possible Thai word.

## Automatic answer capture and reviewed vocabulary expansion

Answers will be autosaved to the server as the player types and scored using the last successfully saved draft when the round ends. No manual submission button; typing feedback still uses the same reviewed dictionary. The backend retains 'submit' for backwards compatibility but the updated client never invokes it. Debounced writes reduce requests; network loss may prevent the most recent text from reaching the server, so the UI shows save status.

Added missing common verbs (including **พนมมือ** and **ปรบมือ**), **อุรุกวัย** and many more countries, states/provinces from multiple countries, common drinks, dishes with eggs, and desserts beginning with ข that do **not** start with 'ขนม'. **พลับพลึง** is a flower/plant, not a commonly eaten fruit; **พลับ** and **พลัม** are fruits. The จังหวัด/รัฐทั่วโลก category is now a deliberately small shortlist of foreign regions familiar to Thai players, not an exhaustive atlas.

Country vocabulary has 193 reviewed Thai name entries after this change (not a formal guarantee of exhaustive UN-member coverage; some names and naming conventions may differ). Added Albania, Algeria, Bahamas, Cabo Verde, Cyprus, Slovakia, Slovenia, and UAE in Thai.

## Private word workspace

A separate, unlinked static HTML page is built as a second Vite entry. The owner has the long URL and a casual password prompt. The player-facing game does **not** have an admin link or a CSV-download button.

**Security warning:** This is obscurity only, not genuine authentication. The admin filename is in the GitHub source and the `251029` password is shipped to visitors' browsers. The existing aggregate-stats AppSync query permits guests, so it is not confidential. Do not put secrets, private user information or real money operations behind this page. A true secure admin portal needs AWS user authentication, admin roles and restricted AppSync APIs.

### Workflow
1. Open the separate admin URL and enter the existing code.
2. Type a word, optionally selecting a category and/or Thai consonant. The page shows whether the exact word exists, which category it belongs to, and its first letter. Usage counts and points load from AWS when reachable.
3. Choose a category and add a missing word. The change is **localStorage draft only**, not saved to the game backend. It survives reload in the same browser unless site data is cleared. Remove draft words individually if needed.
4. Download **dictionary.ts** containing all current words plus staged additions and the existing filtering configuration. Replace `amplify/functions/game/dictionary.ts` in the GitHub repository and deploy after verifying the vocabulary.
5. Download **CSV word-usage statistics** only from the admin page. Includes every original and locally staged word (0 uses for new staged words), with category and Thai letter.

Build CI verifies that the production dist directory includes the random-filename HTML and the usual player index.

## Word popularity dashboard (private workspace)
- The unlinked administrator page contains a data dashboard using the same cumulative, server-owned word statistics stored in DynamoDB; **no new backend tables or write APIs** are needed.
- Switch between **popular words**, **category rankings**, **consonant rankings**, **category × consonant heatmap**, and **words never used**.
- Filter by category, consonant or both; sort highest/lowest; choose frequency or cumulative awarded points; select 10/20/50/100 ranks. Bar charts and heatmap cells drill into the word-search section.
- Summary shows total accepted answer uses, used and unused word/category entries, points and percentage coverage. The same spelling used in different categories is counted separately, matching the backend's aggregate key.
- Only show rankings after the real AWS statistics have loaded. If the backend is unavailable or has not recorded any answers yet, display an explicit empty/error state rather than invented popularity.
- Retained historical word statistics remain visible even for words removed from the current dictionary; the dashboard labels these as removed/archived. Locally staged words have zero server usage until they are merged and actually played.
- Statistics are lifetime aggregates from the point collection was activated; **no per-day timelines** exist in the current schema.

## Ranking table / AI word review inbox
The private admin popular-word ranking has no horizontal scrolling; it uses a fixed-width, wrap-friendly table that scrolls vertically. Smaller screens suppress secondary columns while keeping tappable word details. The separate category×letter matrix remains horizontally scrollable as required for many consonants.

Admins can paste one or multiple unclassified Thai words into a distinct local inbox, persist them in the same browser, remove them and download a plain UTF-8 `.txt` file with only pending added words (categorized drafts + unclassified inbox; unique one per line; no header, no category labels). This file can be given to AI to review categories. Unclassified entries do NOT enter `dictionary.ts` or live play until assigned to a category. Full dictionary export remains separate.

## Dessert prefix normalization: ขนม
When checking a name in **dessert** category, ignore the common leading word **ขนม** for consonant assignment; retain the complete reviewed word for validation, duplicate detection and stats. `ขนมไข่` / `ขนมเข่ง` count as **ข ไข่** while `ขนมครก` counts as **ค ควาย**, `ขนมชั้น` as **ช ช้าง**, `ขนมถ้วย` as **ถ ถุง**. The bare `ขนม` and bare `ไข่` are not accepted as desserts. Unprefixed desserts like `ข้าวเหนียวแก้ว` still use their usual first consonant. The same category-sensitive rule is used for playable-category eligibility, category weights, live input feedback, admin search, dashboard and CSV. Historical aggregate rows under a former letter are combined into the newly correct category/word, rather than silently losing usage counts. The other categories (including foods named `ขนมจีน...`) are unchanged.

## Optional ขนม-prefix for all registered desserts
A dessert with a bare registered name may also be submitted with an optional `ขนม` prefix. Both `ไข่หงส์` and `ขนมไข่หงส์` are valid and identical for uniqueness/scoring; `ขนมข้าวตู` matches the curated `ข้าวตู`. The historic name `ไข่เหี้ย` / `ขนมไข่เหี้ย` is a manually curated alias for `ไข่หงส์`, not a separate dessert for duplicate scoring. Prefixing never makes an unlisted sweet valid, and `ขนม` alone is invalid. Originally fully prefixed dictionary names (e.g. `ขนมครก`) stay accepted without requiring the nonsensical bare `ครก` to be accepted. Letter matching ignores `ขนม` for dessert only; other categories remain unchanged. All duplicates, usage records, admin views, and CSV exports use the same canonical dessert identity, while preserving historical data in the old prefixes.

## Dessert review workspace
The admin-only word table now filters by curated dessert subtypes (traditional Thai / baked / fried / chilled / international / unreviewed). Labels are operational metadata, not new player categories; new or uncertain sweets default to unreviewed. A separate AWS-backed suggestions section lists anonymous, repeated unknown-dessert answers from completed rounds (3+ different rounds), and clicking a proposal only **pre-fills** the existing local draft form for manual verification; it never directly changes the game dictionary. This API uses the existing guest-authorized `getWordStats` resolver with request='dessert-suggestions', not an authenticated secret service.

The **ส เสือ** dessert pool gained five distinct real sweets after alias deduplication to preserve the minimum 5 unique kinds rule.

## คำไวพจน์และหมวดธรรมชาติ (Curated Synonyms)

- เกมปกติรับคำทั่วไป คำทับศัพท์ที่ผ่านการตรวจรับ และ **คำไวพจน์จริงที่มีหลักฐานยืนยันและลงคลังไว้เท่านั้น** ไม่เดาคำไวพจน์หรือเรียก AI ตรวจคำระหว่างเล่น
- ข้อมูลคำไวพจน์ที่ได้รับการตรวจสอบเป็นกลุ่มความหมาย (เช่น ช้าง = คชสาร / กุญชร / หัสดี; ดวงอาทิตย์ = สุริยา / ทินกร) อยู่ใน `amplify/functions/game/synonyms.ts` โดยเก็บหมวดและลิงก์แหล่งคำศัพท์ เพื่อให้ตรวจสอบเพิ่มภายหลังได้
- **คำไวพจน์ต่างคำได้คะแนนแยกกัน** เช่น รอบ ค ควาย หมวดสัตว์: คชสาร vs คชา ได้คนละ 2 คะแนน ส่วนคำเหมือนกันยังได้คนละ 1 คะแนน การแปลงชื่อจังหวัดที่สะกดต่างกันหรือชื่อขนมที่เป็นของชนิดเดียวกันยังยึดกฎเดิม ไม่ใช่คำไวพจน์อิสระ
- หมวดใหม่ **ธรรมชาติ** รองรับสิ่งในธรรมชาติและคำไวพจน์ เช่น ทินกร สุริยา น้ำ วารี ชล และคำสามัญที่ลงคลังไว้ (คำใดจะตอบได้ในรอบจริงต้องขึ้นต้นด้วยพยัญชนะที่สุ่มได้ และหมวด/พยัญชนะนั้นผ่านตัวกรองความเป็นธรรมขั้นต่ำ)
- หมวด **ดอกไม้** เฉพาะชนิด/พันธุ์ดอกไม้ ไม่รับคำว่า บุปผา, ผกา, มาลี เพราะเป็นคำเรียกดอกไม้ทั่ว ๆ ไป; คำเหล่านี้อยู่ในหมวดธรรมชาติแทน
- ห้ามคำที่เป็นเพียงชื่อหมวด เช่น “สัตว์” ในหมวดสัตว์ หรือ “อาหาร” ในหมวดอาหาร
- เฉลยหลังจบรอบและสรุปจบเกมมีคำไวพจน์น่ารู้ที่ขึ้นต้นตรงพยัญชนะของรอบนั้นโดยใช้ `src/word-insights.ts` และข้อมูลชุดเดียวกับคลัง เซิร์ฟเวอร์ยังเป็นผู้ตัดสินคะแนน
- ทุกคำใหม่ต้องตรวจ **ตัวสะกด/ความหมาย/หมวด/หลักฐาน** ก่อนแก้ `dictionary.ts` หรือ `synonyms.ts`; ไฟล์อ้างอิงของแต่ละกลุ่มเป็น metadata เพื่อช่วยทวนสอบ ไม่ใช้การดึงพจนานุกรมมาเพิ่มคำอัตโนมัติ

## คัดรายชื่อจังหวัด/รัฐต่างประเทศให้เหมาะกับผู้เล่นไทย

หมวด **จังหวัด/รัฐทั่วโลก** ไม่ใช่รายชื่อจังหวัดทั้งหมดของโลกอีกต่อไป โดยตั้งใจให้ตอบสนุกสำหรับผู้เล่นไทย:

- จังหวัดไทย **ครบ 77 จังหวัด** (รวมกรุงเทพมหานคร)
- จังหวัด/เขตการปกครองระดับเดียวกันของประเทศเพื่อนบ้าน **38 ชื่อหลัก**: ลาว 8, กัมพูชา 8, เมียนมา 8, มาเลเซีย 8, เวียดนาม 6
- รัฐ/จังหวัด/จังหวัดเทียบเท่าของประเทศอื่น **28 ชื่อหลัก**: สหรัฐอเมริกา 12, แคนาดา 3, ญี่ปุ่น 8, ออสเตรเลีย 3, เยอรมนี 2
- รูปสะกดภาษาไทยทางเลือกอีก **5 แบบ** ที่นับเป็นสถานที่เดียวกัน (ไม่นับเป็นคำตอบใหม่)
- รวม **143 ชื่อหลัก** (77+38+28) หรือ **148 รูปคำ** เมื่อรวมรูปสะกดทางเลือก ไม่มีการเพิ่มชื่อเมืองทั่วไปที่ไม่ได้เป็นเขตการปกครองระดับจังหวัด
- เกณฑ์สุ่มใหม่: อย่างน้อย **2 คำไม่ซ้ำต่อหมวด/พยัญชนะ** และ **5 หมวดต่อพยัญชนะ** จึงสุ่มได้ (สำหรับห้องที่เลือก 6–8 หมวด จะสุ่มเฉพาะอักษรที่รองรับจำนวนหมวดนั้นได้) หากชื่อรัฐหรือจังหวัดอยู่ในคลังแต่พยัญชนะนั้นยังไม่ผ่านเกณฑ์ เกมจะยังไม่สุ่มรอบนั้น
- แหล่งข้อมูล: `amplify/functions/game/neighbor-provinces.ts`, `amplify/functions/game/familiar-world-provinces.ts` และรายการจังหวัดไทยใน `dictionary.ts`; เปลี่ยน shortlist ได้หลังตรวจคำและเทสต์

เกณฑ์คัดเลือกเป็นเกณฑ์บรรณาธิการโดยประมาณ (พบในข่าว การเรียน การท่องเที่ยว หรือประเทศเพื่อนบ้าน) **ไม่ใช่การจัดอันดับจากผลสำรวจว่าคนไทยรู้จักจังหวัดใดมากที่สุด** รายการที่ถูกตัดออกไม่ถือว่าเป็นสถานที่ไม่มีจริง เพียงแต่ไม่ได้เป็นคำตอบที่คลังเกมฉบับนี้รองรับ

## ขยายคลังคำ ล ลิง

คลังคำ ล ลิง เพิ่มคำที่ตรวจหมวดแล้ว **314 รายการ** (คำเดียวกันอาจอยู่หลายหมวดหากใช้ได้จริง) ในไฟล์ `amplify/functions/game/lor-ling-terms.ts` ครอบคลุม 24 หมวด เช่น สัตว์ อาชีพ คำกริยา ผลไม้ อาหาร เครื่องดื่ม ดอกไม้ พืช สิ่งของ ขนม และเครื่องมือ

ตัวอย่าง: **ลา, โลมา, ละมั่ง, ล่าม, ลบ, ลืม, ลูกเนียง, ลาบ, ลูกชิ้น, ลาเต้, ลำไส้, ลิ้นมังกร, ลีลาวดี, ลานจอดรถ, ลอดช่อง, ลูกชุบ, เลื่อย**; คำสะกดผิดหรือคำประสมที่ไม่ได้คัดรับยังไม่ผ่าน ไม่สามารถเติมคำนำหน้า `ลูก`, `ลาบ`, `ลาน` เพื่อสร้างคำใหม่ได้โดยอัตโนมัติ

กฎคัดเลือกพยัญชนะยังเป็น **5 หมวด หมวดละอย่างน้อย 2 คำไม่ซ้ำกัน** ส่วนห้อง 6–8 หมวดต้องมีหมวดที่รองรับครบตามจำนวนที่เลือก การนับคำตอบในหมวดขนมที่ขึ้นต้นด้วย `ขนม` และการคิดคะแนนคำซ้ำยังใช้กฎเดิม

## ขยายคำ ผ ผึ้ง

เพิ่มคำขึ้นต้นด้วย **ผ ผึ้ง** ที่มีการกำหนดหมวดอย่างชัดเจน **404 รายการ** (รูปคำต่างกัน 365 คำ เพราะคำเดียวกันอาจอยู่ได้มากกว่า 1 หมวด) ครอบคลุม **17 หมวด** ใน `amplify/functions/game/pho-phueng-terms.ts` เช่น คำกริยา ผัก อาหาร อาชีพ แมลง เสื้อผ้า สิ่งของ ดอกไม้ ธรรมชาติ และขนม

ตัวอย่างที่รับรอง: **ผึ้ง, ผีเสื้อหนอนมะนาว, ผู้พิพากษา, ผูกเชือก, ผักกูด, ผักกาดขาว, ผัดขี้เมา, เผือกนมสด, ผิวหนัง, ผ้าขาวม้า, ไผ่ตง, ผกากรอง, ผ้าเช็ดตัว, ผาแต้ม, เผือกเชื่อม**. คำสะกดผิด คำประสมที่แต่งเองหรือคำที่อยู่ผิดหมวดไม่ได้รับรองอัตโนมัติ

การสุ่มยังใช้กติกา **พยัญชนะหนึ่งมีอย่างน้อย 5 หมวด และแต่ละหมวดมีอย่างน้อย 2 คำไม่ซ้ำ**; ห้องที่เลือก 6–8 หมวดต้องมีหมวดที่รองรับครบจำนวน การพิมพ์คำว่า `ขนม` นำหน้าของหวาน (เช่น `ขนมเผือกเชื่อม`) ยังคงนับพยัญชนะของชื่อขนมจริงคือ **ผ** ไม่ใช่ ข

## Automatic rarity bonuses (server-authoritative)
- A correct unique word retains **2** base points; a duplicate retains **1**. Only unique answers can earn a rarity bonus (+1 / +2), capped at **+3 bonus points per player per round**. There is no guaranteed quota of rare words in a letter/category group.
- Classify each **letter × category** independently. A group is eligible only after >=10 accepted distinct words, >=max(120, 8×pool-size) deduplicated 30-day uses, >=20 distinct guest identities, >=12 rooms, >=4 active dates spanning >=6 days, and >=7 days since group activation. The first week intentionally has no rarity awards.
- For each reviewed word, record its first eligibility timestamp upon first encountering its group. New words need >=5 days of exposure and >=max(60, 4×pool-size) recent group uses since joining before classification. A large vocabulary addition can temporarily disable bonuses while the baseline is rebuilt; it never grants free rarity to a new zero-use word.
- The estimator compares mature words against the **median selection frequency**, not the mean. It requires a conservative upper confidence bound to fall below 60% of the median (+1) or 25% (+2, groups with >=20 words). A few hugely popular words cannot by themselves make every ordinary word rare. Zero rare words is valid.
- Store only server-verified settled-round observations; never count draft edits. One identity can contribute at most one use of a particular word per UTC day for rarity analysis (not a complete Sybil defense against new guest identities).
- In the same DynamoDB transaction as the match result and lifetime usage increments, write one private, 40-day-TTL observation per active category (<=73 transaction actions). Observations are never exposed through the guest stats API.
- Rarity is evaluated lazily at the start of a round, cached per group per Thai rarity day (03:00 cutoff), and frozen in server match state for scoring. Promotions need two consecutive day evaluations, demotions three. Database or analysis failures fail closed to normal scoring rather than failing the match.
- The first deploy starts new rarity observation history; **existing lifetime WordUsageStats cannot be retroactively treated as recent deduplicated evidence**. The group/day snapshots are cached inside the private RarityGroupMeta table. A safety cap of 5,000 recent round records per group refuses classification rather than reading a truncated dataset; at higher scale add a daily rollup/background aggregation pipeline. This implementation is intentionally fail-closed, not unlimited-capacity analytics.
- Local checks: `npm run check`. After an Amplify backend deploy, verify with >=2 real guest devices and inspect both new DynamoDB tables and Lambda logs; GitHub Actions passing does **not** verify an AWS deployment.


## Admin rarity dashboard (existing frontend gate only)
The existing word workspace includes **สถิติความหายาก**, linked from the top of the admin page. It lists category × consonant groups, lifetime usage, deduplicated 30-day usage, rarity tiers (+1/+2), stability/pending tiers, eligibility thresholds, and whether a group is still learning or legitimately has zero rare words. No separate username or password is required for this panel: unlock the existing word workspace once and the rarity section loads automatically.

**Security tradeoff chosen by the owner:** The pre-existing admin PIN is checked in the browser only. It is a *convenience screen*, NOT secure authentication or a private backend API. Any visitor able to call the guest-authorized `getWordStats(request:'rarity')` endpoint can obtain the same aggregate rarity statistics without the PIN. Do NOT put secrets, email addresses, player identities, raw answer events or private player data into this endpoint. Only aggregated per-word counts, group-wide unique-player/room counts, eligible dates, and server rarity snapshots are returned. The raw `RarityObservations` data, including pseudonymous player IDs, stays server-side. The API is **read-only**; scoring, word validation, and database updates remain under server control.

Deploy the `main` branch with Amplify Gen 2 so the updated Lambda handles the new `rarity` request. There is no Cognito group or account configuration to perform. After deployment, unlock the existing word workspace and use its **ดูสถิติความหายาก** shortcut. The panel distinguishes unavailable snapshots (`—`) from recorded zero uses, and never fabricates rarity while information is insufficient.

Run `npm run check` and verify the live API and mobile admin after backend deployment. GitHub Actions success confirms source tests and build, not a successful AWS production deployment.

## เพิ่ม น หนู และคำศัพท์เกี่ยวกับท้องนา

เพิ่มศัพท์ **น หนู 435 รายการ** (374 รูปคำไม่ซ้ำข้ามหมวด) ใน **23 หมวด** รวมถึงนกชนิดต่าง ๆ อาชีพ คำกริยา อาหาร น้ำผลไม้ อวัยวะ พืช ดอกไม้ สถานที่ และคำไวพจน์บางส่วนที่เป็นคำตอบจริง พร้อมเพิ่มชื่อกระท่อมและอาคารในไร่นาอีก **6 คำ** ใน `amplify/functions/game/nor-nu-terms.ts` โดยไม่สร้างคำขึ้นต้น `นัก`, `นก`, `นา`, `น้ำ` หรือ `นม` จากส่วนท้ายที่ไม่อยู่ในคลัง

- **หมวดสถานที่:** `นา`, `นาข้าว`, `นาขั้นบันได` มีอยู่แล้ว; เพิ่ม `นาดำ`, `นาหว่าน`, `นาปี`, `นาปรัง`, `นาดอน`, `นาลุ่ม`, `นาทาม`, `นาเกลือ`, `นาร้าง` และอีกหลายคำ
- **สถานที่เกี่ยวกับชาวนา:** `เถียงนา` และ `เถียงไร่` เป็นคำขึ้นต้น **ถ ถุง**; `กระท่อมปลายนา` ขึ้นต้น **ก**, `โรงนา` ขึ้นต้น **ร**, `ห้างนา` ขึ้นต้น **ห**, `ขนำ` ขึ้นต้น **ข** ไม่บังคับให้คำลงท้ายว่า `นา` กลายเป็นคำขึ้นต้น น
- **ตัวอย่างศัพท์ น เพิ่มเติม:** `นกขุนทอง`, `นักแสดง`, `นักพัฒนาเกม`, `นั่งพับเพียบ`, `นวดข้าว`, `น้ำพริกกะปิ`, `น้ำเก๊กฮวย`, `นมชมพู`, `นิ้วก้อย`, `น้อยโหน่ง`, `นางเล็ด`
- ในหมวดขนม `นางเล็ด` และ `ขนมนางเล็ด` ถือเป็นคำตอบ **เดียวกัน** ขึ้นต้น **น** ตามกฎตัดคำนำหน้า `ขนม` เดิม

เกณฑ์สุ่มยังเป็น **อย่างน้อย 5 หมวด หมวดละอย่างน้อย 2 คำจริงไม่ซ้ำกัน** และห้อง 6–8 หมวดจะสุ่มเฉพาะพยัญชนะที่มีหมวดรองรับครบ

ข้อมูลอ้างอิงเกี่ยวกับคำท้องนา: [ศูนย์สารนิเทศอีสาน มหาวิทยาลัยมหาสารคาม](https://isancenter.msu.ac.th/?p=1457), [สวท. วิทยุกระจายเสียงแห่งประเทศไทย](https://radiothailand.prd.go.th/th/content/category/detail/id/1378/iid/255458), [สารานุกรมวัฒนธรรมไทย ศูนย์มานุษยวิทยาสิรินธร](https://db.sac.or.th/thailand-cultural-encyclopedia/detail.php?id=15791) และ [มาตรฐานผลิตภัณฑ์ชุมชนข้าวแตน](https://tcps.tisi.go.th/pub/tcps0036_62%28%E0%B8%9C%E0%B8%A5%E0%B8%B4%E0%B8%95%E0%B8%A0%E0%B8%B1%E0%B8%93%E0%B8%91%E0%B9%8C%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%A7%E0%B9%81%E0%B8%95%E0%B8%99%29.pdf)

## All-player votes and analytics abuse resistance (2026-10-30)
- **Skip clock:** during a live round, every active player can vote once with the pinned bottom-right `ข้ามเวลา 0/n` control. Server-side votes use the stable Cognito guest identity, not arbitrary IDs sent by the client. Repeated votes and another tab using the same guest do not add votes. When every active participant has voted, the server accelerates the visual clock into its final **5 seconds** over 1.8 seconds, then grants a real 5-second answer period before scoring. A round already within 5 seconds cannot be extended. For 6–7 seconds remaining, the server shortens directly to five seconds without lengthening the original deadline. All deadlines and scores are decided by AWS Lambda, not the browser animation.
- **Rematch:** on the final result screen, every active participant has a `เล่นอีกครั้ง 0/n` button. Only unanimous votes reset to the **same room lobby**, retaining the exact previous rounds/categories/seconds settings. History, score and previous votes reset. Owner may edit settings again before starting. The legacy owner `reset` API action now records only the owner's vote and cannot force other players to replay.
- **Same browser profile:** Cognito Identity Pool guest credentials are stored across tabs by the browser/Amplify auth cache; Lambda hashes the Cognito identity, and `join` on the same room updates the existing player instead of adding another slot. The UI remembers the room ID in localStorage and re-joins on reload/new tab. This is **not** a hardware-enforced device ID: incognito, clearing storage or separate browser profiles can produce different guest identities. A person can still use more than one browser/device.
- **Anti-farm evidence only:** deduplicate each guest/word/day as before; now cap any single room/day/word to **3** observations and a single guest/group/day to **8** accepted observations (does not change actual scores). More than 60% of evidence from the top 2 rooms or more than 55% on a single day (with at least 120 samples) marks the group suspicious and suspends rarity tier awards, shown in admin as `พักประเมิน: ข้อมูลกระจุกตัว`. Sorted observations make these caps repeatable and fair. This is conservative manipulation resistance, not a guarantee against coordinated Sybil identities.
- No AWS Console setup required. AWS Amplify must deploy the backend code update. `npm run check` covers quorum behavior, duplicate guests, rematch config, time shortening, room/guest analytics caps and sample anomalies. Inspect runtime behavior on 2+ distinct guest devices after deployment before treating it as production verified.

## Optional ต้น prefix in the tree category
The `tree` category treats a leading `ต้น` as an optional prefix for any curated tree name: `มะม่วง` and `ต้นมะม่วง` share the same identity, while a dictionary entry `ต้นโพธิ์` can also be submitted as `โพธิ์`. The consonant is always taken **after** the prefix, so `ต้นมะม่วง` counts as ม and `ต้นโพธิ์` as พ, not ต. The bare forms `ต้น` and `ต้นไม้`, repeated prefixes, and made-up names remain invalid. No normalization changes apply to fruits, plants, foods or any other category. Rarity eligibility, word-choice weights, duplicate scoring, aggregate analytics, historical stats and admin searches all share the same canonical identity. The on-screen hint uses a fictional non-accepted tree, **ต้นประกายเมฆ**, to explain the rule without providing an actual answer.

## Category-local hint placement
On the gameplay answer screen, the special dessert/tree prefix hints appear directly below their own category titles inside their respective answer cards, rather than in the round letter/header region. Hint cards use a stacked, full-width input on mobile to keep the fictional sample and text readable while preserving the same scoring and autosave behavior. All other category rows remain compact.

## Prefix-insensitive flower, bird, insect and fish entries
Category-specific optional labels are now `flower=ดอก`, `bird=นก`, `insect=แมลง`, and `fish=ปลา`. Like existing `tree=ต้น`, only the name **after** the label determines the playable Thai consonant: `ดอกบัว / บัว` → บ, `นกกระจอก / กระจอก` → ก, `แมลงปอ / ปอ` → ป, `ปลาดุก / ดุก` → ด. The bare category nouns, generic `ดอกไม้`, stacked labels, and unregistered names are never valid. All variants share a single canonical ID for deduplication in game modes, round scoring, eligibility thresholds, rarity pooling, historic usage and the admin dashboard/CSV. Other categories remain unchanged. Each special-category answer field displays its own hint beneath the category title using an explicitly fictional example that does not give away a real playable word.

### Correct initial for previously reviewed น หนู vocabulary
Existing NOR_NU_TERMS records retain their raw Thai names as written. In the `bird` category a historical spelling beginning `นก...` now uses the leading consonant of its species name for gameplay (e.g. `นกแสก` becomes ส). Tests distinguish dictionary-raw spelling from the category-specific playable letter. Rarity/fairness still prevents any category-letter pair with insufficient unique species from being played.

## Live feedback for disallowed category-only words
The gameplay answer input now explicitly says **ห้ามใช้คำนี้เป็นคำตอบในหมวดนี้** for standalone category nouns such as `ขนม`, `ต้น`, `ต้นไม้`, `ดอกไม้`, `นก`, `แมลง`, `ปลา`, and repeated invalid prefixes, only in their associated categories. If a player types `นกกระจอก` in a bird round expecting น, the message is **ไม่นับ “นก” นำหน้า · นับ ก ไก่** instead of a generic unknown-word message. Unknown dictionary words still show the original not-found wording. Scoring, autosave and both game modes remain unchanged.
