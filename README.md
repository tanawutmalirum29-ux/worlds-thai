# คำไว (Worlds Thai) — เกมคำไทยออนไลน์

เกมแข่งตอบคำศัพท์ภาษาไทยแบบหลายผู้เล่นจริง ใช้ **AWS Amplify Gen 2 + AppSync API + Lambda + DynamoDB + Cognito Guest** และ Vite/React

## วิธีเล่น

1. ใส่ชื่อเล่น ไม่ต้องสมัครบัญชีและ **ไม่มีช่องกรอกรหัสห้อง**
2. เข้า public matchmaking อัตโนมัติ (สูงสุด 8 คนต่อล็อบบี้, 20 ล็อบบี้)
3. เมื่อมี 2 คนขึ้นไปเริ่มนับถอยหลัง 9 วินาที
4. แข่ง **3 รอบ** รอบละ **40 วินาที** สุ่มพยัญชนะ 1 ตัวและ **5 หมวดไม่ซ้ำ** จาก **28 หมวดที่มีคลังคำตรวจรับแล้ว**
5. กดส่งก่อนหมดเวลา คำตรงพยัญชนะต้น **และอยู่ในคลังคำของหมวดนั้น** ไม่ซ้ำคนอื่น = 20 แต้ม, ซ้ำ = 10, คำผิดหมวด/ไม่อยู่ในคลัง/ว่าง = 0 คะแนน; รวมคะแนน 3 รอบ
6. แชร์ลิงก์จากล็อบบี้ให้เพื่อนเพื่อเข้ากลุ่มเดียวกันโดยไม่ต้องพิมพ์รหัส (ถ้าห้องเต็ม/เริ่มเกมแล้วให้รอเกมถัดไป)

**ขอบเขตการตรวจคำ:** ฝั่งเซิร์ฟเวอร์ตรวจพยัญชนะต้นรวมรูปแบบสระนำ `เ แ โ ใ ไ`, ตรวจรายการคำที่ผู้ดูแลตรวจรับและจัดหมวดไว้ใน `amplify/functions/game/dictionary.ts`, ตรวจคำซ้ำและเวลา ไม่ยอมรับคำใด ๆ เพียงเพราะพยัญชนะต้นตรงอีกแล้ว เลือกสุ่มเฉพาะตัวอักษรที่มีอย่างน้อย 7 หมวด โดยแต่ละหมวดต้องมีคำที่ตรวจรับอย่างน้อย 3 คำ **ข ขวดถูกงดสุ่มชั่วคราว** เพราะคำตอบหลายหมวดจำกัด

**ข้อจำกัด:** นี่เป็นคลังคำคัดเลือก ไม่ใช่พจนานุกรมภาษาไทยฉบับสมบูรณ์ คำจริงที่ไม่ได้บันทึกจะได้ 0 คะแนน (false negative) จึงควรเปิดคำขอเพิ่มคำให้ผู้ดูแลตรวจสอบก่อนปล่อยให้เล่นแข่งขันจริง และห้ามอ้างว่าตรวจคำได้ครบทุกคำ

## Deploy ขึ้น AWS Amplify Hosting (Production)

> การ push GitHub อย่างเดียว **ไม่ทำให้ขึ้นเว็บ** จนกว่าจะสร้างและเชื่อม AWS Amplify App ในบัญชี AWS ของเจ้าของโปรเจกต์ การ deploy backend ต้องใช้ IAM role ที่มีสิทธิ์ CDK/CloudFormation, AppSync, Lambda, DynamoDB และ Cognito

1. เปิด [AWS Amplify Console](https://console.aws.amazon.com/amplify/home) → **Create new app** → **GitHub**
2. Authorize GitHub, เลือกรีโป `tanawutmalirum29-ux/worlds-thai`, branch **`main`**
3. ตรวจว่า Amplify ตรวจพบ `amplify.yml` (ไฟล์มี `npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`); เลือก build/compute role ที่อนุญาตการสร้าง backend Gen 2 ตามคู่มือ AWS
4. กด **Save and deploy** รอทั้ง backend และ frontend เป็น **Succeeded**; Amplify จะกำหนดโดเมน `https://main.<APP_ID>.amplifyapp.com`
5. เปิด URL จริงจากหน้า Amplify แล้วทดสอบ **2 เครื่อง/2 เบราว์เซอร์**: join, แชร์ลิงก์, timer, submit, คะแนน, 3 รอบ, rejoin หลังเน็ตหลุด

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
- โควตาต่อเกม 8 ผู้เล่น/ห้อง 20 ห้อง และ 3 รอบต่อเกม เป็นเพดาน MVP ปัจจุบัน ไม่ใช่ autoscaling matchmaking ระดับใหญ่

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
