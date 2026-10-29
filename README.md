# คำไว (Worlds Thai) — เกมคำไทยออนไลน์

เกมแข่งตอบคำศัพท์ภาษาไทยแบบหลายผู้เล่นจริง มีระบบแสดงห้องรอผู้เล่นแบบสาธารณะ เปิด URL เกมเดียวกันก็เล่นกับเพื่อนได้ ใช้ **AWS Amplify Gen 2 + AppSync API + Lambda + DynamoDB + Cognito Guest** และ Vite/React

## วิธีเล่น

1. คนแรกใส่ชื่อเล่นและกด **สร้างห้อง** เพื่อเป็นเจ้าของห้อง
2. เจ้าของตั้งจำนวนรอบ **1–10**, หมวดต่อรอบ **3–8** และเวลาตอบต่อรอบ **20–120 วินาที** (ค่าเริ่มต้น 3 / 5 / 40)
3. เพื่อนเปิด URL **หน้าเกมเดียวกัน** กด **เข้าร่วมห้อง** จะเห็นรายชื่อห้องที่ยังรอผู้เล่น แล้วกดเข้าร่วมได้ทันที **ไม่ต้องส่งลิงก์หรือกรอกรหัสใด ๆ**
4. เมื่อมี 2 คนขึ้นไป เจ้าของกด **เริ่มเกม** ด้วยตัวเอง; ไม่เริ่มอัตโนมัติ
5. แต่ละรอบสุ่มพยัญชนะและหมวดที่คลังคำรองรับ; คำถูกไม่ซ้ำ 2 คะแนน ถูกซ้ำ 1 คะแนน คำไม่รับรอง/ผิดหมวด 0 คะแนน
6. จบครบจำนวนรอบ เจ้าของกด **เล่นใหม่** ได้; ถ้าเจ้าของออก ผู้เล่นที่ยังอยู่คนแรกจะเป็นเจ้าของแทน

**ขอบเขตการตรวจคำ:** ฝั่งเซิร์ฟเวอร์ตรวจพยัญชนะต้นรวมรูปแบบสระนำ `เ แ โ ใ ไ`, ตรวจรายการคำที่ผู้ดูแลตรวจรับและจัดหมวดไว้ใน `amplify/functions/game/dictionary.ts`, ตรวจคำซ้ำและเวลา ไม่ยอมรับคำใด ๆ เพียงเพราะพยัญชนะต้นตรงอีกแล้ว เลือกสุ่มเฉพาะตัวอักษรที่มีอย่างน้อย 8 หมวด โดยแต่ละหมวดต้องมีคำที่ตรวจรับอย่างน้อย 5 คำไม่ซ้ำกัน และให้โอกาสหมวดที่มีคำตอบมากถูกสุ่มมากกว่า **ฃ ขวด (ตัว ฃ) ถูกงดสุ่ม** ส่วน **ข ไข่ (ตัว ข) ใช้ได้ตามปกติ** และมีคลังคำรองรับอย่างน้อย 8 หมวด

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

The earlier rules admitted a letter/category pair with only 3 approved answers, making responses predictable. The current fairness gate requires **at least 5 distinct accepted words per letter/category pair** and **at least 8 qualifying categories for a consonant**; rounds still honor room settings of 3–8 categories. Category selection favors richer pools. Rare letters such as **ฎ ชฎา** and **ฮ นกฮูก** never enter the draw. **ด เด็ก** and **ข ไข่** remain eligible because their category vocabularies meet the threshold. This is a curated-answer gate, not a claim to cover every possible Thai word.

## Automatic answer capture and reviewed vocabulary expansion

Answers will be autosaved to the server as the player types and scored using the last successfully saved draft when the round ends. No manual submission button; typing feedback still uses the same reviewed dictionary. The backend retains 'submit' for backwards compatibility but the updated client never invokes it. Debounced writes reduce requests; network loss may prevent the most recent text from reaching the server, so the UI shows save status.

Added missing common verbs (including **พนมมือ** and **ปรบมือ**), **อุรุกวัย** and many more countries, states/provinces from multiple countries, common drinks, dishes with eggs, and desserts beginning with ข that do **not** start with 'ขนม'. **พลับพลึง** is a flower/plant, not a commonly eaten fruit; **พลับ** and **พลัม** are fruits. International administrative subdivisions are labelled จังหวัด/รัฐทั่วโลก.
